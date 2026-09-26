import { fetchAllRows, supabase, unwrap } from "../../lib/supabaseClient";
import { acqFromApi, buybackModelFromApi, buybackOfferFromApi, buybackRuleFromApi, cashSettlementFromApi, chatMessageFromApi, companyTaxObligationFromApi, customerFromApi, customerProfileFromApi, customerRequestFromApi, dayCloseFromApi, employeeFromApi, leaveBalanceFromApi, leaveRequestFromApi, leaveTypeFromApi, loyaltyLedgerFromApi, loyaltyRewardFromApi, monthlySummaryFromApi, noteFromApi, pFromApi, partFromApi, payrollPaymentFromApi, payrollScheduleFromApi, profileFromApi, repairLeadFromApi, repairPriceFromApi, reviewFromApi, settingsFromApi, spFromApi, tFromApi, txFromApi, vaultCredentialFromApi, waitingFromApi, warrantyFromApi, webOrderFromApi } from "../../lib/mappers";
import { today } from "../../lib/utils";

export function createDataActions(ctx) {
  const {
    lastLoadAtRef, loadInFlightRef, setBuybackModels, setBuybackOffers, setBuybackRules,
    setCashSettlements, setCompanyTaxObligations, setCustomerProfiles, setCustomerRequests,
    setCustomersTable, setDayCloses, setEmployees, setError, setInboxMessages, setLeaveBalances,
    setLeaveRequests, setLeaveTypes, setLoadingData, setLocations, setLoyaltyLedger, setLoyaltyRewards,
    setMonthlySummaries, setNotes, setParts, setPayrollPayments, setPayrollSchedule,
    setProductAcquisitions, setProductParts, setRepairLeads, setRepairPrices, setReviews, setSettings,
    setStock, setStockHistory, setTickets, setTransactions, setUsers, setVaultCredentials,
    setWaitingItems, setWarranties, setWebOrders,
  } = ctx;

  async function loadAll({ silent = false } = {}) {
    if (silent && (loadInFlightRef.current || Date.now() - lastLoadAtRef.current < 5 * 60 * 1000)) return;
    loadInFlightRef.current = true;
    if (!silent) setLoadingData(true);
    try {
      const [locs, prods, txs, tcks, prs, sps, usrs, hist, custs, msums, warrs, bbModels, bbRules, bbOffers, lTypes, lBalances, lRequests, rPrices, rLeads, cSettlements, bNotes, wItems, appSettings, custReqs, webOrds, prodAcqs, dClosesR, loyRewards, loyLedger, custProfiles, revs, emps, paySched, payPays, coTax, wappMsgs, vaultCreds] = await Promise.all([
        supabase.from("locations").select("*").order("name", { ascending: true }),
        fetchAllRows(() => supabase.from("products").select("*").is("deleted_at", null).order("created_at", { ascending: false })),
        fetchAllRows(() => supabase.from("transactions").select("*, smartbill_documents(*), signatures(*)").is("deleted_at", null).order("date", { ascending: false })),
        fetchAllRows(() => supabase.from("service_tickets").select("*, signatures(*)").is("deleted_at", null).order("created_at", { ascending: false })),
        supabase.from("parts").select("*").is("deleted_at", null).order("name", { ascending: true }),
        supabase.from("service_parts").select("*"),
        supabase.from("profiles").select("*").order("full_name", { ascending: true }),
        supabase.from("stock_value_history").select("*").order("date", { ascending: true }),
        fetchAllRows(() => supabase.from("customers").select("*").is("deleted_at", null)),
        supabase.from("monthly_summaries").select("*").order("year").order("month"),
        supabase.from("warranties").select("*").is("deleted_at", null),
        supabase.from("buyback_models").select("*").is("deleted_at", null).order("brand", { ascending: true }),
        supabase.from("buyback_deduction_rules").select("*").order("question_key", { ascending: true }),
        supabase.from("buyback_offers").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("leave_types").select("*"),
        supabase.from("leave_balances").select("*"),
        supabase.from("leave_requests").select("*").order("start_date", { ascending: true }),
        supabase.from("repair_prices").select("*"),
        supabase.from("repair_leads").select("*").order("created_at", { ascending: false }),
        supabase.from("cash_settlements").select("*").order("period_end", { ascending: false }),
        supabase.from("board_notes").select("*").order("created_at", { ascending: false }),
        supabase.from("waiting_items").select("*").order("created_at", { ascending: false }),
        supabase.from("app_settings").select("*").eq("id", true).single(),
        supabase.from("customer_requests").select("*, customer_profiles(full_name, phone)").neq("status", "lezarva").order("created_at", { ascending: false }),
        supabase.from("web_orders").select("*, locations(name), web_order_items(id, product_id, price, products(brand, model, storage, color, location_id, locations(name)))").in("status", ["fizetve", "visszaigazolva"]).order("created_at", { ascending: false }),
        supabase.from("product_acquisitions").select("*"),
        supabase.from("day_closes").select("*").order("date", { ascending: false }),
        supabase.from("loyalty_rewards").select("*").order("sort_order", { ascending: true }),
        fetchAllRows(() => supabase.from("loyalty_points_ledger").select("*").order("created_at", { ascending: false })),
        supabase.from("customer_profiles").select("*"),
        supabase.from("reviews").select("*").order("review_date", { ascending: false }),
        supabase.from("employees").select("*").order("full_name", { ascending: true }),
        supabase.from("payroll_schedule").select("*").order("sort_order", { ascending: true }),
        supabase.from("payroll_payments").select("*").order("due_date", { ascending: true }),
        supabase.from("company_tax_obligations").select("*").order("due_date", { ascending: true }),
        fetchAllRows(() => supabase.from("chat_messages").select("*").order("created_at", { ascending: true })),
        supabase.from("vault_credentials").select("*").order("site_name", { ascending: true }),
      ]);
      setLocations(unwrap(locs) || []);
      const prodRows = unwrap(prods) || [];
      const acqRows = (unwrap(prodAcqs) || []).map(acqFromApi);
      setProductAcquisitions(acqRows);
      const acqByProduct = {};
      acqRows.forEach((a) => { acqByProduct[a.productId] = a; });
      setStock(prodRows.map((r) => ({ ...pFromApi(r), acquisition: acqByProduct[r.id] || null })));
      setTransactions((unwrap(txs) || []).map(txFromApi));
      setDayCloses((unwrap(dClosesR) || []).map(dayCloseFromApi));
      const spByTicket = {};
      const spByProduct = {};
      (unwrap(sps) || []).map(spFromApi).forEach((sp) => {
        if (sp.ticketId) (spByTicket[sp.ticketId] ||= []).push(sp);
        else if (sp.productId) (spByProduct[sp.productId] ||= []).push(sp);
      });
      setTickets((unwrap(tcks) || []).map((r) => ({ ...tFromApi(r), usedParts: spByTicket[r.id] || [] })));
      setProductParts(spByProduct);
      setParts((unwrap(prs) || []).map(partFromApi));
      setUsers((unwrap(usrs) || []).map(profileFromApi));
      setCustomersTable((unwrap(custs) || []).map(customerFromApi));
      setLoyaltyRewards((unwrap(loyRewards) || []).map(loyaltyRewardFromApi));
      setLoyaltyLedger((unwrap(loyLedger) || []).map(loyaltyLedgerFromApi));
      setCustomerProfiles((unwrap(custProfiles) || []).map(customerProfileFromApi));
      setReviews((unwrap(revs) || []).map(reviewFromApi));
      setMonthlySummaries((unwrap(msums) || []).map(monthlySummaryFromApi));
      setWarranties((unwrap(warrs) || []).map(warrantyFromApi));
      setBuybackModels((unwrap(bbModels) || []).map(buybackModelFromApi));
      setBuybackRules((unwrap(bbRules) || []).map(buybackRuleFromApi));
      setBuybackOffers((unwrap(bbOffers) || []).map(buybackOfferFromApi));
      setEmployees((unwrap(emps) || []).map(employeeFromApi));
      setPayrollSchedule((unwrap(paySched) || []).map(payrollScheduleFromApi));
      setPayrollPayments((unwrap(payPays) || []).map(payrollPaymentFromApi));
      setCompanyTaxObligations((unwrap(coTax) || []).map(companyTaxObligationFromApi));
      setInboxMessages((unwrap(wappMsgs) || []).map(chatMessageFromApi));
      setVaultCredentials((unwrap(vaultCreds) || []).map(vaultCredentialFromApi));
      setLeaveTypes((unwrap(lTypes) || []).map(leaveTypeFromApi));
      setLeaveBalances((unwrap(lBalances) || []).map(leaveBalanceFromApi));
      setLeaveRequests((unwrap(lRequests) || []).map(leaveRequestFromApi));
      setRepairPrices((unwrap(rPrices) || []).map(repairPriceFromApi));
      setRepairLeads((unwrap(rLeads) || []).map(repairLeadFromApi));
      setCashSettlements((unwrap(cSettlements) || []).map(cashSettlementFromApi));
      setNotes((unwrap(bNotes) || []).map(noteFromApi));
      setWaitingItems((unwrap(wItems) || []).map(waitingFromApi));
      setCustomerRequests((unwrap(custReqs) || []).map((r) => ({ ...customerRequestFromApi(r), customerName: r.customer_profiles?.full_name || "?", customerPhone: r.customer_profiles?.phone || "" })));
      setWebOrders((unwrap(webOrds) || []).map(webOrderFromApi));
      const settingsRow = unwrap(appSettings);
      if (settingsRow) setSettings(settingsFromApi(settingsRow));
      const historyRows = unwrap(hist) || [];
      setStockHistory(historyRows.map((r) => ({ date: r.date, value: Number(r.value) || 0 })));
      maybeSnapshotStockValue(prodRows, historyRows);
      setError("");
      lastLoadAtRef.current = Date.now();
    } catch (e) {
      if (!silent) setError("Betöltési hiba: " + e.message);
    } finally {
      loadInFlightRef.current = false;
      if (!silent) setLoadingData(false);
    }
  }
  async function maybeSnapshotStockValue(prodRows, historyRows) {
    const todayStr = today();
    const last = historyRows[historyRows.length - 1];
    if (last) {
      const daysSince = Math.floor((new Date(todayStr) - new Date(last.date)) / 86400000);
      if (daysSince < 3) return;
    }
    const inStock = prodRows.filter((r) => r.status === "in_stock");
    const value = inStock.reduce((s, r) => s + (Number(r.sale_price) || 0), 0);
    const costValue = inStock.reduce((s, r) => s + (Number(r.cost_price) || 0), 0);
    const r = unwrap(await supabase.from("stock_value_history").upsert(
      { date: todayStr, value, cost_value: costValue },
      { onConflict: "date", ignoreDuplicates: true }
    ).select());
    if (r && r[0]) setStockHistory((h) => [...h.filter((x) => x.date !== todayStr), { date: todayStr, value }]);
  }

  return {
    loadAll,
  };
}
