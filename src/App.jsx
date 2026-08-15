import { useState, useEffect, useMemo } from "react";
import { useAuth } from "./lib/AuthContext";
import { supabase, unwrap, fetchAllRows } from "./lib/supabaseClient";
import { pFromApi, pToApi, txFromApi, txToApi, tFromApi, tToApi, partFromApi, partToApi, spFromApi, profileFromApi, customerFromApi, customerToApi, monthlySummaryFromApi, warrantyFromApi, warrantyToApi, buybackModelFromApi, buybackModelToApi, buybackRuleFromApi, buybackRuleToApi, leaveTypeFromApi, leaveBalanceFromApi, leaveRequestFromApi, repairPriceFromApi, repairLeadFromApi, cashHolderFromApi, cashSettlementFromApi } from "./lib/mappers";
import { today, warrantyExpiry, isWarrantyActive, stripAccents, SITE_URL, countWorkdays, rollingBusinessWeekStart, slaInfo, isSlowMoving, isStaleReady, QUICK_SALES, phoneCode } from "./lib/utils";
import { REPAIR_FAMILIES } from "./lib/repairCatalog";
import Login from "./Login";
import StockModal from "./components/StockModal";
import SellModal from "./components/SellModal";
import PartModal from "./components/PartModal";
import DetailPanel from "./components/DetailPanel";
import ProductDetailPanel from "./components/ProductDetailPanel";
import PartDetailPanel from "./components/PartDetailPanel";
import OwnStockServiceModal from "./components/OwnStockServiceModal";
import TicketFormModal from "./components/TicketFormModal";
import DashboardTab from "./tabs/DashboardTab";
import StockTab from "./tabs/StockTab";
import FinanceTab from "./tabs/FinanceTab";
import CashSettlementTab from "./tabs/CashSettlementTab";
import ServiceTab from "./tabs/ServiceTab";
import PartsTab from "./tabs/PartsTab";
import CustomersTab from "./tabs/CustomersTab";
import WarrantyTab from "./tabs/WarrantyTab";
import LeaveTab from "./tabs/LeaveTab";
import BuybackTab from "./tabs/BuybackTab";
import RepairPricesTab from "./tabs/RepairPricesTab";
import UsersTab from "./tabs/UsersTab";
import TrashTab from "./tabs/TrashTab";
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
import { CloseIcon, ChatIcon } from "./components/icons";
import Sidebar from "./components/Sidebar";
import TeamChatPanel from "./components/TeamChatPanel";
import InviteEmployeeModal from "./components/InviteEmployeeModal";
import ChangePasswordModal from "./components/ChangePasswordModal";
import { useInternalChat } from "./lib/useInternalChat";

// TODO: ideiglenesen kikapcsolva munkalap-felvételnél a saját-szerviz feature tesztelése alatt — a felhasználó kérésére.
const SMS_ON_TICKET_CREATE = false;

export default function App() {
  const { session, loading } = useAuth();
  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F4F6F3", color: "#6B7280", fontSize: 13 }}>Betöltés...</div>;
  if (!session) return <Login />;
  return <AppShell />;
}

function AppShell() {
  const { user, profile, signOut } = useAuth();
  const isAdmin = profile?.role === "admin";
  const myLocationId = profile?.locationId || null;

  const [tab, setTab] = useState(isAdmin ? "dashboard" : "service");
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

  const [stockModal, setStockModal] = useState(null); // null | "add" | product obj (edit)
  const [sellModal, setSellModal] = useState(null);
  const [partModal, setPartModal] = useState(null); // null | "add" | part obj (edit)
  const [txModal, setTxModal] = useState(null); // null | tx obj (edit)
  const [ticketModal, setTicketModal] = useState(null); // null | "add" | ticket obj (edit)
  const [ownServiceModal, setOwnServiceModal] = useState(null); // { product, kind } | null
  const [detailId, setDetailId] = useState(null);
  const [productDetailId, setProductDetailId] = useState(null);
  const [partDetailId, setPartDetailId] = useState(null);
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
  const [cashHolders, setCashHolders] = useState([]);
  const [cashSettlements, setCashSettlements] = useState([]);
  const [repairPriceModal, setRepairPriceModal] = useState(null); // null | { familyKey, problemTag }
  const [repairLeadFilter, setRepairLeadFilter] = useState("Új");
  const [repairLeadConvert, setRepairLeadConvert] = useState(null); // lead obj being converted to a ticket

  function printTicketSlip(ticket) {
    setPrintReceipt(null);
    setPrintWarranty(null);
    setPrintTicket(ticket);
    requestAnimationFrame(() => {
      window.print();
    });
  }
  function printReceiptSlip(tx) {
    setPrintTicket(null);
    setPrintWarranty(null);
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
    setPrintTicket(null);
    setPrintReceipt(null);
    setPrintWarranty(w);
    requestAnimationFrame(() => window.print());
  }

  async function loadAll() {
    setLoadingData(true);
    try {
      const [locs, prods, txs, tcks, prs, sps, usrs, hist, custs, msums, warrs, bbModels, bbRules, lTypes, lBalances, lRequests, rPrices, rLeads, cHolders, cSettlements] = await Promise.all([
        supabase.from("locations").select("*").order("name", { ascending: true }),
        fetchAllRows(() => supabase.from("products").select("*").is("deleted_at", null).order("created_at", { ascending: false })),
        fetchAllRows(() => supabase.from("transactions").select("*").is("deleted_at", null).order("date", { ascending: false })),
        fetchAllRows(() => supabase.from("service_tickets").select("*").is("deleted_at", null).order("created_at", { ascending: false })),
        supabase.from("parts").select("*").is("deleted_at", null).order("name", { ascending: true }),
        supabase.from("service_parts").select("*"),
        supabase.from("profiles").select("*").order("full_name", { ascending: true }),
        supabase.from("stock_value_history").select("*").order("date", { ascending: true }),
        fetchAllRows(() => supabase.from("customers").select("*").is("deleted_at", null)),
        supabase.from("monthly_summaries").select("*").order("year").order("month"),
        supabase.from("warranties").select("*").is("deleted_at", null),
        supabase.from("buyback_models").select("*").is("deleted_at", null).order("brand", { ascending: true }),
        supabase.from("buyback_deduction_rules").select("*").order("question_key", { ascending: true }),
        supabase.from("leave_types").select("*"),
        supabase.from("leave_balances").select("*"),
        supabase.from("leave_requests").select("*").order("start_date", { ascending: true }),
        supabase.from("repair_prices").select("*"),
        supabase.from("repair_leads").select("*").order("created_at", { ascending: false }),
        supabase.from("cash_holders").select("*").order("name", { ascending: true }),
        supabase.from("cash_settlements").select("*").order("period_end", { ascending: false }),
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
      setCashHolders((unwrap(cHolders) || []).map(cashHolderFromApi));
      setCashSettlements((unwrap(cSettlements) || []).map(cashSettlementFromApi));
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
        fetchAllRows(() => supabase.from("products").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false })),
        supabase.from("parts").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
        fetchAllRows(() => supabase.from("transactions").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false })),
        fetchAllRows(() => supabase.from("service_tickets").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false })),
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

  async function hardDeleteAllTrash() {
    await withBusy(async () => {
      const errors = [];
      const CHUNK = 100;
      const chunks = (arr) => { const out = []; for (let i = 0; i < arr.length; i += CHUNK) out.push(arr.slice(i, i + CHUNK)); return out; };

      const productIds = trash.products.map((p) => p.id);
      if (productIds.length > 0) {
        try {
          for (const ids of chunks(productIds)) {
            const { data: photos } = await supabase.from("product_photos").select("storage_path").in("product_id", ids);
            if (photos && photos.length > 0) {
              await supabase.storage.from("product-photos").remove(photos.map((p) => p.storage_path)).catch(() => {});
            }
            unwrap(await supabase.from("products").delete().in("id", ids));
          }
        } catch (e) { errors.push("Telefonok: " + e.message); }
      }
      if (trash.transactions.length > 0) {
        try {
          for (const ids of chunks(trash.transactions.map((t) => t.id))) unwrap(await supabase.from("transactions").delete().in("id", ids));
        } catch (e) { errors.push("Tranzakciók: " + e.message); }
      }
      if (trash.tickets.length > 0) {
        try {
          for (const ids of chunks(trash.tickets.map((t) => t.id))) unwrap(await supabase.from("service_tickets").delete().in("id", ids));
        } catch (e) { errors.push("Munkalapok: " + e.message); }
      }
      if (trash.parts.length > 0) {
        try {
          for (const ids of chunks(trash.parts.map((p) => p.id))) {
            const { error } = await supabase.from("parts").delete().in("id", ids);
            if (error) throw error;
          }
        } catch (e) { errors.push(e.code === "23503" ? "Alkatrészek: néhány tétel nem törölhető, mert szerviz munkalaphoz van kötve." : "Alkatrészek: " + e.message); }
      }
      await loadTrash();
      if (errors.length > 0) throw new Error(errors.join(" "));
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
  async function returnProductToStock(productId, txId) {
    await withBusy(async () => {
      unwrap(await supabase.from("products").update({ status: "in_stock", stock_status: "polcon" }).eq("id", productId));
      setStock(stock.map((i) => (i.id === productId ? { ...i, status: "in_stock", stockStatus: "polcon" } : i)));
      if (txId) {
        unwrap(await supabase.from("transactions").update({ warranty: null }).eq("id", txId));
        setTransactions(transactions.map((t) => (t.id === txId ? { ...t, warranty: null } : t)));
      }
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
      sendChatMessage(`${profile?.fullName || "Valaki"} szabadságot kért: ${startDate} – ${endDate} (${days} munkanap)`);
    });
  }
  async function decideLeaveRequest(id, status) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("leave_requests").update({ status, decided_by: user.id, decided_at: new Date().toISOString() }).eq("id", id).select());
      const updated = leaveRequestFromApi(r[0]);
      setLeaveRequests(leaveRequests.map((lr) => (lr.id === id ? updated : lr)));
      if (status === "Jóváhagyva") {
        const reqUser = users.find((u) => u.id === updated.userId);
        sendChatMessage(`${reqUser?.fullName || "Kolléga"} szabadsága jóváhagyva: ${updated.startDate} – ${updated.endDate}`);
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

  async function saveCashSettlement(data) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("cash_settlements").insert({
        period_start: data.periodStart, period_end: data.periodEnd,
        cash_income: data.cashIncome, cash_expense: data.cashExpense,
        cash_counted_total: data.cashCountedTotal, cash_by_holder: data.cashByHolder,
        card_income: data.cardIncome, transfer_income: data.transferIncome,
        other_expense: data.otherExpense, note: data.note || null,
        settled_by: user.id,
      }).select());
      setCashSettlements([cashSettlementFromApi(r[0]), ...cashSettlements]);
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

  // BasketBar checkout — items: [{label, amount, cost, category, kind, stockKind?}]
  // Csak 2+ tételnél kap közös basket_id-t (egyetlen tétel nem "blokk", marad sima sor).
  async function checkoutBasket(items, payment, locId) {
    const basketId = items.length > 1 ? crypto.randomUUID() : null;
    for (const item of items) {
      await addTransaction({
        type: item.kind, description: item.label, amount: item.amount,
        costPrice: item.cost || 0, category: item.category, payment, basketId,
      }, locId);
    }
    const stockItem = items.find((it) => it.stockKind === "Telefon");
    const partItem = items.find((it) => it.stockKind === "Alkatrész");
    if (stockItem) setStockModal({ costPrice: stockItem.amount, locationId: locId });
    if (partItem) setPartModal({ costPrice: partItem.amount, source: partItem.label });
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
  function openOwnServiceModal(product) {
    const kind = product.status === "sold" ? "Saját készlet - garanciális" : "Saját készlet - előkészítés";
    setOwnServiceModal({ product, kind });
  }
  async function saveOwnServiceTicket(data, locId) {
    await addTicket(data, locId);
    setOwnServiceModal(null);
    // szándékosan NEM zárjuk be a ProductDetailPanel-t — a felhasználó rögtön lássa
    // a most létrejött "Előkészítés / szerviz" szekciót és kezdje címkézni az alkatrészeket.
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
      const becameReady = status === "Átadásra" && !(ticket && ticket.status === "Átadásra");
      const patch = { status, sub_status: subStatus };
      if (subStatus === "Átadva") patch.date_out = today();
      if (becameReady) patch.ready_at = new Date().toISOString();
      unwrap(await supabase.from("service_tickets").update(patch).eq("id", id));
      setTickets(tickets.map((t) => (t.id === id ? { ...t, status, subStatus, dateOut: subStatus === "Átadva" ? today() : t.dateOut, readyAt: becameReady ? patch.ready_at : t.readyAt } : t)));

      if (becameReady && subStatus === null && ticket && ticket.customerPhone) {
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

      if (ticket.ticketKind === "Saját készlet - előkészítés" && ticket.productId) {
        const product = stock.find((p) => p.id === ticket.productId);
        if (product) {
          const newCostPrice = Math.max(0, (Number(product.costPrice) || 0) - (Number(usedPart.costPrice) || 0) * usedPart.quantity);
          unwrap(await supabase.from("products").update({ cost_price: newCostPrice }).eq("id", ticket.productId));
          setStock(stock.map((p) => (p.id === ticket.productId ? { ...p, costPrice: newCostPrice } : p)));
        }
      }

      setTickets(tickets.map((t) => (t.id === ticketId ? { ...t, matCost: newMatCost, usedParts: (t.usedParts || []).filter((sp) => sp.id !== usedPart.id) } : t)));
    });
  }

  // FILTERED DATA
  const filteredStock = useMemo(() => {
    let s = stock.filter((i) => i.status === "in_stock");
    if (effectiveLocFilter !== "all") s = s.filter((i) => i.locationId === effectiveLocFilter || i.locationId === reserveLocId);
    const q = search.trim().toLowerCase();
    if (q) s = s.filter((i) => [i.brand, i.model, i.imei, i.color, phoneCode(i.productNo)].join(" ").toLowerCase().includes(q));
    return [...s].sort((a, b) => (a.brand || "").localeCompare(b.brand || "", "hu") || (a.model || "").localeCompare(b.model || "", "hu"));
  }, [stock, effectiveLocFilter, search, reserveLocId]);

  const txByProductId = useMemo(() => {
    const m = new Map();
    for (const t of transactions) if (t.productId) m.set(t.productId, t);
    return m;
  }, [transactions]);

  const soldStock = useMemo(() => {
    let s = stock.filter((i) => i.status === "sold");
    if (effectiveLocFilter !== "all") s = s.filter((i) => i.locationId === effectiveLocFilter || i.locationId === reserveLocId);
    const q = search.trim().toLowerCase();
    if (q) s = s.filter((i) => [i.brand, i.model, i.imei, i.color, phoneCode(i.productNo)].join(" ").toLowerCase().includes(q));
    const withTx = s.map((i) => ({ ...i, saleTx: txByProductId.get(i.id) || null }));
    return withTx.sort((a, b) => (b.saleTx?.date || "").localeCompare(a.saleTx?.date || ""));
  }, [stock, effectiveLocFilter, search, reserveLocId, txByProductId]);

  const filteredTransactions = useMemo(() => {
    if (effectiveLocFilter === "all") return transactions;
    return transactions.filter((t) => t.locationId === effectiveLocFilter);
  }, [transactions, effectiveLocFilter]);

  const dailyIncomeTrend = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days.map((d) => filteredTransactions.filter((t) => t.date === d && t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0));
  }, [filteredTransactions]);

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
    slowMoving: filteredStock.filter((p) => isSlowMoving(p, reserveLocId)).length,
  }), [filteredStock, reserveLocId]);

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

  // a fix QUICK_SALES lista helyett a tényleges, elmúlt 60 napi tartozék-eladásokból számolt
  // gyors-gombok (a telefon-eladások — amiknek van product_id-ja — nem tartozékok, kihagyjuk őket)
  const smartQuickItems = useMemo(() => {
    const cutoff = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    const recentSales = transactions.filter((t) => t.type === "income" && t.category === "Készlet" && !t.productId && t.date >= cutoff);
    const grouped = {};
    recentSales.forEach((t) => {
      const key = t.description;
      if (!grouped[key]) grouped[key] = { label: key, amounts: [], costs: [], count: 0 };
      grouped[key].amounts.push(Number(t.amount) || 0);
      grouped[key].costs.push(Number(t.costPrice) || 0);
      grouped[key].count += 1;
    });
    const computed = Object.values(grouped)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map((g) => ({
        label: g.label,
        amount: Math.round(g.amounts.reduce((s, a) => s + a, 0) / g.amounts.length),
        cost: Math.round(g.costs.reduce((s, a) => s + a, 0) / g.costs.length),
      }));
    return computed.length ? computed : QUICK_SALES;
  }, [transactions]);

  const svcStats = useMemo(() => {
    const customerTickets = filteredTickets.filter((t) => t.ticketKind === "Ügyfél");
    const sikertelenCount = customerTickets.filter((t) => t.subStatus === "Sikertelen").length;
    const kiadvaCount = handedOverTickets.length;
    const resolvedCount = kiadvaCount + sikertelenCount;

    const withMargin = handedOverTickets.filter((t) => t.price != null && t.matCost != null);
    const avgMargin = withMargin.length
      ? Math.round(withMargin.reduce((s, t) => s + (Number(t.price) - Number(t.matCost)), 0) / withMargin.length)
      : null;

    const withTAT = handedOverTickets.filter((t) => t.dateIn && t.dateOut);
    const avgTAT = withTAT.length
      ? Math.round((withTAT.reduce((s, t) => s + (new Date(t.dateOut) - new Date(t.dateIn)), 0) / withTAT.length / 86400000) * 10) / 10
      : null;

    const modelCounts = {};
    customerTickets.forEach((t) => {
      const key = [t.brand, t.model].filter(Boolean).join(" ").trim();
      if (key) modelCounts[key] = (modelCounts[key] || 0) + 1;
    });
    const topModels = Object.entries(modelCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));

    const problemCounts = {};
    let problemsSample = 0;
    customerTickets.forEach((t) => {
      const probs = (t.issue || "").split(",").map((p) => p.trim()).filter(Boolean);
      if (probs.length) problemsSample++;
      probs.forEach((p) => { problemCounts[p] = (problemCounts[p] || 0) + 1; });
    });
    const topProblems = Object.entries(problemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));

    const weekStart = rollingBusinessWeekStart();
    const kiadvaRecent = handedOverTickets.filter((t) => t.dateOut && t.dateOut >= weekStart).length;

    return {
      total: filteredTickets.length,
      active: customerTickets.filter((t) => t.status !== "Átadásra").length,
      inHouse: activeTickets.length,
      kesz: customerTickets.filter((t) => t.status === "Átadásra" && !t.subStatus).length,
      staleReady: customerTickets.filter((t) => isStaleReady(t) && !t.subStatus).length,
      staleFailed: customerTickets.filter((t) => isStaleReady(t) && t.subStatus === "Sikertelen").length,
      sikertelen: sikertelenCount,
      kiadva: kiadvaCount,
      kiadvaRecent,
      ownStock: filteredTickets.filter((t) => t.ticketKind !== "Ügyfél" && t.subStatus !== "Átadva").length,
      sikertelenPct: resolvedCount ? Math.round((sikertelenCount / resolvedCount) * 1000) / 10 : null,
      avgMargin,
      avgTAT,
      topModels,
      topProblems,
      problemsSample,
      problemsTotal: customerTickets.length,
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

  function buildWarrantyItems(active) {
    const saleItems = transactions
      .filter((t) => t.category === "Készlet" && t.warranty && isWarrantyActive(t.date, t.warranty) === active)
      .map((t) => ({
        key: `sale-${t.id}`, kind: "sale", source: "linked", refId: t.id,
        customerName: t.customerName, customerPhone: t.customerPhone,
        label: t.description, warranty: t.warranty, from: t.date, expiry: warrantyExpiry(t.date, t.warranty), locationId: t.locationId,
      }));
    const serviceItems = tickets
      .filter((t) => t.subStatus === "Átadva" && t.warranty && isWarrantyActive(t.dateOut, t.warranty) === active)
      .map((t) => ({
        key: `svc-${t.id}`, kind: "service", source: "linked", refId: t.id,
        customerName: t.customerName, customerPhone: t.customerPhone,
        label: [t.brand, t.model].filter(Boolean).join(" "), warranty: t.warranty, from: t.dateOut, expiry: warrantyExpiry(t.dateOut, t.warranty), locationId: t.locationId,
      }));
    const manualItems = warranties
      .filter((w) => isWarrantyActive(w.fromDate, w.warranty) === active)
      .map((w) => ({
        key: `manual-${w.id}`, kind: w.kind, source: "manual", refId: w.id,
        customerName: w.customerName, customerPhone: w.customerPhone,
        label: w.label, warranty: w.warranty, from: w.fromDate, expiry: warrantyExpiry(w.fromDate, w.warranty), locationId: w.locationId,
        note: w.note,
      }));
    return [...saleItems, ...serviceItems, ...manualItems];
  }
  const activeWarranties = useMemo(() => buildWarrantyItems(true).sort((a, b) => (a.expiry || "").localeCompare(b.expiry || "")), [transactions, tickets, warranties]);
  const expiredWarranties = useMemo(() => buildWarrantyItems(false).sort((a, b) => (b.expiry || "").localeCompare(a.expiry || "")), [transactions, tickets, warranties]);
  const filteredWarranties = warrantyFilter === "all" ? activeWarranties : activeWarranties.filter((w) => w.kind === warrantyFilter);

  const todoItems = useMemo(() => {
    const slaTickets = activeTickets
      .map((t) => ({ ticket: t, sla: slaInfo(t) }))
      .filter((x) => x.sla && (x.sla.level === "warn" || x.sla.level === "overdue"))
      .sort((a, b) => a.sla.days - b.sla.days);
    const soonWarranties = activeWarranties.filter((w) => {
      if (!w.expiry) return false;
      const daysLeft = Math.ceil((new Date(w.expiry) - new Date(today())) / 86400000);
      return daysLeft <= 14 && daysLeft >= 0;
    }).sort((a, b) => (a.expiry || "").localeCompare(b.expiry || ""));
    return { slaTickets, soonWarranties };
  }, [activeTickets, activeWarranties]);

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
  const partUsage = useMemo(() => {
    if (!partDetailId) return [];
    return tickets
      .flatMap((t) => (t.usedParts || []).filter((sp) => sp.partId === partDetailId).map((sp) => ({ ...sp, ticket: t })))
      .sort((a, b) => (b.ticket.dateIn || "").localeCompare(a.ticket.dateIn || ""));
  }, [tickets, partDetailId]);
  const allUsedParts = useMemo(() => {
    return tickets
      .flatMap((t) => (t.usedParts || []).map((sp) => ({ ...sp, ticket: t })))
      .sort((a, b) => (b.usedAt || "").localeCompare(a.usedAt || ""));
  }, [tickets]);
  const activeServiceTicket = useMemo(() => {
    if (!detailProduct) return null;
    return tickets.find((t) => t.productId === detailProduct.id && t.ticketKind !== "Ügyfél" && t.subStatus !== "Átadva") || null;
  }, [tickets, detailProduct]);
  const editingTicket = ticketModal && ticketModal !== "add" ? ticketModal : null;

  const noLocationAssigned = !isAdmin && !myLocationId;

  return (
    <div className="shell">
      <Sidebar
        tab={tab} setTab={setTab} setTicketModal={setTicketModal} isAdmin={isAdmin} locFilter={locFilter} setLocFilter={setLocFilter}
        allowedLocations={allowedLocations} myLocationId={myLocationId} locName={locName} profile={profile} user={user}
        signOut={signOut} setChangePasswordModal={setChangePasswordModal}
      />

      <div className="main">
        {error && <div className="errbar">{error}</div>}
        {info && <div className="banner ok">{info} <button type="button" className="banner-close" onClick={() => setInfo("")}><CloseIcon width={12} height={12} /></button></div>}
        {noLocationAssigned && (
          <div className="banner warn">Nincs helyszín hozzárendelve a fiókodhoz. Kérj meg egy adminisztrátort, hogy rendeljen hozzá egy helyszínt, addig nem látsz adatokat.</div>
        )}

        {!noLocationAssigned && isAdmin && tab === "dashboard" && (
          <DashboardTab
            effectiveLocFilter={effectiveLocFilter} locName={locName} stockStats={stockStats} stockHistory={stockHistory}
            svcStats={svcStats} monthlyTrendSummary={monthlyTrendSummary} currentMonthLive={currentMonthLive}
            monthlySummaries={monthlySummaries} locations={locations} txStats={txStats} partsStats={partsStats} customerStats={customerStats}
            todoItems={todoItems} setDetailId={setDetailId} setWarrantyDetailKey={setWarrantyDetailKey} setTab={setTab}
            stockSparkline={stockHistory.slice(-14).map((h) => h.value)} dailyIncomeTrend={dailyIncomeTrend}
          />
        )}

        {!noLocationAssigned && tab === "stock" && (
          <StockTab
            effectiveLocFilter={effectiveLocFilter} locName={locName} busy={busy} setStockModal={setStockModal}
            search={search} setSearch={setSearch} loadingData={loadingData} filteredStock={filteredStock}
            locations={locations} reserveLocId={reserveLocId} setProductDetailId={setProductDetailId}
            deleteProduct={deleteProduct} setSellModal={setSellModal} stockStats={stockStats}
            soldStock={soldStock}
          />
        )}

        {!noLocationAssigned && tab === "finance" && (
          <FinanceTab
            effectiveLocFilter={effectiveLocFilter} locName={locName}
            allowedLocations={allowedLocations} defaultLocId={defaultLocId} busy={busy}
            loadingData={loadingData} filteredTransactions={filteredTransactions} setTxModal={setTxModal}
            deleteTransaction={deleteTransaction} setReceiptTxId={setReceiptTxId}
            smartQuickItems={smartQuickItems} checkoutBasket={checkoutBasket}
          />
        )}

        {isAdmin && tab === "cash-settlement" && (
          <CashSettlementTab
            busy={busy} transactions={transactions} cashHolders={cashHolders} cashSettlements={cashSettlements}
            saveCashSettlement={saveCashSettlement} users={users}
          />
        )}

        {!noLocationAssigned && tab === "service" && (
          <ServiceTab
            effectiveLocFilter={effectiveLocFilter} locName={locName} busy={busy} setTicketModal={setTicketModal}
            svcSearch={svcSearch} setSvcSearch={setSvcSearch} svcKindFilter={svcKindFilter} setSvcKindFilter={setSvcKindFilter}
            loadingData={loadingData} activeTickets={activeTickets} setDetailId={setDetailId}
            handedOverTickets={handedOverTickets}
            svcStats={svcStats}
          />
        )}

        {!noLocationAssigned && tab === "parts" && (
          <PartsTab
            busy={busy} setPartModal={setPartModal} partSearch={partSearch} setPartSearch={setPartSearch}
            loadingData={loadingData} filteredParts={filteredParts} setPartDetailId={setPartDetailId} deletePart={deletePart}
            partsStats={partsStats} allUsedParts={allUsedParts} locName={locName} setDetailId={setDetailId}
          />
        )}

        {!noLocationAssigned && tab === "customers" && (
          <CustomersTab
            effectiveLocFilter={effectiveLocFilter} locName={locName} busy={busy} setCustomerModal={setCustomerModal}
            custSearch={custSearch} setCustSearch={setCustSearch} loadingData={loadingData} customers={customers} setCustomerKey={setCustomerKey}
            customerStats={customerStats}
          />
        )}

        {!noLocationAssigned && tab === "warranty" && (
          <WarrantyTab
            busy={busy} setWarrantyModal={setWarrantyModal} activeWarranties={activeWarranties}
            warrantyFilter={warrantyFilter} setWarrantyFilter={setWarrantyFilter} loadingData={loadingData}
            filteredWarranties={filteredWarranties} setWarrantyDetailKey={setWarrantyDetailKey} locName={locName}
            expiredWarranties={expiredWarranties}
          />
        )}

        {!noLocationAssigned && tab === "leave" && (
          <LeaveTab
            leaveYear={leaveYear} busy={busy} setLeaveRequestModal={setLeaveRequestModal} coverageWarnings={coverageWarnings}
            locName={locName} users={users} leaveBalanceByUser={leaveBalanceByUser} isAdmin={isAdmin}
            setLeaveBalanceModal={setLeaveBalanceModal} upcomingLeave={upcomingLeave} leaveTypes={leaveTypes} user={user}
            decideLeaveRequest={decideLeaveRequest} revokeLeaveRequest={revokeLeaveRequest}
          />
        )}

        {!noLocationAssigned && isAdmin && tab === "buyback" && (
          <BuybackTab
            busy={busy} buybackModels={buybackModels} setBuybackModelModal={setBuybackModelModal} deleteBuybackModel={deleteBuybackModel}
            buybackRules={buybackRules} setBuybackRuleModal={setBuybackRuleModal} deleteBuybackRule={deleteBuybackRule}
          />
        )}

        {!noLocationAssigned && isAdmin && tab === "repair-prices" && (
          <RepairPricesTab
            repairPrices={repairPrices} setRepairPriceModal={setRepairPriceModal} repairLeads={repairLeads}
            repairLeadFilter={repairLeadFilter} setRepairLeadFilter={setRepairLeadFilter} busy={busy}
            setRepairLeadConvert={setRepairLeadConvert} setTicketModal={setTicketModal} rejectRepairLead={rejectRepairLead} locName={locName}
          />
        )}

        {!noLocationAssigned && isAdmin && tab === "users" && (
          <UsersTab
            busy={busy} setInviteError={setInviteError} setInviteModal={setInviteModal} loadingData={loadingData}
            users={users} user={user} updateUserProfile={updateUserProfile} allowedLocations={allowedLocations}
            resetEmployeePassword={resetEmployeePassword} deleteEmployee={deleteEmployee}
          />
        )}

        {!noLocationAssigned && tab === "trash" && (
          <TrashTab
            trashLoading={trashLoading} trash={trash} busy={busy} restoreProduct={restoreProduct} hardDeleteProduct={hardDeleteProduct}
            restorePart={restorePart} hardDeletePart={hardDeletePart} restoreTransaction={restoreTransaction}
            hardDeleteTransaction={hardDeleteTransaction} restoreTicket={restoreTicket} hardDeleteTicket={hardDeleteTicket}
            hardDeleteAllTrash={hardDeleteAllTrash}
          />
        )}
      </div>

      {stockModal && (
        <StockModal
          product={typeof stockModal === "object" && stockModal?.id ? stockModal : null}
          prefill={typeof stockModal === "object" && !stockModal?.id ? stockModal : null}
          locations={stockLocations}
          onClose={() => setStockModal(null)}
          busy={busy}
          defaultLocId={defaultStockLocId}
          onSave={(data, locId) => (typeof stockModal === "object" && stockModal?.id ? editProduct(stockModal.id, data, locId) : addProduct(data, locId))}
        />
      )}
      {sellModal && <SellModal item={sellModal} locName={locName} customers={customersTable} onClose={() => setSellModal(null)} onSave={sellProduct} busy={busy} />}
      {partModal && (
        <PartModal
          part={typeof partModal === "object" && partModal?.id ? partModal : null}
          prefill={typeof partModal === "object" && !partModal?.id ? partModal : null}
          onClose={() => setPartModal(null)}
          busy={busy}
          onSave={(data) => (typeof partModal === "object" && partModal?.id ? editPart(partModal.id, data) : addPart(data))}
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
          stock={stock}
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
          saleTx={detailProduct.status === "sold" ? txByProductId.get(detailProduct.id) : null}
          locName={locName}
          busy={busy}
          users={users}
          parts={parts}
          activeServiceTicket={activeServiceTicket}
          onAddPart={addPartToTicket}
          onRemovePart={removePartFromTicket}
          onStartService={openOwnServiceModal}
          onOpenTicket={(id) => { setProductDetailId(null); setDetailId(id); }}
          onClose={() => setProductDetailId(null)}
          onSell={(p) => { setProductDetailId(null); setSellModal(p); }}
          onEdit={(p) => { setProductDetailId(null); setStockModal(p); }}
          onDelete={(id) => { deleteProduct(id); setProductDetailId(null); }}
          onReturnToStock={returnProductToStock}
        />
      )}
      {ownServiceModal && (
        <OwnStockServiceModal
          product={ownServiceModal.product}
          kind={ownServiceModal.kind}
          locations={locations}
          users={users}
          busy={busy}
          onClose={() => setOwnServiceModal(null)}
          onSave={saveOwnServiceTicket}
        />
      )}
      {detailPart && (
        <PartDetailPanel
          part={detailPart}
          busy={busy}
          onClose={() => setPartDetailId(null)}
          onEdit={(p) => { setPartDetailId(null); setPartModal(p); }}
          onDelete={(id) => { deletePart(id); setPartDetailId(null); }}
          partUsage={partUsage}
          onOpenTicket={(id) => { setPartDetailId(null); setDetailId(id); }}
          locName={locName}
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
        const w = activeWarranties.find((x) => x.key === warrantyDetailKey) || expiredWarranties.find((x) => x.key === warrantyDetailKey);
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
        {printTicket && <PrintSlip ticket={printTicket} location={locations.find((l) => l.id === printTicket.locationId)} intakeLocation={locations.find((l) => l.id === (printTicket.intakeLocationId || printTicket.locationId))} />}
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
        <ChatIcon width={22} height={22} />
        {chatUnread > 0 && <span className="chat-fab-badge">{chatUnread > 9 ? "9+" : chatUnread}</span>}
      </button>
      {chatOpen && (
        <TeamChatPanel
          messages={chatMessages}
          users={users}
          tickets={tickets}
          stock={stock}
          parts={parts}
          customersTable={customersTable}
          warranties={warranties}
          locName={locName}
          currentUserId={profile?.id}
          onSend={sendChatMessage}
          onOpenTicket={(id) => { setChatOpen(false); setDetailId(id); }}
          onOpenProduct={(id) => { setChatOpen(false); setProductDetailId(id); }}
          onOpenPart={(id) => { setChatOpen(false); setPartDetailId(id); }}
          onOpenCustomer={(id) => { setChatOpen(false); setCustomerKey(id); }}
          onOpenWarranty={(id) => { setChatOpen(false); setTab("warranty"); setWarrantyDetailKey(`manual-${id}`); }}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
