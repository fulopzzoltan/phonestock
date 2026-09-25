import { useState } from "react";
import { ServiceIcon, PhoneCaseIcon, PartsIcon, CustomersIcon, WarrantyIcon, EditIcon, CheckIcon, CloseIcon } from "./icons";
import ConfirmDelete from "./ConfirmDelete";
import { NOTE_COLORS } from "./NoteComposer";

const TYPE_ICON = { ticket: ServiceIcon, product: PhoneCaseIcon, part: PartsIcon, customer: CustomersIcon, warranty: WarrantyIcon };

export default function NoteCard({ note, users, done, onComplete, onReopen, onDelete, onEdit, onOpenLink }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const authorName = users.find((u) => u.id === note.authorId)?.fullName || "?";
  const linkedType = note.linkedTicketId ? "ticket" : note.linkedProductId ? "product" : note.linkedPartId ? "part" : note.linkedCustomerId ? "customer" : note.linkedWarrantyId ? "warranty" : null;
  const linkedId = note.linkedTicketId || note.linkedProductId || note.linkedPartId || note.linkedCustomerId || note.linkedWarrantyId || null;
  const LinkIcon = linkedType ? TYPE_ICON[linkedType] : null;
  const swatch = NOTE_COLORS.find((c) => c.value === note.color) || NOTE_COLORS[0];

  function startEdit() { setDraft(note.body); setEditing(true); }
  function save() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== note.body) onEdit?.(trimmed);
    setEditing(false);
  }
  function cancel() { setDraft(note.body); setEditing(false); }

  return (
    <div className={`note-card${done ? " done" : ""}`} style={{ background: swatch.value }}>
      <div className="note-card-tape" />
      {editing ? (
        <textarea
          className="note-card-edit"
          style={{ color: swatch.ink }}
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); }
            if (e.key === "Escape") cancel();
          }}
          onBlur={save}
        />
      ) : (
        <p
          className="note-card-body"
          style={{ color: swatch.ink, textDecoration: done ? "line-through" : "none", cursor: onEdit && !done ? "text" : undefined }}
          onClick={onEdit && !done ? startEdit : undefined}
        >
          {note.body}
        </p>
      )}
      {linkedType && (
        <button type="button" className="note-card-link" style={{ color: swatch.ink }} onClick={() => onOpenLink?.[linkedType]?.(linkedId)}>
          <LinkIcon width={11} height={11} /> megnyitás
        </button>
      )}
      <div className="note-card-meta">
        <span style={{ color: swatch.ink }}>{authorName}</span>
        {editing ? (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button type="button" className="note-card-btn" style={{ color: swatch.ink }} onMouseDown={(e) => e.preventDefault()} onClick={save} title="Mentés">
              <CheckIcon width={13} height={13} strokeWidth={2.4} />
            </button>
            <button type="button" className="note-card-btn" style={{ color: swatch.ink }} onMouseDown={(e) => e.preventDefault()} onClick={cancel} title="Mégse">
              <CloseIcon width={13} height={13} strokeWidth={2.4} />
            </button>
          </span>
        ) : done ? (
          <button type="button" className="note-card-done" style={{ color: swatch.ink }} onClick={onReopen}>Visszavon</button>
        ) : (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {onEdit && (
              <button type="button" className="note-card-btn" style={{ color: swatch.ink }} onClick={startEdit} title="Szerkesztés">
                <EditIcon width={12} height={12} />
              </button>
            )}
            <button type="button" className="note-card-btn" style={{ color: swatch.ink }} onClick={onComplete} title="Kész">
              <svg viewBox="0 0 24 24" fill="none"><path d="M4.5 13.2 9.3 18 19.5 6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <span style={{ color: swatch.ink, display: "flex" }}>
              <ConfirmDelete disabled={false} onConfirm={onDelete} className="note-card-btn" />
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
