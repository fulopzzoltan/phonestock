import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// chat-webhook — a whatsapp-webhook általánosított, csatorna-semleges utódja. Ugyanarra
// az URL-re küldi Meta mindkét terméket (WhatsApp Business Account ÉS Facebook Page/
// Messenger) — a payload `object` mezője dönti el, melyikről van szó, ezért NEM kell két
// külön webhook-végpont, csak ugyanezt az URL-t kell mindkét helyen (WhatsApp app-szintű
// Webhooks konfig + Page "messages" feliratkozás) regisztrálni.
//
//  GET  — Meta "verify handshake"-je, amikor regisztráljátok az URL-t (mindkét termékhez
//         ugyanaz a WHATSAPP_VERIFY_TOKEN használható, ez app-szintű, nem termékenkénti titok).
//  POST — minden bejövő üzenet, médiacsatolmány és kézbesítési státuszváltozás.
//
// Nincs JWT-ellenőrzés (verify_jwt=false) — Meta nem küld Supabase-auth tokent. Helyette
// minden POST-on ellenőrizzük Meta saját aláírását (X-Hub-Signature-256, HMAC-SHA256 a
// nyers body-n, a META_APP_SECRET-tel kulcsolva — ugyanaz az App Secret mindkét
// terméknél, Meta App Dashboard → Settings → Basic). Aláírás nélkül vagy hibás aláírással
// érkező kérést elutasítunk, mielőtt bármit beírnánk — enélkül bárki, aki ismeri az URL-t,
// tetszőleges "bejövő üzenetet" tudna hamisítani a service role kulccsal író endpointon.
// Service role kulccsal ír, mert nincs bejelentkezett Supabase-felhasználó.

// Meta a nyers (nem újra-szerializált!) body SHA-256 HMAC-jét küldi "sha256=<hex>"
// formában az X-Hub-Signature-256 headerben. Konstans idejű összehasonlítás, hogy az
// aláírás-ellenőrzés maga se legyen egy időzítéses oldalcsatorna.
async function verifyMetaSignature(rawBody: string, signatureHeader: string | null, appSecret: string): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const provided = signatureHeader.slice("sha256=".length).trim().toLowerCase();
  if (!provided) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  const expected = Array.from(sigBytes).map((b) => b.toString(16).padStart(2, "0")).join("");

  if (expected.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  return diff === 0;
}

// A Messenger attachment payload URL-je közvetlenül a (hitelesítés után is csak Metától
// elfogadott, de védekezésképp itt is leellenőrzött) kérésből jön — csak Meta saját
// CDN-jéről fogadunk el letöltést, hogy a szerver ne váljon nyitott SSRF-proxyvá.
const ALLOWED_MEDIA_HOSTS_SUFFIXES = [".fbcdn.net", ".fbsbx.com"];
function isAllowedMessengerMediaUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    return ALLOWED_MEDIA_HOSTS_SUFFIXES.some((suffix) => u.hostname === suffix.slice(1) || u.hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

function normalizeCore(raw: string): string | null {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return null;
  const core = digits.slice(-9);
  return core.length === 9 ? core : null;
}

function extForMime(mime: string): string {
  if (!mime) return "bin";
  if (mime.includes("jpeg")) return "jpg";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("mpeg")) return "mp3";
  if (mime.includes("ogg")) return "ogg";
  return mime.split("/")[1]?.slice(0, 8) || "bin";
}

// WhatsApp médiánál csak egy media-ID érkezik a webhookban — ezt kell "beváltani" egy
// ideiglenes letöltési linkre (Graph API), majd letölteni, ugyanazzal a tokennel.
// Messengernél az attachment payload már egy közvetlen (rövid élettartamú) CDN URL,
// nincs szükség a token-es váltásra.
async function fetchWhatsappMedia(mediaId: string, token: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
  try {
    const metaResp = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, { headers: { Authorization: `Bearer ${token}` } });
    const meta = await metaResp.json().catch(() => null);
    if (!meta?.url) return null;
    const fileResp = await fetch(meta.url, { headers: { Authorization: `Bearer ${token}` } });
    if (!fileResp.ok) return null;
    const bytes = new Uint8Array(await fileResp.arrayBuffer());
    return { bytes, mime: meta.mime_type || "application/octet-stream" };
  } catch {
    return null;
  }
}

async function fetchMessengerMedia(url: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
  if (!isAllowedMessengerMediaUrl(url)) {
    console.error("chat-webhook: elutasított Messenger media URL (nem Meta CDN):", url);
    return null;
  }
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const bytes = new Uint8Array(await resp.arrayBuffer());
    return { bytes, mime: resp.headers.get("content-type") || "application/octet-stream" };
  } catch {
    return null;
  }
}

async function storeMedia(svc: ReturnType<typeof createClient>, channel: string, identity: string, bytes: Uint8Array, mime: string): Promise<string | null> {
  const path = `${channel}/${identity}/${crypto.randomUUID()}.${extForMime(mime)}`;
  const { error } = await svc.storage.from("chat-media").upload(path, bytes, { contentType: mime, upsert: false });
  if (error) {
    console.error("chat-media upload hiba:", error.message);
    return null;
  }
  return path;
}

// Ismeretlen küldő → gyors, üres lead-rekord a customers táblában, hogy a beszélgetés ne
// vesszen el egy "customer_id nélküli" sorban — az admin utólag tölti ki a nevet és a
// forrás-cimkét (szerviz érdeklődő / eladni szeretne / stb.) a postaládában.
async function findOrCreateCustomer(
  svc: ReturnType<typeof createClient>,
  identity: { phoneNorm?: string | null; messengerPsid?: string | null }
): Promise<string | null> {
  const { phoneNorm, messengerPsid } = identity;
  let query = svc.from("customers").select("id").is("deleted_at", null).limit(1);
  query = phoneNorm ? query.eq("phone_norm", phoneNorm) : query.eq("messenger_psid", messengerPsid);
  const { data: existing } = await query.maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error } = await svc
    .from("customers")
    .insert({
      phone_norm: phoneNorm || null,
      messenger_psid: messengerPsid || null,
      lead_stage: "uj_megkereses",
      lead_updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) {
    console.error("lead-customer létrehozási hiba:", error.message);
    return null;
  }
  return created?.id || null;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expected = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
    if (mode === "subscribe" && expected && token === expected) {
      return new Response(challenge || "", { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const appSecret = Deno.env.get("META_APP_SECRET");
    const rawBody = await req.text();

    if (!appSecret) {
      console.error("chat-webhook: META_APP_SECRET nincs beállítva — minden POST elutasítva.");
      return new Response("Forbidden", { status: 401 });
    }
    const signatureOk = await verifyMetaSignature(rawBody, req.headers.get("x-hub-signature-256"), appSecret);
    if (!signatureOk) {
      console.error("chat-webhook: érvénytelen vagy hiányzó X-Hub-Signature-256.");
      return new Response("Forbidden", { status: 401 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const waToken = Deno.env.get("WHATSAPP_TOKEN") || "";
    const svc = createClient(supabaseUrl, serviceKey);

    const payload = JSON.parse(rawBody);
    const entries = payload?.entry || [];

    if (payload?.object === "whatsapp_business_account") {
      for (const entry of entries) {
        for (const change of entry?.changes || []) {
          const value = change?.value;
          if (!value) continue;

          for (const msg of value.messages || []) {
            const core = normalizeCore(msg.from);
            if (!core) continue;
            const customerId = await findOrCreateCustomer(svc, { phoneNorm: core });

            let bodyText: string | null = msg.text?.body ?? null;
            let mediaStoragePath: string | null = null;
            let mediaType: string | null = null;
            const mediaNode = msg.image || msg.document || msg.video || msg.audio || msg.sticker;
            if (mediaNode?.id) {
              if (mediaNode.caption) bodyText = mediaNode.caption;
              const media = await fetchWhatsappMedia(mediaNode.id, waToken);
              if (media) {
                mediaStoragePath = await storeMedia(svc, "whatsapp", core, media.bytes, media.mime);
                mediaType = media.mime;
              }
              if (!bodyText && !mediaStoragePath) bodyText = `[${msg.type || "média"} üzenet — letöltés sikertelen]`;
            } else if (!bodyText && msg.type) {
              bodyText = `[${msg.type} üzenet]`;
            }

            await svc.from("chat_messages").insert({
              channel: "whatsapp",
              direction: "in",
              phone_norm: core,
              body: bodyText,
              status: "received",
              external_message_id: msg.id || null,
              customer_id: customerId,
              media_storage_path: mediaStoragePath,
              media_type: mediaType,
            });
          }

          for (const st of value.statuses || []) {
            if (!st?.id || !st?.status) continue;
            await svc.from("chat_messages").update({ status: st.status }).eq("external_message_id", st.id);
          }
        }
      }
    } else if (payload?.object === "page") {
      for (const entry of entries) {
        for (const m of entry?.messaging || []) {
          const psid = m?.sender?.id;
          if (!psid) continue;

          // Kézbesítési státusz-frissítés (delivery/read) — nem új üzenet.
          if (m.delivery || m.read) {
            const status = m.read ? "read" : "delivered";
            const mids: string[] = m.delivery?.mids || [];
            if (mids.length) {
              await svc.from("chat_messages").update({ status }).in("external_message_id", mids);
            }
            continue;
          }

          const message = m.message;
          if (!message || message.is_echo) continue; // saját kimenő üzenetünk visszhangját ne dupláznánk

          const customerId = await findOrCreateCustomer(svc, { messengerPsid: psid });

          let bodyText: string | null = message.text ?? null;
          let mediaStoragePath: string | null = null;
          let mediaType: string | null = null;
          const attachment = (message.attachments || [])[0];
          if (attachment?.payload?.url) {
            const media = await fetchMessengerMedia(attachment.payload.url);
            if (media) {
              mediaStoragePath = await storeMedia(svc, "messenger", psid, media.bytes, media.mime);
              mediaType = media.mime;
            }
            if (!bodyText && !mediaStoragePath) bodyText = `[${attachment.type || "média"} üzenet — letöltés sikertelen]`;
          }

          await svc.from("chat_messages").insert({
            channel: "messenger",
            direction: "in",
            sender_psid: psid,
            body: bodyText,
            status: "received",
            external_message_id: message.mid || null,
            customer_id: customerId,
            media_storage_path: mediaStoragePath,
            media_type: mediaType,
          });
        }
      }
    }

    // Metának 5 másodpercen belül 200-at kell kapnia, különben 5 sikertelen hívás után
    // felfüggeszti a webhookot — ezért itt nem várunk semmi magáságra, csak visszaigazolunk.
    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (err) {
    console.error("chat-webhook hiba:", err);
    // Akkor is 200-at adunk vissza, hogy Meta ne kapcsolja le a webhookot egy átmeneti
    // hiba miatt — a hibát a függvény-logban lehet utánanézni.
    return new Response("EVENT_RECEIVED_WITH_ERROR", { status: 200 });
  }
});
