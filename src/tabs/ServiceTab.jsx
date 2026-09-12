import { useState } from "react";
import { money, STATUSES, SUB_STATUSES, statusLabel, statusCls, subStatusCls, subStatusLabel, displayName, ticketCode, daysOnShelf, slaInfo, isStaleReady } from "../lib/utils";
import { SearchIcon, ServiceIcon, ClockIcon, WarrantyIcon, FoliaIcon, DropletIcon, ChevronRightIcon, CheckIcon, ScanIcon, PartsIcon, PhoneCaseIcon, MoreIcon } from "../components/icons";
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

  const probsOf = (t) => (t.issue || "").split(",").map((p) => p.trim()).filter(Boolean);
  // Állapotsáv (Probléma és Státusz között): beázás, garanciális, fólia, ígért határidő —
  // egységes színes ikonokkal, hogy egy pillantásra látszódjon minden munkalapon. A 90+
  // napja átvehető, de el nem vitt munkalapokat is az "ígért határidő" jelzésbe soroljuk,
  // mert azok is azonnali odafigyelést igényelnek.
  const flagsOf = (t) => {
    const sla = slaInfo(t) || (isStaleReady(t) ? { level: "overdue", label: "90+ napja várja az átvételt" } : null);
    const partWait = t.status === "Átvett" && (t.subStatus === "Alkatrészre vár" || t.subStatus === "Alkatrészre és készülékre vár");
    const deviceWait = t.status === "Átvett" && (t.subStatus === "Készülékre vár" || t.subStatus === "Alkatrészre és készülékre vár");
    return (
      <span className="svc-flags">
        {(probsOf(t).includes("Beázás") || t.waterDamage) && (
          <span className="svc-flag svc-flag-water" title="Ázott készülék">
            <DropletIcon width={11} height={11} />
          </span>
        )}
        {t.isWarranty && (
          <span className="svc-flag svc-flag-warranty" title={t.warrantyKind === "termék" ? "Garanciális — termék" : "Garanciális — szerviz"}>
            <WarrantyIcon width={11} height={11} />
          </span>
        )}
        {partWait && (
          <span className="svc-flag svc-flag-part" title="Alkatrészre vár">
            <PartsIcon width={11} height={11} />
          </span>
        )}
        {deviceWait && (
          <span className="svc-flag svc-flag-device" title="Készülékre vár">
            <PhoneCaseIcon width={11} height={11} />
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
  const isPartDeviceWait = (t) => t.status === "Átvett" && (t.subStatus === "Alkatrészre vár" || t.subStatus === "Készülékre vár" || t.subStatus === "Alkatrészre és készülékre vár");
  const statusPill = (t) => (t.subStatus && !isPartDeviceWait(t) ? (
    <span className={`st st-fill ${subStatusCls(t.status, t.subStatus)}`}>{subStatusLabel(t.status, t.subStatus)}</span>
  ) : (
    <span className={`st st-fill ${statusCls(t.status)}`}>{statusLabel(t.status)}</span>
  ));
  const TICKET_COLUMNS = [
    { key: "n", label: "Sorszám", className: "col-serial" }, { key: "d", label: "Eszköz", className: "col-grow" }, { key: "c", label: "Kliens" }, { key: "i", label: "Bejött" },
    { key: "s", label: "Státusz", className: "col-status" }, { key: "a", label: "Ár", className: "num-col" }, { key: "x", label: "" },
  ];
  const renderTicketRow = (t) => (
    <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => setDetailId(t.id)}>
      <td className="mono col-serial" style={{ color: "#9CA3AF", whiteSpace: "nowrap" }}>{ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))}</td>
      <td>
        <div className="stk-name">
          {displayName(t.brand, t.model) || "—"}
          {probsOf(t).map((p, i) => <span key={i} className="prob-pill">{p}</span>)}
          {flagsOf(t)}
        </div>
      </td>
      <td style={{ whiteSpace: "nowrap" }}>{kliensOf(t)}</td>
      <td>{daysOf(t)}</td>
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
  );
  const renderTicketMobileRow = (t) => (
    <div className="mob-row" onClick={() => setDetailId(t.id)}>
      <div className="mob-row-top">
        <div className="mob-row-main" style={{ fontSize: 12 }}>
          <span className="stk-sub" style={{ marginTop: 0, marginRight: 5, flexShrink: 0, fontWeight: 400 }}>{ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))}</span>
          <span style={{ flex: 1, minWidth: 0 }}>{displayName(t.brand, t.model) || "—"}</span>
          <span style={{ flexShrink: 0 }}>{statusPill(t)}</span>
        </div>
        <div className="mob-row-amount" style={{ fontSize: 12 }}>
          {(Number(t.depositPaid) || 0) > 0 ? money(t.price - t.depositPaid) : money(t.price)}
        </div>
      </div>
      <div className="mob-row-sub" style={{ marginTop: 12 }}>
        <span>{kliensOf(t)}</span>
        <span>{daysOf(t)}</span>
      </div>
      {(probsOf(t).length > 0 || nextActionOf(t)) && (
        <div className="svc-probs" style={{ marginTop: -5.5, flexWrap: "wrap", alignItems: "flex-end", overflow: "visible" }}>
          {probsOf(t).length > 0 && (
            <span style={{ fontSize: 11, color: "#374151", fontWeight: 600 }}>{probsOf(t).join(", ")}</span>
          )}
          {flagsOf(t)}
          {nextActionOf(t) && (() => {
            const na = nextActionOf(t);
            return (
              <button
                className="btn sec sm icon-only"
                style={{ marginLeft: "auto", boxShadow: "none", width: 40, height: 33.5, padding: 0, borderRadius: 999, justifyContent: "center" }}
                disabled={busy}
                title={na.title}
                onClick={(e) => { e.stopPropagation(); runAction(t, na); }}
              >
                <na.icon width={13} height={13} />
              </button>
            );
          })()}
        </div>
      )}
    </div>
  );

  return (
    <div className="apple-page">
      <div className="filter-row">
        <div className="searchbar"><SearchIcon /><input value={svcSearch} onChange={(e) => setSvcSearch(e.target.value)} /></div>
        {onScan && <button type="button" className="btn sec scan-trigger" onClick={onScan} title="QR/vonalkód szkennelése"><ScanIcon width={16} height={16} /></button>}
        <button
          type="button"
          className={`history-toolbar-btn${showHandedOver ? " active" : ""}`}
          onClick={() => setShowHandedOver((v) => !v)}
          title="Átadott munkák"
        >
          <MoreIcon className="history-toolbar-btn-dots" width={16} height={16} />
          <span className="history-toolbar-btn-text">Átadott munkák <span className="cnt">{handedOverTickets.length}</span></span>
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
              <ResponsiveTable
                wrap={false}
                columns={TICKET_COLUMNS}
                rows={rows}
                rowKey={(t) => t.id}
                renderRow={renderTicketRow}
                renderMobileRow={renderTicketMobileRow}
              />
            );
          })()}
        </div>
      )}

      <div className="tw tw-apple">
      {loadingData ? <LoadingState /> : (
        (() => {
          const items = [...activeTickets].sort((a, b) => {
            const byStatus = STATUS_KEYS.indexOf(a.status) - STATUS_KEYS.indexOf(b.status);
            if (byStatus !== 0) return byStatus;
            return (daysOnShelf(a.dateIn) ?? -1) - (daysOnShelf(b.dateIn) ?? -1);
          });
          if (items.length === 0) return <EmptyState icon={ServiceIcon}>Nincs munkalap.</EmptyState>;
          return (
            <ResponsiveTable
              wrap={false}
              columns={TICKET_COLUMNS}
              rows={items}
              rowKey={(t) => t.id}
              renderRow={renderTicketRow}
              renderMobileRow={renderTicketMobileRow}
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
