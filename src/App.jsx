import { useState, useEffect, useMemo } from "react";
import { useAuth } from "./lib/AuthContext";
import { supabase, unwrap } from "./lib/supabaseClient";
import { pFromApi, pToApi, txFromApi, txToApi, tFromApi, tToApi, partFromApi, partToApi, spFromApi } from "./lib/mappers";
import { money, today, STATUSES } from "./lib/utils";
import Login from "./Login";
import StockModal from "./components/StockModal";
import SellModal from "./components/SellModal";
import PartModal from "./components/PartModal";
import TicketCard from "./components/TicketCard";
import DetailPanel from "./components/DetailPanel";
import ProductDetailPanel from "./components/ProductDetailPanel";
import TicketFormModal from "./components/TicketFormModal";
import TransactionQuickAdd from "./components/TransactionQuickAdd";
import TransactionsPeriodList from "./components/TransactionsPeriodList";
import TransactionModal from "./components/TransactionModal";
import CustomerDetailPanel from "./components/CustomerDetailPanel";
import { SearchIcon, TrashIcon, EditIcon } from "./components/icons";

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

  const [tab, setTab] = useState("stock");
  const [locFilter, setLocFilter] = useState("all");
  const [locations, setLocations] = useState([]);
  const [stock, setStock] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [parts, setParts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [svcSearch, setSvcSearch] = useState("");
  const [custSearch, setCustSearch] = useState("");
  const [period, setPeriod] = useState("day");

  const [stockModal, setStockModal] = useState(null); // null | "add" | product obj (edit)
  const [sellModal, setSellModal] = useState(null);
  const [partModal, setPartModal] = useState(null); // null | "add" | part obj (edit)
  const [txModal, setTxModal] = useState(null); // null | tx obj (edit)
  const [ticketModal, setTicketModal] = useState(null); // null | "add" | ticket obj (edit)
  const [detailId, setDetailId] = useState(null);
  const [productDetailId, setProductDetailId] = useState(null);
  const [showHandedOver, setShowHandedOver] = useState(false);
  const [customerKey, setCustomerKey] = useState(null);

  async function loadAll() {
    setLoadingData(true);
    try {
      const [locs, prods, txs, tcks, prs, sps] = await Promise.all([
        supabase.from("locations").select("*").order("name", { ascending: true }),
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("transactions").select("*").order("date", { ascending: false }),
        supabase.from("service_tickets").select("*").order("created_at", { ascending: false }),
        supabase.from("parts").select("*").order("name", { ascending: true }),
        supabase.from("service_parts").select("*"),
      ]);
      setLocations(unwrap(locs) || []);
      setStock((unwrap(prods) || []).map(pFromApi));
      setTransactions((unwrap(txs) || []).map(txFromApi));
      const spByTicket = {};
      (unwrap(sps) || []).map(spFromApi).forEach((sp) => {
        (spByTicket[sp.ticketId] ||= []).push(sp);
      });
      setTickets((unwrap(tcks) || []).map((r) => ({ ...tFromApi(r), usedParts: spByTicket[r.id] || [] })));
      setParts((unwrap(prs) || []).map(partFromApi));
      setError("");
    } catch (e) {
      setError("Betöltési hiba: " + e.message);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function withBusy(fn) {
    setBusy(true);
    try { await fn(); setError(""); }
    catch (e) { setError(e.message || "Hiba történt."); }
    finally { setBusy(false); }
  }

  const locName = (id) => locations.find((l) => l.id === id)?.name || "—";
  const allowedLocations = isAdmin ? locations : locations.filter((l) => l.id === myLocationId);
  const effectiveLocFilter = isAdmin ? locFilter : (myLocationId || "none");
  const defaultLocId = isAdmin ? (locFilter !== "all" ? locFilter : locations[0]?.id) : myLocationId;

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
      unwrap(await supabase.from("products").delete().eq("id", id));
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
      unwrap(await supabase.from("parts").delete().eq("id", id));
      setParts(parts.filter((p) => p.id !== id));
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
      unwrap(await supabase.from("transactions").delete().eq("id", id));
      setTransactions(transactions.filter((t) => t.id !== id));
    });
  }

  // SERVICE
  async function addTicket(data, locId) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("service_tickets").insert(tToApi(data, locId)).select());
      setTickets([tFromApi(r[0]), ...tickets]);
      setTicketModal(null);
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
      unwrap(await supabase.from("service_tickets").delete().eq("id", id));
      setTickets(tickets.filter((t) => t.id !== id));
      setDetailId(null);
    });
  }
  async function addPartToTicket(ticketId, part, qty) {
    await withBusy(async () => {
      const ticket = tickets.find((t) => t.id === ticketId);
      const unitPrice = Number(part.salePrice) || 0;
      const unitCost = Number(part.costPrice) || 0;
      const r = unwrap(await supabase.from("service_parts").insert({
        service_ticket_id: ticketId, part_id: part.id, part_name: part.name, quantity: qty, unit_price: unitPrice, cost_price: unitCost,
      }).select());
      const newQty = (Number(part.quantity) || 0) - qty;
      unwrap(await supabase.from("parts").update({ quantity: newQty }).eq("id", part.id));
      const newPrice = (Number(ticket.price) || 0) + unitPrice * qty;
      const newMatCost = (Number(ticket.matCost) || 0) + unitCost * qty;
      unwrap(await supabase.from("service_tickets").update({ price: newPrice, mat_cost: newMatCost }).eq("id", ticketId));

      setParts(parts.map((p) => (p.id === part.id ? { ...p, quantity: newQty } : p)));
      setTickets(tickets.map((t) => (t.id === ticketId ? { ...t, price: newPrice, matCost: newMatCost, usedParts: [...(t.usedParts || []), spFromApi(r[0])] } : t)));
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
      const newPrice = Math.max(0, (Number(ticket.price) || 0) - (Number(usedPart.unitPrice) || 0) * usedPart.quantity);
      const newMatCost = Math.max(0, (Number(ticket.matCost) || 0) - (Number(usedPart.costPrice) || 0) * usedPart.quantity);
      unwrap(await supabase.from("service_tickets").update({ price: newPrice, mat_cost: newMatCost }).eq("id", ticketId));
      setTickets(tickets.map((t) => (t.id === ticketId ? { ...t, price: newPrice, matCost: newMatCost, usedParts: (t.usedParts || []).filter((sp) => sp.id !== usedPart.id) } : t)));
    });
  }

  // FILTERED DATA
  const filteredStock = useMemo(() => {
    let s = stock.filter((i) => i.status === "in_stock");
    if (effectiveLocFilter !== "all") s = s.filter((i) => i.locationId === effectiveLocFilter);
    const q = search.trim().toLowerCase();
    if (q) s = s.filter((i) => [i.brand, i.model, i.imei, i.color].join(" ").toLowerCase().includes(q));
    return s;
  }, [stock, effectiveLocFilter, search]);

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
    count: parts.length,
    value: parts.reduce((a, p) => a + (Number(p.costPrice) || 0) * (Number(p.quantity) || 0), 0),
    low: parts.filter((p) => Number(p.quantity) <= 2).length,
    qty: parts.reduce((a, p) => a + (Number(p.quantity) || 0), 0),
  }), [parts]);

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
    const norm = (p) => (p || "").replace(/\D/g, "");
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

  const detailCustomer = customerKey ? customers.find((c) => c.key === customerKey) : null;

  const detailTicket = detailId ? tickets.find((t) => t.id === detailId) : null;
  const detailProduct = productDetailId ? stock.find((i) => i.id === productDetailId) : null;
  const editingTicket = ticketModal && ticketModal !== "add" ? ticketModal : null;

  const noLocationAssigned = !isAdmin && !myLocationId;

  return (
    <div className="shell">
      <div className="sidebar">
        <div className="sidebar-inner">
          <div className="brand">
            <div className="brand-icon"><svg viewBox="0 0 24 24"><path d="M17 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2zm-5 15a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3-7H9V5h6v5z" /></svg></div>
            <div className="brand-name">TELEF<span>O</span>NOS</div>
          </div>
          <button className={`navbtn ${tab === "stock" ? "active" : ""}`} onClick={() => setTab("stock")}>📱 Telefonok</button>
          <button className={`navbtn ${tab === "finance" ? "active" : ""}`} onClick={() => setTab("finance")}>💰 Bevételek &amp; Kiadások</button>
          <button className={`navbtn ${tab === "service" ? "active" : ""}`} onClick={() => setTab("service")}>🔧 Szerviz</button>
          <button className={`navbtn ${tab === "parts" ? "active" : ""}`} onClick={() => setTab("parts")}>🔩 Alkatrészek</button>
          <button className={`navbtn ${tab === "customers" ? "active" : ""}`} onClick={() => setTab("customers")}>👤 Kliensek</button>
        </div>
        <div className="sidebar-bottom">
          {isAdmin ? (
            <div className="loc-sw">
              <button className={`loc-btn ${locFilter === "all" ? "active" : ""}`} onClick={() => setLocFilter("all")}>Mind</button>
              {locations.map((l) => (
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="main">
        {error && <div className="errbar">{error}</div>}
        {noLocationAssigned && (
          <div className="banner warn">Nincs helyszín hozzárendelve a fiókodhoz. Kérj meg egy adminisztrátort, hogy rendeljen hozzá egy helyszínt, addig nem látsz adatokat.</div>
        )}

        {!noLocationAssigned && tab === "stock" && (
          <>
            <div className="topbar">
              <div><div className="page-title">Telefonok</div><div className="page-sub">{effectiveLocFilter === "all" ? "Mindkét helyszín" : locName(effectiveLocFilter)}</div></div>
              <button className="btn" disabled={busy} onClick={() => setStockModal("add")}>+ Új termék</button>
            </div>
            <div className="statrow c4">
              <div className="statcard accent"><div className="lbl">Raktáron</div><div className="val">{stockStats.count} db</div></div>
              <div className="statcard"><div className="lbl">Készlet értéke</div><div className="val">{money(stockStats.value)}</div></div>
              <div className="statcard"><div className="lbl">Besz. érték</div><div className="val">{money(stockStats.cost)}</div></div>
              <div className="statcard"><div className="lbl">Várható profit</div><div className="val" style={{ color: "#22C55E" }}>{money(stockStats.profit)}</div></div>
            </div>
            <div className="filter-row">
              <div className="searchbar"><SearchIcon /><input placeholder="Keresés..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            </div>
            <div className="tw">
              {loadingData ? <div className="empty">Betöltés...</div> : filteredStock.length === 0 ? <div className="empty">Nincs termék raktáron.</div> : (
                <table>
                  <thead><tr><th>Termék</th><th>Hely</th><th>Állapot</th><th>Tárhely/Szín</th><th>IMEI</th><th>Besz.</th><th>Ár</th><th></th></tr></thead>
                  <tbody>
                    {filteredStock.map((i) => (
                      <tr key={i.id} style={{ cursor: "pointer" }} onClick={() => setProductDetailId(i.id)}>
                        <td style={{ fontWeight: 600 }}>{i.brand} {i.model}</td>
                        <td><span className="badge-loc">{locName(i.locationId)}</span></td>
                        <td><span className={`st ${i.condition === "New" ? "st-kesz" : "st-beveve"}`}>{i.condition === "New" ? "Új" : `Felúj. ${i.grade || ""}`}</span></td>
                        <td className="mono">{[i.storage, i.color].filter(Boolean).join(" / ") || "—"}</td>
                        <td className="mono" style={{ color: "#9CA3AF" }}>{i.imei || "—"}</td>
                        <td className="mono" style={{ color: "#6B7280" }}>{money(i.costPrice)}</td>
                        <td className="mono" style={{ fontWeight: 700 }}>{money(i.salePrice)}</td>
                        <td style={{ display: "flex", gap: 5 }} onClick={(e) => e.stopPropagation()}>
                          <button className="btn sec sm" disabled={busy} onClick={() => setSellModal(i)}>Eladva</button>
                          <button className="iconbtn" disabled={busy} onClick={() => setStockModal(i)}><EditIcon /></button>
                          <button className="iconbtn" disabled={busy} onClick={() => deleteProduct(i.id)}><TrashIcon /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
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
            <div className="statrow c4">
              <div className="statcard accent"><div className="lbl">Tranzakciók</div><div className="val">{txStats.count}</div></div>
              <div className="statcard"><div className="lbl">Bevétel</div><div className="val" style={{ color: "#15803D" }}>{money(txStats.income)}</div></div>
              <div className="statcard"><div className="lbl">Kiadás</div><div className="val" style={{ color: "#B91C1C" }}>{money(txStats.expense)}</div></div>
              <div className="statcard"><div className="lbl">Nettó eredmény</div><div className="val">{money(txStats.net)}</div></div>
            </div>
            <TransactionQuickAdd locations={allowedLocations} defaultLocId={defaultLocId} onAdd={addTransaction} busy={busy} />
            {loadingData ? <div className="tw"><div className="empty">Betöltés...</div></div> : (
              <TransactionsPeriodList transactions={filteredTransactions} period={period} locName={locName} onEdit={setTxModal} onDelete={deleteTransaction} busy={busy} />
            )}
          </>
        )}

        {!noLocationAssigned && tab === "service" && (
          <>
            <div className="topbar">
              <div><div className="page-title">Szerviz</div><div className="page-sub">{effectiveLocFilter === "all" ? "Mindkét helyszín" : locName(effectiveLocFilter)}</div></div>
              <button className="btn" disabled={busy} onClick={() => setTicketModal("add")}>+ Új munkalap</button>
            </div>
            <div className="statrow c5">
              <div className="statcard accent"><div className="lbl">Összes</div><div className="val">{svcStats.total}</div></div>
              <div className="statcard"><div className="lbl">Aktív</div><div className="val">{svcStats.active}</div></div>
              <div className="statcard"><div className="lbl">Kész</div><div className="val" style={{ color: "#15803D" }}>{svcStats.kesz}</div></div>
              <div className="statcard"><div className="lbl">Sikertelen</div><div className="val" style={{ color: "#9D174D" }}>{svcStats.sikertelen}</div></div>
              <div className="statcard"><div className="lbl">Kiadva</div><div className="val">{svcStats.kiadva}</div></div>
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
            <div className="statrow c4">
              <div className="statcard accent"><div className="lbl">Féleségek</div><div className="val">{partsStats.count}</div></div>
              <div className="statcard"><div className="lbl">Raktár értéke</div><div className="val">{money(partsStats.value)}</div></div>
              <div className="statcard"><div className="lbl">Alacsony készlet</div><div className="val" style={{ color: "#DC2626" }}>{partsStats.low} tétel</div></div>
              <div className="statcard"><div className="lbl">Össz. darab</div><div className="val">{partsStats.qty} db</div></div>
            </div>
            <div className="tw">
              {loadingData ? <div className="empty">Betöltés...</div> : parts.length === 0 ? <div className="empty">Nincs alkatrész.</div> : (
                <table>
                  <thead><tr><th>Alkatrész</th><th>Márka/Illik</th><th>Készlet</th><th>Besz.</th><th>Elad.</th><th></th></tr></thead>
                  <tbody>
                    {parts.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td style={{ color: "#6B7280", fontSize: 12 }}>{[p.brand, p.modelFit].filter(Boolean).join(" · ") || "—"}</td>
                        <td style={{ fontWeight: 700, color: Number(p.quantity) <= 2 ? "#DC2626" : "#22C55E" }}>{p.quantity} db</td>
                        <td className="mono" style={{ color: "#6B7280" }}>{money(p.costPrice)}</td>
                        <td className="mono" style={{ fontWeight: 600 }}>{money(p.salePrice)}</td>
                        <td style={{ display: "flex", gap: 5 }}>
                          <button className="iconbtn" disabled={busy} onClick={() => setPartModal(p)}><EditIcon /></button>
                          <button className="iconbtn" disabled={busy} onClick={() => deletePart(p.id)}><TrashIcon /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {!noLocationAssigned && tab === "customers" && (
          <>
            <div className="topbar">
              <div><div className="page-title">Kliensek</div><div className="page-sub">{effectiveLocFilter === "all" ? "Mindkét helyszín" : locName(effectiveLocFilter)}</div></div>
            </div>
            <div className="statrow c3">
              <div className="statcard accent"><div className="lbl">Ügyfelek</div><div className="val">{customerStats.count}</div></div>
              <div className="statcard"><div className="lbl">Összes bevétel tőlük</div><div className="val" style={{ color: "#15803D" }}>{money(customerStats.revenue)}</div></div>
              <div className="statcard"><div className="lbl">Átlagos ügyfélérték</div><div className="val">{money(customerStats.avg)}</div></div>
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
      </div>

      {stockModal && (
        <StockModal
          product={stockModal !== "add" ? stockModal : null}
          locations={allowedLocations}
          onClose={() => setStockModal(null)}
          busy={busy}
          defaultLocId={defaultLocId}
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
      {detailCustomer && (
        <CustomerDetailPanel customer={detailCustomer} locName={locName} onClose={() => setCustomerKey(null)} />
      )}
    </div>
  );
}
