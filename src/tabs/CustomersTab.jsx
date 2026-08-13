import { money } from "../lib/utils";
import { SearchIcon } from "../components/icons";

export default function CustomersTab({
  effectiveLocFilter, locName, busy, setCustomerModal, custSearch, setCustSearch, loadingData, customers, setCustomerKey,
}) {
  return (
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
  );
}
