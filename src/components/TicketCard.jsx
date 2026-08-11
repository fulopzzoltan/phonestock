import { money, subStatusCls, subStatusLabel, slaInfo } from "../lib/utils";
import { ClockIcon } from "./icons";
import CallLink from "./CallLink";

export default function TicketCard({ ticket, locName, onOpen }) {
  const probs = (ticket.issue || "").split(",").map((p) => p.trim()).filter(Boolean);
  const sla = slaInfo(ticket);
  return (
    <div className={`t-card${sla && sla.level !== "ok" ? ` t-card-sla-${sla.level}` : ""}`} onClick={() => onOpen(ticket.id)}>
      <div className="t-card-top">
        <span className="t-sn">#{ticket.ticketNo}</span>
        <span className="t-loc">{locName(ticket.locationId)}</span>
      </div>
      {sla && (sla.level === "warn" || sla.level === "overdue") && (
        <div style={{ marginBottom: 4 }}>
          <span className={`sla-badge sla-${sla.level}`}><ClockIcon width={11} height={11} />{sla.label}</span>
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
        <span>{[ticket.brand, ticket.model].filter(Boolean).join(" ")}</span>
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
