import { useState } from "react";
import { money, STATUSES, statusLabel, statusCls, subStatusCls, subStatusLabel, displayName, ticketCode, daysOnShelf, slaInfo, isStaleReady } from "../lib/utils";
import { SearchIcon, ServiceIcon, ClockIcon, WarrantyIcon } from "../components/icons";
import { EmptyState, LoadingState } from "../components/EmptyState";
import HistorySection from "../components/HistorySection";
import ResponsiveTable from "../components/ResponsiveTable";

export default function ServiceTab({
  effectiveLocFilter, locName, busy, setTicketModal, svcSearch, setSvcSearch,
  loadingData, activeTickets, setDetailId, handedOverTickets,
}) {
  const [listStatus, setListStatus] = useState(STATUSES[0].key);

  return (
    <>
      <div className="filter-row">
        <div className="searchbar"><SearchIcon /><input value={svcSearch} onChange={(e) => setSvcSearch(e.target.value)} /></div>
        <div className="status-seg">
          {STATUSES.map((col) => {
            const count = activeTickets.filter((t) => t.status === col.key).length;
            return (
              <button key={col.key} type="button" className={listStatus === col.key ? "active" : ""} onClick={() => setListStatus(col.key)}>
                <span className="dot" style={{ background: col.color }} />
                {statusLabel(col.key)} <span className="cnt">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loadingData ? <LoadingState /> : (
        (() => {
          const items = activeTickets.filter((t) => t.status === listStatus);
          if (listStatus === "Átadásra") items.sort((a, b) => (daysOnShelf(a.dateIn) ?? -1) - (daysOnShelf(b.dateIn) ?? -1));
          if (items.length === 0) return <EmptyState icon={ServiceIcon}>Nincs munkalap ebben az állapotban.</EmptyState>;
          const probsOf = (t) => (t.issue || "").split(",").map((p) => p.trim()).filter(Boolean);
          // Sürgősség: csak akkor jelezzük, ha VAN vállalt határidő (dueDate) — ha nincs ígéret,
          // nincs mihez képest "sürgős" legyen. A 90+ napja átvehető, de el nem vitt munkalapokat
          // is ide soroljuk, mert azok is azonnali odafigyelést igényelnek.
          const urgencyOf = (t) => {
            const sla = slaInfo(t);
            if (sla && (sla.level === "warn" || sla.level === "overdue")) return sla;
            if (isStaleReady(t)) return { level: "overdue", label: "90+ napja várja az átvételt" };
            return null;
          };
          const daysOf = (t) => {
            const n = daysOnShelf(t.dateIn);
            if (n == null) return <span className="svc-days">—</span>;
            if (n <= 0) return <span className="svc-days today">Ma</span>;
            return <span className="svc-days">{n}<span className="svc-days-lbl">napja</span></span>;
          };
          const kliensOf = (t) => {
            if (t.ticketKind === "Saját készlet - előkészítés") {
              return <span className="t-kind-pill" style={{ background: "#F1F5F9", color: "#475569" }}><ServiceIcon width={11} height={11} />Saját — előkészítés</span>;
            }
            if (t.ticketKind === "Saját készlet - garanciális") {
              return <span className="t-kind-pill" style={{ background: "#FCE7F3", color: "#BE185D" }}><WarrantyIcon width={11} height={11} />Saját — garanciális</span>;
            }
            return t.customerName || "—";
          };
          const statusPill = (t) => (t.subStatus ? (
            <span className={`st ${subStatusCls(t.status, t.subStatus)}`}>{subStatusLabel(t.status, t.subStatus)}</span>
          ) : (
            <span className={`st ${statusCls(t.status)}`}>{statusLabel(t.status)}</span>
          ));
          return (
            <ResponsiveTable
              columns={[
                { key: "n", label: "Sorszám", className: "col-serial" }, { key: "d", label: "Eszköz", className: "col-device" }, { key: "c", label: "Kliens" }, { key: "i", label: "Bejött" },
                { key: "p", label: "Probléma", className: "col-grow" }, { key: "s", label: "Státusz" }, { key: "a", label: "Ár" },
              ]}
              rows={items}
              rowKey={(t) => t.id}
              renderRow={(t) => (
                <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => setDetailId(t.id)}>
                  <td className="mono col-serial" style={{ color: "#9CA3AF", whiteSpace: "nowrap" }}>{ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <div className="stk-name" style={{ flexWrap: "nowrap" }}>
                      {displayName(t.brand, t.model) || "—"}
                      {urgencyOf(t) && (
                        <span className={`sla-badge sla-${urgencyOf(t).level}`} style={{ marginLeft: 6 }} title={urgencyOf(t).label}>
                          <ClockIcon width={11} height={11} />
                        </span>
                      )}
                      {t.isWarranty && (
                        <span className="t-kind-pill" style={{ background: "#EDE9FE", color: "#6D28D9", marginLeft: 6, marginBottom: 0 }} title={t.warrantyKind === "termék" ? "Garanciális — termék" : "Garanciális — szerviz"}>
                          <WarrantyIcon width={11} height={11} />
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{kliensOf(t)}</td>
                  <td>{daysOf(t)}</td>
                  <td>
                    <div className="svc-probs">
                      {probsOf(t).length > 0 ? probsOf(t).map((p, i) => <span key={i} className="prob-pill">{p}</span>) : "—"}
                    </div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{statusPill(t)}</td>
                  <td className="row-price">{money(t.price)}</td>
                </tr>
              )}
              renderMobileRow={(t) => (
                <div className="mob-row" onClick={() => setDetailId(t.id)}>
                  <div className="mob-row-top">
                    <div className="mob-row-main">
                      <span className="stk-sub" style={{ marginTop: 0, marginRight: 6 }}>{ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))}</span>
                      <span>{displayName(t.brand, t.model) || "—"}</span>
                      {urgencyOf(t) && (
                        <span className={`sla-badge sla-${urgencyOf(t).level}`} style={{ marginLeft: 6 }} title={urgencyOf(t).label}>
                          <ClockIcon width={11} height={11} />
                        </span>
                      )}
                      {t.isWarranty && (
                        <span className="t-kind-pill" style={{ background: "#EDE9FE", color: "#6D28D9", marginLeft: 6, marginBottom: 0 }} title={t.warrantyKind === "termék" ? "Garanciális — termék" : "Garanciális — szerviz"}>
                          <WarrantyIcon width={11} height={11} />
                        </span>
                      )}
                    </div>
                    <div className="mob-row-amount">{money(t.price)}</div>
                  </div>
                  <div className="mob-row-sub">
                    <span>{kliensOf(t)}</span>
                    {daysOf(t)}
                    {statusPill(t)}
                  </div>
                  {probsOf(t).length > 0 && (
                    <div className="svc-probs" style={{ marginTop: 6, flexWrap: "wrap" }}>
                      {probsOf(t).map((p, i) => <span key={i} className="prob-pill">{p}</span>)}
                    </div>
                  )}
                </div>
              )}
            />
          );
        })()
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
            <thead><tr><th className="col-serial">Sorszám</th><th>Eszköz</th><th>Helyszín</th><th>Bejött</th><th>Átadva</th><th>Vevő</th><th>Díj</th></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => setDetailId(t.id)}>
                  <td className="mono col-serial" style={{ color: "#9CA3AF", whiteSpace: "nowrap" }}>{ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))}</td>
                  <td>
                    <div className="stk-name">
                      {displayName(t.brand, t.model) || "—"}
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
