import { useState, useEffect, useMemo } from "react";
import { useAuth } from "./lib/AuthContext";
import { supabase, unwrap } from "./lib/supabaseClient";
import { pFromApi, pToApi, txFromApi, txToApi, tFromApi, tToApi, partFromApi, partToApi, spFromApi, profileFromApi, customerFromApi, customerToApi, monthlySummaryFromApi, warrantyFromApi, warrantyToApi, buybackModelFromApi, buybackModelToApi, buybackRuleFromApi, buybackRuleToApi, leaveTypeFromApi, leaveBalanceFromApi, leaveRequestFromApi, repairPriceFromApi, repairLeadFromApi } from "./lib/mappers";
import { money, today, STATUSES, PART_CATEGORIES, warrantyExpiry, isWarrantyActive, stripAccents, SITE_URL, statusLabel, BUYBACK_CONDITION_QUESTIONS, countWorkdays, LEAVE_STATUS_CLS } from "./lib/utils";
import { REPAIR_FAMILIES, PRICED_PROBLEMS, PROBLEM_LABELS } from "./lib/repairCatalog";
import Login from "./Login";
import StockModal from "./components/StockModal";
import SellModal from "./components/SellModal";
import PartModal from "./components/PartModal";
import TicketCard from "./components/TicketCard";
import DetailPanel from "./components/DetailPanel";
import ProductDetailPanel from "./components/ProductDetailPanel";
import PartDetailPanel from "./components/PartDetailPanel";
import StockValueChart from "./components/StockValueChart";
import MonthlyTrendChart from "./components/MonthlyTrendChart";
import TicketFormModal from "./components/TicketFormModal";
import QuickSaleButtons from "./components/QuickSaleButtons";
import TransactionQuickAdd from "./components/TransactionQuickAdd";
import TransactionsPeriodList from "./components/TransactionsPeriodList";
import TransactionModal from "./components/TransactionModal";
import CustomerDetailPanel from "./components/CustomerDetailPanel";
import CustomerModal from "./components/CustomerModal";
import PrintSlip from "./components/PrintSlip";
import SaleReceiptPanel from "./components/SaleReceiptPanel";
import PrintReceiptSlip from "./components/PrintReceiptSlip";
import WarrantyDetailPanel from "./components/WarrantyDetailPanel";
import WarrantyModal from "./components/WarrantyModal";
import PrintWarrantySlip from "./components/PrintWarrantySlip";
import BuybackModelModal from "./components/BuybackModelModal";
import BuybackRuleModal from "./components/BuybackRuleModal";
import LeaveRequestModal from "./components/LeaveRequestModal";
import LeaveBalanceModal from "./components/LeaveBalanceModal";
import RepairPriceModal from "./components/RepairPriceModal";
import {
  SearchIcon, EditIcon, LogoIcon, DashboardIcon, ServiceIcon, PhoneCaseIcon,
  PartsIcon, FinanceIcon, CustomersIcon, WarrantyIcon, UsersNavIcon, TrashNavIcon, LogoutIcon, CloseIcon, BuybackIcon, LeaveIcon, RepairPriceIcon,
} from "./components/icons";
import ConfirmDelete from "./components/ConfirmDelete";
import CallLink from "./components/CallLink";
import TeamChatPanel from "./components/TeamChatPanel";
import InviteEmployeeModal from "./components/InviteEmployeeModal";
import ChangePasswordModal from "./components/ChangePasswordModal";
import { useInternalChat } from "./lib/useInternalChat";

// TODO: ideiglenesen kikapcsolva munkalap-felvételnél a saját-szerviz feature tesztelése alatt — a felhasználó kérésére.
const SMS_ON_TICKET_CREATE = false;

export default function App() {
  const { session, loading } = useAuth();
  if (loading) return <div className="login-shell"><div style={{ color: "#6B7280", fontSize: 13 }}>Betöltés...</div></div>;
  if (!session) return <Login />;
  return <AppShell />;
}

function AppShell() {
  const { user, profile, signOut } = useAuth();
  const isAdmin = profile?.role === "admin";
  const myLocationId = profile?.locationId || null;

  const [tab, setTab] = useState("dashboard");
  const [locFilter, setLocFilter] = useState("all");
  const [locations, setLocations] = useState([]);
  const [stock, setStock] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [parts, setParts] = useState([]);
  const [users, setUsers] = useState([]);
  const [customersTable, setCustomersTable] = useState([]);
  const [monthlySummaries, setMonthlySummaries] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const { messages: chatMessages, unreadCount: chatUnread, send: sendChatMessage, markRead: markChatRead } = useInternalChat(profile);
  const [search, setSearch] = useState("");
  const [svcSearch, setSvcSearch] = useState("");
  const [svcKindFilter, setSvcKindFilter] = useState("all"); // all | customer | own
  const [partSearch, setPartSearch] = useState("");
  const [custSearch, setCustSearch] = useState("");
  const [period, setPeriod] = useState("day");

  const [stockModal, setStockModal] = useState(null); // null | "add" | product obj (edit)
  const [sellModal, setSellModal] = useState(null);
  const [partModal, setPartModal] = useState(null); // null | "add" | part obj (edit)
  const [txModal, setTxModal] = useState(null); // null | tx obj (edit)
  const [ticketModal, setTicketModal] = useState(null); // null | "add" | ticket obj (edit)
  const [detailId, setDetailId] = useState(null);
  const [productDetailId, setProductDetailId] = useState(null);
  const [partDetailId, setPartDetailId] = useState(null);
  const [showHandedOver, setShowHandedOver] = useState(false);
  const [customerKey, setCustomerKey] = useState(null);
  const [customerModal, setCustomerModal] = useState(null);
  const [printTicket, setPrintTicket] = useState(null);
  const [receiptTxId, setReceiptTxId] = useState(null);
  const [printReceipt, setPrintReceipt] = useState(null);
  const [warranties, setWarranties] = useState([]);
  const [warrantyModal, setWarrantyModal] = useState(null); // null | "add" | manual warranty object (edit)
  const [warrantyDetailKey, setWarrantyDetailKey] = useState(null);
  const [warrantyFilter, setWarrantyFilter] = useState("all"); // all | sale | service
  const [printWarranty, setPrintWarranty] = useState(null);
  const [stockHistory, setStockHistory] = useState([]);
  const [trash, setTrash] = useState(null); // null = not loaded | { products, parts, transactions, tickets }
  const [trashLoading, setTrashLoading] = useState(false);
  const [buybackModels, setBuybackModels] = useState([]);
  const [buybackRules, setBuybackRules] = useState([]);
  const [buybackModelModal, setBuybackModelModal] = useState(null); // null | "add" | model obj (edit)
  const [buybackRuleModal, setBuybackRuleModal] = useState(null); // null | "add" | rule obj (edit)
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveRequestModal, setLeaveRequestModal] = useState(false);
  const [leaveBalanceModal, setLeaveBalanceModal] = useState(null); // null | user obj
  const [repairPrices, setRepairPrices] = useState([]);
  const [repairLeads, setRepairLeads] = useState([]);
  const [repairPriceModal, setRepairPriceModal] = useState(null); // null | { familyKey, problemTag }
  const [repairLeadFilter, setRepairLeadFilter] = useState("Új");
  const [repairLeadConvert, setRepairLeadConvert] = useState(null); // lead obj being converted to a ticket

  function printTicketSlip(ticket) {
    setPrintTicket(ticket);
    requestAnimationFrame(() => {
      window.print();
    });
  }
  function printReceiptSlip(tx) {
    setPrintReceipt(tx);
    requestAnimationFrame(() => {
      window.print();
    });
  }
  function printWarrantySlip(w) {
    if (w.source === "linked") {
      if (w.kind === "sale") { printReceiptSlip(transactions.find((t) => t.id === w.refId)); return; }
      printTicketSlip(tickets.find((t) => t.id === w.refId));
      return;
    }
    setPrintWarranty(w);
    requestAnimationFrame(() => window.print());
  }

  async function loadAll() {
    setLoadingData(true);
    try {
      const [locs, prods, txs, tcks, prs, sps, usrs, hist, custs, msums, warrs, bbModels, bbRules, lTypes, lBalances, lRequests, rPrices, rLeads] = await Promise.all([
        supabase.from("locations").select("*").order("name", { ascending: true }),
        supabase.from("products").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("transactions").select("*").is("deleted_at", null).order("date", { ascending: false }),
        supabase.from("service_tickets").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("parts").select("*").is("deleted_at", null).order("name", { ascending: true }),
        supabase.from("service_parts").select("*"),
        supabase.from("profiles").select("*").order("full_name", { ascending: true }),
        supabase.from("stock_value_history").select("*").order("date", { ascending: true }),
        supabase.from("customers").select("*").is("deleted_at", null),
        supabase.from("monthly_summaries").select("*").order("year").order("month"),
        supabase.from("warranties").select("*").is("deleted_at", null),
        supabase.from("buyback_models").select("*").is("deleted_at", null).order("brand", { ascending: true }),
        supabase.from("buyback_deduction_rules").select("*").order("question_key", { ascending: true }),
        supabase.from("leave_types").select("*"),
        supabase.from("leave_balances").select("*"),
        supabase.from("leave_requests").select("*").order("start_date", { ascending: true }),
        supabase.from("repair_prices").select("*"),
        supabase.from("repair_leads").select("*").order("created_at", { ascending: false }),
      ]);
      setLocations(unwrap(locs) || []);
      const prodRows = unwrap(prods) || [];
      setStock(prodRows.map(pFromApi));
      setTransactions((unwrap(txs) || []).map(txFromApi));
      const spByTicket = {};
      (unwrap(sps) || []).map(spFromApi).forEach((sp) => {
        (spByTicket[sp.ticketId] ||= []).push(sp);
      });
      setTickets((unwrap(tcks) || []).map((r) => ({ ...tFromApi(r), usedParts: spByTicket[r.id] || [] })));
      setParts((unwrap(prs) || []).map(partFromApi));
      setUsers((unwrap(usrs) || []).map(profileFromApi));
      setCustomersTable((unwrap(custs) || []).map(customerFromApi));
      setMonthlySummaries((unwrap(msums) || []).map(monthlySummaryFromApi));
      setWarranties((unwrap(warrs) || []).map(warrantyFromApi));
      setBuybackModels((unwrap(bbModels) || []).map(buybackModelFromApi));
      setBuybackRules((unwrap(bbRules) || []).map(buybackRuleFromApi));
      setLeaveTypes((unwrap(lTypes) || []).map(leaveTypeFromApi));
      setLeaveBalances((unwrap(lBalances) || []).map(leaveBalanceFromApi));
      setLeaveRequests((unwrap(lRequests) || []).map(leaveRequestFromApi));
      setRepairPrices((unwrap(rPrices) || []).map(repairPriceFromApi));
      setRepairLeads((unwrap(rLeads) || []).map(repairLeadFromApi));
      const historyRows = unwrap(hist) || [];
      setStockHistory(historyRows.map((r) => ({ date: r.date, value: Number(r.value) || 0 })));
      maybeSnapshotStockValue(prodRows, historyRows);
      setError("");
    } catch (e) {
      setError("Betöltési hiba: " + e.message);
    } finally {
      setLoadingData(false);
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

  useEffect(() => { loadAll(); }, []);

  async function loadTrash() {
    setTrashLoading(true);
    try {
      const [prods, prs, txs, tcks] = await Promise.all([
        supabase.from("products").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
        supabase.from("parts").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
        supabase.from("transactions").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
        supabase.from("service_tickets").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
      ]);
      setTrash({
        products: (unwrap(prods) || []).map(pFromApi),
        parts: (unwrap(prs) || []).map(partFromApi),
        transactions: (unwrap(txs) || []).map(txFromApi),
        tickets: (unwrap(tcks) || []).map(tFromApi),
      });
    } catch (e) {
      setError("Kuka betöltési hiba: " + e.message);
    } finally {
      setTrashLoading(false);
    }
  }
  useEffect(() => { if (tab === "trash") loadTrash(); }, [tab]);

  async function restoreProduct(id) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("products").update({ deleted_at: null }).eq("id", id).select());
      setStock([pFromApi(r[0]), ...stock]);
      setTrash((t) => ({ ...t, products: t.products.filter((p) => p.id !== id) }));
    });
  }
  async function restorePart(id) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("parts").update({ deleted_at: null }).eq("id", id).select());
      setParts([partFromApi(r[0]), ...parts]);
      setTrash((t) => ({ ...t, parts: t.parts.filter((p) => p.id !== id) }));
    });
  }
  async function restoreTransaction(id) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("transactions").update({ deleted_at: null }).eq("id", id).select());
      setTransactions([txFromApi(r[0]), ...transactions]);
      setTrash((t) => ({ ...t, transactions: t.transactions.filter((x) => x.id !== id) }));
    });
  }
  async function restoreTicket(id) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("service_tickets").update({ deleted_at: null }).eq("id", id).select());
      setTickets([{ ...tFromApi(r[0]), usedParts: [] }, ...tickets]);
      setTrash((t) => ({ ...t, tickets: t.tickets.filter((x) => x.id !== id) }));
    });
  }

  async function hardDeleteProduct(id) {
    await withBusy(async () => {
      const { data: photos } = await supabase.from("product_photos").select("storage_path").eq("product_id", id);
      if (photos && photos.length > 0) {
        await supabase.storage.from("product-photos").remove(photos.map((p) => p.storage_path)).catch(() => {});
      }
      unwrap(await supabase.from("products").delete().eq("id", id));
      setTrash((t) => ({ ...t, products: t.products.filter((p) => p.id !== id) }));
    });
  }
  async function hardDeletePart(id) {
    await withBusy(async () => {
      const { error } = await supabase.from("parts").delete().eq("id", id);
      if (error) {
        if (error.code === "23503") throw new Error("Ez az alkatrész nem törölhető véglegesen, mert szerviz munkalapokhoz van kötve.");
        throw new Error(error.message);
      }
      setTrash((t) => ({ ...t, parts: t.parts.filter((p) => p.id !== id) }));
    });
  }
  async function hardDeleteTransaction(id) {
    await withBusy(async () => {
      unwrap(await supabase.from("transactions").delete().eq("id", id));
      setTrash((t) => ({ ...t, transactions: t.transactions.filter((x) => x.id !== id) }));
    });
  }
  async function hardDeleteTicket(id) {
    await withBusy(async () => {
      unwrap(await supabase.from("service_tickets").delete().eq("id", id));
      setTrash((t) => ({ ...t, tickets: t.tickets.filter((x) => x.id !== id) }));
    });
  }

  async function withBusy(fn) {
    setBusy(true);
    try { await fn(); setError(""); }
    catch (e) { setError(e.message || "Hiba történt."); }
    finally { setBusy(false); }
  }

  const locName = (id) => locations.find((l) => l.id === id)?.name || "—";
  const stockLocations = isAdmin ? locations : locations.filter((l) => l.id === myLocationId);
  const allowedLocations = stockLocations.filter((l) => l.name !== "Tartalék");
  const effectiveLocFilter = isAdmin ? locFilter : (myLocationId || "none");
  const defaultLocId = isAdmin ? (locFilter !== "all" ? locFilter : allowedLocations[0]?.id) : myLocationId;
  const reserveLocId = locations.find((l) => l.name === "Tartalék")?.id;
  const defaultStockLocId = isAdmin ? (locFilter !== "all" ? locFilter : (reserveLocId || allowedLocations[0]?.id)) : myLocationId;

  // STOCK
  async function addProduct(data, locId) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("products").insert(pToApi(data, locId)).select());
      setStock([pFromApi(r[0]), ...stock]);
      setStockModal(null);
    });
  }
  async function editProduct(id, data, locId) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("products").update(pToApi(data, locId)).eq("id", id).select());
      setStock(stock.map((i) => (i.id === id ? pFromApi(r[0]) : i)));
      setStockModal(null);
    });
  }
  async function deleteProduct(id) {
    await withBusy(async () => {
      unwrap(await supabase.from("products").update({ deleted_at: new Date().toISOString() }).eq("id", id));
      setStock(stock.filter((i) => i.id !== id));
    });
  }
  async function sellProduct(txData, locId) {
    await withBusy(async () => {
      let customerId = txData.customerId || null;
      if (!customerId && txData.customerPhone) {
        const { data: cid } = await supabase.rpc("upsert_customer", { p_name: txData.customerName, p_phone: txData.customerPhone });
        customerId = cid;
      }
      if (txData.marketingConsent && customerId) {
        await supabase.from("customers").update({ marketing_consent: true, marketing_consent_at: new Date().toISOString() }).eq("id", customerId);
      }
      unwrap(await supabase.from("products").update({ status: "sold" }).eq("id", txData.productId));
      const r = unwrap(await supabase.from("transactions").insert({ ...txToApi(txData, locId), customer_id: customerId }).select());
      setStock(stock.map((i) => (i.id === txData.productId ? { ...i, status: "sold" } : i)));
      setTransactions([txFromApi(r[0]), ...transactions]);
      setSellModal(null);
    });
  }

  // PARTS
  async function addPart(data) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("parts").insert(partToApi(data)).select());
      setParts([partFromApi(r[0]), ...parts]);
      setPartModal(null);
    });
  }
  async function editPart(id, data) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("parts").update(partToApi(data)).eq("id", id).select());
      setParts(parts.map((p) => (p.id === id ? partFromApi(r[0]) : p)));
      setPartModal(null);
    });
  }
  async function deletePart(id) {
    await withBusy(async () => {
      unwrap(await supabase.from("parts").update({ deleted_at: new Date().toISOString() }).eq("id", id));
      setParts(parts.filter((p) => p.id !== id));
    });
  }

  // BUYBACK — árazás karbantartása (admin only)
  async function addBuybackModel(data) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("buyback_models").insert(buybackModelToApi(data)).select());
      setBuybackModels([...buybackModels, buybackModelFromApi(r[0])]);
      setBuybackModelModal(null);
    });
  }
  async function editBuybackModel(id, data) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("buyback_models").update(buybackModelToApi(data)).eq("id", id).select());
      setBuybackModels(buybackModels.map((m) => (m.id === id ? buybackModelFromApi(r[0]) : m)));
      setBuybackModelModal(null);
    });
  }
  async function deleteBuybackModel(id) {
    await withBusy(async () => {
      unwrap(await supabase.from("buyback_models").update({ deleted_at: new Date().toISOString() }).eq("id", id));
      setBuybackModels(buybackModels.filter((m) => m.id !== id));
    });
  }
  async function addBuybackRule(data) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("buyback_deduction_rules").insert(buybackRuleToApi(data)).select());
      setBuybackRules([...buybackRules, buybackRuleFromApi(r[0])]);
      setBuybackRuleModal(null);
    });
  }
  async function editBuybackRule(id, data) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("buyback_deduction_rules").update(buybackRuleToApi(data)).eq("id", id).select());
      setBuybackRules(buybackRules.map((r2) => (r2.id === id ? buybackRuleFromApi(r[0]) : r2)));
      setBuybackRuleModal(null);
    });
  }
  async function deleteBuybackRule(id) {
    await withBusy(async () => {
      unwrap(await supabase.from("buyback_deduction_rules").delete().eq("id", id));
      setBuybackRules(buybackRules.filter((r) => r.id !== id));
    });
  }

  // SZABADSÁG
  async function addLeaveRequest({ startDate, endDate, leaveTypeId, note }) {
    await withBusy(async () => {
      const days = countWorkdays(startDate, endDate);
      const r = unwrap(await supabase.from("leave_requests").insert({
        user_id: user.id, leave_type_id: leaveTypeId || null, start_date: startDate, end_date: endDate, days, note: note || null,
      }).select());
      setLeaveRequests([...leaveRequests, leaveRequestFromApi(r[0])].sort((a, b) => a.startDate.localeCompare(b.startDate)));
      setLeaveRequestModal(false);
      sendChatMessage(`📅 ${profile?.fullName || "Valaki"} szabadságot kért: ${startDate} – ${endDate} (${days} munkanap)`);
    });
  }
  async function decideLeaveRequest(id, status) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("leave_requests").update({ status, decided_by: user.id, decided_at: new Date().toISOString() }).eq("id", id).select());
      const updated = leaveRequestFromApi(r[0]);
      setLeaveRequests(leaveRequests.map((lr) => (lr.id === id ? updated : lr)));
      if (status === "Jóváhagyva") {
        const reqUser = users.find((u) => u.id === updated.userId);
        sendChatMessage(`✅ ${reqUser?.fullName || "Kolléga"} szabadsága jóváhagyva: ${updated.startDate} – ${updated.endDate}`);
      }
    });
  }
  async function revokeLeaveRequest(id) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("leave_requests").update({ status: "Visszavonva" }).eq("id", id).select());
      setLeaveRequests(leaveRequests.map((lr) => (lr.id === id ? leaveRequestFromApi(r[0]) : lr)));
    });
  }
  async function saveLeaveBalance(userId, year, entitledDays) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("leave_balances").upsert(
        { user_id: userId, year, entitled_days: entitledDays }, { onConflict: "user_id,year" }
      ).select());
      const updated = leaveBalanceFromApi(r[0]);
      setLeaveBalances([...leaveBalances.filter((b) => !(b.userId === userId && b.year === year)), updated]);
      setLeaveBalanceModal(null);
    });
  }

  // SZERVIZ ÁRBECSLŐ
  const PART_CATEGORY_BY_PROBLEM = { LCD: "Kijelző", Akku: "Akkumulátor", "Csatlakozó": null, Kamera: null };
  async function saveRepairPrice(familyKey, problemTag, data) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("repair_prices").upsert({
        family_key: familyKey, problem_tag: problemTag,
        price_oem: data.priceOem, price_after: data.priceAfter, warranty: data.warranty, est_minutes: data.estMinutes,
        part_category: PART_CATEGORY_BY_PROBLEM[problemTag] ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "family_key,problem_tag" }).select());
      const updated = repairPriceFromApi(r[0]);
      setRepairPrices((prev) => [...prev.filter((p) => !(p.familyKey === familyKey && p.problemTag === problemTag)), updated]);
      setRepairPriceModal(null);
    });
  }
  async function rejectRepairLead(id) {
    await withBusy(async () => {
      unwrap(await supabase.from("repair_leads").update({ status: "Elvetve" }).eq("id", id).select());
      setRepairLeads(repairLeads.map((l) => (l.id === id ? { ...l, status: "Elvetve" } : l)));
    });
  }
  async function convertRepairLead(id, ticketId) {
    unwrap(await supabase.from("repair_leads").update({ status: "Feldolgozva", converted_ticket_id: ticketId }).eq("id", id).select());
    setRepairLeads(repairLeads.map((l) => (l.id === id ? { ...l, status: "Feldolgozva", convertedTicketId: ticketId } : l)));
  }

  // USERS (admin only)
  async function updateUserProfile(id, patch) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("profiles").update(patch).eq("id", id).select());
      setUsers(users.map((u) => (u.id === id ? profileFromApi(r[0]) : u)));
    });
  }
  async function inviteEmployee({ email, fullName, locationId }) {
    setInviteError("");
    await withBusy(async () => {
      const { data, error: fnError } = await supabase.functions.invoke("invite-employee", {
        body: { email, fullName, locationId },
      });
      if (fnError || data?.error) {
        let msg = data?.error || fnError?.message || "Meghívás sikertelen.";
        if (fnError?.context) {
          const body = await fnError.context.json().catch(() => null);
          if (body?.error) msg = body.error;
        }
        setInviteError(msg);
        return;
      }
      setInviteModal(false);
      setInfo(`Meghívó elküldve — ${email} emailben kap egy linket a jelszó beállításához.`);
      const usrs = unwrap(await supabase.from("profiles").select("*").order("created_at"));
      setUsers(usrs.map(profileFromApi));
    });
  }
  async function callManageEmployee(action, userId) {
    let ok = false;
    await withBusy(async () => {
      const { data, error: fnError } = await supabase.functions.invoke("manage-employee", {
        body: { action, userId },
      });
      if (fnError || data?.error) {
        let msg = data?.error || fnError?.message || "Művelet sikertelen.";
        if (fnError?.context) {
          const body = await fnError.context.json().catch(() => null);
          if (body?.error) msg = body.error;
        }
        throw new Error(msg);
      }
      ok = true;
    });
    return ok;
  }
  async function changeOwnPassword(newPassword) {
    await withBusy(async () => {
      const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
      if (pwError) throw new Error(pwError.message);
      setChangePasswordModal(false);
      setInfo("Jelszó módosítva.");
    });
  }
  async function resetEmployeePassword(userId, email) {
    const ok = await callManageEmployee("reset_password", userId);
    if (ok) setInfo(`Jelszó-visszaállító email elküldve — ${email}.`);
  }
  async function deleteEmployee(userId) {
    const ok = await callManageEmployee("delete", userId);
    if (ok) {
      setUsers(users.filter((u) => u.id !== userId));
      setInfo("Felhasználó eltávolítva.");
    }
  }

  // WARRANTIES
  async function addWarranty(data, locId) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("warranties").insert(warrantyToApi(data, locId)).select());
      setWarranties([...warranties, warrantyFromApi(r[0])]);
      setWarrantyModal(null);
    });
  }
  async function editWarranty(id, data, locId) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("warranties").update(warrantyToApi(data, locId)).eq("id", id).select());
      setWarranties(warranties.map((w) => (w.id === id ? warrantyFromApi(r[0]) : w)));
      setWarrantyModal(null);
    });
  }
  async function deleteWarranty(id) {
    await withBusy(async () => {
      unwrap(await supabase.from("warranties").update({ deleted_at: new Date().toISOString() }).eq("id", id));
      setWarranties(warranties.filter((w) => w.id !== id));
    });
  }
  async function editLinkedWarranty(kind, refId, warranty, fromDate) {
    await withBusy(async () => {
      if (kind === "sale") {
        unwrap(await supabase.from("transactions").update({ warranty, date: fromDate }).eq("id", refId));
        setTransactions(transactions.map((t) => (t.id === refId ? { ...t, warranty, date: fromDate } : t)));
      } else {
        unwrap(await supabase.from("service_tickets").update({ warranty, date_out: fromDate }).eq("id", refId));
        setTickets(tickets.map((t) => (t.id === refId ? { ...t, warranty, dateOut: fromDate } : t)));
      }
    });
  }
  async function clearLinkedWarranty(kind, refId) {
    await withBusy(async () => {
      if (kind === "sale") {
        unwrap(await supabase.from("transactions").update({ warranty: null }).eq("id", refId));
        setTransactions(transactions.map((t) => (t.id === refId ? { ...t, warranty: null } : t)));
      } else {
        unwrap(await supabase.from("service_tickets").update({ warranty: null }).eq("id", refId));
        setTickets(tickets.map((t) => (t.id === refId ? { ...t, warranty: null } : t)));
      }
    });
  }

  // CUSTOMERS
  async function createCustomer(data) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("customers").insert(customerToApi(data)).select());
      setCustomersTable((prev) => [...prev, customerFromApi(r[0])]);
      setCustomerModal(null);
    });
  }
  async function updateCustomer(id, data) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("customers").update(customerToApi(data)).eq("id", id).select());
      setCustomersTable((prev) => prev.map((c) => (c.id === id ? customerFromApi(r[0]) : c)));
      setCustomerModal(null);
    });
  }

  // TRANSACTIONS
  async function addTransaction(data, locId) {
    await withBusy(async () => {
      let customerId = data.customerId || null;
      if (!customerId && data.customerPhone) {
        const { data: cid } = await supabase.rpc("upsert_customer", { p_name: data.customerName, p_phone: data.customerPhone });
        customerId = cid;
      }
      if (data.marketingConsent && customerId) {
        await supabase.from("customers").update({ marketing_consent: true, marketing_consent_at: new Date().toISOString() }).eq("id", customerId);
      }
      const r = unwrap(await supabase.from("transactions").insert({ ...txToApi(data, locId), customer_id: customerId }).select());
      setTransactions([txFromApi(r[0]), ...transactions]);
    });
  }
  async function editTransaction(id, data, locId) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("transactions").update(txToApi(data, locId)).eq("id", id).select());
      setTransactions(transactions.map((t) => (t.id === id ? txFromApi(r[0]) : t)));
      setTxModal(null);
    });
  }
  async function deleteTransaction(id) {
    await withBusy(async () => {
      unwrap(await supabase.from("transactions").update({ deleted_at: new Date().toISOString() }).eq("id", id));
      setTransactions(transactions.filter((t) => t.id !== id));
    });
  }

  // SERVICE
  async function addTicket(data, locId) {
    await withBusy(async () => {
      let customerId = data.customerId || null;
      if (!customerId && data.customerPhone) {
        const { data: cid } = await supabase.rpc("upsert_customer", { p_name: data.customerName, p_phone: data.customerPhone });
        customerId = cid;
      }
      if (data.marketingConsent && customerId) {
        await supabase.from("customers").update({ marketing_consent: true, marketing_consent_at: new Date().toISOString() }).eq("id", customerId);
      }
      const r = unwrap(await supabase.from("service_tickets").insert({ ...tToApi(data, locId), customer_id: customerId }).select());
      const newTicket = tFromApi(r[0]);
      setTickets([newTicket, ...tickets]);
      setTicketModal(null);
      if (repairLeadConvert) {
        await convertRepairLead(repairLeadConvert.id, newTicket.id);
        setRepairLeadConvert(null);
      }

      if (SMS_ON_TICKET_CREATE && newTicket.customerPhone) {
        const device = [newTicket.brand, newTicket.model].filter(Boolean).join(" ");
        const message = stripAccents(`Szia! Atvettuk a keszulekedet (${device}), munkalapszam: #${newTicket.ticketNo}. A javitas allapotat itt kovetheted nyomon: ${SITE_URL}/s/${newTicket.shortCode}`);
        supabase.functions.invoke("send-sms", { body: { phone: newTicket.customerPhone, message } }).catch((err) => {
          console.error("SMS küldés sikertelen:", err);
          setError("Az SMS nem ment ki (a mentés egyébként sikeres volt) — nézd meg a konzolt vagy próbáld újra.");
        });
      }
    });
  }
  async function saveTicketEdit(id, data, locId) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("service_tickets").update(tToApi(data, locId)).eq("id", id).select());
      setTickets(tickets.map((t) => (t.id === id ? tFromApi(r[0]) : t)));
      setTicketModal(null);
    });
  }
  async function setTicketStatus(id, status, subStatus = null) {
    await withBusy(async () => {
      const ticket = tickets.find((t) => t.id === id);
      const patch = { status, sub_status: subStatus };
      if (subStatus === "Átadva") patch.date_out = today();
      unwrap(await supabase.from("service_tickets").update(patch).eq("id", id));
      setTickets(tickets.map((t) => (t.id === id ? { ...t, status, subStatus, dateOut: subStatus === "Átadva" ? today() : t.dateOut } : t)));

      const becameReady = status === "Átadásra" && subStatus === null && !(ticket && ticket.status === "Átadásra" && ticket.subStatus === null);
      if (becameReady && ticket && ticket.customerPhone) {
        const device = [ticket.brand, ticket.model].filter(Boolean).join(" ");
        const message = stripAccents(`Szia! A(z) ${device} javítása elkészült, átveheted nálunk (${locName(ticket.locationId)}). Részletek: ${SITE_URL}/s/${ticket.shortCode}`);
        supabase.functions.invoke("send-sms", { body: { phone: ticket.customerPhone, message } }).catch((err) => {
          console.error("SMS küldés sikertelen:", err);
          setError("Az SMS nem ment ki (a mentés egyébként sikeres volt) — nézd meg a konzolt vagy próbáld újra.");
        });
      }

      if (subStatus === "Átadva" && ticket && ticket.subStatus !== "Átadva" && (Number(ticket.price) || 0) > 0) {
        const r = unwrap(await supabase.from("transactions").insert(txToApi({
          type: "income",
          category: "Szerviz",
          description: `Szerviz: ${ticket.customerName} — ${[ticket.brand, ticket.model].filter(Boolean).join(" ")}`,
          amount: ticket.price,
          costPrice: ticket.matCost,
          customerName: ticket.customerName,
          customerPhone: ticket.customerPhone,
        }, ticket.locationId)).select());
        setTransactions((prev) => [txFromApi(r[0]), ...prev]);
      }

      if (subStatus === "Átadva" && ticket && ticket.subStatus !== "Átadva" && ticket.ticketKind === "Saját készlet - garanciális" && (Number(ticket.matCost) || 0) > 0) {
        const product = stock.find((p) => p.id === ticket.productId);
        const r2 = unwrap(await supabase.from("transactions").insert(txToApi({
          type: "expense",
          category: "Szerviz",
          description: `Garanciális javítás — ${product ? `${product.brand} ${product.model}` : [ticket.brand, ticket.model].filter(Boolean).join(" ")}`,
          amount: ticket.matCost,
          productId: ticket.productId,
        }, ticket.locationId)).select());
        setTransactions((prev) => [txFromApi(r2[0]), ...prev]);
      }
    });
  }
  async function completeQc(id, qcByUserId) {
    const patch = { qc_by: qcByUserId || null, qc_at: new Date().toISOString() };
    await withBusy(async () => {
      unwrap(await supabase.from("service_tickets").update(patch).eq("id", id));
      setTickets(tickets.map((t) => (t.id === id ? { ...t, qcBy: patch.qc_by, qcAt: patch.qc_at } : t)));
    });
    await setTicketStatus(id, "Átadásra", null);
  }
  async function deleteTicket(id) {
    await withBusy(async () => {
      unwrap(await supabase.from("service_tickets").update({ deleted_at: new Date().toISOString() }).eq("id", id));
      setTickets(tickets.filter((t) => t.id !== id));
      setDetailId(null);
    });
  }
  async function addPartToTicket(ticketId, part, qty) {
    await withBusy(async () => {
      const ticket = tickets.find((t) => t.id === ticketId);
      const unitCost = Number(part.costPrice) || 0;
      const r = unwrap(await supabase.from("service_parts").insert({
        service_ticket_id: ticketId, part_id: part.id, part_name: part.name, quantity: qty, cost_price: unitCost,
      }).select());
      const newQty = (Number(part.quantity) || 0) - qty;
      unwrap(await supabase.from("parts").update({ quantity: newQty }).eq("id", part.id));
      const newMatCost = (Number(ticket.matCost) || 0) + unitCost * qty;
      unwrap(await supabase.from("service_tickets").update({ mat_cost: newMatCost }).eq("id", ticketId));

      if (ticket.ticketKind === "Saját készlet - előkészítés" && ticket.productId) {
        const product = stock.find((p) => p.id === ticket.productId);
        if (product) {
          const newCostPrice = (Number(product.costPrice) || 0) + unitCost * qty;
          unwrap(await supabase.from("products").update({ cost_price: newCostPrice }).eq("id", ticket.productId));
          setStock(stock.map((p) => (p.id === ticket.productId ? { ...p, costPrice: newCostPrice } : p)));
        }
      }

      setParts(parts.map((p) => (p.id === part.id ? { ...p, quantity: newQty } : p)));
      setTickets(tickets.map((t) => (t.id === ticketId ? { ...t, matCost: newMatCost, usedParts: [...(t.usedParts || []), spFromApi(r[0])] } : t)));
    });
  }
  async function removePartFromTicket(ticketId, usedPart) {
    await withBusy(async () => {
      const ticket = tickets.find((t) => t.id === ticketId);
      const part = parts.find((p) => p.id === usedPart.partId);
      unwrap(await supabase.from("service_parts").delete().eq("id", usedPart.id));
      if (part) {
        const restoredQty = (Number(part.quantity) || 0) + usedPart.quantity;
        unwrap(await supabase.from("parts").update({ quantity: restoredQty }).eq("id", part.id));
        setParts(parts.map((p) => (p.id === part.id ? { ...p, quantity: restoredQty } : p)));
      }
      const newMatCost = Math.max(0, (Number(ticket.matCost) || 0) - (Number(usedPart.costPrice) || 0) * usedPart.quantity);
      unwrap(await supabase.from("service_tickets").update({ mat_cost: newMatCost }).eq("id", ticketId));
      setTickets(tickets.map((t) => (t.id === ticketId ? { ...t, matCost: newMatCost, usedParts: (t.usedParts || []).filter((sp) => sp.id !== usedPart.id) } : t)));
    });
  }

  // FILTERED DATA
  const filteredStock = useMemo(() => {
    let s = stock.filter((i) => i.status === "in_stock");
    if (effectiveLocFilter !== "all") s = s.filter((i) => i.locationId === effectiveLocFilter || i.locationId === reserveLocId);
    const q = search.trim().toLowerCase();
    if (q) s = s.filter((i) => [i.brand, i.model, i.imei, i.color].join(" ").toLowerCase().includes(q));
    return [...s].sort((a, b) => (a.brand || "").localeCompare(b.brand || "", "hu") || (a.model || "").localeCompare(b.model || "", "hu"));
  }, [stock, effectiveLocFilter, search, reserveLocId]);

  const filteredTransactions = useMemo(() => {
    if (effectiveLocFilter === "all") return transactions;
    return transactions.filter((t) => t.locationId === effectiveLocFilter);
  }, [transactions, effectiveLocFilter]);

  const filteredTickets = useMemo(() => {
    let t = effectiveLocFilter === "all" ? tickets : tickets.filter((x) => x.locationId === effectiveLocFilter);
    const q = svcSearch.trim().toLowerCase();
    if (q) t = t.filter((x) => [x.customerName, x.brand, x.model].join(" ").toLowerCase().includes(q));
    if (svcKindFilter === "customer") t = t.filter((x) => x.ticketKind === "Ügyfél");
    if (svcKindFilter === "own") t = t.filter((x) => x.ticketKind !== "Ügyfél");
    return t;
  }, [tickets, effectiveLocFilter, svcSearch, svcKindFilter]);

  const stockStats = useMemo(() => ({
    count: filteredStock.length,
    value: filteredStock.reduce((s, i) => s + (Number(i.salePrice) || 0), 0),
    cost: filteredStock.reduce((s, i) => s + (Number(i.costPrice) || 0), 0),
    profit: filteredStock.reduce((s, i) => s + ((Number(i.salePrice) || 0) - (Number(i.costPrice) || 0)), 0),
  }), [filteredStock]);

  const txStats = useMemo(() => {
    const income = filteredTransactions.filter((t) => t.type === "income").reduce((a, t) => a + (Number(t.amount) || 0), 0);
    const expense = filteredTransactions.filter((t) => t.type === "expense").reduce((a, t) => a + (Number(t.amount) || 0), 0);
    return { count: filteredTransactions.length, income, expense, net: income - expense };
  }, [filteredTransactions]);

  // a folyó, még nyitott hónap élő adata a monthly_summaries mellé — a trend ne szakadjon meg a jelennél
  const currentMonthLive = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth() + 1;
    const inMonth = (t) => {
      const d = new Date(t.date + "T00:00:00");
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    };
    const rows = filteredTransactions.filter(inMonth);
    const revenue = rows.filter((t) => t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const expenses = rows.filter((t) => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const margin = rows.filter((t) => t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0) - (Number(t.costPrice) || 0), 0);
    return { year: y, month: m, revenue, expenses, margin, profit: revenue - expenses, isLive: true };
  }, [filteredTransactions]);

  // "ez a hónap eddig vs. múlt hónap ilyenkor (ugyanannyi nyitvatartási napra vetítve)"
  const monthlyTrendSummary = useMemo(() => {
    const dayOfMonth = new Date().getDate();
    let prevY = currentMonthLive.year, prevM = currentMonthLive.month - 1;
    if (prevM === 0) { prevM = 12; prevY -= 1; }
    const relevant = monthlySummaries.filter((s) => s.year === prevY && s.month === prevM && (effectiveLocFilter === "all" || s.locationId === effectiveLocFilter));
    if (relevant.length === 0) return null;
    const prevRevenue = relevant.reduce((s, r) => s + r.revenue, 0);
    const prevDaysOpen = relevant.reduce((s, r) => s + (r.daysOpen || 0), 0) / relevant.length;
    if (!prevDaysOpen) return null;
    const projected = (prevRevenue / prevDaysOpen) * dayOfMonth;
    const pct = projected > 0 ? Math.round(((currentMonthLive.revenue - projected) / projected) * 100) : null;
    return { dayOfMonth, projected, pct };
  }, [monthlySummaries, currentMonthLive, effectiveLocFilter]);

  const partsStats = useMemo(() => ({
    value: parts.reduce((a, p) => a + (Number(p.costPrice) || 0) * (Number(p.quantity) || 0), 0),
  }), [parts]);

  const filteredParts = useMemo(() => {
    const q = partSearch.trim().toLowerCase();
    if (!q) return parts;
    return parts.filter((p) => [p.name, p.brand, p.modelFit, p.category, p.source].join(" ").toLowerCase().includes(q));
  }, [parts, partSearch]);

  const activeTickets = useMemo(() => filteredTickets.filter((t) => t.subStatus !== "Átadva"), [filteredTickets]);
  const handedOverTickets = useMemo(() => filteredTickets.filter((t) => t.subStatus === "Átadva"), [filteredTickets]);

  const svcStats = useMemo(() => {
    const customerTickets = filteredTickets.filter((t) => t.ticketKind === "Ügyfél");
    return {
      total: filteredTickets.length,
      active: customerTickets.filter((t) => t.status !== "Átadásra").length,
      kesz: customerTickets.filter((t) => t.status === "Átadásra" && !t.subStatus).length,
      sikertelen: customerTickets.filter((t) => t.subStatus === "Sikertelen").length,
      kiadva: handedOverTickets.length,
      ownStock: filteredTickets.filter((t) => t.ticketKind !== "Ügyfél" && t.subStatus !== "Átadva").length,
    };
  }, [filteredTickets, handedOverTickets]);

  const customers = useMemo(() => {
    return customersTable.map((c) => {
      const purchases = filteredTransactions.filter((t) => t.type === "income" && t.customerId === c.id);
      const tickets = filteredTickets.filter((t) => t.customerId === c.id);
      const visits = purchases.length + tickets.length;
      return {
        ...c,
        key: c.id,
        purchases,
        tickets,
        isNew: visits <= 1,
        purchaseTotal: purchases.reduce((s, p) => s + (Number(p.amount) || 0), 0),
        ticketTotal: tickets.reduce((s, t) => s + (Number(t.price) || 0), 0),
        lastActivity: [...purchases.map((p) => p.date), ...tickets.map((t) => t.dateIn)].filter(Boolean).sort().reverse()[0] || "",
      };
    }).filter((c) => {
      const q = custSearch.trim().toLowerCase();
      return !q || [c.name, c.phone].join(" ").toLowerCase().includes(q);
    }).sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
  }, [customersTable, filteredTransactions, filteredTickets, custSearch]);

  const customerStats = useMemo(() => ({
    count: customers.length,
    revenue: customers.reduce((s, c) => s + c.purchaseTotal + c.ticketTotal, 0),
    avg: customers.length ? customers.reduce((s, c) => s + c.purchaseTotal + c.ticketTotal, 0) / customers.length : 0,
  }), [customers]);

  const activeWarranties = useMemo(() => {
    const saleItems = transactions
      .filter((t) => t.category === "Készlet" && t.warranty && isWarrantyActive(t.date, t.warranty))
      .map((t) => ({
        key: `sale-${t.id}`, kind: "sale", source: "linked", refId: t.id,
        customerName: t.customerName, customerPhone: t.customerPhone,
        label: t.description, warranty: t.warranty, from: t.date, expiry: warrantyExpiry(t.date, t.warranty), locationId: t.locationId,
      }));
    const serviceItems = tickets
      .filter((t) => t.subStatus === "Átadva" && t.warranty && isWarrantyActive(t.dateOut, t.warranty))
      .map((t) => ({
        key: `svc-${t.id}`, kind: "service", source: "linked", refId: t.id,
        customerName: t.customerName, customerPhone: t.customerPhone,
        label: [t.brand, t.model].filter(Boolean).join(" "), warranty: t.warranty, from: t.dateOut, expiry: warrantyExpiry(t.dateOut, t.warranty), locationId: t.locationId,
      }));
    const manualItems = warranties
      .filter((w) => isWarrantyActive(w.fromDate, w.warranty))
      .map((w) => ({
        key: `manual-${w.id}`, kind: w.kind, source: "manual", refId: w.id,
        customerName: w.customerName, customerPhone: w.customerPhone,
        label: w.label, warranty: w.warranty, from: w.fromDate, expiry: warrantyExpiry(w.fromDate, w.warranty), locationId: w.locationId,
        note: w.note,
      }));
    return [...saleItems, ...serviceItems, ...manualItems].sort((a, b) => (a.expiry || "").localeCompare(b.expiry || ""));
  }, [transactions, tickets, warranties]);
  const filteredWarranties = warrantyFilter === "all" ? activeWarranties : activeWarranties.filter((w) => w.kind === warrantyFilter);

  const leaveYear = new Date().getFullYear();
  const leaveBalanceByUser = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      const bal = leaveBalances.find((b) => b.userId === u.id && b.year === leaveYear);
      const entitled = bal ? bal.entitledDays : 20;
      const used = leaveRequests
        .filter((r) => r.userId === u.id && r.status === "Jóváhagyva" && r.startDate.slice(0, 4) === String(leaveYear))
        .reduce((s, r) => s + r.days, 0);
      map[u.id] = { entitled, used };
    });
    return map;
  }, [users, leaveBalances, leaveRequests, leaveYear]);
  const upcomingLeave = useMemo(() => {
    const todayStr = today();
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 92);
    const horizonStr = horizon.toISOString().slice(0, 10);
    return leaveRequests
      .filter((r) => (r.status === "Kérve" || r.status === "Jóváhagyva") && r.endDate >= todayStr && r.startDate <= horizonStr)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [leaveRequests]);
  const coverageWarnings = useMemo(() => {
    const todayStr = today();
    const warnings = [];
    const staffByLocation = {};
    users.forEach((u) => { if (u.locationId) (staffByLocation[u.locationId] ||= []).push(u.id); });
    const approved = leaveRequests.filter((r) => r.status === "Jóváhagyva");
    for (let i = 0; i < 92; i++) {
      const d = new Date(todayStr + "T00:00:00");
      d.setDate(d.getDate() + i);
      const dStr = d.toISOString().slice(0, 10);
      for (const loc of locations) {
        const staff = staffByLocation[loc.id] || [];
        if (staff.length === 0) continue;
        const allAway = staff.every((uid) => approved.some((r) => r.userId === uid && r.startDate <= dStr && dStr <= r.endDate));
        if (allAway) warnings.push({ date: dStr, locationId: loc.id });
      }
    }
    return warnings;
  }, [users, locations, leaveRequests]);

  const detailCustomer = customerKey ? customers.find((c) => c.key === customerKey) : null;
  const receiptTx = receiptTxId ? transactions.find((t) => t.id === receiptTxId) : null;

  const detailTicket = detailId ? tickets.find((t) => t.id === detailId) : null;
  const detailProduct = productDetailId ? stock.find((i) => i.id === productDetailId) : null;
  const detailPart = partDetailId ? parts.find((p) => p.id === partDetailId) : null;
  const editingTicket = ticketModal && ticketModal !== "add" ? ticketModal : null;

  const noLocationAssigned = !isAdmin && !myLocationId;

  return (
    <div className="shell">
      <div className="sidebar">
        <div className="sidebar-inner">
          <div className="brand">
            <div className="brand-mark"><LogoIcon className="nav-ic" /></div>
            <div className="brand-word">TELEF<span>O</span>NOS</div>
          </div>
          <a className="shop-preview-link" href="/" target="_blank" rel="noopener noreferrer">Webshop megtekintése ↗</a>

          <div className="nav-lbl">Napi munka</div>
          <button className={`navbtn ${tab === "dashboard" ? "active" : ""}`} onClick={() => setTab("dashboard")}><DashboardIcon className="nav-ic" />Áttekintés</button>
          <div className="navrow">
            <button className={`navbtn ${tab === "service" ? "active" : ""}`} onClick={() => setTab("service")}><ServiceIcon className="nav-ic" />Szerviz</button>
            <button type="button" className="nav-quick-add" title="Új munkalap" onClick={() => { setTab("service"); setTicketModal("add"); }}>+</button>
          </div>
          <button className={`navbtn ${tab === "stock" ? "active" : ""}`} onClick={() => setTab("stock")}><PhoneCaseIcon className="nav-ic" />Telefonok</button>
          <button className={`navbtn ${tab === "parts" ? "active" : ""}`} onClick={() => setTab("parts")}><PartsIcon className="nav-ic" />Alkatrészek</button>
          <button className={`navbtn ${tab === "finance" ? "active" : ""}`} onClick={() => setTab("finance")}><FinanceIcon className="nav-ic" />Bevételek &amp; Kiadások</button>
          <button className={`navbtn ${tab === "customers" ? "active" : ""}`} onClick={() => setTab("customers")}><CustomersIcon className="nav-ic" />Kliensek</button>
          <button className={`navbtn ${tab === "warranty" ? "active" : ""}`} onClick={() => setTab("warranty")}><WarrantyIcon className="nav-ic" />Garancia</button>

          <div className="nav-lbl">Admin</div>
          {isAdmin && (
            <button className={`navbtn ${tab === "buyback" ? "active" : ""}`} onClick={() => setTab("buyback")}><BuybackIcon className="nav-ic" />Felvásárlás</button>
          )}
          {isAdmin && (
            <button className={`navbtn ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}><UsersNavIcon className="nav-ic" />Felhasználók</button>
          )}
          {isAdmin && (
            <button className={`navbtn ${tab === "repair-prices" ? "active" : ""}`} onClick={() => setTab("repair-prices")}><RepairPriceIcon className="nav-ic" />Szerviz árbecslő</button>
          )}
          <button className={`navbtn ${tab === "leave" ? "active" : ""}`} onClick={() => setTab("leave")}><LeaveIcon className="nav-ic" />Szabadság</button>
          <button className={`navbtn ${tab === "trash" ? "active" : ""}`} onClick={() => setTab("trash")}><TrashNavIcon className="nav-ic" />Kuka</button>
        </div>
        <div className="sidebar-bottom">
          {isAdmin ? (
            <div className="loc-sw">
              <button className={`loc-btn ${locFilter === "all" ? "active" : ""}`} onClick={() => setLocFilter("all")}>Mind</button>
              {allowedLocations.map((l) => (
                <button key={l.id} className={`loc-btn ${locFilter === l.id ? "active" : ""}`} onClick={() => setLocFilter(l.id)}>{l.name}</button>
              ))}
            </div>
          ) : (
            <div className="loc-static">{myLocationId ? locName(myLocationId) : "Nincs helyszín"}</div>
          )}
          <div className="user-row">
            <div className="user-avatar">{(profile?.fullName || user?.email || "?").slice(0, 1).toUpperCase()}</div>
            <div className="user-meta">
              <div className="user-name">{profile?.fullName || user?.email}</div>
              <div className="user-role">{isAdmin ? "Admin" : "Alkalmazott"}</div>
            </div>
            <button className="logout-btn" title="Jelszó módosítása" onClick={() => setChangePasswordModal(true)}>
              <EditIcon />
            </button>
            <button className="logout-btn" title="Kijelentkezés" onClick={signOut}>
              <LogoutIcon />
            </button>
          </div>
        </div>
      </div>

      <div className="main">
        {error && <div className="errbar">{error}</div>}
        {info && <div className="banner ok">{info} <button type="button" className="banner-close" onClick={() => setInfo("")}><CloseIcon width={12} height={12} /></button></div>}
        {noLocationAssigned && (
          <div className="banner warn">Nincs helyszín hozzárendelve a fiókodhoz. Kérj meg egy adminisztrátort, hogy rendeljen hozzá egy helyszínt, addig nem látsz adatokat.</div>
        )}

        {!noLocationAssigned && tab === "dashboard" && (
          <>
            <div className="topbar">
              <div><div className="page-title">Áttekintés</div><div className="page-sub">{effectiveLocFilter === "all" ? "Mindkét helyszín" : locName(effectiveLocFilter)}</div></div>
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>📱 Telefonok</div>
            <div className="statrow c4">
              <div className="statcard accent"><div className="lbl">Raktáron</div><div className="val">{stockStats.count} db</div></div>
              <div className="statcard"><div className="lbl">Készlet értéke</div><div className="val">{money(stockStats.value)}</div></div>
              <div className="statcard"><div className="lbl">Besz. érték</div><div className="val">{money(stockStats.cost)}</div></div>
              <div className="statcard"><div className="lbl">Várható profit</div><div className="val" style={{ color: "#22C55E" }}>{money(stockStats.profit)}</div></div>
            </div>
            <div style={{ marginBottom: 26 }}>
              <StockValueChart history={stockHistory} />
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>🔧 Szerviz</div>
            <div className={`statrow ${svcStats.ownStock > 0 ? "c6" : "c5"}`} style={{ marginBottom: 26 }}>
              <div className="statcard accent"><div className="lbl">Összes</div><div className="val">{svcStats.total}</div></div>
              <div className="statcard"><div className="lbl">Aktív (ügyfél)</div><div className="val">{svcStats.active}</div></div>
              <div className="statcard"><div className="lbl">Kész (ügyfél)</div><div className="val" style={{ color: "#15803D" }}>{svcStats.kesz}</div></div>
              <div className="statcard"><div className="lbl">Sikertelen (ügyfél)</div><div className="val" style={{ color: "#9D174D" }}>{svcStats.sikertelen}</div></div>
              <div className="statcard"><div className="lbl">Kiadva</div><div className="val">{svcStats.kiadva}</div></div>
              {svcStats.ownStock > 0 && (
                <div className="statcard"><div className="lbl">Saját készlet szervizben</div><div className="val">{svcStats.ownStock}</div></div>
              )}
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>💰 Bevételek &amp; Kiadások</div>
            {monthlyTrendSummary && (
              <div style={{ fontSize: 13, color: "#374151", margin: "0 0 10px 2px", lineHeight: 1.6 }}>
                Ez a hónap eddig: <b>{money(currentMonthLive.revenue)}</b> — {monthlyTrendSummary.dayOfMonth} nap alatt. Múlt hónap ilyenkor ({monthlyTrendSummary.dayOfMonth}. napon): {money(monthlyTrendSummary.projected)} volt →{" "}
                <b style={{ color: monthlyTrendSummary.pct >= 0 ? "#15803D" : "#B91C1C" }}>{monthlyTrendSummary.pct >= 0 ? "+" : ""}{monthlyTrendSummary.pct}%</b>
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <MonthlyTrendChart summaries={monthlySummaries} liveMonth={currentMonthLive} locations={locations} locFilter={effectiveLocFilter} locName={locName} />
            </div>
            <div className="statrow c4" style={{ marginBottom: 26 }}>
              <div className="statcard accent"><div className="lbl">Tranzakciók</div><div className="val">{txStats.count}</div></div>
              <div className="statcard"><div className="lbl">Bevétel</div><div className="val" style={{ color: "#15803D" }}>{money(txStats.income)}</div></div>
              <div className="statcard"><div className="lbl">Kiadás</div><div className="val" style={{ color: "#B91C1C" }}>{money(txStats.expense)}</div></div>
              <div className="statcard"><div className="lbl">Nettó eredmény</div><div className="val">{money(txStats.net)}</div></div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>🔩 Alkatrészek</div>
                <div className="statrow c1">
                  <div className="statcard accent"><div className="lbl">Raktár értéke</div><div className="val">{money(partsStats.value)}</div></div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>👤 Kliensek</div>
                <div className="statrow c3">
                  <div className="statcard accent"><div className="lbl">Ügyfelek</div><div className="val">{customerStats.count}</div></div>
                  <div className="statcard"><div className="lbl">Bevétel tőlük</div><div className="val" style={{ color: "#15803D" }}>{money(customerStats.revenue)}</div></div>
                </div>
              </div>
            </div>
          </>
        )}

        {!noLocationAssigned && tab === "stock" && (
          <>
            <div className="topbar">
              <div><div className="page-title">Telefonok</div><div className="page-sub">{effectiveLocFilter === "all" ? "Mindkét helyszín" : locName(effectiveLocFilter)}</div></div>
              <button className="btn" disabled={busy} onClick={() => setStockModal("add")}>+ Új termék</button>
            </div>
            <div className="filter-row">
              <div className="searchbar"><SearchIcon /><input placeholder="Keresés..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            </div>
            {loadingData ? <div className="empty">Betöltés...</div> : filteredStock.length === 0 ? <div className="empty">Nincs termék raktáron.</div> : (
              (effectiveLocFilter === "all" ? locations : locations.filter((l) => l.id === effectiveLocFilter || l.id === reserveLocId)).map((loc) => {
                const items = filteredStock.filter((i) => i.locationId === loc.id);
                if (items.length === 0) return null;
                return (
                  <div key={loc.id} style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>
                      {loc.name} <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({items.length} db)</span>
                    </div>
                    <div className="tw">
                      {items.length === 0 ? <div className="empty">Nincs termék ezen a helyszínen.</div> : (
                        <table>
                          <thead><tr><th>Termék</th><th>Állapot</th><th>Tárhely/Szín</th><th>IMEI</th><th>Besz.</th><th>Ár</th><th></th></tr></thead>
                          <tbody>
                            {items.map((i) => (
                              <tr key={i.id} style={{ cursor: "pointer" }} onClick={() => setProductDetailId(i.id)}>
                                <td style={{ fontWeight: 600 }}>{i.brand} {i.model}</td>
                                <td><span className={`st ${i.condition === "New" ? "st-kesz" : "st-beveve"}`}>{i.condition === "New" ? "Új" : `Felúj. ${i.grade || ""}`}</span></td>
                                <td className="mono">{[i.storage, i.color].filter(Boolean).join(" / ") || "—"}</td>
                                <td className="mono" style={{ color: "#9CA3AF" }}>{i.imei || "—"}</td>
                                <td className="mono" style={{ color: "#6B7280" }}>{money(i.costPrice)}</td>
                                <td className="mono" style={{ fontWeight: 700 }}>{money(i.salePrice)}</td>
                                <td style={{ display: "flex", gap: 5 }} onClick={(e) => e.stopPropagation()}>
                                  <button className="btn sec sm" disabled={busy} onClick={() => setSellModal(i)}>Eladva</button>
                                  <button className="iconbtn" disabled={busy} onClick={() => setStockModal(i)}><EditIcon /></button>
                                  <ConfirmDelete disabled={busy} onConfirm={() => deleteProduct(i.id)} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {!noLocationAssigned && tab === "finance" && (
          <>
            <div className="topbar">
              <div><div className="page-title">Bevételek &amp; Kiadások</div><div className="page-sub">{effectiveLocFilter === "all" ? "Mindkét helyszín összesítve" : locName(effectiveLocFilter)}</div></div>
              <div className="seg">
                <button type="button" className={period === "day" ? "active" : ""} onClick={() => setPeriod("day")}>Napi</button>
                <button type="button" className={period === "week" ? "active" : ""} onClick={() => setPeriod("week")}>Heti</button>
                <button type="button" className={period === "month" ? "active" : ""} onClick={() => setPeriod("month")}>Havi</button>
              </div>
            </div>
            <QuickSaleButtons locations={allowedLocations} defaultLocId={defaultLocId} onAdd={addTransaction} busy={busy} />
            <TransactionQuickAdd locations={allowedLocations} defaultLocId={defaultLocId} onAdd={addTransaction} busy={busy} />
            {loadingData ? <div className="tw"><div className="empty">Betöltés...</div></div> : (
              <TransactionsPeriodList transactions={filteredTransactions} period={period} locName={locName} onEdit={setTxModal} onDelete={deleteTransaction} onOpenReceipt={setReceiptTxId} busy={busy} />
            )}
          </>
        )}

        {!noLocationAssigned && tab === "service" && (
          <>
            <div className="topbar">
              <div><div className="page-title">Szerviz</div><div className="page-sub">{effectiveLocFilter === "all" ? "Mindkét helyszín" : locName(effectiveLocFilter)}</div></div>
              <button className="btn" disabled={busy} onClick={() => setTicketModal("add")}>+ Új munkalap</button>
            </div>
            <div className="filter-row">
              <div className="searchbar"><SearchIcon /><input placeholder="Keresés vevő, márka, modell..." value={svcSearch} onChange={(e) => setSvcSearch(e.target.value)} /></div>
              <div className="seg">
                <button type="button" className={svcKindFilter === "all" ? "active" : ""} onClick={() => setSvcKindFilter("all")}>Mind</button>
                <button type="button" className={svcKindFilter === "customer" ? "active" : ""} onClick={() => setSvcKindFilter("customer")}>Csak ügyfél</button>
                <button type="button" className={svcKindFilter === "own" ? "active" : ""} onClick={() => setSvcKindFilter("own")}>Csak saját készlet</button>
              </div>
            </div>
            {loadingData ? <div className="empty">Betöltés...</div> : (
              <div className="kanban-wrap">
                <div className="kanban">
                  {STATUSES.map((col) => {
                    const items = activeTickets.filter((t) => t.status === col.key);
                    return (
                      <div className="k-col" key={col.key} style={{ "--col-color": col.color }}>
                        <div className="k-col-head">
                          <div className="k-col-title"><span className="k-dot"></span>{statusLabel(col.key)}</div>
                          <span className="k-count">{items.length}</span>
                        </div>
                        <div className="k-col-body">
                          {items.length === 0 && <div className="k-empty">Üres</div>}
                          {items.map((t) => <TicketCard key={t.id} ticket={t} locName={locName} onOpen={setDetailId} />)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <span className="toggle-link" onClick={() => setShowHandedOver((v) => !v)}>
              {showHandedOver ? "Átadott munkalapok elrejtése" : `Átadott munkalapok megtekintése (${handedOverTickets.length})`}
            </span>
            {showHandedOver && (
              <div className="tw" style={{ marginTop: 12 }}>
                {handedOverTickets.length === 0 ? <div className="empty">Nincs átadott munkalap.</div> : (
                  <table>
                    <thead><tr><th>#</th><th>Vevő</th><th>Helyszín</th><th>Eszköz</th><th>Bejött</th><th>Átadva</th><th>Díj</th></tr></thead>
                    <tbody>
                      {handedOverTickets.map((t) => (
                        <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => setDetailId(t.id)}>
                          <td className="mono">#{t.ticketNo}</td>
                          <td>{t.customerName}</td>
                          <td><span className="badge-loc">{locName(t.locationId)}</span></td>
                          <td>{[t.brand, t.model].filter(Boolean).join(" ")}</td>
                          <td className="mono">{t.dateIn}</td>
                          <td className="mono">{t.dateOut || "—"}</td>
                          <td className="mono" style={{ fontWeight: 700 }}>{money(t.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}

        {!noLocationAssigned && tab === "parts" && (
          <>
            <div className="topbar">
              <div><div className="page-title">Alkatrész raktár</div><div className="page-sub">Közös raktár — mindkét helyszín</div></div>
              <button className="btn" disabled={busy} onClick={() => setPartModal("add")}>+ Új alkatrész</button>
            </div>
            <div className="filter-row">
              <div className="searchbar"><SearchIcon /><input placeholder="Keresés név, márka, kategória, forrás szerint..." value={partSearch} onChange={(e) => setPartSearch(e.target.value)} /></div>
            </div>
            {loadingData ? <div className="tw"><div className="empty">Betöltés...</div></div> : filteredParts.length === 0 ? <div className="tw"><div className="empty">Nincs találat.</div></div> : (
              [...PART_CATEGORIES, "Egyéb"].map((cat) => {
                const items = cat === "Egyéb"
                  ? filteredParts.filter((p) => !PART_CATEGORIES.includes(p.category))
                  : filteredParts.filter((p) => p.category === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat} style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>
                      {cat} <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({items.length} db)</span>
                    </div>
                    <div className="tw">
                      <table>
                        <thead><tr><th>#</th><th>Alkatrész</th><th>Márka/Illik</th><th>Készlet</th><th>Beérk. ár</th><th>Forrás</th><th></th></tr></thead>
                        <tbody>
                          {items.map((p) => (
                            <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setPartDetailId(p.id)}>
                              <td className="mono" style={{ color: "#9CA3AF" }}>{p.partNo}</td>
                              <td style={{ fontWeight: 600 }}>{p.name}</td>
                              <td style={{ color: "#6B7280", fontSize: 12 }}>{[p.brand, p.modelFit].filter(Boolean).join(" · ") || "—"}</td>
                              <td style={{ fontWeight: 700 }}>{p.quantity} db</td>
                              <td className="mono" style={{ color: "#6B7280" }}>{money(p.costPrice)}</td>
                              <td style={{ color: "#6B7280", fontSize: 12 }}>{p.source || "—"}</td>
                              <td style={{ display: "flex", gap: 5 }} onClick={(e) => e.stopPropagation()}>
                                <button className="iconbtn" disabled={busy} onClick={() => setPartModal(p)}><EditIcon /></button>
                                <ConfirmDelete disabled={busy} onConfirm={() => deletePart(p.id)} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {!noLocationAssigned && tab === "customers" && (
          <>
            <div className="topbar">
              <div><div className="page-title">Kliensek</div><div className="page-sub">{effectiveLocFilter === "all" ? "Mindkét helyszín" : locName(effectiveLocFilter)}</div></div>
              <button className="btn" disabled={busy} onClick={() => setCustomerModal("add")}>+ Új ügyfél</button>
            </div>
            <div className="filter-row">
              <div className="searchbar"><SearchIcon /><input placeholder="Keresés név vagy telefonszám..." value={custSearch} onChange={(e) => setCustSearch(e.target.value)} /></div>
            </div>
            <div className="tw">
              {loadingData ? <div className="empty">Betöltés...</div> : customers.length === 0 ? <div className="empty">Nincs ügyfél.</div> : (
                <table>
                  <thead><tr><th>Név</th><th>Telefonszám</th><th>Típus</th><th>Vásárlások</th><th>Szerviz</th><th>Utolsó aktivitás</th></tr></thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.key} style={{ cursor: "pointer" }} onClick={() => setCustomerKey(c.key)}>
                        <td style={{ fontWeight: 600 }}>{c.name || "Névtelen"}</td>
                        <td className="mono">{c.phone || "—"}</td>
                        <td>{c.isNew ? <span className="badge-loc">Új</span> : <span className="badge-income">Visszatérő</span>}</td>
                        <td>{c.purchases.length} db · <span className="mono">{money(c.purchaseTotal)}</span></td>
                        <td>{c.tickets.length} db · <span className="mono">{money(c.ticketTotal)}</span></td>
                        <td className="mono" style={{ color: "#6B7280" }}>{c.lastActivity || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {!noLocationAssigned && tab === "warranty" && (
          <>
            <div className="topbar">
              <div><div className="page-title">Garancia</div><div className="page-sub">Aktív garanciák — telefon és szerviz, kézzel is felvehető</div></div>
              <button className="btn" disabled={busy} onClick={() => setWarrantyModal("add")}>+ Garancia felvétele</button>
            </div>
            <div className="statrow c1">
              <div className="statcard accent"><div className="lbl">Aktív garancia</div><div className="val">{activeWarranties.length} db</div></div>
            </div>
            <div style={{ display: "flex", gap: 8, margin: "0 0 14px 2px" }}>
              {[["all", "Mind"], ["sale", "Telefon garancia"], ["service", "Szerviz garancia"]].map(([key, label]) => (
                <button key={key} type="button"
                  className={`btn sec sm${warrantyFilter === key ? " active" : ""}`}
                  style={warrantyFilter === key ? { background: "#111827", color: "#fff", borderColor: "#111827" } : undefined}
                  onClick={() => setWarrantyFilter(key)}>{label}</button>
              ))}
            </div>
            <div className="tw">
              {loadingData ? <div className="empty">Betöltés...</div> : filteredWarranties.length === 0 ? <div className="empty">Nincs aktív garancia.</div> : (
                <table>
                  <thead><tr><th>Típus</th><th>Ügyfél</th><th>Termék / Eszköz</th><th>Garancia</th><th>Lejárat</th><th>Helyszín</th><th>Művelet</th></tr></thead>
                  <tbody>
                    {filteredWarranties.map((w) => {
                      const daysLeft = w.expiry ? Math.ceil((new Date(w.expiry) - new Date(today())) / 86400000) : null;
                      function sendReminder(e) {
                        e.stopPropagation();
                        const message = stripAccents(`Szia! A(z) ${w.label} garanciája hamarosan lejár (${w.expiry}). Ha bármi gond van a készülékkel, keress minket!`);
                        supabase.functions.invoke("send-sms", { body: { phone: w.customerPhone, message } })
                          .then(() => alert("SMS elküldve."))
                          .catch((err) => { console.error(err); setError("Az SMS nem ment ki."); });
                      }
                      return (
                        <tr key={w.key} style={{ cursor: "pointer" }} onClick={() => setWarrantyDetailKey(w.key)}>
                          <td>{w.kind === "sale" ? <span className="badge-income">Eladás</span> : <span className="badge-loc">Szerviz</span>}</td>
                          <td style={{ fontWeight: 600 }}>{w.customerName || "—"}</td>
                          <td>{w.label || "—"}</td>
                          <td><span className="gar-pill">{w.warranty}</span></td>
                          <td className="mono" style={{ fontWeight: 700, color: daysLeft != null && daysLeft <= 14 ? "#DC2626" : "#111827" }}>
                            {w.expiry} {daysLeft != null && <span style={{ fontWeight: 500, color: "#9CA3AF" }}>({daysLeft} nap)</span>}
                          </td>
                          <td><span className="badge-loc">{locName(w.locationId)}</span></td>
                          <td style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                            <CallLink phone={w.customerPhone} />
                            <button type="button" className="btn sec sm" disabled={!w.customerPhone} onClick={sendReminder}>Emlékeztető SMS</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {!noLocationAssigned && tab === "leave" && (
          <>
            <div className="topbar">
              <div><div className="page-title">Szabadság</div><div className="page-sub">{leaveYear}. évi keretek és a következő ~3 hónap</div></div>
              <button className="btn" disabled={busy} onClick={() => setLeaveRequestModal(true)}>+ Szabadság kérése</button>
            </div>

            {coverageWarnings.length > 0 && (
              <div className="leave-warn">
                <div className="leave-warn-title">⚠ Ezeken a napokon egy helyszínen mindenki szabadságon lesz</div>
                {coverageWarnings.map((w, i) => (
                  <div key={i} className="leave-warn-item">{w.date} — {locName(w.locationId)}</div>
                ))}
              </div>
            )}

            <div className="leave-cards">
              {users.map((u) => {
                const b = leaveBalanceByUser[u.id] || { entitled: 20, used: 0 };
                const pct = b.entitled > 0 ? Math.min(100, Math.round((b.used / b.entitled) * 100)) : 0;
                return (
                  <div key={u.id} className="leave-card">
                    <div className="leave-card-top">
                      <div className="leave-card-name">{u.fullName || "?"}</div>
                      {isAdmin && (
                        <button className="iconbtn" title="Keret módosítása" onClick={() => setLeaveBalanceModal(u)}><EditIcon /></button>
                      )}
                    </div>
                    <div className="leave-card-days">{b.used} / {b.entitled} nap felhasználva</div>
                    <div className="leave-progress"><div className="leave-progress-fill" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>

            <div className="tw">
              {upcomingLeave.length === 0 ? (
                <div className="empty">Nincs felvett vagy közelgő szabadság a következő 3 hónapban.</div>
              ) : (
                <table>
                  <thead><tr><th>Dolgozó</th><th>Helyszín</th><th>Típus</th><th>Időszak</th><th>Napok</th><th>Állapot</th><th></th></tr></thead>
                  <tbody>
                    {upcomingLeave.map((r) => {
                      const reqUser = users.find((u) => u.id === r.userId);
                      const lt = leaveTypes.find((t) => t.id === r.leaveTypeId);
                      const canRevoke = r.status === "Kérve" && r.userId === user.id;
                      return (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600 }}>{reqUser?.fullName || "?"}</td>
                          <td><span className="badge-loc">{locName(reqUser?.locationId)}</span></td>
                          <td><span className="leave-type-chip"><span className="leave-type-dot" style={{ background: lt?.color || "#9CA3AF" }} />{lt?.name || "—"}</span></td>
                          <td className="mono">{r.startDate} – {r.endDate}</td>
                          <td style={{ fontWeight: 700 }}>{r.days}</td>
                          <td><span className={LEAVE_STATUS_CLS[r.status] || "badge-loc"}>{r.status}</span></td>
                          <td style={{ display: "flex", gap: 6 }}>
                            {r.status === "Kérve" && isAdmin && (
                              <>
                                <button className="btn sec sm" disabled={busy} onClick={() => decideLeaveRequest(r.id, "Jóváhagyva")}>Jóváhagyás</button>
                                <button className="btn sec sm" disabled={busy} onClick={() => decideLeaveRequest(r.id, "Elutasítva")}>Elutasítás</button>
                              </>
                            )}
                            {canRevoke && (
                              <button className="btn sec sm" disabled={busy} onClick={() => revokeLeaveRequest(r.id)}>Visszavonás</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {!noLocationAssigned && isAdmin && tab === "buyback" && (
          <>
            <div className="topbar">
              <div><div className="page-title">Felvásárlás</div><div className="page-sub">A publikus /eladom oldal árazása — modellek és levonási szabályok</div></div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 8px 2px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151" }}>Modellek <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({buybackModels.length} db)</span></div>
              <button className="btn sec sm" disabled={busy} onClick={() => setBuybackModelModal("add")}>+ Új modell</button>
            </div>
            <div className="tw" style={{ marginBottom: 22 }}>
              {buybackModels.length === 0 ? (
                <div className="empty">Nincs modell felvéve — az /eladom oldal addig üres marad.</div>
              ) : (
                <table>
                  <thead><tr><th>Márka</th><th>Modell</th><th>Tárhely</th><th>Alapár</th><th>Állapot</th><th></th></tr></thead>
                  <tbody>
                    {buybackModels.map((m) => (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 600 }}>{m.brand}</td>
                        <td>{m.model}</td>
                        <td style={{ color: "#6B7280" }}>{m.storage || "—"}</td>
                        <td className="mono" style={{ fontWeight: 700 }}>{money(m.basePrice)}</td>
                        <td>{m.active ? <span className="badge-income">Aktív</span> : <span style={{ color: "#9CA3AF", fontSize: 12 }}>Inaktív</span>}</td>
                        <td style={{ display: "flex", gap: 5 }}>
                          <button className="iconbtn" disabled={busy} onClick={() => setBuybackModelModal(m)}><EditIcon /></button>
                          <ConfirmDelete disabled={busy} onConfirm={() => deleteBuybackModel(m.id)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 8px 2px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151" }}>Levonási szabályok <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({buybackRules.length} db)</span></div>
              <button className="btn sec sm" disabled={busy} onClick={() => setBuybackRuleModal("add")}>+ Új szabály</button>
            </div>
            <div className="tw">
              {buybackRules.length === 0 ? (
                <div className="empty">Nincs levonási szabály — minden készülék az alapáron kerül felajánlásra, függetlenül az állapottól.</div>
              ) : (
                <table>
                  <thead><tr><th>Kérdés</th><th>Válasz</th><th>Szöveg</th><th>Levonás</th><th>Állapot</th><th></th></tr></thead>
                  <tbody>
                    {buybackRules.map((r) => {
                      const q = BUYBACK_CONDITION_QUESTIONS.find((x) => x.key === r.questionKey);
                      const opt = q?.options.find((o) => o.key === r.answerKey);
                      return (
                        <tr key={r.id}>
                          <td style={{ color: "#6B7280", fontSize: 12.5 }}>{q?.question || r.questionKey}</td>
                          <td style={{ fontSize: 12.5 }}>{opt?.label || r.answerKey}</td>
                          <td style={{ fontWeight: 600 }}>{r.label}</td>
                          <td className="mono" style={{ fontWeight: 700, color: "#DC2626" }}>
                            −{r.deductionType === "percent" ? `${r.deductionValue}%` : money(r.deductionValue)}
                          </td>
                          <td>{r.active ? <span className="badge-income">Aktív</span> : <span style={{ color: "#9CA3AF", fontSize: 12 }}>Inaktív</span>}</td>
                          <td style={{ display: "flex", gap: 5 }}>
                            <button className="iconbtn" disabled={busy} onClick={() => setBuybackRuleModal(r)}><EditIcon /></button>
                            <ConfirmDelete disabled={busy} onConfirm={() => deleteBuybackRule(r.id)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {!noLocationAssigned && isAdmin && tab === "repair-prices" && (
          <>
            <div className="topbar">
              <div><div className="page-title">Szerviz árbecslő</div><div className="page-sub">A publikus /becsles oldal árazása és a beérkezett érdeklődők</div></div>
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>Árazási mátrix</div>
            <div className="tw" style={{ marginBottom: 22 }}>
              <table>
                <thead><tr><th>Modellcsalád</th>{PRICED_PROBLEMS.map((tag) => <th key={tag}>{tag}</th>)}</tr></thead>
                <tbody>
                  {Object.entries(REPAIR_FAMILIES).map(([familyKey, familyLabel]) => (
                    <tr key={familyKey}>
                      <td style={{ fontWeight: 600 }}>{familyLabel}</td>
                      {PRICED_PROBLEMS.map((tag) => {
                        const row = repairPrices.find((p) => p.familyKey === familyKey && p.problemTag === tag);
                        return (
                          <td key={tag} style={{ cursor: "pointer" }} onClick={() => setRepairPriceModal({ familyKey, problemTag: tag, price: row })}>
                            {row?.priceOem != null ? (
                              <span className="mono" style={{ fontWeight: 700 }}>{money(row.priceOem)}</span>
                            ) : (
                              <span style={{ color: "#9CA3AF", fontSize: 12 }}>+ Ár megadása</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 8px 2px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151" }}>Beérkezett érdeklődők <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({repairLeads.filter((l) => repairLeadFilter === "Mind" || l.status === repairLeadFilter).length} db)</span></div>
              <div style={{ display: "flex", gap: 6 }}>
                {["Új", "Feldolgozva", "Elvetve", "Mind"].map((f) => (
                  <button key={f} type="button" className={`btn sec sm${repairLeadFilter === f ? " active" : ""}`}
                    style={repairLeadFilter === f ? { background: "#111827", color: "#fff", borderColor: "#111827" } : undefined}
                    onClick={() => setRepairLeadFilter(f)}>{f}</button>
                ))}
              </div>
            </div>
            <div className="tw">
              {repairLeads.filter((l) => repairLeadFilter === "Mind" || l.status === repairLeadFilter).length === 0 ? (
                <div className="empty">Nincs ilyen státuszú érdeklődő.</div>
              ) : (
                <table>
                  <thead><tr><th>Ügyfél</th><th>Telefon</th><th>Eszköz</th><th>Probléma</th><th>Becsült ár</th><th>Helyszín</th><th>Beérkezett</th><th></th></tr></thead>
                  <tbody>
                    {repairLeads.filter((l) => repairLeadFilter === "Mind" || l.status === repairLeadFilter).map((l) => (
                      <tr key={l.id}>
                        <td style={{ fontWeight: 600 }}>{l.customerName}</td>
                        <td className="mono">{l.customerPhone}</td>
                        <td>{[l.brand, l.model].filter(Boolean).join(" ")}</td>
                        <td>{l.problemTag ? (PROBLEM_LABELS[l.problemTag] || l.problemTag) : (l.note || "—")}</td>
                        <td className="mono">{l.estimatedPrice != null ? money(l.estimatedPrice) : "—"}</td>
                        <td><span className="badge-loc">{locName(l.preferredLocationId)}</span></td>
                        <td className="mono" style={{ color: "#6B7280" }}>{(l.createdAt || "").slice(0, 10)}</td>
                        <td style={{ display: "flex", gap: 6 }}>
                          {l.status === "Új" && (
                            <>
                              <button className="btn sec sm" disabled={busy} onClick={() => { setRepairLeadConvert(l); setTicketModal("add"); }}>Munkalap létrehozása</button>
                              <button className="btn sec sm" disabled={busy} onClick={() => rejectRepairLead(l.id)}>Elvetés</button>
                            </>
                          )}
                          {l.status === "Feldolgozva" && <span className="badge-income">Feldolgozva</span>}
                          {l.status === "Elvetve" && <span style={{ color: "#9CA3AF", fontSize: 12 }}>Elvetve</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {!noLocationAssigned && isAdmin && tab === "users" && (
          <>
            <div className="topbar">
              <div><div className="page-title">Felhasználók</div><div className="page-sub">Szerepkör és helyszín beállítása</div></div>
              <button className="btn" disabled={busy} onClick={() => { setInviteError(""); setInviteModal(true); }}>+ Új kolléga meghívása</button>
            </div>
            <div className="tw">
              {loadingData ? <div className="empty">Betöltés...</div> : users.length === 0 ? <div className="empty">Nincs felhasználó.</div> : (
                <table>
                  <thead><tr><th>Név</th><th>Email</th><th>Szerepkör</th><th>Helyszín</th><th>Műveletek</th></tr></thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600 }}>{u.fullName || "—"}{u.id === user.id ? " (te)" : ""}</td>
                        <td style={{ color: "#6B7280" }}>{u.email || "—"}</td>
                        <td>
                          <select value={u.role} disabled={busy} onChange={(e) => updateUserProfile(u.id, { role: e.target.value })}>
                            <option value="employee">Alkalmazott</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td>
                          <select value={u.locationId || ""} disabled={busy} onChange={(e) => updateUserProfile(u.id, { location_id: e.target.value || null })}>
                            <option value="">— Nincs —</option>
                            {allowedLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                        </td>
                        <td style={{ display: "flex", gap: 6 }}>
                          {u.id !== user.id && (
                            <>
                              <button type="button" className="btn sec sm" disabled={busy} onClick={() => resetEmployeePassword(u.id, u.email)}>Jelszó visszaállítása</button>
                              <ConfirmDelete variant="full" disabled={busy} onConfirm={() => deleteEmployee(u.id)} />
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {!noLocationAssigned && tab === "trash" && (
          <>
            <div className="topbar">
              <div><div className="page-title">Kuka</div><div className="page-sub">Törölt tételek — bármikor visszaállíthatók</div></div>
            </div>
            {trashLoading || !trash ? <div className="tw"><div className="empty">Betöltés...</div></div> : (
              <>
                {trash.products.length === 0 && trash.parts.length === 0 && trash.transactions.length === 0 && trash.tickets.length === 0 && (
                  <div className="tw"><div className="empty">A kuka üres.</div></div>
                )}
                {trash.products.length > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>Telefonok <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({trash.products.length} db)</span></div>
                    <div className="tw">
                      <table>
                        <thead><tr><th>Termék</th><th>IMEI</th><th>Ár</th><th></th></tr></thead>
                        <tbody>
                          {trash.products.map((p) => (
                            <tr key={p.id}>
                              <td style={{ fontWeight: 600 }}>{p.brand} {p.model}</td>
                              <td className="mono" style={{ color: "#9CA3AF" }}>{p.imei || "—"}</td>
                              <td className="mono" style={{ fontWeight: 700 }}>{money(p.salePrice)}</td>
                              <td style={{ display: "flex", gap: 6 }}>
                                <button className="btn sec sm" disabled={busy} onClick={() => restoreProduct(p.id)}>Visszaállítás</button>
                                <ConfirmDelete variant="full" disabled={busy} onConfirm={() => hardDeleteProduct(p.id)} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {trash.parts.length > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>Alkatrészek <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({trash.parts.length} db)</span></div>
                    <div className="tw">
                      <table>
                        <thead><tr><th>Alkatrész</th><th>Kategória</th><th>Készlet</th><th></th></tr></thead>
                        <tbody>
                          {trash.parts.map((p) => (
                            <tr key={p.id}>
                              <td style={{ fontWeight: 600 }}>{p.name}</td>
                              <td style={{ color: "#6B7280", fontSize: 12 }}>{p.category || "—"}</td>
                              <td style={{ fontWeight: 700 }}>{p.quantity} db</td>
                              <td style={{ display: "flex", gap: 6 }}>
                                <button className="btn sec sm" disabled={busy} onClick={() => restorePart(p.id)}>Visszaállítás</button>
                                <ConfirmDelete variant="full" disabled={busy} onConfirm={() => hardDeletePart(p.id)} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {trash.transactions.length > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>Bevételek &amp; Kiadások <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({trash.transactions.length} db)</span></div>
                    <div className="tw">
                      <table>
                        <thead><tr><th>Leírás</th><th>Összeg</th><th>Dátum</th><th></th></tr></thead>
                        <tbody>
                          {trash.transactions.map((t) => (
                            <tr key={t.id}>
                              <td style={{ fontWeight: 600 }}>{t.description}</td>
                              <td className="mono" style={{ fontWeight: 700, color: t.type === "income" ? "#15803D" : "#B91C1C" }}>{t.type === "income" ? "+" : "-"}{money(t.amount)}</td>
                              <td style={{ color: "#6B7280" }}>{t.date}</td>
                              <td style={{ display: "flex", gap: 6 }}>
                                <button className="btn sec sm" disabled={busy} onClick={() => restoreTransaction(t.id)}>Visszaállítás</button>
                                <ConfirmDelete variant="full" disabled={busy} onConfirm={() => hardDeleteTransaction(t.id)} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {trash.tickets.length > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>Szerviz munkalapok <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({trash.tickets.length} db)</span></div>
                    <div className="tw">
                      <table>
                        <thead><tr><th>#</th><th>Ügyfél</th><th>Eszköz</th><th></th></tr></thead>
                        <tbody>
                          {trash.tickets.map((t) => (
                            <tr key={t.id}>
                              <td className="mono" style={{ color: "#9CA3AF" }}>{t.ticketNo}</td>
                              <td style={{ fontWeight: 600 }}>{t.customerName}</td>
                              <td style={{ color: "#6B7280" }}>{[t.brand, t.model].filter(Boolean).join(" ")}</td>
                              <td style={{ display: "flex", gap: 6 }}>
                                <button className="btn sec sm" disabled={busy} onClick={() => restoreTicket(t.id)}>Visszaállítás</button>
                                <ConfirmDelete variant="full" disabled={busy} onConfirm={() => hardDeleteTicket(t.id)} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {stockModal && (
        <StockModal
          product={stockModal !== "add" ? stockModal : null}
          locations={stockLocations}
          onClose={() => setStockModal(null)}
          busy={busy}
          defaultLocId={defaultStockLocId}
          onSave={(data, locId) => (stockModal !== "add" ? editProduct(stockModal.id, data, locId) : addProduct(data, locId))}
        />
      )}
      {sellModal && <SellModal item={sellModal} locName={locName} customers={customersTable} onClose={() => setSellModal(null)} onSave={sellProduct} busy={busy} />}
      {partModal && (
        <PartModal
          part={partModal !== "add" ? partModal : null}
          onClose={() => setPartModal(null)}
          busy={busy}
          onSave={(data) => (partModal !== "add" ? editPart(partModal.id, data) : addPart(data))}
        />
      )}
      {txModal && (
        <TransactionModal
          tx={txModal}
          locations={allowedLocations}
          defaultLocId={defaultLocId}
          onClose={() => setTxModal(null)}
          busy={busy}
          onSave={(data, locId) => editTransaction(txModal.id, data, locId)}
        />
      )}
      {ticketModal && (
        <TicketFormModal
          ticket={editingTicket}
          prefill={!editingTicket && repairLeadConvert ? {
            customerName: repairLeadConvert.customerName,
            customerPhone: repairLeadConvert.customerPhone,
            brand: repairLeadConvert.brand,
            model: repairLeadConvert.model,
            price: repairLeadConvert.estimatedPrice ?? "",
            tags: repairLeadConvert.problemTag ? [repairLeadConvert.problemTag] : [],
            extra: repairLeadConvert.note || "",
          } : undefined}
          locations={allowedLocations}
          users={users}
          customers={customersTable}
          stock={stock}
          defaultLocId={defaultLocId}
          onClose={() => { setTicketModal(null); setRepairLeadConvert(null); }}
          busy={busy}
          onSave={(data, locId) => (editingTicket ? saveTicketEdit(editingTicket.id, data, locId) : addTicket(data, locId))}
        />
      )}
      {detailTicket && (
        <DetailPanel
          ticket={detailTicket}
          locName={locName}
          busy={busy}
          parts={parts}
          users={users}
          onClose={() => setDetailId(null)}
          onStatusChange={setTicketStatus}
          onCompleteQc={completeQc}
          onEdit={(t) => { setDetailId(null); setTicketModal(t); }}
          onDelete={deleteTicket}
          onAddPart={addPartToTicket}
          onRemovePart={removePartFromTicket}
          onPrint={printTicketSlip}
        />
      )}
      {detailProduct && (
        <ProductDetailPanel
          product={detailProduct}
          locName={locName}
          busy={busy}
          onClose={() => setProductDetailId(null)}
          onSell={(p) => { setProductDetailId(null); setSellModal(p); }}
          onEdit={(p) => { setProductDetailId(null); setStockModal(p); }}
          onDelete={(id) => { deleteProduct(id); setProductDetailId(null); }}
        />
      )}
      {detailPart && (
        <PartDetailPanel
          part={detailPart}
          busy={busy}
          onClose={() => setPartDetailId(null)}
          onEdit={(p) => { setPartDetailId(null); setPartModal(p); }}
          onDelete={(id) => { deletePart(id); setPartDetailId(null); }}
        />
      )}
      {detailCustomer && (
        <CustomerDetailPanel
          customer={detailCustomer}
          locName={locName}
          busy={busy}
          onClose={() => setCustomerKey(null)}
          onEdit={(c) => { setCustomerKey(null); setCustomerModal(c); }}
        />
      )}
      {customerModal && (
        <CustomerModal
          customer={customerModal === "add" ? null : customerModal}
          busy={busy}
          onClose={() => setCustomerModal(null)}
          onSave={(data) => (customerModal === "add" ? createCustomer(data) : updateCustomer(customerModal.id, data))}
        />
      )}
      {receiptTx && (
        <SaleReceiptPanel tx={receiptTx} locName={locName} onClose={() => setReceiptTxId(null)} onPrint={printReceiptSlip} />
      )}
      {warrantyDetailKey && (() => {
        const w = activeWarranties.find((x) => x.key === warrantyDetailKey);
        if (!w) return null;
        return (
          <WarrantyDetailPanel
            w={w} locName={locName} busy={busy}
            onClose={() => setWarrantyDetailKey(null)}
            onPrint={(w) => printWarrantySlip(w)}
            onEditLinked={editLinkedWarranty}
            onEditManual={(w) => { setWarrantyModal(warranties.find((x) => x.id === w.refId)); setWarrantyDetailKey(null); }}
            onDeleteLinked={(kind, refId) => { clearLinkedWarranty(kind, refId); setWarrantyDetailKey(null); }}
            onDeleteManual={(id) => { deleteWarranty(id); setWarrantyDetailKey(null); }}
          />
        );
      })()}
      {warrantyModal && (
        <WarrantyModal
          initial={warrantyModal === "add" ? null : warrantyModal}
          locations={allowedLocations} busy={busy}
          onClose={() => setWarrantyModal(null)}
          onSubmit={(data, locId) => (warrantyModal === "add" ? addWarranty(data, locId) : editWarranty(warrantyModal.id, data, locId))}
        />
      )}
      {buybackModelModal && (
        <BuybackModelModal
          model={buybackModelModal !== "add" ? buybackModelModal : null}
          onClose={() => setBuybackModelModal(null)}
          busy={busy}
          onSave={(data) => (buybackModelModal !== "add" ? editBuybackModel(buybackModelModal.id, data) : addBuybackModel(data))}
        />
      )}
      {buybackRuleModal && (
        <BuybackRuleModal
          rule={buybackRuleModal !== "add" ? buybackRuleModal : null}
          onClose={() => setBuybackRuleModal(null)}
          busy={busy}
          onSave={(data) => (buybackRuleModal !== "add" ? editBuybackRule(buybackRuleModal.id, data) : addBuybackRule(data))}
        />
      )}
      {leaveRequestModal && (
        <LeaveRequestModal
          leaveTypes={leaveTypes}
          busy={busy}
          onClose={() => setLeaveRequestModal(false)}
          onSubmit={addLeaveRequest}
        />
      )}
      {leaveBalanceModal && (
        <LeaveBalanceModal
          user={leaveBalanceModal}
          year={leaveYear}
          initial={leaveBalanceByUser[leaveBalanceModal.id]?.entitled ?? 20}
          busy={busy}
          onClose={() => setLeaveBalanceModal(null)}
          onSave={(days) => saveLeaveBalance(leaveBalanceModal.id, leaveYear, days)}
        />
      )}
      {repairPriceModal && (
        <RepairPriceModal
          familyLabel={REPAIR_FAMILIES[repairPriceModal.familyKey]}
          problemLabel={repairPriceModal.problemTag}
          price={repairPriceModal.price}
          busy={busy}
          onClose={() => setRepairPriceModal(null)}
          onSave={(data) => saveRepairPrice(repairPriceModal.familyKey, repairPriceModal.problemTag, data)}
        />
      )}
      <div id="print-slip-root">
        {printTicket && <PrintSlip ticket={printTicket} location={locations.find((l) => l.id === printTicket.locationId)} />}
        {printReceipt && <PrintReceiptSlip tx={printReceipt} location={locations.find((l) => l.id === printReceipt.locationId)} />}
        {printWarranty && <PrintWarrantySlip w={printWarranty} location={locations.find((l) => l.id === printWarranty.locationId)} />}
      </div>
      {changePasswordModal && (
        <ChangePasswordModal busy={busy} onClose={() => setChangePasswordModal(false)} onChange={changeOwnPassword} />
      )}
      {inviteModal && (
        <InviteEmployeeModal
          locations={allowedLocations}
          busy={busy}
          error={inviteError}
          onClose={() => setInviteModal(false)}
          onInvite={inviteEmployee}
        />
      )}
      <button
        type="button"
        className="chat-fab"
        onClick={() => { setChatOpen((o) => !o); if (!chatOpen) markChatRead(); }}
      >
        💬
        {chatUnread > 0 && <span className="chat-fab-badge">{chatUnread > 9 ? "9+" : chatUnread}</span>}
      </button>
      {chatOpen && (
        <TeamChatPanel
          messages={chatMessages}
          users={users}
          tickets={tickets}
          stock={stock}
          currentUserId={profile?.id}
          onSend={sendChatMessage}
          onOpenTicket={(id) => { setChatOpen(false); setDetailId(id); }}
          onOpenProduct={(id) => { setChatOpen(false); setProductDetailId(id); }}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
