import { useState } from "react";
import { money, STATUSES, statusLabel, displayName, ticketCode } from "../lib/utils";
import { SearchIcon, ChevronDownIcon, ServiceIcon } from "../components/icons";
import TicketCard from "../components/TicketCard";
import Thumb from "../components/Thumb";
import { LoadingState } from "../components/EmptyState";
import HistorySection from "../components/HistorySection";

export default function ServiceTab({
  effectiveLocFilter, locName, busy, setTicketModal, svcSearch, setSvcSearch, svcKindFilter, setSvcKindFilter,
  loadingData, activeTickets, setDetailId, handedOverTickets, svcStats,
}) {
  const [showFailedInCol, setShowFailedInCol] = useState(false);
  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Szerviz</div><div className="page-sub">{effectiveLocFilter === "all" ? "Mindkét helyszín" : locName(effectiveLocFilter)}</div></div>
        <button className="btn" disabled={busy} onClick={() => setTicketModal("add")}>+ Új munkalap</button>
      </div>

      <div className={`statrow ${svcStats.ownStock > 0 ? "c5" : "c4"}`}>
        <div className="statcard"><div className="lbl">Aktív munkák</div><div className="val">{svcStats.inHouse}</div></div>
        <div className="statcard"><div className="lbl">Átvehető (ügyfél)</div><div className="val" style={{ color: "#15803D" }}>{svcStats.kesz}</div></div>
        <div className="statcard"><div className="lbl">Nem javítható (ügyfél)</div><div className="val" style={{ color: "#9D174D" }}>{svcStats.sikertelen}</div></div>
        <div className="statcard"><div className="lbl">Kiadva (utolsó 7 munkanap)</div><div className="val">{svcStats.kiadvaRecent}</div></div>
        {svcStats.ownStock > 0 && (
          <div className="statcard"><div className="lbl">Saját készlet szervizben</div><div className="val">{svcStats.ownStock}</div></div>
        )}
      </div>

      {(svcStats.staleReady > 0 || svcStats.staleFailed > 0) && (
        <div className="statcard warn" style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="lbl">Figyelmet igényel — 90+ napja nem átvett</div>
            <div className="val">{svcStats.staleReady + svcStats.staleFailed} db</div>
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>
            {svcStats.staleReady > 0 && <span>{svcStats.staleReady} átvehető</span>}
            {svcStats.staleReady > 0 && svcStats.staleFailed > 0 && "  ·  "}
            {svcStats.staleFailed > 0 && <span>{svcStats.staleFailed} nem javítható</span>}
          </div>
        </div>
      )}

      <div className="filter-row">
        <div className="searchbar"><SearchIcon /><input placeholder="Keresés vevő, márka, modell..." value={svcSearch} onChange={(e) => setSvcSearch(e.target.value)} /></div>
        <div className="seg">
          <button type="button" className={svcKindFilter === "all" ? "active" : ""} onClick={() => setSvcKindFilter("all")}>Mind</button>
          <button type="button" className={svcKindFilter === "customer" ? "active" : ""} onClick={() => setSvcKindFilter("customer")}>Csak ügyfél</button>
          <button type="button" className={svcKindFilter === "own" ? "active" : ""} onClick={() => setSvcKindFilter("own")}>Csak saját készlet</button>
        </div>
      </div>
      {loadingData ? <LoadingState /> : (
        <div className="kanban-wrap">
          <div className="kanban">
            {STATUSES.map((col) => {
              const items = activeTickets.filter((t) => t.status === col.key);
              const isReadyCol = col.key === "Átadásra";
              const shownItems = isReadyCol ? items.filter((t) => t.subStatus !== "Sikertelen") : items;
              const failedItems = isReadyCol ? items.filter((t) => t.subStatus === "Sikertelen") : [];
              return (
                <div className="k-col" key={col.key} style={{ "--col-color": col.color }}>
                  <div className="k-col-head">
                    <div className="k-col-title"><span className="k-dot"></span>{statusLabel(col.key)}</div>
                    <span className="k-count">{items.length}</span>
                  </div>
                  <div className="k-col-body">
                    {items.length === 0 && <div className="k-empty"><ServiceIcon />Üres</div>}
                    {shownItems.map((t) => <TicketCard key={t.id} ticket={t} locName={locName} onOpen={setDetailId} />)}
                    {failedItems.length > 0 && (
                      <>
                        <button type="button" className="k-collapse-toggle" onClick={() => setShowFailedInCol((v) => !v)}>
                          <ChevronDownIcon style={{ transform: showFailedInCol ? "rotate(180deg)" : undefined }} />
                          {showFailedInCol ? "Sikertelenek elrejtése" : `Sikertelenek (${failedItems.length})`}
                        </button>
                        {showFailedInCol && failedItems.map((t) => <TicketCard key={t.id} ticket={t} locName={locName} onOpen={setDetailId} />)}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <HistorySection
        icon={ServiceIcon}
        label="Átadott munkalapok"
        items={handedOverTickets}
        searchPlaceholder="Keresés vevő, márka, modell szerint..."
        filterFn={(t, q) => [t.customerName, t.brand, t.model, ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))].filter(Boolean).join(" ").toLowerCase().includes(q)}
      >
        {(rows) => (
          <table>
            <thead><tr><th>Eszköz</th><th>Helyszín</th><th>Bejött</th><th>Átadva</th><th>Vevő</th><th>Díj</th></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => setDetailId(t.id)}>
                  <td>
                    <div className="stk-row">
                      <Thumb brand={t.brand} />
                      <div>
                        <div className="stk-name">{displayName(t.brand, t.model) || "—"}</div>
                        <div className="stk-sub">{ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge-loc">{locName(t.locationId)}</span></td>
                  <td className="mono">{t.dateIn}</td>
                  <td className="mono">{t.dateOut || "—"}</td>
                  <td>{t.customerName}</td>
                  <td className="mono" style={{ fontWeight: 700 }}>{money(t.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </HistorySection>
    </>
  );
}
