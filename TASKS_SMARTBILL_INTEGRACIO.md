# TASKS — SmartBill integráció (számlázás, bon, recepció, e-Factura)

Kérés: "dolgozd ki a smartbillel valo egyuttmukodest lehessen receptiot, casat rendezni, atvenni efacturat kiallitani szamlat stb"

**Fontos, előre**: nem vagyok könyvelő, és a SmartBill API-t élesben sosem futtattam — a lenti architektúra a hivatalos API-dokumentáció (`api.smartbill.ro`, 2026-08-17-i állapot) alapos átnézésén alapul, de az ÁFA-kezelést (neplătitor de TVA) és a fiskális bon-kiállítás jogszabályi részleteit **mindenképp egyeztesd a könyvelőddel**, mielőtt élesítjük.

## 0. A legfontosabb dolog, amit tisztázni kell: mit tud ténylegesen az API

Végignéztem a SmartBill nyilvános V1 API teljes dokumentációját (`https://api.smartbill.ro/en/`, hat végpont-csoport: Invoices, Estimates, Payments, Inventory, Email, Settings). A kérésedben volt 4 dolog — ebből **kettő simán megy, kettő NEM lehetséges** ezzel az API-val:

| Amit kértél | API-val megoldható? | Miért |
|---|---|---|
| **Számla kiállítása** (facturi) | ✅ Igen | `POST /invoice/v2` — teljesen támogatott, lásd 3-4. pont |
| **Casă rendezése** (fiskális bon, kártyás/készpénzes befizetés rögzítése) | ✅ Részben | `POST /payment` tud Bon (fiskális nyugta) és egyéb befizetést kiállítani — de **nincs** "napi zárás / Z-jelentés" végpont, csak egyenkénti nyugta-kiállítás. Lásd 5. pont a korlátra. |
| **Recepció kezelése** (bejövő áru / NIR) | ❌ Nem | Az "Inventory" végpont-csoportban **csak** `GET /stocks` van — kizárólag lekérdezés, nincs semmilyen "áru bevételezése" POST végpont. A SmartBill API-n keresztül fizikailag nem lehet készletet bevételezni. |
| **e-Factura fogadása** (beérkező szállítói számlák) | ❌ Nem | A hat végpont-csoport egyikében sincs e-Factura / ANAF SPV végpont. A SmartBill Cloud felületén belül van saját e-Factura beérkező-számla funkció (ANAF-fal szinkronizál), de ez **nem érhető el ezen az API-n keresztül** — csak a SmartBill Cloud felhasználói felületén, bejelentkezve. |

Tehát: a "recepció" és az "e-Factura fogadása" rész nem API-integráció, hanem a SmartBill Cloud saját felülete — ott ma is megcsinálod, ha ott van, ezen nem tud a phonestock-kódunk semmit gyorsítani vagy automatizálni. Ha ez a két funkció fontos neked, arra van két reális út, de mindkettő szándékosan **nincs** ebben a specifikációban, mert vagy nem lehetséges API-n, vagy egy jóval nagyobb, önálló projekt:
- **Recepció**: a phonestock saját `product_acquisitions` táblája (a `TASKS_BIZOMANYOS_ERTEKESITES.md`-ben már megtervezve) pontosan ezt csinálja — bevételezés helyi nyilvántartása Borderou/Contract de consignație generálással. Ez SmartBill nélkül is megvan, nem kell hozzá SmartBill.
- **e-Factura fogadása közvetlenül ANAF-tól**: ez egy teljesen külön, OAuth2 + UBL-XML alapú, sokkal bonyolultabb kormányzati API-integráció (ANAF SPV) — nem ugyanaz, mint a SmartBill API. Ha ezt tényleg akarod, szólj külön, az egy önálló specifikációt igényel, jelen fájl ezt szándékosan nem tartalmazza.

Innentől a fájl csak azzal foglalkozik, ami ténylegesen megvalósítható: **számla kiállítása** és **fiskális bon / befizetés rögzítése**.

## 1. Amit megnéztem (API-tények, forrás: api.smartbill.ro/en/, 2026-08-17)

- **Base URL**: `https://ws.smartbill.ro/SBORO/api` (V1, "invoicing and everyday operations" — ez az egyetlen releváns API-verzió).
- **Auth**: HTTP Basic Auth, `email:token` base64-kódolva az `Authorization` fejlécben. A token a SmartBill Cloud `Integrari` oldaláról jön, automatikusan generálódik a fiók létrehozásakor. **Ehhez kell egy "Facturare Platinum" előfizetés** — ez a te/a könyvelőd teendője, nem tudom helyetted megcsinálni.
- **Válaszformátum**: minden JSON. Sikeres híváskor `errorText: ""` + a dokumentum adatai (`number`, `series`, `documentId`, `documentUrl` — szerkesztői link, auth kell hozzá —, `documentViewUrl` — publikus PDF-link, ezt küldheted ki ügyfélnek).
- **Hibaformátum, két alak van**:
  1. Üzleti validáció (400/401/422): `errorText` mezőben a hibaszöveg (pl. "Seria nu a fost gasita!"). **Ez tartalmazhat HTML-t** (pl. `<br/>`, `<b>`) — ezt nem szabad nyers szövegként kiírni, se sanitizálás nélkül HTML-ként renderelni; a biztonságos megoldás: az első `<` jelig vágni, az a lényegi rész.
  2. Kérés-szintű hiba (400/405/415, `errorText` NINCS benne): `{"status":400,"type":"invalid_request_error","errors":[{"code":"json_mapping_error","message":"...","param":"products[0].quantity"}]}` — ez akkor jön, ha rossz mezőnevet küldünk, vagy rossz típusú értéket.
  3. Van egy csúnya edge-case is: ha a mezőnév helyesírása rossz (pl. `nume` a `name` helyett), **500-as HTML választ** ad, nem JSON-t — ezt is kezelnie kell a hibafeldolgozásnak (ne próbáljon JSON-t parse-olni, ha a `Content-Type` nem `application/json`).
- **Formátum-szabályok**: UTF-8; boolean mezők `1`/`0`-t is elfogadnak; százalék `taxPercentage: 21` (szám, NEM `"21%"` string, az 400-at ad); JSON-ban az idézőjelet/backslash-t escape-elni kell.
- **Rate limit**: 30 hívás / 10 mp / token, túllépéskor 10 percre blokkol. Fejlécek: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` — ezt figyelembe kell venni, ha kötegelt (pl. napi több tucat) számlát állítunk ki egyszerre.
- **Fontos, amire a SmartBill saját AI-integrációs útmutatója is figyelmeztet**: a `seriesName`, `taxName`, `measuringUnitName` mezőket **pontosan úgy kell küldeni**, ahogy a SmartBill Cloud fiókban be vannak állítva — ezeket **nem szabad kitalálni**, hanem be kell olvasni a `GET /series` és `GET /tax` végpontokról (lásd 4. pont).
- **Árak alapból ÁFA nélkül értendők** (`isTaxIncluded: false` az alapértelmezés) — mivel a phonestock jelenleg neplătitor de TVA (a `TASKS_BIZOMANYOS_ERTEKESITES.md`-ben már tárgyalt mikrovállalkozói státusz), ez különösen fontos: **a `taxName` értéket, amit a neplătitor-eset esetén használni kell (pl. "Scutit" vagy hasonló, attól függően, mi van a te SmartBill fiókodban konfigurálva), a könyvelőddel kell tisztázni és a `GET /tax` válaszából kell kiolvasni** — ezt nem találom ki helyetted, mert rossz ÁFA-kód rossz számlát jelent.

## 2. Payments végpont — mit tud

- `POST /payment` — fizetés/befizetés rögzítése. A `type` mező dönt (nem case-sensitive, de szóköz-érzékeny — `"Card online"` jó, `" Card online"` 404-et ad):
  - **Csak rögzít, nem állít ki külön dokumentumot**: `Card`, `Card online`, `Ordin plata`, `CEC`, `Bilet ordin`, `Mandat postal`, `Extras de cont`, `Ramburs`, `Alta incasare` — ezekhez nincs `number`/`series` a válaszban.
  - **Számozott dokumentumot generál**: `Chitanta` (nyugta, egy `seriesName` sorozaton) és `Bon` (fiskális blokk, a beállított pénztárgépen).
- **`Bon` (fiskális blokk) kiállítás korlátai — ez a "casă rendezése" leginkább releváns része**:
  - Előfeltétel: a SmartBill Cloud fiókban be kell állítani egy alapértelmezett pénztárgépet (`Configurari > Case de marcat`) — **ez felhasználó-szintű beállítás, nem cég-szintű**: a blokk azon a pénztárgépen keletkezik, ami az API-hívást indító SmartBill-felhasználóhoz van beállítva alapértelmezettként, függetlenül attól, hogy másik felhasználónak esetleg más gép van beállítva.
  - **Ez nálunk konkrét döntési pont, mert két helyszín van (Gyimes, Szentgyörgy)**: ha mindkét boltnak külön fiskális pénztárgépe van SmartBillben regisztrálva, akkor **két külön API-tokenre / két külön SmartBill-felhasználóra van szükség** (egy Gyimes-hez, egy Szentgyörgy-höz beállított alapértelmezett pénztárgéppel), és az Edge Function-nek a `locId` alapján kell eldöntenie, melyik hitelesítő adatpárt használja. Ha csak egy közös/virtuális pénztárgép van, egy tokennel is megoldható, de akkor a blokkokon nem fog látszani, melyik boltban történt az eladás — **ezt neked kell eldöntened, mert attól függ, hogy fizikailag hogy van beállítva a SmartBill fiókotokban.**
  - ÁFA-sor: csak `taxPercentage`-t küldj, `taxName`-t ne — mert egy fiskális gépen csak bizonyos kulcsok vannak beállítva, és ha a küldött `taxName` nincs a gépen konfigurálva, elutasítja a hívást.
  - Csak RON pénznemben állítható ki bon.
  - Válasz: `id` (ezzel kérhető le utólag `GET /payment/text`-tel a nyomtatható tartalom), `number` (API-n át kiállítva **0-val** jön vissza — a tényleges sorszámot a fizikai pénztárgép osztja ki nyomtatáskor).
- **Nincs "napi zárás" / Z-jelentés végpont** — a "casă rendezése" tehát nálunk gyakorlatilag annyit jelent: minden készpénzes/kártyás eladáshoz automatikusan generálunk egy `Bon`-t vagy `Chitanta`-t SmartBillben, de a **tényleges napi/időszaki elszámolást továbbra is a meglévő `CashSettlementTab.jsx` végzi** (ami már most is jól működik — összegzi a `payment` mező alapján a Készpénz/Kártya/Átutalás tranzakciókat). A SmartBill-bon-kiállítás ehhez képest egy **kiegészítő, jogilag szükséges dokumentum-generálás**, nem helyettesíti a mostani elszámolás-logikát.

## 3. Invoice végpont — mit tud

`POST /invoice/v2` — a leggazdagabb végpont, rengeteg opcióval (a doksi oldalsávjában külön-külön példa van mindegyikre): egyszerű/teljes számla, fizetési linkkel, készletlevonással együtt (`cu_descarcare_gestiune`), piszkozatként, kedvezménnyel, szolgáltatással, fizetési határidővel, "már kifizetve" jelöléssel, email-küldéssel egybekötve, devizás, EU-s adószámmal, neplătitor de TVA kibocsátóként, több ÁFA-kulccsal, idegen nyelven, ajánlatból, megjegyzésekkel.

A phonestock-hoz releváns kombináció (egy telefon eladása / bizományos jutalék-számla):
- `companyVatCode` — a `company_cui` mezőből (`app_settings`, már megvan a `TASKS_BIZOMANY_DOKUMENTUMOK.md` óta).
- `seriesName` — a `GET /series` (`type=f`) válaszából kiválasztott, valós sorozat.
- `client` — a phonestock `customers` tábla `name`/`phone`/`email`/`address` mezőiből (a `customerToApi`/`customerFromApi` mapper már megvan `src/lib/mappers.js`-ben) — ha nincs ügyfél rögzítve (anonymous eladás), egy minimál `{"name": "Persoana fizica"}` küldhető, mivel magánszemélynek nem kötelező adószám/cím a számlán.
- `products` — egy sor: `name` (pl. "iPhone 13 128GB — {IMEI}"), `code` (a phonestock termékkód, `phoneCode()`), `quantity: 1`, `price` = eladási ár, `measuringUnitName: "buc"`, `taxName`/`taxPercentage` a neplătitor-eset szerint (könyvelővel egyeztetve), `isTaxIncluded: true` (mert a `sale_price` már bruttó, ahogy a boltban).
- Bizományos eladásnál (`TASKS_BIZOMANYOS_ERTEKESITES.md`): a számla összege **csak a jutalék**, nem a teljes eladási ár — ez már úgyis megvan tervezve a `is_passthrough` logikában, a SmartBill-számlázás ugyanerre az elvre épül: csak a saját bevétel (jutalék) kerül számlára.

## 4. Adatmodell — új tábla

Nem a meglévő `transactions` táblát bővítjük (az már így is sok mindenre használt, egységes napló) — inkább egy külön kapcsolótábla, hogy egy tranzakcióhoz 0 vagy 1 SmartBill-számla/bon tartozzon, és a hibás/sztornózott kísérletek is nyomon követhetők legyenek:

```sql
create table smartbill_documents (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references transactions(id) on delete set null,
  doc_type text not null check (doc_type in ('invoice', 'bon', 'chitanta')),
  status text not null default 'pending' check (status in ('pending', 'issued', 'failed', 'cancelled')),
  smartbill_series text,
  smartbill_number text,
  smartbill_document_id integer,
  smartbill_document_url text,       -- szerkesztői link (auth kell hozzá)
  smartbill_document_view_url text,  -- publikus PDF-link, ügyfélnek küldhető
  error_text text,                   -- a SmartBill errorText mezője, ha hiba volt
  location_id uuid references locations(id),
  created_by uuid references auth.users(id),
  issued_at timestamptz,
  created_at timestamptz not null default now()
);
```

RLS: ugyanaz a minta, mint a `transactions`-on — staff a saját helyszínéhez tartozókat látja, admin mindent (a `location_id` mezőn keresztül).

`app_settings` már bővítve van (`company_name`/`company_cui`/`company_address`/`company_phone`/`company_email`) — ehhez jön még két beállítás-mező, **nem titkos, tehát mehet ide**:
- `smartbill_default_series` (melyik számlasorozatot használja alapból)
- `smartbill_locations_map` (jsonb, opcionális — ha két külön pénztárgép/token van a két helyszínhez, itt tárolható, melyik `location_id`-hoz melyik Supabase-secret-név tartozik, pl. `{"gyimes_location_id": "GYIMES", "szgy_location_id": "SZGY"}` — maguk a titkos kulcsok persze secretben maradnak, csak a *melyiket melyikhez* párosítás megy ide)

## 5. Titkos kulcsok — a te teendőd

Ugyanaz a minta, mint a Netopiánál (`TASKS_WEBSHOP_ONLINE_FIZETES.md`): **nem kezelek jelszót/API-tokent a nevedben**. Amikor a SmartBill fiók és a Facturare Platinum előfizetés megvan:

1. Lépj be `cloud.smartbill.ro/core/integrari/`-ra, az API szekcióban másold ki az Email + Token + CIF értékeket.
2. Állítsd be Supabase secretként (egy közös pár, vagy — ha a 2. pontban tárgyalt két-pénztárgépes eset áll fenn — kettő, helyszínenként):
   ```
   supabase secrets set SMARTBILL_EMAIL=... SMARTBILL_TOKEN=... SMARTBILL_CIF=...
   ```
   (vagy `SMARTBILL_EMAIL_GYIMES`/`SMARTBILL_TOKEN_GYIMES` + `..._SZGY` párban, ha kettő kell.)
3. Szólj, ha ez megvan — utána tudjuk élesíteni az Edge Function-t.

## 6. Edge Function — `smartbill-issue-document`

Egy Supabase Edge Function, ami a `doc_type` paraméter (`invoice` / `bon` / `chitanta`) alapján állítja össze a megfelelő SmartBill-hívást:

- Bemenet: `transaction_id` (a `transactions` táblából olvassa ki az összeget, ügyfelet, terméket), `doc_type`, `location_id`.
- A `location_id` alapján választja ki, melyik Supabase secret-párt használja (ha kettő van).
- Először (cache-elve, pl. napi 1x frissítve egy kis helyi táblában vagy csak minden híváskor lekérve — a rate limit 30/10mp bőven elég erre) lekéri `GET /tax` és `GET /series`-t, hogy a pontos `taxName`/`seriesName` stringeket használja, ne találja ki.
- Elküldi a `POST /invoice/v2` vagy `POST /payment` hívást.
- A választ feldolgozza a 3 hibaformátum szerint (1. pont), és beírja a `smartbill_documents` sorba: siker esetén `status='issued'` + a dokumentum-adatok, hiba esetén `status='failed'` + `error_text` (a `<` jelig vágva, HTML nélkül).
- Visszaadja a frontendnek a `smartbill_document_view_url`-t (ha van), hogy azonnal linkelhető/nyomtatható legyen.

## 7. UI-érintkezési pontok

- **`SellModal` / eladás rögzítésekor**: egy nem-kötelező checkbox — "Számla kiállítása SmartBillben" (alapból kikapcsolva magánszemélyes gyors eladásnál, mert elég a bon/nyugta; bekapcsolva, ha az ügyfél cégként vásárol és számlát kér). Ha be van pipálva, az eladás sikeres mentése után meghívja az Edge Function-t.
- **Bizományos eladás mentésekor** (`TASKS_BIZOMANYOS_ERTEKESITES.md` szerinti flow): ugyanaz a checkbox, de a számla összege a jutalék, nem a teljes ár (lásd 3. pont).
- **Webshop-rendelés sikeres Netopia-fizetés után** (`TASKS_WEBSHOP_ONLINE_FIZETES.md`): automatikusan (checkbox nélkül, mert online értékesítésnél számla kötelező) meghívja az Edge Function-t a `netopia-ipn` sikeres ágában.
- **`TransactionRow` / tranzakció-részletnézet**: ha van hozzá `smartbill_documents` sor `status='issued'`-dal, egy kis "Számla" jelvény + "Megnyitás" link (`smartbill_document_view_url`) és "Küldés emailben" gomb (ez a `POST /document/send` végpontot hívná — ezt még nem néztem át részletesen, ha kell, utánanézek, mielőtt beépítjük). Ha `status='failed'`, egy "Hiba: {error_text}" felirat + "Újrapróbálás" gomb.
- **`SettingsTab.jsx` "Integrációk" szekció**: egy "SmartBill kapcsolat tesztelése" gomb, ami meghívja az Edge Function-t egy könnyű `GET /tax` hívással (nem állít ki semmit, csak ellenőrzi, hogy a secretek helyesek-e) és zöld/piros státuszt mutat.

## 8. Külön menüpont a navigációban — „Számlázás"

Kérted, hogy ne csak a meglévő fülekbe (Pult/Pénzügyek) épüljön be pontszerűen a SmartBill, hanem legyen egy **dedikált menüpont**, ahol a számlázás/kasszázás egy helyen intézhető. Kód szerint pontosítva:

### Nav-gomb — `src/components/Sidebar.jsx`

A „Pénzügyek" csoportba kerül (36-40. sor), a „Bevételek & Kiadások" gomb után, **nem admin-only** — a bon/számla-kiállítás napi, helyszíni feladat, minden dolgozónak kell hozzá hozzáférjen, csak a lap alján lévő beállítás-infó lesz admin-only:

```jsx
<div className="nav-lbl">Pénzügyek</div>
<button className={`navbtn ${tab === "finance" ? "active" : ""}`} onClick={() => go("finance")}><FinanceIcon className="nav-ic" />Bevételek &amp; Kiadások</button>
<button className={`navbtn ${tab === "smartbill" ? "active" : ""}`} onClick={() => go("smartbill")}><InvoiceIcon className="nav-ic" />Számlázás</button>
{isAdmin && (
  <button className={`navbtn ${tab === "cash-settlement" ? "active" : ""}`} onClick={() => go("cash-settlement")}><CashSettlementIcon className="nav-ic" />Elszámolás</button>
)}
```

Kell hozzá egy új `InvoiceIcon` a `src/components/icons.jsx`-be, a meglévő ikonok stílusát követve (pl. a `CashSettlementIcon` mintájára, 181-186. sor — csak dokumentum-sziluett vízszintes vonalakkal, nem pipával):
```jsx
export const InvoiceIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 2h9l3 3v17H6z" />
    <path d="M9 9h6M9 13h6M9 17h4" />
  </svg>
);
```

### Route — `src/App.jsx`

A render-switchben a `cash-settlement` blokk mintájára (kb. 1697-1702. sor környékén), új `SmartBillTab` komponenshez:
```jsx
{!noLocationAssigned && tab === "smartbill" && (
  <SmartBillTab
    busy={busy} effectiveLocFilter={effectiveLocFilter} locName={locName}
    allowedLocations={allowedLocations} isAdmin={isAdmin}
    smartbillDocuments={smartbillDocuments} transactions={transactions} customers={customers}
    issueSmartbillDocument={issueSmartbillDocument} retrySmartbillDocument={retrySmartbillDocument}
  />
)}
```
Ehhez az App.jsx-ben kell egy `smartbillDocuments` state + betöltő (a többi tábla `fetchAllRows`-mintáját követve az adatbetöltő `useEffect`-ben), és két új wrapper-függvény (`issueSmartbillDocument(txId, docType)`, `retrySmartbillDocument(docId)`), amik a 6. pontban leírt `smartbill-issue-document` Edge Function-t hívják (`supabase.functions.invoke(...)`), majd frissítik a lokális state-et a válasszal.

### Oldal-elrendezés — új `src/tabs/SmartBillTab.jsx`

1. **Fejléc + kapcsolat-státusz csík** — kis zöld/piros pötty + „SmartBill kapcsolódva" vagy „Nincs beállítva" felirat, a `GET /tax` teszthívás cache-elt eredménye alapján.
2. **„Mai bonok/számlák" lista** — a mai naphoz tartozó `smartbill_documents` sorok, `effectiveLocFilter` szerint szűrve, típus-jelvénnyel (Számla/Bon/Nyugta), státusz-jelvénnyel (Kiállítva zöld / Hiba piros / Folyamatban szürke), összeggel, ügyfélnévvel. Hibás sornál „Újrapróbálás" gomb (`retrySmartbillDocument`).
3. **„Gyors kiállítás" panel** — nem feltétlenül egy meglévő `transactions` sorhoz kötött, önállóan indítható számla/bon (pl. ha valaki csak betér és bont kér, ami nincs a rendszerben eladásként rögzítve): összeg, ügyfél (kereshető a `customers` listából vagy új), típus-választó (Számla / Bon / Nyugta), „Kiállítás" gomb.
4. **„Napi bonok kiállítása" köteg-gomb** — végigmegy a mai, még ki nem számlázott készpénzes/kártyás tranzakciókon (`transactions` szűrve `date === today() && payment in [Készpénz, Kártya]` és nincs hozzájuk `issued` állapotú `smartbill_documents` sor), és sorban kiállítja rájuk a Bont — ez a leginkább kézzelfogható napi „kasszázás" rutin, figyelembe véve az API 30 hívás / 10 mp rate limitjét (kis késleltetéssel a hívások között).
5. **Alsó infó-doboz, csak adminnak** — a `GET /series`/`GET /tax` cache-elt válasza (aktuális sorozatnevek, ÁFA-kulcsok), „Kapcsolat tesztelése" gomb, link a Beállítások fülre a céges adatok szerkesztéséhez.

Ez a lap vizuálisan egy helyre gyűjti a 6-7. pontban már megtervezett Edge Function-t és `smartbill_documents` táblát — nem új backend-logika, csak a kért dedikált felület hozzá.

## 9. Amit még tisztázni kell, mielőtt kódolunk

Ezek olyan döntések, amiket nem tudok helyetted meghozni:

1. **ÁFA-kód neplătitor esetén** — pontosan milyen `taxName` van beállítva a SmartBill fiókodban a "nincs ÁFA" esetre? (Ezt a könyvelőddel vagy a `GET /tax` hívással tudjuk kideríteni, amint van API-hozzáférés.)
2. **Egy vagy két pénztárgép/token** — Gyimesnek és Szentgyörgynek van-e külön fiskális pénztárgépe a SmartBillben, vagy közösen egy van beállítva? Ez dönti el, kell-e két Supabase-secret-pár.
3. **Mikor kötelező a checkbox, mikor nem** — jelenleg úgy terveztem, hogy magánszemélyes gyors eladásnál opcionális (elég a bon), céges/számlát kérő vevőnél ajánlott — ez így stimmel a jelenlegi gyakorlatoddal, vagy minden eladásra akarsz számlát?
4. **`document/send` (email-küldés) végpont részletei** — ezt még nem néztem át tétel szinten (a doksiban "Collapsed" volt, csak a `POST /document/send` útvonalat láttam) — ha kell az automatikus email-küldés, ezt még meg kell nézni, mielőtt beépítjük.

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- `smartbill_documents` tábla + RLS létrehozva, migrálva
- Edge Function csak Supabase secretekből olvassa a SmartBill-hitelesítést, sosem kerül kódba/repo-ba
- `errorText` HTML-tartalma sosem kerül nyers/nem-sanitizált formában a felhasználó elé
- `seriesName`/`taxName` mindig a `GET /series`/`GET /tax` valós válaszából jön, nincs hardkódolt találgatás
- Sikeres számla/bon után a `smartbill_document_view_url` linkelve/nyomtathatóan elérhető
- A meglévő `CashSettlementTab.jsx` logika változatlan marad — a SmartBill-bon ehhez képest kiegészítés, nem csere
- Nincs `git push`, csak lokális commit
