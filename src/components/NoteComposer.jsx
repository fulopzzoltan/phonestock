import { useState, useMemo } from "react";
import { searchMentions } from "../lib/mentions";
import { ServiceIcon, PhoneCaseIcon, PartsIcon, CustomersIcon, WarrantyIcon, CloseIcon } from "./icons";

const TYPE_ICON = { ticket: ServiceIcon, product: PhoneCaseIcon, part: PartsIcon, customer: CustomersIcon, warranty: WarrantyIcon };

export default function NoteComposer({ users, tickets, stock, parts, customersTable, warranties, locName, onSave }) {
  const [text, setText] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueScope, setDueScope] = useState("today");
  const [link, setLink] = useState(null);

  const mentionQuery = useMemo(() => { const m = text.match(/#(\S*)$/); return m ? m[1] : null; }, [text]);
  const mentionMatches = useMemo(
    () => (mentionQuery ? searchMentions(mentionQuery, { tickets, stock, parts, customersTable, warranties, locName }) : []),
    [mentionQuery, tickets, stock, parts, customersTable, warranties, locName]
  );
  function pickMention(m) { setText((t) => t.replace(/#(\S*)$/, "")); setLink({ type: m.type, id: m.id, label: m.label }); }

  function submit() {
    if (!text.trim()) return;
    onSave(text.trim(), { assignedTo: assignedTo || null, dueScope: dueScope || null, link });
    setText(""); setAssignedTo(""); setDueScope("today"); setLink(null);
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #EEF0F2", borderRadius: 14, padding: 12, marginBottom: 14 }}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Pl. hozz át 2 kijelzőt Szentgyörgyről... (# a munkalap/telefon/alkatrész/ügyfél/garancia hivatkozáshoz)"
        style={{ width: "100%", minHeight: 48, resize: "vertical", border: "none", outline: "none", fontFamily: "inherit", fontSize: 13 }} />
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
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} style={{ fontSize: 12 }}>
          <option value="">Mindenkinek</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.fullName || u.email}</option>)}
        </select>
        <div className="seg">
          <button type="button" className={dueScope === "today" ? "active" : ""} onClick={() => setDueScope("today")}>Ma</button>
          <button type="button" className={dueScope === "week" ? "active" : ""} onClick={() => setDueScope("week")}>E héten</button>
          <button type="button" className={dueScope === "" ? "active" : ""} onClick={() => setDueScope("")}>Nincs határidő</button>
        </div>
        <button type="button" className="btn sm" style={{ marginLeft: "auto" }} onClick={submit}>Felírás</button>
      </div>
    </div>
  );
}
