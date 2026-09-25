import { useState, useRef, useEffect } from "react";
import { money, STATUSES, SUB_STATUSES, statusLabel, statusCls, subStatusCls, subStatusLabel, displayName, ticketCode, daysOnShelf, slaInfo, isStaleReady, partCode } from "../lib/utils";
import { SearchIcon, ServiceIcon, WarrantyIcon, ChevronRightIcon, ChevronDownIcon, CheckIcon, ScanIcon, MoreIcon, PrintIcon, PlusIcon, CloseIcon } from "../components/icons";
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

// Kattintható státusz-jelvény a lista Státusz oszlopában — a BoardUI table-komponensének
// "Purchase" oszlopa alapján: a jelvény maga a dropdown trigger, kattintásra egy kis lista
// nyílik a 4 fő státusszal, hogy ne kelljen a munkalapot megnyitni csak a státuszváltáshoz.
function StatusPicker({ ticket, cls, label, disabled, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  return (
    <div className="wl-status-wrap" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button type="button" className={`status-picker-trigger ${cls}`} disabled={disabled} onClick={() => setOpen((v) => !v)}>
        <span className="status-dot" />
        {label}
        <ChevronDownIcon width={11} height={11} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .12s" }} />
      </button>
      {open && (
        <div className="wl-status-menu">
          {STATUSES.map((s) => (
            <div
              key={s.key}
              className={`wl-status-opt${s.key === ticket.status ? " current" : ""}`}
              onClick={() => { setOpen(false); if (s.key !== ticket.status) onChange(ticket.id, s.key, SUB_STATUSES[s.key]?.[0]?.key ?? null); }}
            >
              <span className="dot" style={{ background: s.color }} />{s.label}
              {s.key === ticket.status && <CheckIcon width={13} height={13} style={{ marginLeft: "auto", flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Gyors alkatrész-hozzárendelés a listából — Rögzítve státuszú munkalapoknál a "Következő
// állapot" nyíl helyett, mert a státuszváltás már a Státusz-választóból is elérhető, itt
// hasznosabb egy azonnali "+" az első alkatrész felvételére (nem kell a munkalapot megnyitni).
function PartAddPopover({ ticket, parts, onAddPart, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selPartId, setSelPartId] = useState("");
  const [qty, setQty] = useState(1);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) { setQuery(""); setSelPartId(""); setQty(1); return; }
    function onDocMouseDown(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const availableParts = (parts || []).filter((p) => Number(p.quantity) > 0);
  const q = query.trim().toLowerCase();
  const shownParts = q
    ? availableParts.filter((p) => [p.name, p.brand, p.modelFit, partCode(p.partNo)].filter(Boolean).join(" ").toLowerCase().includes(q))
    : availableParts;
  const selPart = availableParts.find((p) => p.id === selPartId);

  function add() {
    if (!selPart) return;
    onAddPart(ticket.id, selPart, qty);
    setOpen(false); setQuery(""); setSelPartId(""); setQty(1);
  }

  return (
    <div className="wl-status-wrap" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button type="button" className="btn sec sm icon-only" disabled={disabled} title="Alkatrész hozzáadása" onClick={() => setOpen((v) => !v)}>
        <PlusIcon width={13} height={13} />
      </button>
      {open && (
        <div className="wl-status-menu part-add-menu">
          <input
            type="text" autoFocus placeholder="Keresés név vagy kód szerint..."
            value={query} onChange={(e) => setQuery(e.target.value)}
            style={{ marginBottom: 6, width: "100%", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 9, padding: "8px 10px", fontFamily: "inherit", fontSize: 13, boxSizing: "border-box" }}
          />
          <select value={selPartId} onChange={(e) => setSelPartId(e.target.value)} style={{ width: "100%", marginBottom: 6 }}>
            <option value="">— Alkatrész ({shownParts.length}) —</option>
            {shownParts.map((p) => {
              const fit = [p.brand, p.modelFit].filter(Boolean).join(" ");
              return <option key={p.id} value={p.id}>{partCode(p.partNo)} — {p.name}{fit ? ` · ${fit}` : ""} ({p.quantity} db)</option>;
            })}
          </select>
          <div style={{ display: "flex", gap: 6 }}>
            <input type="number" min="1" max={selPart?.quantity || 1} value={qty} onChange={(e) => setQty(Number(e.target.value))}
              style={{ width: 56, background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 9, padding: "9px 8px", fontFamily: "inherit", fontSize: 13 }} />
            <button type="button" className="btn sm" disabled={!selPart || disabled} onClick={add} style={{ flex: 1 }}>Hozzáadás</button>
            <button type="button" className="iconbtn" onClick={() => setOpen(false)}><CloseIcon width={14} height={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ServiceTab({
  effectiveLocFilter, locName, busy, setTicketModal, svcSearch, setSvcSearch, onScan,
  loadingData, activeTickets, setDetailId, handedOverTickets, onStatusChange, onPrint, parts, onAddPart,
}) {
  const [handoverPrompt, setHandoverPrompt] = useState(null);
  const [showHandedOver, setShowHandedOver] = useState(false);
  const [handedOverQuery, setHandedOverQuery] = useState("");
  const [dateSort, setDateSort] = useState(null); // null | "asc" | "desc"

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
    const sla = slaInfo(t) || (isStaleReady(t) ? { level: "overdue", label: "90+ napja" } : null);
    const partWait = t.status === "Átvett" && (t.subStatus === "Alkatrészre vár" || t.subStatus === "Alkatrészre és készülékre vár");
    const deviceWait = t.status === "Átvett" && (t.subStatus === "Készülékre vár" || t.subStatus === "Alkatrészre és készülékre vár");
    return (
      <>
        {(probsOf(t).includes("Beázás") || t.waterDamage) && (
          <span className="svc-flag-chip svc-flag-water">Ázott</span>
        )}
        {t.isWarranty && (
          <span className="svc-flag-chip svc-flag-warranty" title={t.warrantyKind === "termék" ? "Garanciális — termék" : "Garanciális — szerviz"}>Garanciális</span>
        )}
        {partWait && (
          <span className="svc-flag-chip svc-flag-part">Alkatrészre vár</span>
        )}
        {deviceWait && (
          <span className="svc-flag-chip svc-flag-device">Készülékre vár</span>
        )}
        {t.folia && (
          <span className="svc-flag-chip svc-flag-folia">Fólia felhelyezve</span>
        )}
        {sla && (
          <span className={`svc-flag-chip svc-flag-due-${sla.level}`}>{sla.label}</span>
        )}
      </>
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
  const statusClsOf = (t) => (t.subStatus && !isPartDeviceWait(t) ? subStatusCls(t.status, t.subStatus) : statusCls(t.status));
  const statusLabelOf = (t) => (t.subStatus && !isPartDeviceWait(t) ? subStatusLabel(t.status, t.subStatus) : statusLabel(t.status));
  const statusPill = (t) => (t.subStatus && !isPartDeviceWait(t) ? (
    <span className={`st st-fill ${subStatusCls(t.status, t.subStatus)}`}>{subStatusLabel(t.status, t.subStatus)}</span>
  ) : (
    <span className={`st st-fill ${statusCls(t.status)}`}>{statusLabel(t.status)}</span>
  ));
  const TICKET_COLUMNS = [
    { key: "n", label: "Szám", className: "col-serial" },
    {
      key: "i",
      label: (
        <button
          type="button"
          onClick={() => setDateSort((d) => (d === "asc" ? "desc" : d === "desc" ? null : "asc"))}
          style={{ display: "flex", alignItems: "center", gap: 3, background: "none", border: "none", padding: 0, font: "inherit", color: "inherit", cursor: "pointer" }}
        >
          Bejött
          {dateSort && <ChevronDownIcon width={10} height={10} style={{ transform: dateSort === "asc" ? "rotate(180deg)" : "none" }} />}
        </button>
      ),
    },
    { key: "d", label: "Eszköz" }, { key: "p", label: "Probléma", className: "col-grow" }, { key: "c", label: "Kliens" },
    { key: "s", label: "Státusz", className: "col-status" }, { key: "a", label: "Ár", className: "num-col" }, { key: "x", label: "" },
  ];
  const renderTicketRow = (t) => (
    <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => setDetailId(t.id)}>
      <td className="mono col-serial" style={{ color: "#9CA3AF", whiteSpace: "nowrap" }}>{ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))}</td>
      <td>{daysOf(t)}</td>
      <td style={{ whiteSpace: "nowrap" }}><span className="stk-name">{displayName(t.brand, t.model) || "—"}</span></td>
      <td>
        <div className="svc-flags">
          {probsOf(t).map((p, i) => <span key={i} className="prob-pill">{p}</span>)}
          {flagsOf(t)}
        </div>
      </td>
      <td style={{ whiteSpace: "nowrap" }}>{kliensOf(t)}</td>
      <td className="col-status" style={{ whiteSpace: "nowrap" }}>
        <StatusPicker ticket={t} cls={statusClsOf(t)} label={statusLabelOf(t)} disabled={busy} onChange={onStatusChange} />
      </td>
      <td className="row-price">
        {(Number(t.depositPaid) || 0) > 0 ? (
          <>
            {money(t.price - t.depositPaid)}
            <div className="row-price-sub">-{money(t.depositPaid)} előleg</div>
          </>
        ) : money(t.price)}
      </td>
      <td className="stk-actions" onClick={(e) => e.stopPropagation()}>
        {onPrint && (
          <button className="btn sec sm icon-only" disabled={busy} title="Nyomtatás" onClick={() => onPrint(t)}>
            <PrintIcon width={13} height={13} />
          </button>
        )}
        {t.status === "Átvett" && onAddPart ? (
          <PartAddPopover ticket={t} parts={parts} onAddPart={onAddPart} disabled={busy} />
        ) : nextActionOf(t) && (() => {
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
    <div className="mob-row svc-row-lg mob-row-coded" onClick={() => setDetailId(t.id)}>
      <div className={`mob-code-col ${statusClsOf(t)}`}>
        {String(t.ticketNo).split("").map((ch, i) => <span key={i}>{ch}</span>)}
      </div>
      <div className="mob-row-content">
        <div className="mob-row-top">
          <div className="mob-row-main" style={{ fontSize: 13, gap: 9 }}>
            <span style={{ flex: 1, minWidth: 0 }}>{displayName(t.brand, t.model) || "—"}</span>
            <span style={{ flexShrink: 0 }}>{statusPill(t)}</span>
          </div>
          <div className="mob-row-amount" style={{ fontSize: 13 }}>
            {(Number(t.depositPaid) || 0) > 0 ? money(t.price - t.depositPaid) : money(t.price)}
          </div>
        </div>
        <div className="mob-row-sub" style={{ marginTop: 13, fontSize: 12.5 }}>
          <span>{kliensOf(t)}</span>
          <span>{daysOf(t)}</span>
        </div>
        {(probsOf(t).length > 0 || nextActionOf(t)) && (
          <div className="svc-probs" style={{ marginTop: -5.5, flexWrap: "wrap", alignItems: "flex-end", overflow: "visible", gap: 5 }}>
            {probsOf(t).length > 0 && (
              <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>{probsOf(t).join(", ")}</span>
            )}
            <span style={{ marginLeft: 6 }}>{flagsOf(t)}</span>
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
    </div>
  );

  return (
    <div className="apple-page">
      <div className="filter-row svc-filter-row">
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
        <div className="tw tw-apple svc-table" style={{ marginBottom: 16 }}>
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

      <div className="tw tw-apple svc-table">
      {loadingData ? <LoadingState /> : (
        (() => {
          const items = dateSort
            ? [...activeTickets].sort((a, b) => (dateSort === "asc" ? (a.dateIn || "").localeCompare(b.dateIn || "") : (b.dateIn || "").localeCompare(a.dateIn || "")))
            : [...activeTickets].sort((a, b) => {
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
