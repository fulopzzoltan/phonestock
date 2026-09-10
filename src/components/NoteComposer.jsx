import { useState, useMemo } from "react";
import { searchMentions } from "../lib/mentions";
import { ServiceIcon, PhoneCaseIcon, PartsIcon, CustomersIcon, WarrantyIcon, CloseIcon } from "./icons";

const TYPE_ICON = { ticket: ServiceIcon, product: PhoneCaseIcon, part: PartsIcon, customer: CustomersIcon, warranty: WarrantyIcon };
export const NOTE_COLORS = [
  { value: "#86EFAC", ink: "#14532D" },
  { value: "#C4B5FD", ink: "#3B0764" },
  { value: "#FDBA74", ink: "#7C2D12" },
  { value: "#FDE68A", ink: "#713F12" },
];

export default function NoteComposer({ users, tickets, stock, parts, customersTable, warranties, locName, onSave, open, setOpen }) {
  const [text, setText] = useState("");
  const [color, setColor] = useState(NOTE_COLORS[0].value);
  const [link, setLink] = useState(null);

  const mentionQuery = useMemo(() => { const m = text.match(/#(\S*)$/); return m ? m[1] : null; }, [text]);
  const mentionMatches = useMemo(
    () => (mentionQuery ? searchMentions(mentionQuery, { tickets, stock, parts, customersTable, warranties, locName }) : []),
    [mentionQuery, tickets, stock, parts, customersTable, warranties, locName]
  );
  function pickMention(m) { setText((t) => t.replace(/#(\S*)$/, "")); setLink({ type: m.type, id: m.id, label: m.label }); }

  function submit() {
    if (!text.trim()) return;
    onSave(text.trim(), { color, link });
    setText(""); setColor(NOTE_COLORS[0].value); setLink(null); setOpen(false);
  }

  if (!open) {
    return <button type="button" className="btn sm" onClick={() => setOpen(true)}>+ Cetli</button>;
  }

  const ink = NOTE_COLORS.find((c) => c.value === color)?.ink || NOTE_COLORS[0].ink;

  return (
    <div className="note-composer">
      <div className="note-composer-colors">
        {NOTE_COLORS.map((c) => (
          <button type="button" key={c.value} className={`note-color-dot${c.value === color ? " on" : ""}`} style={{ background: c.value }} onClick={() => setColor(c.value)} />
        ))}
      </div>
      <div className="note-composer-body">
        <textarea value={text} onChange={(e) => setText(e.target.value)}
          style={{ color: ink }} autoFocus />
        {link && (() => { const LinkIcon = TYPE_ICON[link.type]; return (
          <div className="chat-link-preview"><LinkIcon width={12} height={12} /> {link.label}<button type="button" onClick={() => setLink(null)}><CloseIcon width={12} height={12} /></button></div>
        ); })()}
        {mentionMatches.length > 0 && (
          <div className="chat-mentions">
            {mentionMatches.map((m) => { const MIcon = TYPE_ICON[m.type]; return (
              <div key={m.type + m.id} className="chat-mention-item" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={() => pickMention(m)}>
                <MIcon width={12} height={12} /> {m.label}
              </div>
            ); })}
          </div>
        )}
      </div>
      <div className="note-composer-toolbar">
        <button type="button" className="btnv sec" onClick={() => setOpen(false)}>Mégse</button>
        <button type="button" className="btnv prim" onClick={submit}>Felírás</button>
      </div>
    </div>
  );
}
