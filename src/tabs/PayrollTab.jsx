import { useEffect, useMemo, useState } from "react";
import { money } from "../lib/utils";
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon, CloseIcon } from "../components/icons";
import CashOrCardModal from "../components/CashOrCardModal";
import { EmptyState } from "../components/EmptyState";

function periodOf(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; }
function shiftPeriod(period, delta) {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return periodOf(d);
}
function periodLabel(period) {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("hu-HU", { year: "numeric", month: "long" });
}
function dayOf(dateStr) { return dateStr ? Number(dateStr.slice(8, 10)) : null; }

function AddTaxModal({ locations, period, onClose, onSave, busy }) {
  const [locationId, setLocationId] = useState(locations[0]?.id || "");
  const [taxType, setTaxType] = useState("");
  const [amount, setAmount] = useState("");
  const valid = locationId && taxType.trim() && amount !== "";
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
        <h2>Új adótétel <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        <div className="field"><label>Cég / helyszín</label>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.company_name || l.name}</option>)}
          </select>
        </div>
        <div className="field"><label>Adónem</label><input value={taxType} onChange={(e) => setTaxType(e.target.value)} placeholder="pl. ÁFA" /></div>
        <div className="field"><label>Összeg (Lej)</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!valid || busy} onClick={() => valid && onSave(locationId, period, taxType.trim(), Number(amount))}>Hozzáadás</button>
        </div>
      </div>
    </div>
  );
}

export default function PayrollTab({
  busy, employees, payrollSchedule, payrollPayments, companyTaxObligations, locations,
  ensurePayrollPeriod, ensureCompanyTaxPeriod, markPayrollPaid, unmarkPayrollPaid, markTaxPaid, unmarkTaxPaid, addCompanyTaxObligation,
}) {
  const [period, setPeriod] = useState(periodOf(new Date()));
  const [filter, setFilter] = useState("all");
  const [payPrompt, setPayPrompt] = useState(null); // { kind, id, amount, label }
  const [addTax, setAddTax] = useState(false);

  useEffect(() => {
    ensurePayrollPeriod(period);
    ensureCompanyTaxPeriod(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const rows = useMemo(() => {
    const payrollRows = payrollPayments
      .filter((p) => p.period === period)
      .map((p) => {
        const emp = employees.find((e) => e.id === p.employeeId);
        const sched = payrollSchedule.find((s) => s.id === p.scheduleId);
        const amount = p.paid ? (p.paidAmount ?? p.computedAmount ?? 0) : (p.computedAmount ?? 0);
        return {
          kind: "payroll", id: p.id, day: dayOf(p.dueDate), title: p.label,
          sub: sched?.commissionPct ? `${money(sched.baseAmount)} + ${sched.commissionPct}% × ${sched.commissionBasis || "előző havi árbevétel"}` : (employeesLocName(emp, locations)),
          amount, paid: p.paid, tagLabel: emp?.fullName?.split(" ")[0] || "?", tagKind: "emp",
        };
      });
    const taxRows = companyTaxObligations
      .filter((t) => t.period === period)
      .map((t) => {
        const loc = locations.find((l) => l.id === t.locationId);
        return {
          kind: "tax", id: t.id, day: dayOf(t.dueDate), title: t.taxType,
          sub: `${loc?.company_name || loc?.name || ""}`,
          amount: t.amount ?? 0, paid: t.paid, tagLabel: "Cég-adó", tagKind: "co",
        };
      });
    const all = [...payrollRows, ...taxRows].sort((a, b) => (a.day || 99) - (b.day || 99));
    if (filter === "payroll") return all.filter((r) => r.kind === "payroll");
    if (filter === "tax") return all.filter((r) => r.kind === "tax");
    return all;
  }, [payrollPayments, companyTaxObligations, employees, payrollSchedule, locations, period, filter]);

  const totals = useMemo(() => {
    const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const paid = rows.filter((r) => r.paid).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const taxTotal = rows.filter((r) => r.kind === "tax").reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return { total, paid, remaining: total - paid, taxTotal };
  }, [rows]);

  function togglePaid(r) {
    if (r.paid) {
      if (r.kind === "payroll") unmarkPayrollPaid(r.id); else unmarkTaxPaid(r.id);
    } else {
      setPayPrompt(r);
    }
  }
  function confirmPay(payment) {
    if (!payPrompt) return;
    if (payPrompt.kind === "payroll") markPayrollPaid(payPrompt.id, payment, payPrompt.amount);
    else markTaxPaid(payPrompt.id, payment, payPrompt.amount);
    setPayPrompt(null);
  }

  return (
    <>
      <div className="filter-row" style={{ justifyContent: "space-between" }}>
        <div className="month-nav">
          <button type="button" className="iconbtn" onClick={() => setPeriod((p) => shiftPeriod(p, -1))}><ChevronLeftIcon width={13} height={13} /></button>
          <span style={{ fontSize: 13, fontWeight: 700, minWidth: 130, textAlign: "center", textTransform: "capitalize" }}>{periodLabel(period)}</span>
          <button type="button" className="iconbtn" onClick={() => setPeriod((p) => shiftPeriod(p, 1))}><ChevronRightIcon width={13} height={13} /></button>
        </div>
        <button className="btn sec sm" disabled={busy} onClick={() => setAddTax(true)}>+ Új adótétel</button>
      </div>

      <div className="statrow c4" style={{ marginBottom: 18 }}>
        <div className="statcard"><div className="lbl">E havi teljes kötelezettség</div><div className="val">{money(totals.total)}</div></div>
        <div className="statcard accent"><div className="lbl">Ebből kifizetve</div><div className="val">{money(totals.paid)}</div></div>
        <div className="statcard warn"><div className="lbl">Hátralévő ez hónapban</div><div className="val">{money(totals.remaining)}</div></div>
        <div className="statcard"><div className="lbl">Ebből cég-adó</div><div className="val">{money(totals.taxTotal)}</div></div>
      </div>

      <div className="seg" style={{ marginBottom: 12 }}>
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Mind</button>
        <button className={filter === "payroll" ? "active" : ""} onClick={() => setFilter("payroll")}>Bérek</button>
        <button className={filter === "tax" ? "active" : ""} onClick={() => setFilter("tax")}>Cég-adók</button>
      </div>

      {rows.length === 0 ? (
        <EmptyState>Nincs tétel ebben a hónapban.</EmptyState>
      ) : (
        <div className="tw">
          {rows.map((r) => (
            <div className="pay-row" key={`${r.kind}-${r.id}`}>
              <div className="pay-day">{r.day ?? "—"}</div>
              <span className={`tag ${r.tagKind}`}>{r.tagLabel}</span>
              <div className="pay-main">
                <div className="pay-title">{r.title}</div>
                {r.sub && <div className="pay-sub">{r.sub}</div>}
              </div>
              <div className="pay-amount">{money(r.amount)}</div>
              <button
                type="button"
                className={`paid-toggle${r.paid ? " done" : ""}`}
                disabled={busy}
                onClick={() => togglePaid(r)}
              >
                {r.paid && <CheckIcon width={11} height={11} />}
                {r.paid ? "Kifizetve" : "Nincs kifizetve"}
              </button>
            </div>
          ))}
        </div>
      )}

      {payPrompt && (
        <CashOrCardModal
          title={payPrompt.title}
          amount={payPrompt.amount}
          busy={busy}
          onClose={() => setPayPrompt(null)}
          onConfirm={confirmPay}
        />
      )}
      {addTax && (
        <AddTaxModal
          locations={locations}
          period={period}
          busy={busy}
          onClose={() => setAddTax(false)}
          onSave={(locationId, per, taxType, amount) => { addCompanyTaxObligation(locationId, per, taxType, amount, null); setAddTax(false); }}
        />
      )}
    </>
  );
}

function employeesLocName(emp, locations) {
  const loc = locations.find((l) => l.id === emp?.locationId);
  return loc ? loc.name : "";
}
