# TASKS — Digitális aláírás eladáskor és szerviz átvételkor/kiadáskor (paperless, ha akarjuk)

Kérés: "a ceges telefonunkra eladaskor es a szerviz bevetelkor es kiadaskor alakellene irni es mindig az adott melohoz kikuldeni egy feluletet amit ha alair nalunk megmarad igy paperless dolgozhatnank ha akarunk"

**Az értelmezésem** (jelezd, ha máshogy gondoltad): 3 pillanat, amikor ma papíron írat alá a vevő/ügyfél, és ehelyett (vagy emellett — lásd 6. pont, ez opcionális marad) egy képernyőn is aláírathatnád:
1. **Eladáskor** — telefon-vásárlás bizonylata + garancia elfogadása.
2. **Szerviz "bevétel"** — amikor a gép **bejön** hozzánk (munkalap felvétele) — átvételi elismervény + hozzájárulás.
3. **Szerviz "kiadás"** — amikor a kész gépet **kiadjuk** — átadási lap + garancia elfogadása.

Mindhárom a meglévő, már működő nyilvános token-linkes oldalakra épül (`/receipt/:token`, `/status/:token`) — nem kell új oldal-infrastruktúra, csak egy "aláírás mód" hozzáadása ezekhez, plusz a tárolás.

## 0. Amit megnéztem — mire épül ez

- **A publikus oldalak és tokenek már léteznek**: `src/StatusLookup.jsx` (`/status/:token`) és a vele szimmetrikus `ReceiptLookup.jsx` (`/receipt/:token`) — mindkettő egy SECURITY DEFINER RPC-n keresztül (`get_ticket_status_by_token`, `get_receipt_by_token`) tölti be az adatot, anélkül hogy bejelentkezés vagy nyílt tábla-hozzáférés kellene (`CLAUDE.md` szerint is ez a szándékos minta). A `ticket.publicToken`/`tx.publicToken` már ma is létezik, minden munkalapnak/eladásnak van saját linkje (`src/components/DetailPanel.jsx` 27. sor, `src/components/SaleReceiptPanel.jsx` 11. sor).
- **A garancia-szöveg már megvan**: `SERVICE_WARRANTY_TERMS` (`src/lib/utils.js`), amit a `StatusLookup.jsx` már ma is kiír (142-144. sor) — az aláírás-képernyő ugyanezt a szöveget mutatja majd elfogadásra.
- **A "Nyomtatás" gombok jelenlegi helyei**, ahova az "Aláíratás" gomb kerül melléjük:
  - `src/components/SaleReceiptPanel.jsx` 53-55. sor (`dp-actions`, "Nyomtatás" gomb) — eladás.
  - `src/components/DetailPanel.jsx` 185. sor ("Nyomtatás" gomb) + a 74-80. sor "Ügyfél nyomon követés" szekció (ahol a link-másolás már van) — szerviz.

## 1. Jogi megjegyzés — fontos, nem vagyok jogász

Ez a canvas-alapú, ujjal/egérrel rajzolt aláírás **egyszerű elektronikus aláírásnak** (nem minősített, nem fokozott biztonságú eIDAS-aláírásnak) számít. Ez a gyakorlatban bevett, sok kis kereskedő/szerviz POS-rendszere pontosan így működik, és a legtöbb hétköznapi átvételi/garanciaelismerő nyilatkozathoz elegendő bizonyító erejű — de **ha valamelyik dokumentumnak (pl. GDPR-hozzájárulás, bizományos szerződés) magasabb jogi súlya kell**, azt érdemes a könyvelőddel/ügyvéddel megerősíttetni, mielőtt teljesen elhagyod a papírt azokra az esetekre.

## 2. Adatmodell

```sql
create table signatures (
  id uuid primary key default gen_random_uuid(),
  stage text not null check (stage in ('sale', 'service_intake', 'service_handover')),
  transaction_id uuid references transactions(id) on delete set null,
  ticket_id uuid references service_tickets(id) on delete set null,
  signer_name text,
  image_path text not null,          -- Storage-beli elérési út
  signed_at timestamptz not null default now(),
  created_by_token boolean not null default true  -- infó: publikus token-oldalról jött-e (mindig igaz lesz kezdetben)
);
create unique index signatures_one_per_tx_stage on signatures(transaction_id, stage) where transaction_id is not null;
create unique index signatures_one_per_ticket_stage on signatures(ticket_id, stage) where ticket_id is not null;
```
(Az unique index miatt egy adott tranzakcióhoz/munkalaphoz stage-enként csak egyszer lehet aláírás — nem lehet véletlenül kétszer/felülírva aláíratni.)

**Storage bucket**: `signatures`, **publikus olvasás, unguessable UUID-alapú fájlnév** (`{signature.id}.png`) — ugyanaz az elv, mint a SmartBill `documentViewUrl`-jénél (`TASKS_SMARTBILL_INTEGRACIO.md`): a fájlnév egy találgathatatlan UUID, nincs benne személyes adat a névben, ez elég védelmet ad egy aláírás-képhez (nem bankkártya-adat), és így nem kell bajlódni signed URL generálással minden megtekintéskor. Ha ez neked nem elég szigorú, jelezd, és inkább egy Edge Function-nel generált, lejáró signed URL-re állítjuk — az is megoldható, csak egy plusz lépés.

## 3. Írás csak Edge Function-ön keresztül — miért nem elég egy sima RPC

A meglévő `get_ticket_status_by_token`/`get_receipt_by_token` minta sima Postgres SQL RPC — ez tökéletes **olvasáshoz**, de a Storage-ba való fájlfeltöltés nem SQL-művelet, azt a Supabase Storage API-ján keresztül kell csinálni. Ezért az aláírás **beküldéséhez** egy új, kicsi Edge Function kell: `submit-signature`.

- Bemenet: `{ token, kind ("ticket" | "purchase"), stage, signerName, imageDataUrl }`.
- A function service-role kulccsal (nem anon-nal, hogy biztonságosan validálhasson) ellenőrzi:
  - létezik-e a `ticket`/`transaction` a megadott tokennel,
  - a `stage` illik-e a jelenlegi állapothoz (pl. `service_handover` csak akkor engedélyezett, ha `status IN ('Átadásra', ...)` vagy már `Átadva`; `sale` csak eladási tranzakcióhoz; `service_intake` bármikor a munkalap létrejötte után),
  - **nincs-e már aláírás** ugyanarra a stage-re (az unique index amúgy is elkapná, de szebb előbb ellenőrizni és értelmes hibaüzenetet adni).
- Ha minden rendben: a base64 PNG-t feltölti a `signatures` bucketbe, beszúr egy `signatures` sort, visszaadja a publikus URL-t.
- Válasz hiba esetén egyértelmű, magyar üzenettel (pl. "Ez már alá van írva.", "Ehhez a munkalaphoz még nem lehet átadási aláírást kérni.").

## 4. Új komponens — `SignaturePad.jsx`

Kézzel írt (nem új npm-csomag — a projekt konvenciója szerint "nincs UI-lib", ld. `CLAUDE.md`), egyszerű canvas-alapú rajzoló:
- `<canvas>` egérrel/érintéssel rajzolható vonal (pointer events, nem külön mouse/touch kezelés kell).
- "Törlés" gomb (canvas ürítése).
- A szülő komponens egy `onSave(dataUrl)` callbacket kap, amit egy "Aláírás mentése" gomb hív meg (`canvas.toDataURL("image/png")`).
- Reszponzív, nagy érintőfelület — mobilon/tableten kényelmesen használható legyen, hiszen pontosan erre szánjuk (a "céges telefon/tablet" a pulton).

## 5. A publikus oldalak kibővítése — "aláírás mód"

### 5a. Routing — `src/main.jsx`

A meglévő `statusMatch`/`receiptMatch` mellé egy query-paraméter, amit a `StatusLookup`/`ReceiptLookup` propként megkap:
```js
const signStage = new URLSearchParams(window.location.search).get("sign"); // "service_intake" | "service_handover" | "sale" | null
```
majd `<StatusLookup token={...} signStage={signStage} />` / `<ReceiptLookup token={...} signStage={signStage} />`.

### 5b. `StatusLookup.jsx` — szerviz átvétel/átadás aláírás

Amikor `token` van ÉS `signStage` be van állítva ÉS a ticket állapota megengedi:
- A jelenlegi read-only nézet (117-144. sor) **fölé/köré** egy fókuszált "Aláírás" képernyő kerül: rövid összefoglaló (mi történt — "Átvétel: {dátum}, {eszköz}" vagy "Átadás: {ár}, garancia: {feltételek}"), egy Név mező (előre kitöltve `result.customer_name`-mel, szerkeszthető — hátha nem ugyanaz veszi át, aki hozta), a `SERVICE_WARRANTY_TERMS` (handover esetén) vagy egy rövid átvételi/hozzájárulási szöveg (intake esetén — **ezt a pontos szöveget te add meg**, nem találom ki jogi hozzájárulási szövegként, ahogy a `SERVICE_WARRANTY_TERMS`-nél is a te szövegedet használjuk változtatás nélkül), végül a `SignaturePad`.
- "Aláírás mentése" → hívja a `submit-signature` Edge Function-t → sikeres válasz után a képernyő lecserélődik egy lezárt állapotra: "✓ Aláírva — {signerName}, {signed_at}" + a mentett aláírás-kép kis előnézete.
- Ha az oldal betöltésekor **már van** aláírás az adott stage-re (valaki már aláírt, esetleg a link újra meg lett nyitva), rögtön a lezárt állapot jelenik meg, nincs újra-aláírás lehetőség.
- Ha `signStage` meg van adva, de az adott stage **nem engedélyezett** a jelenlegi állapotban (pl. `service_handover`, de a munkalap még "Javítás alatt"), egyértelmű üzenet: "Ez a munkalap még nincs átadásra kész."

### 5c. `ReceiptLookup.jsx` — eladás aláírás

Ugyanez a minta, `stage="sale"`-re — rövid "megvásároltam, átvettem, a garanciafeltételeket elfogadom" szöveg (ezt is a te pontos megfogalmazásoddal kell feltölteni) + `SignaturePad`.

## 6. Hol indítod az aláíratást — a pult oldali (staff) gombok, "ha akarunk" elv

**Fontos**: ez mindenhol egy **plusz, opcionális** gomb a meglévő "Nyomtatás" mellett — a nyomtatás semmilyen formában nem tűnik el, nem kötelező digitálisan aláíratni. Te/a dolgozók döntitek el eseti alapon, melyiket használjátok.

- **`SaleReceiptPanel.jsx`** (53-55. sor, `dp-actions`): a "Nyomtatás" gomb mellé egy "Aláíratás" gomb — `window.open(`${receiptLink}?sign=sale`, "_blank")` (új fülön nyílik, hogy a pultos gép/tablet átadható legyen a vevőnek, amíg az app a háttérben nyitva marad). Ha már van aláírás ehhez a tranzakcióhoz, a gomb helyett/mellett egy "✓ Aláírva {dátum}" jelvény, rákattintva megnyitja a mentett aláírás-képet.
- **`DetailPanel.jsx`**: két külön gomb, az "Ügyfél nyomon követés" szekció (74-80. sor) alá:
  - "Átvételi aláíratás" — mindig elérhető, amint a munkalap létrejött (`?sign=service_intake`).
  - "Átadási aláíratás" — csak akkor aktív, ha a munkalap `Átadásra`/`Átadva` státuszban van (`?sign=service_handover`).
  - Mindkettőnél ugyanaz az "✓ Aláírva {dátum}" jelvény-minta, ha már megtörtént.

## 7. Adatbetöltés az App.jsx-ben — a staff oldalon is látszódjon

A többi táblához hasonlóan: `signatures` state + betöltés, `signatureFromApi` mapper, majd a ticketekhez/tranzakciókhoz csatolva (`ticket.signatures` / `tx.signatures`, hasonlóan ahhoz, ahogy a `TASKS_SMARTBILL_INTEGRACIO.md`-ben a `smartbillDoc` is rá lett fűzve a tranzakciókra) — hogy a `DetailPanel`/`SaleReceiptPanel` tudja, mutasson-e "✓ Aláírva" jelvényt gomb helyett/mellett anélkül, hogy külön API-hívást kelljen indítania.

## 8. Amit tisztázni kell

1. **A "szerviz bevétel/kiadás" értelmezése** — a tervben ez "amikor bejön a gép" (intake) és "amikor kiadjuk" (handover) — ha te ehelyett a pénzügyi bevétel/kiadás tranzakciókra gondoltál (pl. alkatrész-vásárlás kiadása), szólj, mert az egy egészen más, és szerintem kevésbé indokolt eset (egy alkatrész-beszerzéshez nem az ügyfél írna alá).
2. **Az intake/consent szöveg pontos megfogalmazása** — ezt nem találom ki helyetted (ahogy a `SERVICE_WARRANTY_TERMS`-t sem tenném), küldd el, mit írjon alá a vevő gépátvételkor.
3. **Storage — publikus unguessable link vs. lejáró signed URL** (2. pont) — az egyszerűbb, publikus-de-találgathatatlan út az alapértelmezett javaslatom, szólj, ha inkább a szigorúbb, lejáró linkes megoldást akarod.

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- `signatures` tábla + Storage bucket létrehozva, migrálva
- `submit-signature` Edge Function validálja a stage-et az aktuális állapothoz képest, és nem enged duplán aláírni
- A publikus `/status/:token?sign=...` és `/receipt/:token?sign=...` oldalak működnek aláírás nélkül (a mai, változatlan nézet) ÉS aláírás módban is
- A pult oldalon (SaleReceiptPanel, DetailPanel) az "Aláíratás" gombok és az "✓ Aláírva" jelvények megjelennek, a "Nyomtatás" gombok változatlanul megmaradnak
- Nincs `git push`, csak lokális commit
