import { ServiceIcon, PhoneCaseIcon, PartsIcon, CustomersIcon, WarrantyIcon } from "./icons";
import ConfirmDelete from "./ConfirmDelete";
import { NOTE_COLORS } from "./NoteComposer";

const TYPE_ICON = { ticket: ServiceIcon, product: PhoneCaseIcon, part: PartsIcon, customer: CustomersIcon, warranty: WarrantyIcon };

export default function NoteCard({ note, users, done, onComplete, onReopen, onDelete, onOpenLink }) {
  const authorName = users.find((u) => u.id === note.authorId)?.fullName || "?";
  const linkedType = note.linkedTicketId ? "ticket" : note.linkedProductId ? "product" : note.linkedPartId ? "part" : note.linkedCustomerId ? "customer" : note.linkedWarrantyId ? "warranty" : null;
  const linkedId = note.linkedTicketId || note.linkedProductId || note.linkedPartId || note.linkedCustomerId || note.linkedWarrantyId || null;
  const LinkIcon = linkedType ? TYPE_ICON[linkedType] : null;
  const swatch = NOTE_COLORS.find((c) => c.value === note.color) || NOTE_COLORS[0];
  return (
    <div className={`note-card${done ? " done" : ""}`} style={{ background: swatch.value }}>
      <div className="note-card-tape" />
      <p className="note-card-body" style={{ color: swatch.ink, textDecoration: done ? "line-through" : "none" }}>{note.body}</p>
      {linkedType && (
        <button type="button" className="note-card-link" style={{ color: swatch.ink }} onClick={() => onOpenLink?.[linkedType]?.(linkedId)}>
          <LinkIcon width={11} height={11} /> megnyitás
        </button>
      )}
      <div className="note-card-meta">
        <span style={{ color: swatch.ink }}>{authorName}</span>
        {done ? (
          <button type="button" className="note-card-done" style={{ color: swatch.ink }} onClick={onReopen}>Visszavon</button>
        ) : (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button type="button" className="note-card-btn" style={{ color: swatch.ink }} onClick={onComplete} title="Kész">
              <svg viewBox="0 0 24 24" fill="none"><path d="M4.5 13.2 9.3 18 19.5 6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <ConfirmDelete disabled={false} onConfirm={onDelete} className="note-card-btn" />
          </span>
        )}
      </div>
    </div>
  );
}
