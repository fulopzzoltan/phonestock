import { ServiceIcon, PhoneCaseIcon, PartsIcon, CustomersIcon, WarrantyIcon } from "./icons";
import ConfirmDelete from "./ConfirmDelete";

const TYPE_ICON = { ticket: ServiceIcon, product: PhoneCaseIcon, part: PartsIcon, customer: CustomersIcon, warranty: WarrantyIcon };
const DUE_LABEL = { today: "Ma", week: "E héten" };

export default function NoteCard({ note, users, currentUserId, done, onComplete, onReopen, onDelete, onOpenLink }) {
  const authorName = users.find((u) => u.id === note.authorId)?.fullName || "?";
  const assignedName = note.assignedToId ? (users.find((u) => u.id === note.assignedToId)?.fullName || "?") : "Mindenkinek";
  const linkedType = note.linkedTicketId ? "ticket" : note.linkedProductId ? "product" : note.linkedPartId ? "part" : note.linkedCustomerId ? "customer" : note.linkedWarrantyId ? "warranty" : null;
  const linkedId = note.linkedTicketId || note.linkedProductId || note.linkedPartId || note.linkedCustomerId || note.linkedWarrantyId || null;
  const LinkIcon = linkedType ? TYPE_ICON[linkedType] : null;
  const mine = note.assignedToId && note.assignedToId === currentUserId;
  const cardCls = `note-card${done ? " done" : note.dueScope === "today" ? " due-today" : ""}${mine ? " mine" : ""}`;
  return (
    <div className={cardCls}>
      <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.4, textDecoration: done ? "line-through" : "none" }}>{note.body}</p>
      {linkedType && (
        <button type="button" className="chat-chip" style={{ marginBottom: 8 }} onClick={() => onOpenLink?.[linkedType]?.(linkedId)}>
          <LinkIcon width={11} height={11} /> megnyitás
        </button>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "#9CA3AF", marginTop: "auto" }}>
        <span>{authorName} · {assignedName}{note.dueScope ? ` · ${DUE_LABEL[note.dueScope]}` : ""}</span>
        {done ? (
          <button type="button" className="btn sec sm" onClick={onReopen}>Visszavon</button>
        ) : (
          <span style={{ display: "flex", gap: 6 }}>
            <button type="button" className="btn sec sm" onClick={onComplete}>Kész</button>
            <ConfirmDelete disabled={false} onConfirm={onDelete} />
          </span>
        )}
      </div>
    </div>
  );
}
