import { useMemo, useState } from "react";
import { money, formatPhone, exportToCsv, today } from "../lib/utils";
import { SearchIcon, CustomersIcon } from "../components/icons";
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
  effectiveLocFilter, locName, busy, setCustomerModal, custSearch, setCustSearch, loadingData, customers, setCustomerKey,
}) {
  const [sortBy, setSortBy] = useState("recent");

  const sorted = useMemo(() => sortCustomers(customers, sortBy), [customers, sortBy]);

  function exportCustomers() {
    exportToCsv(`ugyfelek-${today()}`, [
      { key: (c) => c.name || "Névtelen", label: "Név" }, { key: (c) => formatPhone(c.phone) || "", label: "Telefonszám" },
      { key: (c) => c.purchases.length, label: "Vásárlások db" }, { key: (c) => c.purchaseTotal, label: "Vásárlások összege" },
      { key: (c) => c.tickets.length, label: "Szerviz db" }, { key: (c) => c.ticketTotal, label: "Szerviz összege" },
      { key: (c) => c.lastActivity || "", label: "Utolsó aktivitás" },
    ], sorted);
  }

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Kliensek</div></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn sec" disabled={busy || sorted.length === 0} onClick={exportCustomers}>Exportálás CSV-be</button>
          <button className="btn" disabled={busy} onClick={() => setCustomerModal("add")}>+ Új ügyfél</button>
        </div>
      </div>

      <div className="filter-row">
        <div className="searchbar"><SearchIcon /><input placeholder="Keresés név vagy telefonszám..." value={custSearch} onChange={(e) => setCustSearch(e.target.value)} /></div>
        <select className="filter-sel" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      <div className="tw">
        {loadingData ? <LoadingState /> : sorted.length === 0 ? <EmptyState icon={CustomersIcon}>Nincs ügyfél.</EmptyState> : (
          <>
            <table>
              <thead><tr><th>Név</th><th className="col-grow">Telefonszám</th><th>Vásárlások</th><th>Szerviz</th><th style={{ textAlign: "right" }}>Utolsó aktivitás</th></tr></thead>
              <tbody>
                {sorted.map((c) => (
                  <tr key={c.key} style={{ cursor: "pointer" }} onClick={() => setCustomerKey(c.key)}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <div className="stk-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {c.name || "Névtelen"}
                        {c.webshopAccount && <span className="gar-pill" title={`Webshop-fiók: ${c.webshopAccount.email || "—"}`}>Webshop</span>}
                      </div>
                    </td>
                    <td className="mono" style={{ whiteSpace: "nowrap" }}>{formatPhone(c.phone) || "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{c.purchases.length} db · <span className="mono">{money(c.purchaseTotal)}</span></td>
                    <td style={{ whiteSpace: "nowrap" }}>{c.tickets.length} db · <span className="mono">{money(c.ticketTotal)}</span></td>
                    <td className="mono" style={{ color: "#6B7280", whiteSpace: "nowrap", textAlign: "right" }}>{c.lastActivity || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mob-cards">
              {sorted.map((c) => (
                <div key={c.key} className="mob-row" onClick={() => setCustomerKey(c.key)}>
                  <div className="mob-row-top">
                    <div className="mob-row-main" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{c.name || "Névtelen"}</span>
                      {c.webshopAccount && <span className="gar-pill">Webshop</span>}
                    </div>
                  </div>
                  <div className="mob-row-sub">
                    <span className="mono">{formatPhone(c.phone) || "—"}</span>
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
