import { money, STATUSES, statusLabel } from "../lib/utils";
import { SearchIcon } from "../components/icons";
import TicketCard from "../components/TicketCard";

export default function ServiceTab({
  effectiveLocFilter, locName, busy, setTicketModal, svcSearch, setSvcSearch, svcKindFilter, setSvcKindFilter,
  loadingData, activeTickets, setDetailId, showHandedOver, setShowHandedOver, handedOverTickets,
}) {
  return (
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
  );
}
