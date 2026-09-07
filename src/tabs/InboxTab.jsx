import { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { ChatIcon, SearchIcon, WhatsappIcon, FacebookIcon, CameraIcon } from "../components/icons";
import { EmptyState } from "../components/EmptyState";
import { formatPhone } from "../lib/utils";

// Közös postaláda — WhatsApp és Messenger üzenetek egy helyen, CRM-szemlélettel: minden
// beszélgetéshez tartozik egy ügyfél/lead-rekord (customers tábla), pipeline-státusszal
// (hol tart) és forrás-cimkével (miért írt), hogy a szerviz-érdeklődőket, eladni
// szándékozókat és vásárlókat egyben lehessen átlátni, és tudni lehessen, ki már nem
// releváns — ld. unified_chat_inbox_and_crm_pipeline migráció.

export const LEAD_STAGES = [
  { value: "uj_megkereses", label: "Új megkeresés", color: "#2563EB" },
  { value: "folyamatban", label: "Folyamatban", color: "#A5722A" },
  { value: "ajanlat_kikuldve", label: "Ajánlat kiküldve", color: "#7C3AED" },
  { value: "ugyfel_lett", label: "Ügyfél lett", color: "#15803D" },
  { value: "nem_relevans", label: "Nem releváns", color: "#9CA3AF" },
];
export const LEAD_SOURCES = [
  { value: "szerviz_erdeklodo", label: "Szerviz érdeklődő" },
  { value: "eladni_szeretne", label: "Eladni szeretne" },
  { value: "vasarolt", label: "Vásárolt" },
  { value: "egyeb", label: "Egyéb" },
];
const STAGE_BY_VALUE = Object.fromEntries(LEAD_STAGES.map((s) => [s.value, s]));

// Beszélgetéssé csoportosítás: a kulcs csatorna + azonosító (WhatsApp: telefonszám,
// Messenger: PSID — a kettőnek nincs közös alapja, ezért nem lehet egy mezőre húzni).
// Az ügyfél-hozzárendelést a legutóbbi üzenet customer_id-jából vesszük (a chat-webhook
// mindig kitölti, ismeretlen küldőnél is — ld. findOrCreateCustomer); régebbi soroknál
// (a migráció előttről) telefonszám/PSID-egyezésre esik vissza.
function buildThreads(messages, customers) {
  const byKey = {};
  for (const m of messages) {
    const identity = m.phoneNorm || m.senderPsid;
    if (!identity) continue;
    const key = `${m.channel}:${identity}`;
    (byKey[key] ||= []).push(m);
  }
  const customerById = {};
  const customerByPhone = {};
  const customerByPsid = {};
  for (const c of customers) {
    customerById[c.id] = c;
    const norm = (c.phone || "").replace(/\D/g, "").slice(-9);
    if (norm) customerByPhone[norm] = c;
    if (c.messengerPsid) customerByPsid[c.messengerPsid] = c;
  }

  return Object.entries(byKey).map(([key, msgs]) => {
    const sorted = [...msgs].sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
    const last = sorted[sorted.length - 1];
    const channel = sorted[0].channel;
    const identity = sorted[0].phoneNorm || sorted[0].senderPsid;
    const withCustomerId = [...sorted].reverse().find((m) => m.customerId);
    const customer = (withCustomerId && customerById[withCustomerId.customerId])
      || (channel === "messenger" ? customerByPsid[identity] : customerByPhone[identity])
      || null;
    return {
      key,
      channel,
      phoneNorm: channel === "whatsapp" ? identity : null,
      senderPsid: channel === "messenger" ? identity : null,
      customer,
      customerId: customer?.id || null,
      messages: sorted,
      lastAt: last?.createdAt || "",
      lastPreview: last?.mediaType ? "📷 Kép" : (last?.body || (last?.templateName ? `Sablon: ${last.templateName}` : "")),
      unread: sorted.some((m) => m.direction === "in" && !m.readAt),
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

function ChannelBadge({ channel }) {
  const Icon = channel === "messenger" ? FacebookIcon : WhatsappIcon;
  const color = channel === "messenger" ? "#1877F2" : "#25D366";
  return <Icon width={13} height={13} style={{ color, flexShrink: 0 }} />;
}

function StagePill({ stage }) {
  const s = STAGE_BY_VALUE[stage];
  if (!s) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700, color: s.color }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: s.color }} />
      {s.label}
    </span>
  );
}

export default function InboxTab({ messages, customers, onSend, onOpenCustomer, onMarkRead, onUpdateLead }) {
  const [q, setQ] = useState("");
  const [showIrrelevant, setShowIrrelevant] = useState(false);
  const [activeKey, setActiveKey] = useState(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [mediaUrls, setMediaUrls] = useState({});
  const fileInputRef = useRef(null);

  const threads = useMemo(() => buildThreads(messages, customers), [messages, customers]);
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return threads.filter((t) => {
      if (!showIrrelevant && t.customer?.leadStage === "nem_relevans" && !t.unread) return false;
      if (!qq) return true;
      return [t.customer?.name, t.phoneNorm, t.senderPsid].filter(Boolean).join(" ").toLowerCase().includes(qq);
    });
  }, [threads, q, showIrrelevant]);

  const active = threads.find((t) => t.key === activeKey) || filtered[0] || null;

  useEffect(() => {
    if (active?.unread && onMarkRead) onMarkRead(active);
  }, [active?.key, active?.unread, onMarkRead]);

  useEffect(() => {
    setNameDraft(active?.customer?.name || "");
  }, [active?.key, active?.customer?.name]);

  // A képeket privát storage bucket tárolja (ld. chat-media) — csak aláírt, lejáró linkkel
  // érhetők el, ezt kérjük le igény szerint, amikor egy beszélgetés képes üzenete látszik.
  useEffect(() => {
    if (!active) return;
    const paths = active.messages.filter((m) => m.mediaStoragePath && !mediaUrls[m.mediaStoragePath]).map((m) => m.mediaStoragePath);
    if (!paths.length) return;
    (async () => {
      const results = await Promise.all(paths.map((p) => supabase.storage.from("chat-media").createSignedUrl(p, 3600)));
      setMediaUrls((prev) => {
        const next = { ...prev };
        results.forEach((r, i) => { if (r.data?.signedUrl) next[paths[i]] = r.data.signedUrl; });
        return next;
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.key, active?.messages.length]);

  function threadRef(t) {
    return { channel: t.channel, phoneNorm: t.phoneNorm, senderPsid: t.senderPsid, customerId: t.customerId };
  }

  async function submit() {
    if (!draft.trim() || !active) return;
    setSending(true);
    setSendError("");
    try {
      await onSend(threadRef(active), draft.trim());
      setDraft("");
    } catch (err) {
      setSendError(err.message || "Nem sikerült elküldeni.");
    } finally {
      setSending(false);
    }
  }

  async function handleImagePick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !active) return;
    setSending(true);
    setSendError("");
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const identity = active.phoneNorm || active.senderPsid;
      const path = `outbound/${active.channel}/${identity}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat-media").upload(path, file, { contentType: file.type || "image/jpeg" });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage.from("chat-media").createSignedUrl(path, 3600);
      if (signErr) throw signErr;
      await onSend(threadRef(active), null, signed.signedUrl);
    } catch (err) {
      setSendError(err.message || "Kép feltöltése sikertelen.");
    } finally {
      setSending(false);
    }
  }

  async function saveName() {
    if (!active?.customerId || !nameDraft.trim()) return;
    await onUpdateLead(active.customerId, { name: nameDraft.trim() });
  }

  if (threads.length === 0) {
    return (
      <EmptyState icon={ChatIcon}>
        Még nincs beszélgetés. Amint a WhatsApp és/vagy Messenger be van kötve (webhook + Meta
        rendszerfelhasználó token beállítva), az ügyfelekkel folytatott üzenetváltások itt fognak megjelenni.
      </EmptyState>
    );
  }

  return (
    <div className="wa-tab">
      <div className="wa-threads">
        <div className="searchbar" style={{ margin: "0 0 8px" }}>
          <SearchIcon width={14} height={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6B7280", margin: "0 0 8px", cursor: "pointer" }}>
          <input type="checkbox" checked={showIrrelevant} onChange={(e) => setShowIrrelevant(e.target.checked)} />
          Nem releváns beszélgetések mutatása is
        </label>
        <div className="wa-thread-list">
          {filtered.map((t) => (
            <div
              key={t.key}
              className={`wa-thread-item${active?.key === t.key ? " active" : ""}`}
              onClick={() => setActiveKey(t.key)}
            >
              <div className="wa-thread-name">
                <ChannelBadge channel={t.channel} />
                {t.customer?.name || formatPhone(t.phoneNorm) || t.phoneNorm || "Ismeretlen"}
              </div>
              <div className="wa-thread-preview">{t.lastPreview}</div>
              <div className="wa-thread-time">{fmtTime(t.lastAt)}</div>
              {t.unread && <span className="wa-thread-dot" />}
              {t.customer?.leadStage && <div style={{ marginTop: 3 }}><StagePill stage={t.customer.leadStage} /></div>}
            </div>
          ))}
        </div>
      </div>

      <div className="wa-panel">
        {!active ? (
          <EmptyState icon={ChatIcon}>Válassz egy beszélgetést.</EmptyState>
        ) : (
          <>
            <div className="wa-panel-head" style={{ flexWrap: "wrap", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 14 }}>
                  <ChannelBadge channel={active.channel} />
                  {active.customer?.name ? (
                    active.customer.name
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        placeholder="Név hozzáadása..."
                        style={{ fontSize: 13, fontWeight: 600, border: "1px solid #E5E7EB", borderRadius: 8, padding: "4px 8px", width: 160 }}
                      />
                      {nameDraft.trim() && nameDraft.trim() !== active.customer?.name && (
                        <button type="button" className="btn sec sm" onClick={saveName}>Mentés</button>
                      )}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                  {active.channel === "whatsapp" ? (formatPhone(active.phoneNorm) || active.phoneNorm) : "Messenger"}
                </div>
              </div>
              {active.customer && onOpenCustomer && (
                <button type="button" className="btn sec sm" onClick={() => onOpenCustomer(active.customer.id)}>Ügyfélkártya</button>
              )}
              {active.customerId && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <select
                    value={active.customer?.leadStage || ""}
                    onChange={(e) => onUpdateLead(active.customerId, { leadStage: e.target.value })}
                    style={{ fontSize: 11.5, border: "1px solid #E5E7EB", borderRadius: 8, padding: "5px 6px" }}
                  >
                    <option value="">Státusz —</option>
                    {LEAD_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <select
                    value={active.customer?.leadSource || ""}
                    onChange={(e) => onUpdateLead(active.customerId, { leadSource: e.target.value })}
                    style={{ fontSize: 11.5, border: "1px solid #E5E7EB", borderRadius: 8, padding: "5px 6px" }}
                  >
                    <option value="">Forrás —</option>
                    {LEAD_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
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
                  {m.mediaStoragePath && mediaUrls[m.mediaStoragePath] ? (
                    <a href={mediaUrls[m.mediaStoragePath]} target="_blank" rel="noopener noreferrer">
                      <img src={mediaUrls[m.mediaStoragePath]} alt="melléklet" style={{ maxWidth: 220, maxHeight: 220, borderRadius: 10, display: "block", marginTop: 4 }} />
                    </a>
                  ) : m.mediaStoragePath ? (
                    <div className="chat-msg-body" style={{ color: "#9CA3AF" }}>📎 kép betöltése...</div>
                  ) : null}
                  {m.body && <div className="chat-msg-body">{m.body}</div>}
                  {!m.body && !m.mediaStoragePath && (
                    <div className="chat-msg-body">{m.templateName ? `📋 Sablonüzenet: ${m.templateName}` : "—"}</div>
                  )}
                </div>
              ))}
            </div>
            <div className="wa-composer">
              {sendError && <div className="errbar" style={{ marginBottom: 8 }}>{sendError}</div>}
              <div style={{ fontSize: 10.5, color: "#9CA3AF", marginBottom: 6 }}>
                {active.channel === "messenger"
                  ? "Messengeren csak akkor kézbesíthető, ha az ügyfél 24 órán belül írt — utána csak ő tud új üzenetet kezdeményezni."
                  : "Csak akkor kézbesíthető, ha az ügyfél a közelmúltban írt nekünk (Meta service window)."}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImagePick} />
                <button type="button" className="btn sec" style={{ padding: "0 12px" }} disabled={sending} onClick={() => fileInputRef.current?.click()} title="Kép küldése">
                  <CameraIcon width={16} height={16} />
                </button>
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
