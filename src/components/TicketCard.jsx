import { useState } from "react";
import { money, subStatusCls, subStatusLabel, slaInfo, displayName, ticketCode, isStaleReady } from "../lib/utils";
import { ClockIcon, ServiceIcon, WarrantyIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";
import CallLink from "./CallLink";

export default function TicketCard({ ticket, locName, onOpen, onStep, stepPrev, stepNext, onClose }) {
  const [askingPayment, setAskingPayment] = useState(false);
  const probs = (ticket.issue || "").split(",").map((p) => p.trim()).filter(Boolean);
  const sla = slaInfo(ticket);
  const staleReady = isStaleReady(ticket);
  const kindCls = ticket.ticketKind === "Saját készlet - előkészítés" ? " t-card-kind-prep"
    : ticket.ticketKind === "Saját készlet - garanciális" ? " t-card-kind-warranty" : "";
  return (
    <div className={`t-card${kindCls}${sla && sla.level !== "ok" ? ` t-card-sla-${sla.level}` : ""}`} onClick={() => onOpen(ticket.id)}>
      <div className="t-card-top">
        <span className="t-sn">{ticketCode(ticket.ticketNo, locName(ticket.intakeLocationId || ticket.locationId))}</span>
        {onStep && (
          <span style={{ display: "flex", gap: 2, marginLeft: "auto" }}>
            {stepPrev && <button type="button" className="t-card-step prev" onClick={(e) => { e.stopPropagation(); onStep(ticket.id, "prev"); }} title="Előző státusz"><ChevronLeftIcon width={14} height={14} /></button>}
            {stepNext && <button type="button" className="t-card-step next" onClick={(e) => { e.stopPropagation(); onStep(ticket.id, "next"); }} title="Következő státusz"><ChevronRightIcon width={14} height={14} /></button>}
          </span>
        )}
      </div>
      {ticket.ticketKind !== "Ügyfél" && (
        <span className="t-kind-pill">
          {ticket.ticketKind === "Saját készlet - előkészítés" ? <ServiceIcon width={11} height={11} /> : <WarrantyIcon width={11} height={11} />}
          {ticket.ticketKind === "Saját készlet - előkészítés" ? "Saját — előkészítés" : "Saját — garanciális"}
        </span>
      )}
      {ticket.isWarranty && (
        <span className="t-kind-pill" style={{ background: "#EDE9FE", color: "#6D28D9" }}>
          <WarrantyIcon width={11} height={11} />
          Garanciális{ticket.warrantyKind === "termék" ? " — termék" : " — szerviz"}
        </span>
      )}
      {sla && (sla.level === "warn" || sla.level === "overdue") && (
        <div style={{ marginBottom: 4 }}>
          <span className={`sla-badge sla-${sla.level}`}><ClockIcon width={11} height={11} />{sla.label}</span>
        </div>
      )}
      {staleReady && (
        <div style={{ marginBottom: 4 }}>
          <span className="sla-badge sla-overdue"><ClockIcon width={11} height={11} />90+ napja várja az átvételt</span>
        </div>
      )}
      {ticket.subStatus && (
        <div style={{ marginBottom: 4 }}>
          <span className={`st ${subStatusCls(ticket.status, ticket.subStatus)}`} style={{ fontSize: 10, padding: "2px 8px" }}>
            {subStatusLabel(ticket.status, ticket.subStatus)}
          </span>
        </div>
      )}
      <div className="t-name">{ticket.customerName}</div>
      <div className="t-device">
        <span className="t-device-main">{displayName(ticket.brand, ticket.model) || "—"}</span>
        <CallLink phone={ticket.customerPhone} />
      </div>
      {probs.length > 0 && (
        <div className="t-probs">{probs.map((p, i) => <span key={i} className="prob-pill">{p}</span>)}</div>
      )}
      <div className="t-footer">
        <span className="t-price">{money(ticket.price)}</span>
        {ticket.folia ? <span className="t-folia">✓ Fólia</span> : <span className="t-date">{ticket.dateIn}</span>}
      </div>
      {onClose && ticket.status === "Átadásra" && ticket.subStatus !== "Sikertelen" && (
        Number(ticket.price) > 0 ? (
          askingPayment ? (
            <div className="t-card-pay-row" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="t-card-pay-btn primary" onClick={() => onClose(ticket.id, "Készpénz")}>Készpénz</button>
              <button type="button" className="t-card-pay-btn" onClick={() => onClose(ticket.id, "Kártya")}>Kártya</button>
              <button type="button" className="t-card-pay-btn" onClick={() => onClose(ticket.id, "Átutalás")}>Átutalás</button>
            </div>
          ) : (
            <button type="button" className="t-card-close-btn" onClick={(e) => { e.stopPropagation(); setAskingPayment(true); }}>
              {money(ticket.price)}
            </button>
          )
        ) : (
          <button type="button" className="t-card-close-btn" onClick={(e) => { e.stopPropagation(); onClose(ticket.id, null); }}>
            Ingyenes átadás
          </button>
        )
      )}
    </div>
  );
}
