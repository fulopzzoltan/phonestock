import { useMemo, useState } from "react";
import { money } from "../lib/utils";
import { SearchIcon, CustomersIcon } from "../components/icons";
import Thumb from "../components/Thumb";
import { EmptyState, LoadingState } from "../components/EmptyState";

const SORTS = [
  { key: "recent", label: "Legutóbbi aktivitás" },
  { key: "revenue-desc", label: "Bevétel: magas → alacsony" },
  { key: "name", label: "Név A–Z" },
];

function sortCustomers(items, sortBy) {
  if (sortBy === "recent") return items;
  const arr = [...items];
  if (sortBy === "revenue-desc") arr.sort((a, b) => (b.purchaseTotal + b.ticketTotal) - (a.purchaseTotal + a.ticketTotal));
  else if (sortBy === "name") arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  return arr;
}

export default function CustomersTab({
  effectiveLocFilter, locName, busy, setCustomerModal, custSearch, setCustSearch, loadingData, customers, setCustomerKey, customerStats,
}) {
  const [typeFilter, setTypeFilter] = useState("all"); // all | new | returning
  const [sortBy, setSortBy] = useState("recent");

  const typeFiltered = useMemo(() => {
    if (typeFilter === "all") return customers;
    if (typeFilter === "new") return customers.filter((c) => c.isNew);
    return customers.filter((c) => !c.isNew);
  }, [customers, typeFilter]);

  const sorted = useMemo(() => sortCustomers(typeFiltered, sortBy), [typeFiltered, sortBy]);

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Kliensek</div><div className="page-sub">{effectiveLocFilter === "all" ? "Mindkét helyszín" : locName(effectiveLocFilter)}</div></div>
        <button className="btn" disabled={busy} onClick={() => setCustomerModal("add")}>+ Új ügyfél</button>
      </div>

      <div className="statrow c3">
        <div className="statcard accent"><div className="lbl">Ügyfelek</div><div className="val">{customerStats.count} db</div></div>
        <div className="statcard"><div className="lbl">Összes bevétel</div><div className="val">{money(customerStats.revenue)}</div></div>
        <div className="statcard"><div className="lbl">Átlag / ügyfél</div><div className="val">{money(customerStats.avg)}</div></div>
      </div>

      <div className="filter-row">
        <div className="searchbar"><SearchIcon /><input placeholder="Keresés név vagy telefonszám..." value={custSearch} onChange={(e) => setCustSearch(e.target.value)} /></div>
        <div className="seg">
          <button className={typeFilter === "all" ? "active" : ""} onClick={() => setTypeFilter("all")}>Mind</button>
          <button className={typeFilter === "new" ? "active" : ""} onClick={() => setTypeFilter("new")}>Új</button>
          <button className={typeFilter === "returning" ? "active" : ""} onClick={() => setTypeFilter("returning")}>Visszatérő</button>
        </div>
        <select className="filter-sel" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      <div className="tw">
        {loadingData ? <LoadingState /> : sorted.length === 0 ? <EmptyState icon={CustomersIcon}>Nincs ügyfél.</EmptyState> : (
          <>
            <table>
              <thead><tr><th>Név</th><th>Telefonszám</th><th>Típus</th><th>Vásárlások</th><th>Szerviz</th><th>Utolsó aktivitás</th></tr></thead>
              <tbody>
                {sorted.map((c) => (
                  <tr key={c.key} style={{ cursor: "pointer" }} onClick={() => setCustomerKey(c.key)}>
                    <td>
                      <div className="stk-row">
                        <Thumb brand={c.name || "?"} />
                        <div className="stk-name">{c.name || "Névtelen"}</div>
                      </div>
                    </td>
                    <td className="mono">{c.phone || "—"}</td>
                    <td>{c.isNew ? <span className="badge-loc">Új</span> : <span className="badge-income">Visszatérő</span>}</td>
                    <td>{c.purchases.length} db · <span className="mono">{money(c.purchaseTotal)}</span></td>
                    <td>{c.tickets.length} db · <span className="mono">{money(c.ticketTotal)}</span></td>
                    <td className="mono" style={{ color: "#6B7280" }}>{c.lastActivity || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mob-cards">
              {sorted.map((c) => (
                <div key={c.key} className="mob-row" onClick={() => setCustomerKey(c.key)}>
                  <div className="mob-row-top">
                    <div className="mob-row-main"><Thumb brand={c.name || "?"} size="sm" /><span>{c.name || "Névtelen"}</span></div>
                    {c.isNew ? <span className="badge-loc">Új</span> : <span className="badge-income">Visszatérő</span>}
                  </div>
                  <div className="mob-row-sub">
                    <span className="mono">{c.phone || "—"}</span>
                    <span>{c.purchases.length} vásárlás · {money(c.purchaseTotal)}</span>
                    <span>{c.tickets.length} szerviz · {money(c.ticketTotal)}</span>
                    <span>{c.lastActivity || "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
