import { useState, useRef, useEffect, useMemo } from "react";
import { CloseIcon } from "./icons";

function timeLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function TeamChatPanel({ messages, users, tickets, stock, currentUserId, onSend, onOpenTicket, onOpenProduct, onClose }) {
  const [text, setText] = useState("");
  const [link, setLink] = useState(null); // { type: "ticket"|"product", id, label }
  const listRef = useRef(null);
  const notifAskedRef = useRef(false);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    if (notifAskedRef.current) return;
    notifAskedRef.current = true;
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const userName = (id) => {
    const u = users.find((x) => x.id === id);
    return u?.fullName || u?.email || "Ismeretlen";
  };

  const mentionQuery = useMemo(() => {
    const m = text.match(/#(\d*)$/);
    return m ? m[1] : null;
  }, [text]);

  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return [];
    if (!mentionQuery) {
      return [];
    }
    const ticketMatches = tickets
      .filter((t) => String(t.ticketNo).startsWith(mentionQuery))
      .slice(0, 5)
      .map((t) => ({ type: "ticket", id: t.id, label: `#${t.ticketNo} — ${[t.brand, t.model].filter(Boolean).join(" ")}` }));
    const productMatches = stock
      .filter((p) => (p.imei || "").includes(mentionQuery))
      .slice(0, 5)
      .map((p) => ({ type: "product", id: p.id, label: `${[p.brand, p.model].filter(Boolean).join(" ")} — IMEI …${(p.imei || "").slice(-6)}` }));
    return [...ticketMatches, ...productMatches];
  }, [mentionQuery, tickets, stock]);

  function pickMention(m) {
    setText((t) => t.replace(/#(\d*)$/, ""));
    setLink({ type: m.type, id: m.id, label: m.label });
  }

  function submit() {
    const body = text.trim();
    if (!body) return;
    onSend(body, link?.type === "ticket" ? link.id : null, link?.type === "product" ? link.id : null);
    setText("");
    setLink(null);
  }

  return (
    <div className="chat-panel">
      <div className="chat-panel-head">
        <div>💬 Csapat-chat</div>
        <button className="iconbtn" onClick={onClose}><CloseIcon /></button>
      </div>
      <div className="chat-panel-list" ref={listRef}>
        {messages.length === 0 && <div className="empty">Még nincs üzenet — írj elsőnek!</div>}
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg${m.senderId === currentUserId ? " mine" : ""}`}>
            <div className="chat-msg-meta">
              <span className="chat-msg-sender">{userName(m.senderId)}</span>
              <span className="chat-msg-time">{timeLabel(m.createdAt)}</span>
            </div>
            <div className="chat-msg-body">{m.body}</div>
            {m.linkedTicketId && (
              <button type="button" className="chat-chip" onClick={() => onOpenTicket(m.linkedTicketId)}>
                🔧 {(() => {
                  const t = tickets.find((x) => x.id === m.linkedTicketId);
                  return t ? `#${t.ticketNo} — ${[t.brand, t.model].filter(Boolean).join(" ")}` : "Munkalap";
                })()}
              </button>
            )}
            {m.linkedProductId && (
              <button type="button" className="chat-chip" onClick={() => onOpenProduct(m.linkedProductId)}>
                📦 {(() => {
                  const p = stock.find((x) => x.id === m.linkedProductId);
                  return p ? [p.brand, p.model].filter(Boolean).join(" ") : "Termék";
                })()}
              </button>
            )}
          </div>
        ))}
      </div>
      {link && (
        <div className="chat-link-preview">
          {link.type === "ticket" ? "🔧" : "📦"} {link.label}
          <button type="button" onClick={() => setLink(null)}><CloseIcon width={12} height={12} /></button>
        </div>
      )}
      {mentionMatches.length > 0 && (
        <div className="chat-mentions">
          {mentionMatches.map((m) => (
            <div key={m.type + m.id} className="chat-mention-item" onClick={() => pickMention(m)}>
              {m.type === "ticket" ? "🔧" : "📦"} {m.label}
            </div>
          ))}
        </div>
      )}
      <div className="chat-panel-input">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Üzenet... (# a munkalap/termék hivatkozáshoz)"
        />
        <button className="btn" onClick={submit}>Küldés</button>
      </div>
    </div>
  );
}
