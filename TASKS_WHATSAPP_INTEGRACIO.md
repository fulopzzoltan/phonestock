# TASKS — Közös postaláda (WhatsApp + Messenger) + CRM-pipeline

**Kontextus:** eredetileg a szerviz automatikus SMS-értesítéseit váltottuk WhatsAppra (mert az
SMS-re nem lehet válaszolni), aztán ez kibővült egy közös postaládává: WhatsApp + Facebook
Messenger egy helyen, minden beszélgetéshez rendelt ügyfél/lead-rekorddal és egy egyszerű
pipeline-státusszal (Hormozi-stílus: hol tart a megkeresés, ki még releváns, ki nem).

Email egyelőre **nincs** bekötve — az `info@telefonos.ro` jelenleg nem él, ha lesz hova kötni
(pl. Google Workspace), az egy következő kör.

## Amit a coding-agent session már megcsinált (kódoldal kész, commitolva + deployolva)

- `chat_messages` tábla (a régi `whatsapp_messages` átnevezve és kibővítve): `channel`
  (`whatsapp`/`messenger`), `sender_psid` (Messenger azonosító), `media_url`/`media_type`/
  `media_storage_path` (képek).
- `customers` tábla kibővítve CRM-mezőkkel: `lead_stage` (Új megkeresés → Folyamatban →
  Ajánlat kiküldve → Ügyfél lett / Nem releváns), `lead_source` (szerviz érdeklődő / eladni
  szeretne / vásárolt / egyéb), `messenger_psid`.
- `chat-media` storage bucket (privát) — ügyfél által küldött/nekik küldött képek, csak
  admin/employee éri el, aláírt (lejáró) linkeken keresztül.
- `chat-webhook` Edge Function (a `whatsapp-webhook` utódja) — **ugyanarra az URL-re** fut be
  mind a WhatsApp, mind a Messenger üzenet, a payload dönti el melyik: fogadja a bejövő
  üzeneteket (szöveg + kép), letölti és eltárolja a képeket, és ha ismeretlen a küldő (nincs
  meg ügyfélként sem telefonszám, sem Messenger-azonosító alapján), automatikusan felvesz
  egy csupasz lead-sort `Új megkeresés` státusszal — az admin a postaládában tölti ki utólag
  a nevet és a forrás-cimkét.
- `send-whatsapp` Edge Function frissítve: az új `chat_messages` táblába naplóz, és mostantól
  képet is tud küldeni (`imageUrl` paraméter).
- `send-messenger` Edge Function (új): kimenő Messenger-válasz küldése ugyanazzal a
  jogosultsági szabállyal, mint a WhatsAppnál (csak admin/employee).
- Admin fül átnevezve **"Postaláda"**-ra (`InboxTab.jsx`): csatorna-jelvény (WhatsApp/Messenger
  ikon) minden beszélgetésnél, kép megjelenítés + kép küldése, pipeline-státusz és forrás-cimke
  választó a beszélgetés fejlécén, "nem releváns" beszélgetések alapból elrejtve (bekapcsolható).

## Amit neked kell megcsinálnod a Meta oldalon

### WhatsApp (ha még nem tetted meg a korábbi kör alapján)

1. **"Phone numbers" fül** ellenőrzése a WhatsApp-fiókban — legyen hozzá rendelve egy
   ellenőrzött telefonszám.
2. **Rendszerfelhasználó + permanens token**, `whatsapp_business_messaging` jogosultsággal.
3. **3 Supabase secret** (Project Settings → Edge Functions → Secrets — **ne chatben küldd
   el**): `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` (ez utóbbit te
   találod ki).
4. **2 sablon jóváhagyásra** (`ticket_created`, `ticket_ready`) — ha ez már megvan az előző
   körből, nincs teendő.

### Messenger (új rész)

5. **Facebook oldal hozzárendelése a rendszerfelhasználóhoz** — Meta Business Suite →
   Beállítások → Rendszerfelhasználók → a meglévő (WhatsApphoz használt) rendszerfelhasználó →
   "Assets" → add hozzá a Telefonos Facebook oldalát, `pages_messaging` jogosultsággal.
6. **Page Access Token generálása** ugyanennél a rendszerfelhasználónál (Graph API Explorer
   vagy a rendszerfelhasználó "Generate token" gombja), a Facebook oldalra vonatkozóan.
7. **Új Supabase secret**: `MESSENGER_PAGE_TOKEN` — a 6. pontban generált token.
8. **Webhook feliratkozás a Facebook oldalon** (App dashboard → Webhooks → Page objektum,
   VAGY az oldal Beállítások → Messenger platform → Webhooks résznél):
   - Callback URL: **ugyanaz, mint a WhatsAppnál**, csak más a végpont neve:
     `https://aaiyyhskvxjqfhrgoulh.supabase.co/functions/v1/chat-webhook`
   - Verify token: ugyanaz, amit a `WHATSAPP_VERIFY_TOKEN`-nél használtál (ez app-szintű, nem
     termékenkénti)
   - Feliratkozás: `messages` (kötelező), opcionálisan `message_deliveries`/`messaging_postbacks`
9. **A WhatsApp webhook URL-jét is érdemes átállítani** a régi `whatsapp-webhook` végpontról az
   újra: `https://aaiyyhskvxjqfhrgoulh.supabase.co/functions/v1/chat-webhook` (a régi
   `whatsapp-webhook` function egyelőre még fut, de a `chat-webhook` az, amit innentől
   karbantartunk — a kettő nem duplikálja egymást, mert csak az egyik van regisztrálva Metánál).

## ÚJ, KÖTELEZŐ lépés — biztonsági javítás (`chat-webhook` aláírás-ellenőrzés)

A `chat-webhook` eredetileg semmivel sem ellenőrizte, hogy a bejövő POST kérés tényleg
Metától jön-e (csak a GET "verify handshake" volt védve) — bárki, aki ismerte ezt az URL-t,
hamis "bejövő üzenetet" tudott volna beíratni a service role kulccsal a `chat_messages` /
`customers` táblákba, és a Messenger-media letöltésen keresztül a szervert tetszőleges URL
letöltésére tudta volna rávenni (SSRF). Ezt most javítottam: minden POST-on ellenőrzi Meta
saját `X-Hub-Signature-256` aláírását, aláírás nélkül/hibás aláírással 401-et ad vissza, és a
Messenger média-letöltés is csak Meta CDN-jéről (`*.fbcdn.net` / `*.fbsbx.com`, `https`) fogad el.

10. **Új Supabase secret, ENÉLKÜL A WEBHOOK MINDEN POST-OT ELUTASÍT**: `META_APP_SECRET` — a
    Meta App Dashboard → **Settings → Basic** oldalon található "App Secret" (ugyanaz az App,
    amit a WhatsApp/Messenger integrációhoz használsz — app-szintű, nem termékenkénti titok,
    mint a verify token). Project Settings → Edge Functions → Secrets alá kell felvinni,
    ugyanúgy, mint a többi Supabase secretet — **ne chatben küldd el**.
11. **Deploy**: a `chat-webhook` Edge Function frissített kódját ki kell tolni Supabase-ba
    (`supabase functions deploy chat-webhook`), különben a régi, aláírás-ellenőrzés nélküli
    verzió fut tovább élesben.

## Ellenőrzés, miután a fentiek megvannak

- **WhatsApp**: nyiss egy próba munkalapot valós telefonszámmal, nézd meg hogy a `chat_messages`
  táblában megjelenik-e egy `channel: 'whatsapp'`, `status: 'sent'` sor.
- **Messenger**: írj rá a Facebook oldalra Messengeren egy próbaüzenetet — jelenjen meg a
  Postaláda fülön, Messenger-jelvénnyel, és ha ismeretlen a Facebook-profilod a rendszerben,
  jöjjön létre automatikusan egy "Új megkeresés" státuszú lead.
- **Kép**: küldj egy fotót WhatsAppon vagy Messengeren — jelenjen meg képként (ne csak
  "[image üzenet]" szövegként) a beszélgetésben.
- Válaszolj a postaládából mindkét csatornán — érkezzen meg a customer oldalára.
- Ha bármi SMS-re esik vissza a vártnál, vagy a kép nem tölt be, nézd meg a Supabase Edge
  Function logokat (`chat-webhook` / `send-whatsapp` / `send-messenger`) — ott pontosan
  látszik, miért.

Nincs `git push`, csak lokális commit, amíg nem szólsz.
