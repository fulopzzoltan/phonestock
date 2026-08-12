import { useState, useEffect, useMemo } from "react";
import { useAuth } from "./lib/AuthContext";
import { supabase, unwrap } from "./lib/supabaseClient";
import { pFromApi, pToApi, txFromApi, txToApi, tFromApi, tToApi, partFromApi, partToApi, spFromApi, profileFromApi } from "./lib/mappers";
import { money, today, STATUSES, PART_CATEGORIES, warrantyExpiry, isWarrantyActive, stripAccents } from "./lib/utils";
import Login from "./Login";
import StockModal from "./components/StockModal";
import SellModal from "./components/SellModal";
import PartModal from "./components/PartModal";
import TicketCard from "./components/TicketCard";
import DetailPanel from "./components/DetailPanel";
import ProductDetailPanel from "./components/ProductDetailPanel";
import PartDetailPanel from "./components/PartDetailPanel";
import StockValueChart from "./components/StockValueChart";
import TicketFormModal from "./components/TicketFormModal";
import QuickSaleButtons from "./components/QuickSaleButtons";
import TransactionQuickAdd from "./components/TransactionQuickAdd";
import TransactionsPeriodList from "./components/TransactionsPeriodList";
import TransactionModal from "./components/TransactionModal";
import CustomerDetailPanel from "./components/CustomerDetailPanel";
import PrintSlip from "./components/PrintSlip";
import SaleReceiptPanel from "./components/SaleReceiptPanel";
import PrintReceiptSlip from "./components/PrintReceiptSlip";
import {
  SearchIcon, EditIcon, LogoIcon, DashboardIcon, ServiceIcon, PhoneCaseIcon,
  PartsIcon, FinanceIcon, CustomersIcon, WarrantyIcon, UsersNavIcon, TrashNavIcon, LogoutIcon,
} from "./components/icons";
import ConfirmDelete from "./components/ConfirmDelete";

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
  const [loadingData, setLoadingData] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [svcSearch, setSvcSearch] = useState("");
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
  const [printTicket, setPrintTicket] = useState(null);
  const [receiptTxId, setReceiptTxId] = useState(null);
  const [printReceipt, setPrintReceipt] = useState(null);
  const [stockHistory, setStockHistory] = useState([]);
  const [trash, setTrash] = useState(null); // null = not loaded | { products, parts, transactions, tickets }
  const [trashLoading, setTrashLoading] = useState(false);

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

  async function loadAll() {
    setLoadingData(true);
    try {
      const [locs, prods, txs, tcks, prs, sps, usrs, hist] = await Promise.all([
        supabase.from("locations").select("*").order("name", { ascending: true }),
        supabase.from("products").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("transactions").select("*").is("deleted_at", null).order("date", { ascending: false }),
        supabase.from("service_tickets").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("parts").select("*").is("deleted_at", null).order("name", { ascending: true }),
        supabase.from("service_parts").select("*"),
        supabase.from("profiles").select("*").order("full_name", { ascending: true }),
        supabase.from("stock_value_history").select("*").order("date", { ascending: true }),
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
      unwrap(await supabase.from("products").update({ status: "sold" }).eq("id", txData.productId));
      const r = unwrap(await supabase.from("transactions").insert(txToApi(txData, locId)).select());
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

  // USERS (admin only)
  async function updateUserProfile(id, patch) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("profiles").update(patch).eq("id", id).select());
      setUsers(users.map((u) => (u.id === id ? profileFromApi(r[0]) : u)));
    });
  }

  // TRANSACTIONS
  async function addTransaction(data, locId) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("transactions").insert(txToApi(data, locId)).select());
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
      const r = unwrap(await supabase.from("service_tickets").insert(tToApi(data, locId)).select());
      const newTicket = tFromApi(r[0]);
      setTickets([newTicket, ...tickets]);
      setTicketModal(null);

      if (newTicket.customerPhone) {
        const device = [newTicket.brand, newTicket.model].filter(Boolean).join(" ");
        const message = stripAccents(`Szia! Atvettuk a keszulekedet (${device}), munkalapszam: #${newTicket.ticketNo}. A javitas allapotat itt kovetheted nyomon: ${window.location.origin}/s/${newTicket.shortCode}`);
        supabase.functions.invoke("send-sms", { body: { phone: newTicket.customerPhone, message } }).catch(() => {});
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
        const message = stripAccents(`Szia! A(z) ${device} javítása elkészült, átveheted nálunk (${locName(ticket.locationId)}). Részletek: ${window.location.origin}/s/${ticket.shortCode}`);
        supabase.functions.invoke("send-sms", { body: { phone: ticket.customerPhone, message } }).catch(() => {});
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
    });
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
    return t;
  }, [tickets, effectiveLocFilter, svcSearch]);

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

  const svcStats = useMemo(() => ({
    total: filteredTickets.length,
    active: filteredTickets.filter((t) => t.status !== "Átadásra").length,
    kesz: filteredTickets.filter((t) => t.status === "Átadásra" && !t.subStatus).length,
    sikertelen: filteredTickets.filter((t) => t.subStatus === "Sikertelen").length,
    kiadva: handedOverTickets.length,
  }), [filteredTickets, handedOverTickets]);

  const customers = useMemo(() => {
    // RO telefonszámok 9 érdemi számjegyből állnak, akár "0" (10 jegy), akár "+40"/"40" (11 jegy)
    // előtaggal írjuk — az utolsó 9 jegyre normalizálva ugyanaz a szám mindig ugyanoda kulcsolódik.
    const norm = (p) => (p || "").replace(/\D/g, "").slice(-9);
    const map = new Map();
    function addEntry(name, phone, kind, record) {
      const key = norm(phone) || (name ? `name:${name.trim().toLowerCase()}` : null);
      if (!key) return;
      if (!map.has(key)) map.set(key, { key, name: "", phone: "", purchases: [], tickets: [] });
      const c = map.get(key);
      if (name && !c.name) c.name = name;
      if (phone && !c.phone) c.phone = phone;
      if (kind === "purchase") c.purchases.push(record);
      else c.tickets.push(record);
    }
    filteredTransactions.filter((t) => t.type === "income" && t.customerName).forEach((t) => addEntry(t.customerName, t.customerPhone, "purchase", t));
    filteredTickets.forEach((t) => addEntry(t.customerName, t.customerPhone, "ticket", t));
    let list = [...map.values()].map((c) => ({
      ...c,
      purchaseTotal: c.purchases.reduce((s, p) => s + (Number(p.amount) || 0), 0),
      ticketTotal: c.tickets.reduce((s, t) => s + (Number(t.price) || 0), 0),
      lastActivity: [...c.purchases.map((p) => p.date), ...c.tickets.map((t) => t.dateIn)].filter(Boolean).sort().reverse()[0] || "",
    }));
    const q = custSearch.trim().toLowerCase();
    if (q) list = list.filter((c) => [c.name, c.phone].join(" ").toLowerCase().includes(q));
    return list.sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
  }, [filteredTransactions, filteredTickets, custSearch]);

  const customerStats = useMemo(() => ({
    count: customers.length,
    revenue: customers.reduce((s, c) => s + c.purchaseTotal + c.ticketTotal, 0),
    avg: customers.length ? customers.reduce((s, c) => s + c.purchaseTotal + c.ticketTotal, 0) / customers.length : 0,
  }), [customers]);

  const activeWarranties = useMemo(() => {
    const saleItems = transactions
      .filter((t) => t.category === "Készlet" && t.warranty && isWarrantyActive(t.date, t.warranty))
      .map((t) => ({
        key: `sale-${t.id}`, kind: "sale", customerName: t.customerName, customerPhone: t.customerPhone,
        label: t.description, warranty: t.warranty, from: t.date, expiry: warrantyExpiry(t.date, t.warranty), locationId: t.locationId,
      }));
    const serviceItems = tickets
      .filter((t) => t.subStatus === "Átadva" && t.warranty && isWarrantyActive(t.dateOut, t.warranty))
      .map((t) => ({
        key: `svc-${t.id}`, kind: "service", customerName: t.customerName, customerPhone: t.customerPhone,
        label: [t.brand, t.model].filter(Boolean).join(" "), warranty: t.warranty, from: t.dateOut, expiry: warrantyExpiry(t.dateOut, t.warranty), locationId: t.locationId,
      }));
    return [...saleItems, ...serviceItems].sort((a, b) => (a.expiry || "").localeCompare(b.expiry || ""));
  }, [transactions, tickets]);

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
          <button className={`navbtn ${tab === "warranty" ? "active" : ""}`} onClick={() => setTab("warranty")}><WarrantyIcon className="nav-ic" />Garanciális</button>

          <div className="nav-lbl">Admin</div>
          {isAdmin && (
            <button className={`navbtn ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}><UsersNavIcon className="nav-ic" />Felhasználók</button>
          )}
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
            <button className="logout-btn" title="Kijelentkezés" onClick={signOut}>
              <LogoutIcon />
            </button>
          </div>
        </div>
      </div>

      <div className="main">
        {error && <div className="errbar">{error}</div>}
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
            <div className="statrow c5" style={{ marginBottom: 26 }}>
              <div className="statcard accent"><div className="lbl">Összes</div><div className="val">{svcStats.total}</div></div>
              <div className="statcard"><div className="lbl">Aktív</div><div className="val">{svcStats.active}</div></div>
              <div className="statcard"><div className="lbl">Kész</div><div className="val" style={{ color: "#15803D" }}>{svcStats.kesz}</div></div>
              <div className="statcard"><div className="lbl">Sikertelen</div><div className="val" style={{ color: "#9D174D" }}>{svcStats.sikertelen}</div></div>
              <div className="statcard"><div className="lbl">Kiadva</div><div className="val">{svcStats.kiadva}</div></div>
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>💰 Bevételek &amp; Kiadások</div>
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
            </div>
            {loadingData ? <div className="empty">Betöltés...</div> : (
              <div className="kanban-wrap">
                <div className="kanban">
                  {STATUSES.map((col) => {
                    const items = activeTickets.filter((t) => t.status === col.key);
                    return (
                      <div className="k-col" key={col.key} style={{ "--col-color": col.color }}>
                        <div className="k-col-head">
                          <div className="k-col-title"><span className="k-dot"></span>{col.key}</div>
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
            </div>
            <div className="filter-row">
              <div className="searchbar"><SearchIcon /><input placeholder="Keresés név vagy telefonszám..." value={custSearch} onChange={(e) => setCustSearch(e.target.value)} /></div>
            </div>
            <div className="tw">
              {loadingData ? <div className="empty">Betöltés...</div> : customers.length === 0 ? <div className="empty">Nincs ügyfél.</div> : (
                <table>
                  <thead><tr><th>Név</th><th>Telefonszám</th><th>Vásárlások</th><th>Szerviz</th><th>Utolsó aktivitás</th></tr></thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.key} style={{ cursor: "pointer" }} onClick={() => setCustomerKey(c.key)}>
                        <td style={{ fontWeight: 600 }}>{c.name || "Névtelen"}</td>
                        <td className="mono">{c.phone || "—"}</td>
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
              <div><div className="page-title">Garanciális</div><div className="page-sub">Aktív garanciák — telefoneladás és szerviz, lejárat szerint</div></div>
            </div>
            <div className="statrow c1">
              <div className="statcard accent"><div className="lbl">Aktív garancia</div><div className="val">{activeWarranties.length} db</div></div>
            </div>
            <div className="tw">
              {loadingData ? <div className="empty">Betöltés...</div> : activeWarranties.length === 0 ? <div className="empty">Nincs aktív garancia.</div> : (
                <table>
                  <thead><tr><th>Típus</th><th>Ügyfél</th><th>Termék / Eszköz</th><th>Garancia</th><th>Lejárat</th><th>Helyszín</th></tr></thead>
                  <tbody>
                    {activeWarranties.map((w) => {
                      const daysLeft = w.expiry ? Math.ceil((new Date(w.expiry) - new Date(today())) / 86400000) : null;
                      return (
                        <tr key={w.key}>
                          <td>{w.kind === "sale" ? <span className="badge-income">Eladás</span> : <span className="badge-loc">Szerviz</span>}</td>
                          <td style={{ fontWeight: 600 }}>{w.customerName || "—"}</td>
                          <td>{w.label || "—"}</td>
                          <td><span className="gar-pill">{w.warranty}</span></td>
                          <td className="mono" style={{ fontWeight: 700, color: daysLeft != null && daysLeft <= 14 ? "#DC2626" : "#111827" }}>
                            {w.expiry} {daysLeft != null && <span style={{ fontWeight: 500, color: "#9CA3AF" }}>({daysLeft} nap)</span>}
                          </td>
                          <td><span className="badge-loc">{locName(w.locationId)}</span></td>
                        </tr>
                      );
                    })}
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
            </div>
            <div className="tw">
              {loadingData ? <div className="empty">Betöltés...</div> : users.length === 0 ? <div className="empty">Nincs felhasználó.</div> : (
                <table>
                  <thead><tr><th>Név</th><th>Email</th><th>Szerepkör</th><th>Helyszín</th></tr></thead>
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
                              <td><button className="btn sec sm" disabled={busy} onClick={() => restoreProduct(p.id)}>Visszaállítás</button></td>
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
                              <td><button className="btn sec sm" disabled={busy} onClick={() => restorePart(p.id)}>Visszaállítás</button></td>
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
                              <td><button className="btn sec sm" disabled={busy} onClick={() => restoreTransaction(t.id)}>Visszaállítás</button></td>
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
                              <td><button className="btn sec sm" disabled={busy} onClick={() => restoreTicket(t.id)}>Visszaállítás</button></td>
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
      {sellModal && <SellModal item={sellModal} locName={locName} onClose={() => setSellModal(null)} onSave={sellProduct} busy={busy} />}
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
          locations={allowedLocations}
          defaultLocId={defaultLocId}
          onClose={() => setTicketModal(null)}
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
          onClose={() => setDetailId(null)}
          onStatusChange={setTicketStatus}
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
        <CustomerDetailPanel customer={detailCustomer} locName={locName} onClose={() => setCustomerKey(null)} />
      )}
      {receiptTx && (
        <SaleReceiptPanel tx={receiptTx} locName={locName} onClose={() => setReceiptTxId(null)} onPrint={printReceiptSlip} />
      )}
      <div id="print-slip-root">
        {printTicket && <PrintSlip ticket={printTicket} location={locations.find((l) => l.id === printTicket.locationId)} />}
        {printReceipt && <PrintReceiptSlip tx={printReceipt} location={locations.find((l) => l.id === printReceipt.locationId)} />}
      </div>
    </div>
  );
}
