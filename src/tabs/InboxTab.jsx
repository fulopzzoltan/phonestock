import { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { ChatIcon, SearchIcon, WhatsappIcon, FacebookIcon, CameraIcon, ServiceIcon } from "../components/icons";
import { EmptyState } from "../components/EmptyState";
import { formatPhone, displayName, money, statusCls, statusLabel } from "../lib/utils";

function normPhone(raw) {
  return (raw || "").replace(/\D/g, "").slice(-9);
}

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
    const norm = normPhone(c.phone);
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

// A 24 órás válaszablak mindkét csatornánál (WhatsApp customer care window, Messenger
// standard messaging window) nagyjából ugyanígy működik: csak az ügyfél UTOLSÓ beérkezett
// üzenetétől számított 24 órán belül küldhető szabad szöveg, utána csak jóváhagyott sablon.
function windowInfo(thread) {
  const last = thread?.messages[thread.messages.length - 1];
  if (!last || last.direction !== "in" || !last.createdAt) return null;
  const msLeft = new Date(last.createdAt).getTime() + 24 * 3600 * 1000 - Date.now();
  return { closed: msLeft <= 0, msLeft };
}
function fmtWindow(ms) {
  const totalMin = Math.max(0, Math.round(Math.abs(ms) / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} ó ${m} p` : `${m} p`;
}

const QUICK_REPLIES = ["Mikor tudod behozni?", "1–2 munkanap a javítás", "Elkészült, átveheted"];

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

export default function InboxTab({ messages, customers, tickets = [], onSend, onOpenCustomer, onMarkRead, onUpdateLead, onCreateLead, onOpenTicket }) {
  const [q, setQ] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const [activeKey, setActiveKey] = useState(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [mediaUrls, setMediaUrls] = useState({});
  const fileInputRef = useRef(null);

  const threads = useMemo(() => buildThreads(messages, customers), [messages, customers]);

  // A "Mind" alap-készlet ugyanazt a szabályt követi, mint korábban a checkbox: a nem
  // releváns beszélgetések alapból rejtve maradnak, kivéve ha olvasatlan bennük valami.
  const visibleBase = useMemo(
    () => threads.filter((t) => t.customer?.leadStage !== "nem_relevans" || t.unread),
    [threads]
  );
  const waitingThreads = useMemo(
    () => visibleBase.filter((t) => t.messages[t.messages.length - 1]?.direction === "in"),
    [visibleBase]
  );
  const failedThreads = useMemo(
    () => visibleBase.filter((t) => t.messages.some((m) => m.status === "failed")),
    [visibleBase]
  );
  const irrelevantThreads = useMemo(
    () => threads.filter((t) => t.customer?.leadStage === "nem_relevans"),
    [threads]
  );

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const pool = filterMode === "irrelevant" ? irrelevantThreads
      : filterMode === "waiting" ? waitingThreads
      : filterMode === "failed" ? failedThreads
      : visibleBase;
    if (!qq) return pool;
    return pool.filter((t) => [t.customer?.name, t.phoneNorm, t.senderPsid].filter(Boolean).join(" ").toLowerCase().includes(qq));
  }, [visibleBase, waitingThreads, failedThreads, irrelevantThreads, filterMode, q]);

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

  // Kapcsolódó munkalap(ok): elsőként az ügyfél-rekord id-je alapján (ha már van), különben
  // a WhatsApp telefonszám egyezésével — Messenger-szálaknál (nincs telefonszám) így nem
  // találunk semmit, ami helyes, hisz azon a csatornán nincs mire párosítani.
  const relatedTickets = useMemo(() => {
    if (!active) return [];
    const activePhone = active.phoneNorm;
    return tickets
      .filter((t) => (active.customerId && t.customerId === active.customerId) || (activePhone && normPhone(t.customerPhone) === activePhone))
      .sort((a, b) => (b.dateIn || "").localeCompare(a.dateIn || ""));
  }, [tickets, active]);

  // Egységesen kezeli az állapot/forrás állítást attól függetlenül, hogy van-e már
  // ügyfél-rekord a beszélgetéshez: ha nincs (vadonatúj megkeresés), létrehozza, ha van,
  // csak frissíti — a Postaláda kezelőjének erre nem kell külön gondolnia.
  function setLead(patch) {
    if (!active) return;
    if (active.customerId) onUpdateLead(active.customerId, patch);
    else onCreateLead?.(active, patch);
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
        <div className="wa-filters">
          <button type="button" className={`wa-filter-chip${filterMode === "all" ? " active" : ""}`} onClick={() => setFilterMode("all")}>
            Mind <b>{visibleBase.length}</b>
          </button>
          <button type="button" className={`wa-filter-chip${filterMode === "waiting" ? " active" : ""}`} onClick={() => setFilterMode("waiting")}>
            Válaszra vár <b>{waitingThreads.length}</b>
          </button>
          {failedThreads.length > 0 && (
            <button type="button" className={`wa-filter-chip${filterMode === "failed" ? " active" : ""}`} onClick={() => setFilterMode("failed")}>
              Sikertelen <b>{failedThreads.length}</b>
            </button>
          )}
          {irrelevantThreads.length > 0 && (
            <button type="button" className={`wa-filter-chip${filterMode === "irrelevant" ? " active" : ""}`} onClick={() => setFilterMode("irrelevant")}>
              Nem releváns <b>{irrelevantThreads.length}</b>
            </button>
          )}
        </div>
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
            </div>
            {(() => {
              const win = windowInfo(active);
              if (!win) return null;
              return (
                <div className={`wa-window-banner${win.closed ? " closed" : ""}`}>
                  {win.closed
                    ? "A válaszablak lezárt — innentől csak jóváhagyott sablon mehet ki."
                    : <>Válaszablak: <b>{fmtWindow(win.msLeft)}</b> múlva zárul</>}
                </div>
              );
            })()}
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
            <div className="wa-quick-replies">
              <span className="lbl">Gyors válasz:</span>
              {QUICK_REPLIES.map((r) => (
                <button key={r} type="button" className="wa-quick-chip" onClick={() => setDraft((d) => (d.trim() ? `${d.trim()} ${r}` : r))}>
                  {r}
                </button>
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

      {active && (
        <div className="wa-side">
          {!active.customerId && (
            <div style={{ fontSize: 11.5, color: "#9CA3AF", marginBottom: 14 }}>Ehhez a beszélgetéshez még nincs ügyfél-rekord — az első állapot- vagy forrás-választás létrehoz egyet.</div>
          )}
          <div className="wa-side-sec">
            <div className="wa-side-lbl">Állapot</div>
            {LEAD_STAGES.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`wa-side-pill${active.customer?.leadStage === s.value ? " active" : ""}`}
                style={active.customer?.leadStage === s.value ? { color: s.color } : undefined}
                onClick={() => setLead({ leadStage: s.value })}
              >
                <span className="d" style={{ background: s.color }} />
                {s.label}
              </button>
            ))}
          </div>
          <div className="wa-side-sec">
            <div className="wa-side-lbl">Miért írt</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {LEAD_SOURCES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={`wa-side-source${active.customer?.leadSource === s.value ? " active" : ""}`}
                  onClick={() => setLead({ leadSource: s.value })}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {relatedTickets.length > 0 && (
            <div className="wa-side-sec">
              <div className="wa-side-lbl">Kapcsolódó munkalap{relatedTickets.length > 1 ? "ok" : ""}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {relatedTickets.slice(0, 3).map((t) => (
                  <div key={t.id} className="wa-side-ticket" onClick={() => onOpenTicket?.(t.id)}>
                    <ServiceIcon width={14} height={14} style={{ color: "#6B7280", flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName(t.brand, t.model) || "—"}</div>
                      <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 1 }}>{money(t.price)}</div>
                    </div>
                    <span className={`st ${statusCls(t.status)}`} style={{ fontSize: 9.5, padding: "2px 7px", flexShrink: 0 }}>{statusLabel(t.status)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
