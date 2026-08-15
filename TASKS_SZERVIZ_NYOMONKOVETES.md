# TASKS — Alkatrész-kód kereső, 90+ napos jelzés javítás, Szerviz KPI redesign, egységes nyomonkövetés

Négy összefüggő, de külön is elvégezhető feladat. Sorrend ajánlott (lentről lejjebb haladva), de nincs köztük kemény függőség.

**Ne pusholj / ne deployolj**, csak lokális commit, amíg nem szólnak.

---

## 1. Alkatrész kiválasztása kód alapján a munkalapon

**Fájl:** `src/components/DetailPanel.jsx`

Jelenleg (127–130. sor) a "Felhasznált alkatrészek" hozzáadó `<select>`-je csak névvel + darabszámmal listáz, kód nélkül — hosszú listánál nehéz megtalálni, és nem lehet az azonosítóval (`partCode`, pl. `A123`) rákeresni.

- Importáld a `partCode`-ot: `import { money, STATUSES, SUB_STATUSES, slaInfo, SITE_URL, statusLabel, ticketCode, partCode } from "../lib/utils";`
- Vegyél fel egy szűrő state-et: `const [partFilter, setPartFilter] = useState("");`
- Szűrd az elérhető alkatrészeket névre **és** kódra egyaránt:
```js
const partFilterQ = partFilter.trim().toLowerCase();
const shownParts = partFilterQ
  ? availableParts.filter((p) => (p.name || "").toLowerCase().includes(partFilterQ) || (partCode(p.partNo) || "").toLowerCase().includes(partFilterQ))
  : availableParts;
```
- A `showAddPart` blokkban (124–138. sor) tegyél egy kereső mezőt a `<select>` fölé, és a `<select>` opciói mutassák a kódot is:
```jsx
{showAddPart ? (
  <div style={{ marginTop: 8 }}>
    <input
      type="text"
      placeholder="Keresés név vagy kód szerint (pl. A123)..."
      value={partFilter}
      onChange={(e) => setPartFilter(e.target.value)}
      style={{ marginBottom: 6, width: "100%", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 9, padding: "8px 10px", fontFamily: "inherit", fontSize: 12.5 }}
    />
    <div className="row2" style={{ alignItems: "flex-end" }}>
      <div className="field" style={{ margin: 0 }}>
        <select value={selPartId} onChange={(e) => setSelPartId(e.target.value)}>
          <option value="">— Alkatrész ({shownParts.length}) —</option>
          {shownParts.map((p) => <option key={p.id} value={p.id}>{partCode(p.partNo)} — {p.name} ({p.quantity} db)</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input type="number" min="1" max={selPart?.quantity || 1} value={qty} onChange={(e) => setQty(Number(e.target.value))}
          style={{ width: 56, background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 9, padding: "9px 8px", fontFamily: "inherit", fontSize: 13 }} />
        <button className="btn sm" disabled={!selPart || busy} onClick={() => { if (selPart) { onAddPart(ticket.id, selPart, qty); setShowAddPart(false); setSelPartId(""); setQty(1); setPartFilter(""); } }}>OK</button>
        <button className="iconbtn" onClick={() => { setShowAddPart(false); setPartFilter(""); }}><CloseIcon width={14} height={14} /></button>
      </div>
    </div>
  </div>
) : ( ... marad a "+ Alkatrész hozzáadása" gomb ... )}
```
Megjegyzés: a `selPart` már a `selPartId`-ból van levezetve (18. sor) — az nem változik, csak azt kell figyelni, hogy `availableParts.find(...)` helyett most `shownParts`-ból is választható, de a `selPart` keresés maradhat `availableParts`-on, mert `selPartId` mindenképp abból a halmazból jön.

---

## 2. 90+ napos jelzés hiányzik a "Sikertelen" munkalapoknál

Megerősítve: a jelenlegi kód **kizárja** a `Sikertelen` státuszú munkalapokat a 90+ napos jelzésből, ráadásul azoknál `ready_at` sincs kitöltve (mert csak a sima "Kész, átvehető" váltásnál íródik be). Ezért látsz egy régi Sikertelen munkát jelzés nélkül.

**a) `src/App.jsx` — 764–772. sor, `setTicketStatus`:**

Jelenleg:
```js
const becameReady = status === "Átadásra" && subStatus === null && !(ticket && ticket.status === "Átadásra" && ticket.subStatus === null);
```
Ez csak a sima "Kész, átvehető"-re váltáskor ír `ready_at`-et. Cseréld erre, hogy bármelyik "Átadásra" alstátuszra (Kész **vagy** Sikertelen) belépéskor beírja, de ne írja felül, ha már ott volt a munkalap az Átadásra oszlopban:
```js
const becameReady = status === "Átadásra" && !(ticket && ticket.status === "Átadásra");
```
(Az SMS-küldést a 774. sor körül hagyd változatlanul — az továbbra is csak akkor fusson, ha `subStatus === null`, mert Sikertelennél nem küldünk "elkészült" SMS-t. Ha a jelenlegi kódban a `becameReady && ticket && ticket.customerPhone` feltétel nem néz subStatus-t, egészítsd ki: `becameReady && subStatus === null && ticket && ticket.customerPhone`.)

**b) `src/lib/utils.js` — 41–45. sor, `isStaleReady`:**

Jelenleg:
```js
export function isStaleReady(t) {
  if (t.status !== "Átadásra" || t.subStatus || !t.readyAt) return false;
  return Math.floor((Date.now() - new Date(t.readyAt)) / 86400000) >= READY_STALE_DAYS;
}
```
A `t.subStatus` feltétel miatt bármilyen alstátusszal rendelkező munkalap (Sikertelen **és** Átadva is) kiesik. Az "Átadva" (már tényleg kiadott) munkát viszont helyesen nem szabad jelezni. Cseréld erre:
```js
export function isStaleReady(t) {
  if (t.status !== "Átadásra" || t.subStatus === "Átadva" || !t.readyAt) return false;
  return Math.floor((Date.now() - new Date(t.readyAt)) / 86400000) >= READY_STALE_DAYS;
}
```
Ezzel a `TicketCard.jsx`-ben már meglévő `isStaleReady(ticket)` alapú piros jelzés (29–33. sor) automatikusan megjelenik a Sikertelen kártyákon is — ott nincs más teendő.

**c) `src/App.jsx` — `svcStats` (kb. 1033. sor):** bontsd ketté a jelenlegi összevont `staleReady`-t, hogy a két statcard-on külön tudd mutatni:
```js
staleReady: customerTickets.filter((t) => isStaleReady(t) && !t.subStatus).length,
staleFailed: customerTickets.filter((t) => isStaleReady(t) && t.subStatus === "Sikertelen").length,
```

**d) Egyszeri adat-backfill (Supabase SQL editor / migráció):** a meglévő 4 db Sikertelen munkalapnál nincs `ready_at`, mert a funkció eddig nem írta be nekik. Ezek nélkül a javítás után is jelzés nélkül maradnának, amíg valaki hozzájuk nem nyúl. Fuss le ezt egyszer:
```sql
update service_tickets
set ready_at = coalesce(ready_at, date_out::timestamptz, created_at)
where status = 'Átadásra' and sub_status = 'Sikertelen' and ready_at is null and deleted_at is null;
```
(Ellenőrizve: jelenleg pontosan 4 sort érint, a "Kész, átvehető" alstátuszú munkáknál nincs hiányzó `ready_at`, azoknál nincs teendő.)

**e) `src/tabs/ServiceTab.jsx` — 31. sor** ("Nem javítható (ügyfél)" kártya): tegyél alá ugyanolyan jelzőszöveget, mint amilyen a "Átvehető" kártyán már van (25–29. sor) — ez a lépés összeolvad a 3. pontban leírt KPI-redesignnal, lásd ott a teljes kártyasor kódját.

---

## 3. Szerviz KPI-sor redesign — a fekete kártyának legyen jelentése

**Probléma:** a `.statcard.accent` (`src/index.css` 94–98. sor) `var(--sidebar-bg)`-t használ háttérként, ami majdnem fekete (`#0A0A0C`). A `ServiceTab.jsx`-ben (21. sor) ez a stílus véletlenszerűen az első kártyára (`Aktív munkák`) kerül, csak mert az van elöl — nem azért, mert az a legfontosabb szám. Ez vizuálisan magára vonja a tekintetet, miközben "hány munka van éppen folyamatban" önmagában nem cselekvésre ösztönző adat (szinte mindig lesz valamennyi).

**Megoldás:** a fekete kiemelést vegyük le az "Aktív munkák"-ról, és tegyük át egy új, feltételes "Figyelmet igényel" sávra, ami csak akkor jelenik meg, ha van 90+ napja nem átvett munka — ez tényleg cselekvésre szólító adat (Hormozi-elv: a dashboard azt kiabálja, amivel foglalkozni kell, nem azt, ami mindig ott van).

**a) Új CSS — `src/index.css`, az 94–98. sor (`.statcard.accent`) blokk után:**
```css
.statcard.warn{background:var(--warning-soft);border-color:var(--warning-soft)}
.statcard.warn .lbl{color:var(--warning-ink)}
.statcard.warn .val{color:var(--warning-ink)}
```

**b) `src/tabs/ServiceTab.jsx` — cseréld a 20–36. sort erre:**
```jsx
<div className={`statrow ${svcStats.ownStock > 0 ? "c5" : "c4"}`}>
  <div className="statcard"><div className="lbl">Aktív munkák</div><div className="val">{svcStats.inHouse}</div></div>
  <div className="statcard"><div className="lbl">Átvehető (ügyfél)</div><div className="val" style={{ color: "#15803D" }}>{svcStats.kesz}</div></div>
  <div className="statcard"><div className="lbl">Nem javítható (ügyfél)</div><div className="val" style={{ color: "#9D174D" }}>{svcStats.sikertelen}</div></div>
  <div className="statcard"><div className="lbl">Kiadva (utolsó 7 munkanap)</div><div className="val">{svcStats.kiadvaRecent}</div></div>
  {svcStats.ownStock > 0 && (
    <div className="statcard"><div className="lbl">Saját készlet szervizben</div><div className="val">{svcStats.ownStock}</div></div>
  )}
</div>

{(svcStats.staleReady > 0 || svcStats.staleFailed > 0) && (
  <div className="statcard warn" style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
    <div>
      <div className="lbl">Figyelmet igényel — 90+ napja nem átvett</div>
      <div className="val">{svcStats.staleReady + svcStats.staleFailed} db</div>
    </div>
    <div style={{ fontSize: 12.5, fontWeight: 600 }}>
      {svcStats.staleReady > 0 && <span>{svcStats.staleReady} átvehető</span>}
      {svcStats.staleReady > 0 && svcStats.staleFailed > 0 && "  ·  "}
      {svcStats.staleFailed > 0 && <span>{svcStats.staleFailed} nem javítható</span>}
    </div>
  </div>
)}
```
(A korábbi, kártyán-belüli apró "90+ napja várakozó" szöveg ezzel kiváltva — az most a saját, jól látható sávjában van, nem bújik meg egy másik kártya alján.)

Ez a minta (`.statcard.accent` fekete = pozíció alapján, nem jelentés alapján) valószínűleg a Dashboard/Pénzügyek/Alkatrészek/Kliensek füleken is megvan — most szándékosan csak a Szerviz fület javítjuk, a többit majd külön nézzük át, ha szeretnéd.

---

## 4. Egységes, kereshető "előzmény" nézet — átadott munkalapok, eladott telefonok, lejárt garanciák, alkatrész-felhasználás

Jelenleg az "Átadott munkalapok" (`ServiceTab.jsx` 79–110. sor) és az "Eladott telefonok" (`StockTab.jsx` 164–194. sor) ugyanazt az egyszerű `toggle-link` + sima `<table>` mintát használja. A Garanciáknál **nincs is ilyen** — a `WarrantyTab` csak az aktív garanciákat mutatja, lejárt garancia sehol nem kereshető vissza. Az Alkatrészeknél a részletnézet (`PartDetailPanel.jsx`) nem mutatja, mely munkalapokon lett felhasználva az adott alkatrész.

Egy közös, újrahasználható komponenssel oldjuk meg mind a négyet egyszerre.

### 4a. Új komponens: `src/components/HistorySection.jsx`
```jsx
import { useState } from "react";
import { ChevronDownIcon } from "./icons";
import { EmptyState } from "./EmptyState";

export default function HistorySection({ icon: Icon, label, items, searchPlaceholder, filterFn, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [q, setQ] = useState("");
  const shown = q.trim() && filterFn ? items.filter((it) => filterFn(it, q.trim().toLowerCase())) : items;

  return (
    <div style={{ marginTop: 14 }}>
      <button type="button" className="history-toggle" onClick={() => setOpen((v) => !v)}>
        <Icon width={14} height={14} />
        <span>{label} ({items.length})</span>
        <ChevronDownIcon style={{ marginLeft: "auto", transform: open ? "rotate(180deg)" : undefined }} />
      </button>
      {open && (
        <div className="tw" style={{ marginTop: 10 }}>
          {items.length > 6 && filterFn && (
            <div style={{ padding: "10px 12px", borderBottom: "1px solid #F3F4F6" }}>
              <div className="searchbar" style={{ margin: 0, maxWidth: "none" }}>
                <input placeholder={searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>
          )}
          {shown.length === 0 ? <EmptyState icon={Icon}>Nincs találat.</EmptyState> : children(shown)}
        </div>
      )}
    </div>
  );
}
```

### 4b. Új CSS — `src/index.css`, a `.toggle-link` szabályok (128–129. sor) mellé:
```css
.history-toggle{display:flex;align-items:center;gap:8px;width:100%;background:#fff;border:1px solid #EEF0F2;border-radius:14px;padding:12px 16px;font-family:inherit;font-size:13px;font-weight:600;color:#374151;cursor:pointer;box-shadow:var(--shadow-card)}
.history-toggle:hover{border-color:#D1D5DB}
```
A régi `.toggle-link` osztály maradhat (más helyen még használhatja a kód), csak ezen a négy helyen váltjuk le.

### 4c. `ServiceTab.jsx` — cseréld a 79–110. sort:
```jsx
<HistorySection
  icon={ServiceIcon}
  label="Átadott munkalapok"
  items={handedOverTickets}
  searchPlaceholder="Keresés vevő, márka, modell szerint..."
  filterFn={(t, q) => [t.customerName, t.brand, t.model, ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))].filter(Boolean).join(" ").toLowerCase().includes(q)}
>
  {(rows) => (
    <table>
      <thead><tr><th>Eszköz</th><th>Helyszín</th><th>Bejött</th><th>Átadva</th><th>Vevő</th><th>Díj</th></tr></thead>
      <tbody>
        {rows.map((t) => (
          <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => setDetailId(t.id)}>
            <td>
              <div className="stk-row">
                <Thumb brand={t.brand} />
                <div>
                  <div className="stk-name">{displayName(t.brand, t.model) || "—"}</div>
                  <div className="stk-sub">{ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))}</div>
                </div>
              </div>
            </td>
            <td><span className="badge-loc">{locName(t.locationId)}</span></td>
            <td className="mono">{t.dateIn}</td>
            <td className="mono">{t.dateOut || "—"}</td>
            <td>{t.customerName}</td>
            <td className="mono" style={{ fontWeight: 700 }}>{money(t.price)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )}
</HistorySection>
```
Import: `import HistorySection from "../components/HistorySection";` — a `showHandedOver`/`setShowHandedOver` propokra ezután már nincs szükség itt (a nyitott/zárt állapotot a `HistorySection` maga kezeli), törölhetők a komponens signature-ből és az `App.jsx`-ből átadott propokból, ha máshol nem használja őket.

### 4d. `StockTab.jsx` — cseréld a 164–194. sort ugyanígy, `soldStock`-kal:
```jsx
<HistorySection
  icon={PhoneCaseIcon}
  label="Eladott telefonok"
  items={soldStock}
  searchPlaceholder="Keresés márka, modell, vevő szerint..."
  filterFn={(i, q) => [i.brand, i.model, i.saleTx?.customerName, phoneCode(i.productNo)].filter(Boolean).join(" ").toLowerCase().includes(q)}
>
  {(rows) => (
    <table>
      <thead><tr><th>Termék</th><th>Helyszín</th><th>Eladva</th><th>Vevő</th><th>Ár</th></tr></thead>
      <tbody>
        {rows.map((i) => (
          <tr key={i.id} style={{ cursor: "pointer" }} onClick={() => setProductDetailId(i.id)}>
            <td>
              <div className="stk-row">
                <Thumb brand={i.brand} />
                <div>
                  <div className="stk-name">{displayName(i.brand, i.model)}</div>
                  <div className="stk-sub">{[phoneCode(i.productNo), i.imei].filter(Boolean).join(" · ") || "—"}</div>
                </div>
              </div>
            </td>
            <td><span className="badge-loc">{locName(i.locationId)}</span></td>
            <td className="mono">{i.saleTx?.date || "—"}</td>
            <td>{i.saleTx?.customerName || "—"}</td>
            <td className="mono" style={{ fontWeight: 700 }}>{money(i.salePrice)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )}
</HistorySection>
```
Ugyanúgy a `showSold`/`setShowSold` propok innen már nem szükségesek.

### 4e. Garanciák — új "Lejárt garanciák" előzmény (valódi új funkció, eddig nem létezett)

**`src/App.jsx`**: az `activeWarranties` (1075–1099. sor) pontosan ugyanazt a három forrást (eladási tranzakció, szerviz-átadás, kézi garancia) építi fel, csak mindegyiknél előre kiszűri az `isWarrantyActive`-ot. Emeld ki a közös leképezést egy segédfüggvénybe, és számold ki mindkét halmazt:
```js
function buildWarrantyItems(active) {
  const saleItems = transactions
    .filter((t) => t.category === "Készlet" && t.warranty && isWarrantyActive(t.date, t.warranty) === active)
    .map((t) => ({ key: `sale-${t.id}`, kind: "sale", source: "linked", refId: t.id, customerName: t.customerName, customerPhone: t.customerPhone, label: t.description, warranty: t.warranty, from: t.date, expiry: warrantyExpiry(t.date, t.warranty), locationId: t.locationId }));
  const serviceItems = tickets
    .filter((t) => t.subStatus === "Átadva" && t.warranty && isWarrantyActive(t.dateOut, t.warranty) === active)
    .map((t) => ({ key: `svc-${t.id}`, kind: "service", source: "linked", refId: t.id, customerName: t.customerName, customerPhone: t.customerPhone, label: [t.brand, t.model].filter(Boolean).join(" "), warranty: t.warranty, from: t.dateOut, expiry: warrantyExpiry(t.dateOut, t.warranty), locationId: t.locationId }));
  const manualItems = warranties
    .filter((w) => isWarrantyActive(w.fromDate, w.warranty) === active)
    .map((w) => ({ key: `manual-${w.id}`, kind: w.kind, source: "manual", refId: w.id, customerName: w.customerName, customerPhone: w.customerPhone, label: w.label, warranty: w.warranty, from: w.fromDate, expiry: warrantyExpiry(w.fromDate, w.warranty), locationId: w.locationId, note: w.note }));
  return [...saleItems, ...serviceItems, ...manualItems].sort((a, b) => (a.expiry || "").localeCompare(b.expiry || ""));
}
const activeWarranties = useMemo(() => buildWarrantyItems(true), [transactions, tickets, warranties]);
const expiredWarranties = useMemo(() => buildWarrantyItems(false).sort((a, b) => (b.expiry || "").localeCompare(a.expiry || "")), [transactions, tickets, warranties]);
```
Add tovább `expiredWarranties`-t a `WarrantyTab`-nak.

**`src/tabs/WarrantyTab.jsx`**: vedd fel az `expiredWarranties` propot, és a táblázat (49–104. sor) alá tegyél egy `HistorySection`-t:
```jsx
<HistorySection
  icon={WarrantyIcon}
  label="Lejárt garanciák"
  items={expiredWarranties}
  searchPlaceholder="Keresés ügyfél vagy termék szerint..."
  filterFn={(w, q) => [w.customerName, w.label].filter(Boolean).join(" ").toLowerCase().includes(q)}
>
  {(rows) => (
    <table>
      <thead><tr><th>Típus</th><th>Ügyfél</th><th>Termék / Eszköz</th><th>Garancia</th><th>Lejárt</th><th>Helyszín</th></tr></thead>
      <tbody>
        {rows.map((w) => (
          <tr key={w.key} style={{ cursor: "pointer" }} onClick={() => setWarrantyDetailKey(w.key)}>
            <td>{w.kind === "sale" ? <span className="badge-income">Eladás</span> : <span className="badge-loc">Szerviz</span>}</td>
            <td style={{ fontWeight: 600 }}>{w.customerName || "—"}</td>
            <td><div className="stk-row"><Thumb brand={w.label || "?"} size="sm" /><div>{w.label || "—"}</div></div></td>
            <td><span className="gar-pill">{w.warranty}</span></td>
            <td className="mono" style={{ color: "#9CA3AF" }}>{w.expiry}</td>
            <td><span className="badge-loc">{locName(w.locationId)}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  )}
</HistorySection>
```

### 4f. Alkatrészek — felhasználási előzmény a részletnézetben

Nincs listaszintű "előzmény" (az alkatrészek nem "lejárnak"), hanem részlet-szintű nyomonkövethetőség kell: melyik munkalapon, mikor, mennyi lett felhasználva belőle.

**`src/App.jsx`**: a `tickets[].usedParts` már tartalmazza `partId`-vel az összes felhasználást (lásd 183–187. sor). Számold ki egy adott alkatrész felhasználási listáját ott, ahol a `partDetailId` van kezelve:
```js
const partUsage = useMemo(() => {
  if (!partDetailId) return [];
  return tickets
    .flatMap((t) => (t.usedParts || []).filter((sp) => sp.partId === partDetailId).map((sp) => ({ ...sp, ticket: t })))
    .sort((a, b) => (b.ticket.dateIn || "").localeCompare(a.ticket.dateIn || ""));
}, [tickets, partDetailId]);
```
Add át propként a `PartDetailPanel`-nek: `partUsage={partUsage}` és `onOpenTicket={(id) => { setPartDetailId(null); setDetailId(id); }}`.

**`src/components/PartDetailPanel.jsx`**: vedd fel az új propokat (`partUsage = [], onOpenTicket`), és a "Pénzügyek" szekció (28–32. sor) után tegyél egy új szekciót:
```jsx
<div className="dp-section">
  <div className="dp-section-title">Felhasználási előzmény</div>
  {partUsage.length === 0 ? (
    <div style={{ fontSize: 12.5, color: "#9CA3AF" }}>Ez az alkatrész még nem lett felhasználva munkalapon.</div>
  ) : partUsage.map((sp) => (
    <div key={sp.id} className="dp-row" style={{ cursor: "pointer" }} onClick={() => onOpenTicket(sp.ticket.id)}>
      <span className="dp-key">{ticketCode(sp.ticket.ticketNo, sp.ticket.locationId)} — {[sp.ticket.brand, sp.ticket.model].filter(Boolean).join(" ")}</span>
      <span className="dp-val">{sp.quantity} db · {sp.ticket.dateIn}</span>
    </div>
  ))}
</div>
```
Import: `ticketCode` a `../lib/utils`-ból. (A `locName` nélküli `ticketCode` hívás itt csak a helyszín nevét nem tudja feloldani szépen — ha ez zavaró, add át a `locName` függvényt is propként, és használd `ticketCode(sp.ticket.ticketNo, locName(sp.ticket.intakeLocationId || sp.ticket.locationId))` formában, konzisztensen a többi hellyel.)

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- Szerviz munkalapon alkatrész hozzáadásnál lehet kódra (pl. "A12") és névre is keresni, a legördülőben mindenhol látszik a kód
- Egy 90+ napja "Sikertelen" munkalapon megjelenik a piros "90+ napja várja az átvételt" jelzés (a 4 érintett munkalapon a backfill SQL után azonnal)
- Új "Sikertelen" munkalap 90+ nap után is jelez, "Átadva" (ténylegesen kiadott) munkalapon soha nem jelenik meg téves jelzés
- Szerviz fülön az "Aktív munkák" kártya már nem fekete/accent; a "Figyelmet igényel" sáv csak akkor látszik, ha van 90+ napos elmaradás
- Átadott munkalapok, Eladott telefonok, Lejárt garanciák mind ugyanazzal a kártyás/kereshető `HistorySection` mintával nyílnak
- Egy alkatrész részletnézetében látszik, mely munkalapokon lett felhasználva, rájuk kattintva megnyílik az adott munkalap
- Más fülön (Dashboard, Pénzügyek stb.) semmi nem változott
- Nincs `git push`, csak lokális commit
