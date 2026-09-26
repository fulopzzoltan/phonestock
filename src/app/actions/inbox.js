import { supabase, unwrap } from "../../lib/supabaseClient";
import { customerFromApi, customerToApi } from "../../lib/mappers";

export function createInboxActions(ctx) {
  const {
    customersTable, inboxMessages, setCustomersTable, setInboxMessages,
  } = ctx;
  const withBusy = (...a) => ctx.withBusy(...a);

  // KÖZÖS POSTALÁDA — szabad szöveges (vagy kép-) válasz egy meglévő beszélgetésben,
  // csatornától függően a send-whatsapp vagy a send-messenger functiont hívja. Mindkettő
  // csak akkor tud kézbesíteni, ha az ügyfél a közelmúltban (WhatsApp: gyakorlatban
  // korlátlan sablon nélkül is elfogadják; Messenger: szigorúan 24 órán belül) írt nekünk —
  // ld. TASKS_WHATSAPP_INTEGRACIO.md.
  async function sendInboxReply(thread, body, mediaUrl) {
    if (thread.channel === "email") {
      const { data, error: fnError } = await supabase.functions.invoke("send-email", {
        body: { to: thread.emailAddress, subject: thread.subject || null, text: body || "", threadId: thread.threadId || null, customerId: thread.customerId || null },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setInboxMessages((prev) => [...prev, {
        id: `local-${Date.now()}`, channel: "email", direction: "out", emailAddress: thread.emailAddress,
        subject: thread.subject || null, threadId: data?.data?.threadId || thread.threadId || null,
        body: body || "", status: "sent", customerId: thread.customerId || null, createdAt: new Date().toISOString(),
      }]);
      return data;
    }
    if (thread.channel === "messenger") {
      const { data, error: fnError } = await supabase.functions.invoke("send-messenger", {
        body: { psid: thread.senderPsid, text: body || null, mediaUrl: mediaUrl || null, customerId: thread.customerId || null },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setInboxMessages((prev) => [...prev, {
        id: `local-${Date.now()}`, channel: "messenger", direction: "out", senderPsid: thread.senderPsid,
        body: body || "", mediaUrl: mediaUrl || null, mediaType: mediaUrl ? "image" : null, status: "sent",
        customerId: thread.customerId || null, createdAt: new Date().toISOString(),
      }]);
      return data;
    }
    const { data, error: fnError } = await supabase.functions.invoke("send-whatsapp", {
      body: { phone: thread.phoneNorm, freeformBody: body || null, imageUrl: mediaUrl || null },
    });
    if (fnError) throw fnError;
    if (data?.error) throw new Error(data.error);
    // Optimista sor a helyi listához — a webhook/valós external_message_id majd a következő
    // frissítéskor (loadAll) pontosítja, de a felhasználónak azonnal látszania kell a válasz.
    setInboxMessages((prev) => [...prev, {
      id: `local-${Date.now()}`, channel: "whatsapp", direction: "out", phoneNorm: thread.phoneNorm,
      body: body || "", mediaUrl: mediaUrl || null, mediaType: mediaUrl ? "image" : null, status: "sent",
      customerId: thread.customerId || customersTable.find((c) => c.phone && c.phone.replace(/\D/g, "").slice(-9) === thread.phoneNorm)?.id || null,
      createdAt: new Date().toISOString(),
    }]);
    return data;
  }
  // Olvasottnak jelöli egy beszélgetés összes eddigi bejövő üzenetét — akkor hívjuk, amikor
  // valaki megnyitja azt a beszélgetést a Postaláda fülön. Ez adja az alapját a
  // Sidebar/BottomNav "olvasatlan" jelvényének (nav-pill), ugyanúgy, mint a Pult fülnél.
  async function markInboxRead(thread) {
    const unreadIds = inboxMessages
      .filter((m) => m.channel === thread.channel
        && (thread.channel === "messenger" ? m.senderPsid === thread.senderPsid
          : thread.channel === "email" ? m.emailAddress === thread.emailAddress
          : m.phoneNorm === thread.phoneNorm)
        && m.direction === "in" && !m.readAt)
      .map((m) => m.id);
    if (unreadIds.length === 0) return;
    const nowIso = new Date().toISOString();
    setInboxMessages((prev) => prev.map((m) => (unreadIds.includes(m.id) ? { ...m, readAt: nowIso } : m)));
    await supabase.from("chat_messages").update({ read_at: nowIso }).in("id", unreadIds);
  }
  // Ügyfél/lead pipeline-státusz és forrás-cimke frissítése a Postaláda beszélgetés-fejlécéből
  // (ld. customers.lead_stage / lead_source, unified_chat_inbox_and_crm_pipeline migráció).
  async function updateLead(customerId, patch) {
    const apiPatch = {};
    if ("leadStage" in patch) apiPatch.lead_stage = patch.leadStage || null;
    if ("leadSource" in patch) apiPatch.lead_source = patch.leadSource || null;
    if ("name" in patch) apiPatch.name = patch.name || null;
    apiPatch.lead_updated_at = new Date().toISOString();
    const r = unwrap(await supabase.from("customers").update(apiPatch).eq("id", customerId).select());
    if (r?.[0]) setCustomersTable((prev) => prev.map((c) => (c.id === customerId ? customerFromApi(r[0]) : c)));
  }
  // Postaláda: ha egy WhatsApp/Messenger beszélgetéshez még nincs ügyfél/lead-rekord
  // (vadonatúj megkeresés, amit a webhook nem tudott automatikusan párosítani), itt hozzuk
  // létre a beviteli pillanatban — pl. amikor valaki státuszt állít rajta. A telefonszámot
  // vagy Messenger-PSID-et a szálból vesszük át, hogy a buildThreads (InboxTab.jsx) utólag
  // automatikusan hozzá tudja rendelni ezt az új rekordot ugyanahhoz a beszélgetéshez.
  async function createLeadFromThread(thread, patch) {
    await withBusy(async () => {
      const data = {
        name: thread.customer?.name || null,
        phone: thread.phoneNorm || null,
        messengerPsid: thread.senderPsid || null,
        ...patch,
      };
      const r = unwrap(await supabase.from("customers").insert(customerToApi(data)).select());
      if (r?.[0]) setCustomersTable((prev) => [...prev, customerFromApi(r[0])]);
    });
  }

  return {
    sendInboxReply, markInboxRead, updateLead, createLeadFromThread,
  };
}
