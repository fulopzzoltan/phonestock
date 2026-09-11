# Marketing modul: automatikus Google-értékelés kérés — mit kell még beállítanod

A kódot, az adatbázis-táblát és a küldő motort (edge function) elkészítettem és élesítettem.
Három dolog maradt, amit csak te (vagy a Supabase-hozzáféréssel rendelkező fejlesztő) tud
elvégezni — automatikus rendszerekhez a sandboxom itt óvatosságból nem fér hozzá.

## 1. Napi automatikus indítás bekapcsolása (kötelező, e nélkül semmi nem megy ki)

Nyisd meg a Supabase projekt **SQL Editor**-ját, és futtasd le ezt egyszer:

```sql
select cron.schedule(
  'send-review-requests-daily',
  '0 7 * * *', -- naponta 07:00 UTC, kb. 09-10 óra hazai idő
  $$
  select net.http_post(
    url := 'https://aaiyyhskvxjqfhrgoulh.supabase.co/functions/v1/send-review-requests',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_review_requests_secret' limit 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Ez minden nap egyszer meghívja a `send-review-requests` functiont, ami elküldi az aznap
esedékes értékelés-kéréseket. A titkos kulcsot (`cron_review_requests_secret`) már
létrehoztam a Supabase Vault-ban, ezt a parancsot csak egyszer kell lefuttatni.

Ha egyszer módosítani akarod az időpontot, ezt futtasd előtte: `select cron.unschedule('send-review-requests-daily');`

## 2. Google-értékelés linkek beállítása helyszínenként

Admin fiókkal: **Beállítások → Google-értékelés kérés** → mindkét boltnál (Gyimes,
Szentgyörgy) írd be a saját "Írjon értékelést" linketeket. Ezt a Google Cégprofilodból
tudod kimásolni: Cégprofil kezelése → Vélemények → "Vélemények kérése" gomb.

Amíg egy helyszínnek nincs beállítva a linkje, azon a helyszínen egyszerűen kimarad az
értékelés-kérés (nem hibázik, csak "skipped" lesz a naplóban).

Ugyanitt tudod bekapcsolni magát a funkciót, és beállítani hány nappal az átadás/eladás
után menjen ki az üzenet (alapból 2 nap).

## 3. WhatsApp sablon jóváhagyása Metánál (opcionális, enélkül is működik SMS-sel)

A WhatsApp Business-t nálatok már használjátok a `ticket_created`/`ticket_ready`
sablonokhoz — ugyanoda kell felvenni egy újat:

- **Sablon neve:** `review_request`
- **Kategória:** Marketing (mert ez nem egy folyamatban lévő ügyről szóló infó, hanem egy
  vélemény-kérés — Meta valószínűleg ide sorolja) vagy Utility, ha elfogadja úgy
- **Nyelv:** magyar (hu)
- **Törzsszöveg, 2 változóval**, kb. így:
  > Szia {{1}}! Köszönjük, hogy nálunk jártál. Ha elégedett voltál, egy rövid
  > értékeléssel sokat segítenél: {{2}}

  ({{1}} = ügyfél keresztneve, {{2}} = a Google-értékelés linkje)

Amíg ezt nem hagyja jóvá Meta (vagy amíg nincs is felvéve), a rendszer automatikusan
SMS-re esik vissza — tehát a funkció e nélkül is működik, csak WhatsApp helyett SMS-en
megy ki az üzenet.

**Fontos, amire figyelj:** mivel ez egy proaktív, nem az ügyfél kérésére induló üzenet,
Meta szabályai szerint "Marketing" kategóriás sablonként kezelheti, ami elvben az ügyfél
előzetes hozzájárulásához (opt-in) van kötve. Nálatok van már `marketing_consent` mező az
ügyfeleknél — ha ezt szigorúan akarod venni, szólj, és beköthetem, hogy csak azoknak
menjen ki WhatsAppon, akik ezt elfogadták (SMS-nél ez a fajta szabály nem érvényes).

---

*Technikai jegyzet a fejlesztőnek: a küldő logika a `send-review-requests` edge
functionben van, a `review_requests` tábla tárolja az ütemezett/elküldött kéréseket,
állapotuk (`pending`/`sent`/`failed`/`skipped`) és hibaüzenetük ott visszakereshető.*
