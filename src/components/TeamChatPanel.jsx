import { useState, useRef, useEffect, useMemo } from "react";
import { CloseIcon, ChatIcon, ServiceIcon, PhoneCaseIcon, PartsIcon, CustomersIcon, WarrantyIcon } from "./icons";
import { EmptyState } from "./EmptyState";
import { searchMentions } from "../lib/mentions";
import { ticketCode } from "../lib/utils";

function timeLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const TYPE_ICON = { ticket: ServiceIcon, product: PhoneCaseIcon, part: PartsIcon, customer: CustomersIcon, warranty: WarrantyIcon };

export default function TeamChatPanel({
  messages, users, tickets, stock, parts, customersTable, warranties, locName, currentUserId, onSend,
  onOpenTicket, onOpenProduct, onOpenPart, onOpenCustomer, onOpenWarranty, onClose,
}) {
  const [text, setText] = useState("");
  const [link, setLink] = useState(null); // { type, id, label }
  const listRef = useRef(null);
  const notifAskedRef = useRef(null);

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
    const m = text.match(/#(\S*)$/);
    return m ? m[1] : null;
  }, [text]);

  const mentionMatches = useMemo(
    () => (mentionQuery ? searchMentions(mentionQuery, { tickets, stock, parts, customersTable, warranties, locName }) : []),
    [mentionQuery, tickets, stock, parts, customersTable, warranties, locName]
  );

  function pickMention(m) {
    setText((t) => t.replace(/#(\S*)$/, ""));
    setLink({ type: m.type, id: m.id, label: m.label });
  }

  function submit() {
    const body = text.trim();
    if (!body) return;
    onSend(
      body,
      link?.type === "ticket" ? link.id : null,
      link?.type === "product" ? link.id : null,
      link?.type === "part" ? link.id : null,
      link?.type === "customer" ? link.id : null,
      link?.type === "warranty" ? link.id : null,
    );
    setText("");
    setLink(null);
  }

  function openLink(type, id) {
    if (type === "ticket") onOpenTicket(id);
    else if (type === "product") onOpenProduct(id);
    else if (type === "part") onOpenPart(id);
    else if (type === "customer") onOpenCustomer(id);
    else if (type === "warranty") onOpenWarranty(id);
  }

  function chipLabel(type, id) {
    if (type === "ticket") {
      const t = tickets.find((x) => x.id === id);
      return t ? `${ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))} — ${[t.brand, t.model].filter(Boolean).join(" ")}` : "Munkalap";
    }
    if (type === "product") {
      const p = stock.find((x) => x.id === id);
      return p ? [p.brand, p.model].filter(Boolean).join(" ") : "Termék";
    }
    if (type === "part") {
      const pt = parts.find((x) => x.id === id);
      return pt ? pt.name : "Alkatrész";
    }
    if (type === "customer") {
      const c = customersTable.find((x) => x.id === id);
      return c ? (c.name || "Névtelen") : "Ügyfél";
    }
    if (type === "warranty") {
      const w = warranties.find((x) => x.id === id);
      return w ? `Garancia — ${w.customerName || "?"}` : "Garancia";
    }
    return "";
  }

  return (
    <div className="chat-panel">
      <div className="chat-panel-head">
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}><ChatIcon width={15} height={15} /> Csapat-chat</div>
        <button className="iconbtn" onClick={onClose}><CloseIcon /></button>
      </div>
      <div className="chat-panel-list" ref={listRef}>
        {messages.length === 0 && <EmptyState icon={ChatIcon}>Még nincs üzenet — írj elsőnek!</EmptyState>}
        {messages.map((m) => {
          const linkedType = m.linkedTicketId ? "ticket" : m.linkedProductId ? "product" : m.linkedPartId ? "part" : m.linkedCustomerId ? "customer" : m.linkedWarrantyId ? "warranty" : null;
          const linkedId = m.linkedTicketId || m.linkedProductId || m.linkedPartId || m.linkedCustomerId || m.linkedWarrantyId || null;
          const LinkedIcon = linkedType ? TYPE_ICON[linkedType] : null;
          return (
            <div key={m.id} className={`chat-msg${m.senderId === currentUserId ? " mine" : ""}`}>
              <div className="chat-msg-meta">
                <span className="chat-msg-sender">{userName(m.senderId)}</span>
                <span className="chat-msg-time">{timeLabel(m.createdAt)}</span>
              </div>
              <div className="chat-msg-body">{m.body}</div>
              {linkedType && (
                <button type="button" className="chat-chip" onClick={() => openLink(linkedType, linkedId)}>
                  <LinkedIcon width={11} height={11} /> {chipLabel(linkedType, linkedId)}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {link && (() => {
        const LinkIcon = TYPE_ICON[link.type];
        return (
          <div className="chat-link-preview">
            <LinkIcon width={12} height={12} /> {link.label}
            <button type="button" onClick={() => setLink(null)}><CloseIcon width={12} height={12} /></button>
          </div>
        );
      })()}
      {mentionMatches.length > 0 && (
        <div className="chat-mentions">
          {mentionMatches.map((m) => {
            const MIcon = TYPE_ICON[m.type];
            return (
              <div key={m.type + m.id} className="chat-mention-item" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={() => pickMention(m)}>
                <MIcon width={12} height={12} /> {m.label}
              </div>
            );
          })}
        </div>
      )}
      <div className="chat-panel-input">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Üzenet... (# a munkalap/termék/alkatrész/ügyfél/garancia hivatkozáshoz)"
        />
        <button className="btn" onClick={submit}>Küldés</button>
      </div>
    </div>
  );
}
