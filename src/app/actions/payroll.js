import { supabase, unwrap } from "../../lib/supabaseClient";
import { companyTaxObligationFromApi, payrollPaymentFromApi, txFromApi, txToApi } from "../../lib/mappers";
import { today } from "../../lib/utils";

export function createPayrollActions(ctx) {
  const {
    companyTaxObligations, employees, locations, payrollPayments, payrollSchedule,
    setCompanyTaxObligations, setPayrollPayments, setTransactions, transactions,
  } = ctx;
  const withBusy = (...a) => ctx.withBusy(...a);

  // SZABADSÁG
  // BÉREK & ADÓK
  function monthRevenue(locationId, year, month) {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    return transactions
      .filter((t) => t.type === "income" && t.locationId === locationId && (t.date || "").startsWith(prefix))
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  }
  async function ensurePayrollPeriod(period) {
    const [y, m] = period.split("-").map(Number);
    const existing = new Set(payrollPayments.filter((p) => p.period === period).map((p) => p.scheduleId));
    const toCreate = payrollSchedule.filter((s) => s.active && !existing.has(s.id));
    if (toCreate.length === 0) return;
    const rows = toCreate.map((s) => {
      let amount = s.baseAmount;
      if (s.commissionPct) {
        const prevM = m === 1 ? 12 : m - 1;
        const prevY = m === 1 ? y - 1 : y;
        const emp = employees.find((e) => e.id === s.employeeId);
        const rev = monthRevenue(emp?.locationId, prevY, prevM);
        amount = s.baseAmount + (rev * s.commissionPct) / 100;
      }
      return {
        employee_id: s.employeeId, schedule_id: s.id, period, label: s.label,
        due_date: `${period.slice(0, 7)}-${String(s.payDay).padStart(2, "0")}`,
        computed_amount: Math.round(amount * 100) / 100,
      };
    });
    // upsert + ignoreDuplicates: két gyors egymás utáni hívás (pl. React StrictMode dupla
    // effekt-lefutása) ne fusson egymásba unique constraint hibával — a már létező sorokat
    // egyszerűen kihagyja, csak az új sorokat adja vissza.
    const r = unwrap(await supabase.from("payroll_payments").upsert(rows, { onConflict: "employee_id,schedule_id,period", ignoreDuplicates: true }).select());
    if (r.length > 0) setPayrollPayments((prev) => [...prev, ...r.map(payrollPaymentFromApi)]);
  }
  async function ensureCompanyTaxPeriod(period) {
    const existing = new Set(companyTaxObligations.filter((t) => t.period === period).map((t) => `${t.locationId}|${t.taxType}`));
    const gyimes = locations.find((loc) => loc.name === "Gyimes");
    const rows = [
      ...locations
        .filter((loc) => loc.name !== "Tartalék" && !existing.has(`${loc.id}|Bugetul de stat`))
        .map((loc) => ({ location_id: loc.id, tax_type: "Bugetul de stat", period, due_date: `${period.slice(0, 7)}-25`, amount: 1500 })),
      // Futó hitel — csak a Gyimesi céghez tartozik, minden hónap 1-jén esedékes.
      ...(gyimes && !existing.has(`${gyimes.id}|Hitel`)
        ? [{ location_id: gyimes.id, tax_type: "Hitel", period, due_date: `${period.slice(0, 7)}-01`, amount: 1500 }]
        : []),
    ];
    if (rows.length === 0) return;
    const r = unwrap(await supabase.from("company_tax_obligations").upsert(rows, { onConflict: "location_id,tax_type,period", ignoreDuplicates: true }).select());
    if (r.length > 0) setCompanyTaxObligations((prev) => [...prev, ...r.map(companyTaxObligationFromApi)]);
  }
  async function addCompanyTaxObligation(locationId, period, taxType, amount, dueDate) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("company_tax_obligations").insert({
        location_id: locationId, tax_type: taxType, period, due_date: dueDate || null, amount: amount || null,
      }).select());
      setCompanyTaxObligations((prev) => [...prev, companyTaxObligationFromApi(r[0])]);
    });
  }
  async function updatePayrollAmount(paymentId, amount) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("payroll_payments").update({ computed_amount: amount }).eq("id", paymentId).select());
      setPayrollPayments((prev) => prev.map((x) => (x.id === paymentId ? payrollPaymentFromApi(r[0]) : x)));
    });
  }
  async function updateTaxAmount(taxId, amount) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("company_tax_obligations").update({ amount }).eq("id", taxId).select());
      setCompanyTaxObligations((prev) => prev.map((x) => (x.id === taxId ? companyTaxObligationFromApi(r[0]) : x)));
    });
  }
  async function markPayrollPaid(paymentId, payment, amount) {
    await withBusy(async () => {
      const p = payrollPayments.find((x) => x.id === paymentId);
      const emp = employees.find((e) => e.id === p.employeeId);
      const r = unwrap(await supabase.from("transactions").insert(txToApi({
        type: "expense", category: "Bér", description: `Bér: ${emp?.fullName || ""} — ${p.label}`,
        amount, payment, payrollPaymentId: paymentId,
      }, emp?.locationId)).select());
      setTransactions((prev) => [txFromApi(r[0]), ...prev]);
      const r2 = unwrap(await supabase.from("payroll_payments").update({ paid: true, paid_date: today(), paid_amount: amount }).eq("id", paymentId).select());
      setPayrollPayments((prev) => prev.map((x) => (x.id === paymentId ? payrollPaymentFromApi(r2[0]) : x)));
    });
  }
  async function unmarkPayrollPaid(paymentId) {
    await withBusy(async () => {
      const linked = unwrap(await supabase.from("transactions").select("id").eq("payroll_payment_id", paymentId).is("deleted_at", null));
      if (linked.length > 0) {
        const ids = linked.map((r) => r.id);
        unwrap(await supabase.from("transactions").update({ deleted_at: new Date().toISOString() }).in("id", ids));
        setTransactions((prev) => prev.filter((t) => !ids.includes(t.id)));
      }
      const r2 = unwrap(await supabase.from("payroll_payments").update({ paid: false, paid_date: null, paid_amount: null }).eq("id", paymentId).select());
      setPayrollPayments((prev) => prev.map((x) => (x.id === paymentId ? payrollPaymentFromApi(r2[0]) : x)));
    });
  }
  async function markTaxPaid(taxId, payment, amount) {
    await withBusy(async () => {
      const t = companyTaxObligations.find((x) => x.id === taxId);
      const loc = locations.find((l) => l.id === t.locationId);
      const r = unwrap(await supabase.from("transactions").insert(txToApi({
        type: "expense", category: t.taxType === "Hitel" ? "Hitel" : "Adó", description: `${t.taxType} — ${loc?.name || ""}`,
        amount, payment, companyTaxObligationId: taxId,
      }, t.locationId)).select());
      setTransactions((prev) => [txFromApi(r[0]), ...prev]);
      const r2 = unwrap(await supabase.from("company_tax_obligations").update({ paid: true, paid_date: today() }).eq("id", taxId).select());
      setCompanyTaxObligations((prev) => prev.map((x) => (x.id === taxId ? companyTaxObligationFromApi(r2[0]) : x)));
    });
  }
  async function unmarkTaxPaid(taxId) {
    await withBusy(async () => {
      const linked = unwrap(await supabase.from("transactions").select("id").eq("company_tax_obligation_id", taxId).is("deleted_at", null));
      if (linked.length > 0) {
        const ids = linked.map((r) => r.id);
        unwrap(await supabase.from("transactions").update({ deleted_at: new Date().toISOString() }).in("id", ids));
        setTransactions((prev) => prev.filter((t) => !ids.includes(t.id)));
      }
      const r2 = unwrap(await supabase.from("company_tax_obligations").update({ paid: false, paid_date: null }).eq("id", taxId).select());
      setCompanyTaxObligations((prev) => prev.map((x) => (x.id === taxId ? companyTaxObligationFromApi(r2[0]) : x)));
    });
  }

  return {
    monthRevenue, ensurePayrollPeriod, ensureCompanyTaxPeriod, addCompanyTaxObligation,
    updatePayrollAmount, updateTaxAmount, markPayrollPaid, unmarkPayrollPaid, markTaxPaid, unmarkTaxPaid,
  };
}
