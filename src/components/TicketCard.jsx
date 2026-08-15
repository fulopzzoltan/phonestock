import { money, subStatusCls, subStatusLabel, slaInfo, displayName, ticketCode, isStaleReady } from "../lib/utils";
import { ClockIcon, ServiceIcon, WarrantyIcon } from "./icons";
import CallLink from "./CallLink";
import Thumb from "./Thumb";

export default function TicketCard({ ticket, locName, onOpen }) {
  const probs = (ticket.issue || "").split(",").map((p) => p.trim()).filter(Boolean);
  const sla = slaInfo(ticket);
  const staleReady = isStaleReady(ticket);
  const kindCls = ticket.ticketKind === "Saját készlet - előkészítés" ? " t-card-kind-prep"
    : ticket.ticketKind === "Saját készlet - garanciális" ? " t-card-kind-warranty" : "";
  return (
    <div className={`t-card${kindCls}${sla && sla.level !== "ok" ? ` t-card-sla-${sla.level}` : ""}`} onClick={() => onOpen(ticket.id)}>
      <div className="t-card-top">
        <span className="t-sn">{ticketCode(ticket.ticketNo, locName(ticket.intakeLocationId || ticket.locationId))}</span>
        <span className="t-loc">{locName(ticket.locationId)}</span>
      </div>
      {ticket.ticketKind !== "Ügyfél" && (
        <span className="t-kind-pill">
          {ticket.ticketKind === "Saját készlet - előkészítés" ? <ServiceIcon width={11} height={11} /> : <WarrantyIcon width={11} height={11} />}
          {ticket.ticketKind === "Saját készlet - előkészítés" ? "Saját — előkészítés" : "Saját — garanciális"}
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
        <span className="t-device-main"><Thumb brand={ticket.brand} size="sm" />{displayName(ticket.brand, ticket.model) || "—"}</span>
        <CallLink phone={ticket.customerPhone} />
      </div>
      {probs.length > 0 && (
        <div className="t-probs">{probs.map((p, i) => <span key={i} className="prob-pill">{p}</span>)}</div>
      )}
      <div className="t-footer">
        <span className="t-price">{money(ticket.price)}</span>
        {ticket.folia ? <span className="t-folia">✓ Fólia</span> : <span className="t-date">{ticket.dateIn}</span>}
      </div>
    </div>
  );
}
