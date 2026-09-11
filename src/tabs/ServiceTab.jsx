import { useState } from "react";
import { money, STATUSES, SUB_STATUSES, statusLabel, statusCls, subStatusCls, subStatusLabel, displayName, ticketCode, daysOnShelf, slaInfo, isStaleReady } from "../lib/utils";
import { SearchIcon, ServiceIcon, ClockIcon, WarrantyIcon, FoliaIcon, DropletIcon, ChevronRightIcon, CheckIcon, ScanIcon } from "../components/icons";
import { EmptyState, LoadingState } from "../components/EmptyState";
import ResponsiveTable from "../components/ResponsiveTable";
import HandoverPaymentModal from "../components/HandoverPaymentModal";

const STATUS_KEYS = STATUSES.map((s) => s.key);
function nextActionOf(t) {
  const idx = STATUS_KEYS.indexOf(t.status);
  if (idx !== -1 && idx < STATUS_KEYS.length - 1) {
    const nk = STATUS_KEYS[idx + 1];
    return { status: nk, subStatus: SUB_STATUSES[nk]?.[0]?.key ?? null, icon: ChevronRightIcon, label: "Következő", title: `Következő státusz: ${statusLabel(nk)}` };
  }
  if (idx === STATUS_KEYS.length - 1 && t.subStatus !== "Átadva") {
    return { status: t.status, subStatus: "Átadva", icon: CheckIcon, label: "Átadás", title: "Munkalap átadása a vevőnek" };
  }
  return null;
}

export default function ServiceTab({
  effectiveLocFilter, locName, busy, setTicketModal, svcSearch, setSvcSearch, onScan,
  loadingData, activeTickets, setDetailId, handedOverTickets, onStatusChange,
}) {
  const [listStatus, setListStatus] = useState(STATUSES[0].key);
  const [handoverPrompt, setHandoverPrompt] = useState(null);
  const [showHandedOver, setShowHandedOver] = useState(false);
  const [handedOverQuery, setHandedOverQuery] = useState("");

  function runAction(t, na) {
    if (na.subStatus === "Átadva" && (Number(t.price) || 0) > 0) {
      setHandoverPrompt(t);
    } else {
      onStatusChange(t.id, na.status, na.subStatus);
    }
  }

  return (
    <div className="apple-page">
      <div className="filter-row">
        <div className="searchbar"><SearchIcon /><input value={svcSearch} onChange={(e) => setSvcSearch(e.target.value)} /></div>
        {onScan && <button type="button" className="btn sec scan-trigger" onClick={onScan} title="QR/vonalkód szkennelése"><ScanIcon width={16} height={16} /></button>}
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
        <button type="button" className={`history-toolbar-btn${showHandedOver ? " active" : ""}`} onClick={() => setShowHandedOver((v) => !v)}>
          <ServiceIcon width={14} height={14} />
          Átadott munkalapok <span className="cnt">{handedOverTickets.length}</span>
        </button>
      </div>

      {showHandedOver && (
        <div className="tw tw-apple" style={{ marginBottom: 16 }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #F3F4F6" }}>
            <div className="searchbar" style={{ margin: 0, maxWidth: "none" }}>
              <SearchIcon width={13} height={13} />
              <input value={handedOverQuery} onChange={(e) => setHandedOverQuery(e.target.value)} placeholder="Keresés..." autoFocus />
            </div>
          </div>
          {(() => {
            const q = handedOverQuery.trim().toLowerCase();
            const rows = q
              ? handedOverTickets.filter((t) => [t.customerName, t.brand, t.model, ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))].filter(Boolean).join(" ").toLowerCase().includes(q))
              : handedOverTickets;
            if (rows.length === 0) return <EmptyState icon={ServiceIcon}>Nincs találat.</EmptyState>;
            return (
              <table>
                <thead><tr><th className="col-serial">Sorszám</th><th>Eszköz</th><th>Helyszín</th><th>Bejött</th><th>Átadva</th><th>Vevő</th><th className="num-col">Díj</th></tr></thead>
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
                      <td className="row-price">{money(t.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>
      )}

      <div className="tw tw-apple">
      {loadingData ? <LoadingState /> : (
        (() => {
          const items = activeTickets.filter((t) => t.status === listStatus);
          if (listStatus === "Átadásra") items.sort((a, b) => (daysOnShelf(a.dateIn) ?? -1) - (daysOnShelf(b.dateIn) ?? -1));
          if (items.length === 0) return <EmptyState icon={ServiceIcon}>Nincs munkalap ebben az állapotban.</EmptyState>;
          const probsOf = (t) => (t.issue || "").split(",").map((p) => p.trim()).filter(Boolean);
          // Állapotsáv (Probléma és Státusz között): beázás, garanciális, fólia, ígért határidő —
          // egységes színes ikonokkal, hogy egy pillantásra látszódjon minden munkalapon. A 90+
          // napja átvehető, de el nem vitt munkalapokat is az "ígért határidő" jelzésbe soroljuk,
          // mert azok is azonnali odafigyelést igényelnek.
          const flagsOf = (t) => {
            const sla = slaInfo(t) || (isStaleReady(t) ? { level: "overdue", label: "90+ napja várja az átvételt" } : null);
            return (
              <span className="svc-flags">
                {probsOf(t).includes("Beázás") && (
                  <span className="svc-flag svc-flag-water" title="Beázott készülék">
                    <DropletIcon width={11} height={11} />
                  </span>
                )}
                {t.isWarranty && (
                  <span className="svc-flag svc-flag-warranty" title={t.warrantyKind === "termék" ? "Garanciális — termék" : "Garanciális — szerviz"}>
                    <WarrantyIcon width={11} height={11} />
                  </span>
                )}
                {t.folia && (
                  <span className="t-folia" title="Fólia felhelyezve">
                    <FoliaIcon width={12} height={12} />
                  </span>
                )}
                {sla && (
                  <span className={`svc-flag svc-flag-due-${sla.level}`} title={sla.label}>
                    <ClockIcon width={11} height={11} />
                  </span>
                )}
              </span>
            );
          };
          const daysOf = (t) => {
            const n = daysOnShelf(t.dateIn);
            if (n == null) return <span className="svc-days">—</span>;
            if (n <= 0) return <span className="svc-days today">{n}<span className="svc-days-lbl">napja</span></span>;
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
              wrap={false}
              columns={[
                { key: "n", label: "Sorszám", className: "col-serial" }, { key: "d", label: "Eszköz", className: "col-device" }, { key: "c", label: "Kliens" }, { key: "i", label: "Bejött" },
                { key: "p", label: "Probléma", className: "col-grow" }, { key: "f", label: "" }, { key: "s", label: "Státusz", className: "col-status" }, { key: "a", label: "Ár", className: "num-col" }, { key: "x", label: "" },
              ]}
              rows={items}
              rowKey={(t) => t.id}
              renderRow={(t) => (
                <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => setDetailId(t.id)}>
                  <td className="mono col-serial" style={{ color: "#9CA3AF", whiteSpace: "nowrap" }}>{ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <div className="stk-name" style={{ flexWrap: "nowrap" }}>
                      {displayName(t.brand, t.model) || "—"}
                    </div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{kliensOf(t)}</td>
                  <td>{daysOf(t)}</td>
                  <td>
                    <div className="svc-probs">
                      {probsOf(t).length > 0 ? probsOf(t).map((p, i) => <span key={i} className="prob-pill">{p}</span>) : "—"}
                    </div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{flagsOf(t)}</td>
                  <td className="col-status" style={{ whiteSpace: "nowrap" }}>{statusPill(t)}</td>
                  <td className="row-price">
                    {(Number(t.depositPaid) || 0) > 0 ? (
                      <>
                        {money(t.price - t.depositPaid)}
                        <div className="row-price-sub">-{money(t.depositPaid)} előleg</div>
                      </>
                    ) : money(t.price)}
                  </td>
                  <td className="stk-actions" onClick={(e) => e.stopPropagation()}>
                    {nextActionOf(t) && (() => {
                      const na = nextActionOf(t);
                      return (
                        <button className="btn sec sm icon-only" disabled={busy} title={na.title} onClick={() => runAction(t, na)}>
                          <na.icon width={13} height={13} />
                        </button>
                      );
                    })()}
                  </td>
                </tr>
              )}
              renderMobileRow={(t) => (
                <div className="mob-row" onClick={() => setDetailId(t.id)}>
                  <div className="mob-row-top">
                    <div className="mob-row-main">
                      <span className="stk-sub" style={{ marginTop: 0, marginRight: 6 }}>{ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))}</span>
                      <span>{displayName(t.brand, t.model) || "—"}</span>
                    </div>
                    <div className="mob-row-amount">
                      {(Number(t.depositPaid) || 0) > 0 ? money(t.price - t.depositPaid) : money(t.price)}
                    </div>
                  </div>
                  <div className="mob-row-sub">
                    <span>{kliensOf(t)}</span>
                    {daysOf(t)}
                    {statusPill(t)}
                    {flagsOf(t)}
                  </div>
                  {probsOf(t).length > 0 && (
                    <div className="svc-probs" style={{ marginTop: 6, flexWrap: "wrap" }}>
                      {probsOf(t).map((p, i) => <span key={i} className="prob-pill">{p}</span>)}
                    </div>
                  )}
                  {nextActionOf(t) && (() => {
                    const na = nextActionOf(t);
                    return (
                      <div className="mob-row-sub" style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                        <button className="btn sec sm icon-only" disabled={busy} title={na.title} onClick={() => runAction(t, na)}>
                          <na.icon width={13} height={13} />
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}
            />
          );
        })()
      )}
      </div>
      {handoverPrompt && (
        <HandoverPaymentModal
          ticket={handoverPrompt}
          busy={busy}
          onClose={() => setHandoverPrompt(null)}
          onConfirm={(payment, cash, card) => {
            onStatusChange(handoverPrompt.id, handoverPrompt.status, "Átadva", payment, cash, card);
            setHandoverPrompt(null);
          }}
        />
      )}
    </div>
  );
}
