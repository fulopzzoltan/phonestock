import { money } from "../lib/utils";
import { CallIcon } from "./icons";

export default function TicketCard({ ticket, locName, onOpen }) {
  const probs = (ticket.issue || "").split(",").map((p) => p.trim()).filter(Boolean);
  return (
    <div className="t-card" onClick={() => onOpen(ticket.id)}>
      <div className="t-card-top">
        <span className="t-sn">#{ticket.ticketNo}</span>
        <span className="t-loc">{locName(ticket.locationId)}</span>
      </div>
      <div className="t-name">{ticket.customerName}</div>
      <div className="t-device">
        <span>{[ticket.brand, ticket.model].filter(Boolean).join(" ")}</span>
        {ticket.customerPhone && (
          <a className="call-link" href={`tel:${ticket.customerPhone.replace(/\s/g, "")}`} onClick={(e) => e.stopPropagation()}>
            <CallIcon />Hívás
          </a>
        )}
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
