import { useState, useMemo } from "react";
import { ChatIcon, SearchIcon } from "../components/icons";
import { EmptyState } from "../components/EmptyState";
import { formatPhone } from "../lib/utils";

// Az üzeneteket a `phone_norm` (9 jegyű, +40 nélküli szám) szerint csoportosítjuk
// beszélgetésekké — ugyanaz a formátum, mint a `customers.phone_norm`, így az ügyfélnév
// egyszerű egyezéssel feloldható, külön backend-JOIN nélkül.
function buildThreads(messages, customers) {
  const byPhone = {};
  for (const m of messages) {
    (byPhone[m.phoneNorm] ||= []).push(m);
  }
  const customerByPhone = {};
  for (const c of customers) {
    const norm = (c.phone || "").replace(/\D/g, "").slice(-9);
    if (norm) customerByPhone[norm] = c;
  }
  return Object.entries(byPhone).map(([phoneNorm, msgs]) => {
    const sorted = [...msgs].sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
    const last = sorted[sorted.length - 1];
    const customer = customerByPhone[phoneNorm];
    return {
      phoneNorm,
      customer,
      messages: sorted,
      lastAt: last?.createdAt || "",
      lastPreview: last?.body || (last?.templateName ? `Sablon: ${last.templateName}` : ""),
      unread: sorted.some((m) => m.direction === "in" && m.status === "received"),
    };
  }).sort((a, b) => (b.lastAt || "").localeCompare(a.lastAt || ""));
}

function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("hu-HU", { month: "short", day: "numeric" });
}

export default function WhatsAppTab({ messages, customers, onSend, onOpenCustomer }) {
  const [q, setQ] = useState("");
  const [activePhone, setActivePhone] = useState(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const threads = useMemo(() => buildThreads(messages, customers), [messages, customers]);
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return threads;
    return threads.filter((t) => [t.customer?.name, t.phoneNorm].filter(Boolean).join(" ").toLowerCase().includes(qq));
  }, [threads, q]);

  const active = threads.find((t) => t.phoneNorm === activePhone) || filtered[0] || null;

  async function submit() {
    if (!draft.trim() || !active) return;
    setSending(true);
    setSendError("");
    try {
      await onSend(active.phoneNorm, draft.trim());
      setDraft("");
    } catch (err) {
      setSendError(err.message || "Nem sikerült elküldeni.");
    } finally {
      setSending(false);
    }
  }

  if (threads.length === 0) {
    return (
      <EmptyState icon={ChatIcon}>
        Még nincs WhatsApp-üzenet. Amint a WhatsApp-fiók be van kötve (webhook + Meta rendszerfelhasználó
        token beállítva), az ügyfelekkel folytatott beszélgetések itt fognak megjelenni.
      </EmptyState>
    );
  }

  return (
    <div className="wa-tab">
      <div className="wa-threads">
        <div className="searchbar" style={{ margin: "0 0 10px" }}>
          <SearchIcon width={14} height={14} />
          <input placeholder="Keresés név vagy szám szerint..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="wa-thread-list">
          {filtered.map((t) => (
            <div
              key={t.phoneNorm}
              className={`wa-thread-item${active?.phoneNorm === t.phoneNorm ? " active" : ""}`}
              onClick={() => setActivePhone(t.phoneNorm)}
            >
              <div className="wa-thread-name">{t.customer?.name || formatPhone(t.phoneNorm) || t.phoneNorm}</div>
              <div className="wa-thread-preview">{t.lastPreview}</div>
              <div className="wa-thread-time">{fmtTime(t.lastAt)}</div>
              {t.unread && <span className="wa-thread-dot" />}
            </div>
          ))}
        </div>
      </div>

      <div className="wa-panel">
        {!active ? (
          <EmptyState icon={ChatIcon}>Válassz egy beszélgetést.</EmptyState>
        ) : (
          <>
            <div className="wa-panel-head">
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{active.customer?.name || "Ismeretlen ügyfél"}</div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>{formatPhone(active.phoneNorm) || active.phoneNorm}</div>
              </div>
              {active.customer && onOpenCustomer && (
                <button type="button" className="btn sec sm" onClick={() => onOpenCustomer(active.customer.id)}>Ügyfélkártya</button>
              )}
            </div>
            <div className="wa-messages">
              {active.messages.map((m) => (
                <div key={m.id} className={`chat-msg${m.direction === "out" ? " mine" : ""}`}>
                  <div className="chat-msg-meta">
                    <span className="chat-msg-sender">{m.direction === "out" ? "Mi" : (active.customer?.name || "Ügyfél")}</span>
                    <span className="chat-msg-time">{fmtTime(m.createdAt)}</span>
                    {m.status === "failed" && <span className="chat-msg-time" style={{ color: "#B91C1C" }}>sikertelen</span>}
                  </div>
                  <div className="chat-msg-body">{m.body || (m.templateName ? `📋 Sablonüzenet: ${m.templateName}` : "—")}</div>
                </div>
              ))}
            </div>
            <div className="wa-composer">
              {sendError && <div className="errbar" style={{ marginBottom: 8 }}>{sendError}</div>}
              <div style={{ fontSize: 10.5, color: "#9CA3AF", marginBottom: 6 }}>
                Csak akkor kézbesíthető, ha az ügyfél 24 órán belül írt nekünk (Meta service window).
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <textarea
                  rows={2}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Írj választ..."
                  style={{ flex: 1, resize: "none", fontFamily: "inherit", fontSize: 13, border: "1px solid #E5E7EB", borderRadius: 10, padding: "8px 10px" }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                />
                <button type="button" className="btn" disabled={sending || !draft.trim()} onClick={submit}>
                  {sending ? "Küldés..." : "Küldés"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
