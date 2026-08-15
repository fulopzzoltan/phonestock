# TASKS — Eszköz-előzmény ("kórtörténeti lap") minden hozzánk bekerülő telefonhoz

## 0. Helyzetkép — ezt találtam az élő adatban, mielőtt nekiálltam tervezni

Lekérdeztem az élő Supabase adatot (`aaiyyhskvxjqfhrgoulh`), hogy lássam, mennyire kivitelezhető ez ma:

- **`products`**: 913 aktív tételből 775-nek van kitöltve IMEI-je (85%) — jó alap.
- **`service_tickets`**: 1069 aktív munkalapból **mindössze 1-nek** van kitöltve IMEI-je (a `Ügyfél` típusúak közül 1067-ből **0**). A mező ott van a felvételi formon (`TicketFormModal.jsx` 126. sor), de a gyakorlatban szinte soha nem töltik ki.
- Találtam **ismétlődő IMEI-ket** a `products`-ban (pl. egy IMEI 4×, több másik 2-3×) — ez valószínűleg visszatérő beváltás/felvásárlás (buyback → eladás → később megint beváltjuk) ugyanarra a készülékre. Pontosan ez az a fajta összefüggés, amit látni szeretnél.
- A kézzel felvett `warranties` táblának **nincs** semmilyen eszköz-azonosítója (se IMEI, se product_id, se ticket_id) — csak szabad szöveg. Ezt technikailag nem lehet eszközhöz kötni jelenlegi formájában, ezért ez a funkció **nem** tudja bevonni a kézi garanciákat. Ez egy tudatos kihagyás, nem hiba — ha ez zavaró, külön kellene sémát bővíteni rajta, azt most nem piszkáljuk.

**Ebből egy fontos következtetés:** az eszköz-előzmény a `products`-ra és a saját-készletes munkalapokra ma azonnal működni fog (jó a lefedettség), de az **ügyfél-szervizeknél** csak akkor lesz haszna, ha innentől tényleg beírjuk az IMEI-t felvételkor — ma gyakorlatilag soha nem történik meg. Ezért a lenti terv két részből áll: (A) maga az előzmény-nézet, és (B) egy konkrét ösztönző, ami miatt az IMEI kitöltése azonnal megéri a recepciósnak — nem csak elvi kérés.

---

## 1. IMEI normalizálás — `src/lib/utils.js`

Az IMEI-k formázása (szóköz, kötőjel) nem mindig egységes. Egyetlen segédfüggvény kell, amit mindenhol ugyanígy használunk az egyeztetéshez:
```js
export function normalizeImei(imei) {
  return (imei || "").replace(/\D/g, "");
}
```

---

## 2. Eszköz-előzmény összeállítása — `src/App.jsx`

Új state + számítás. A `stock` (teljes, eladottakkal együtt) és `tickets` már mind elérhető az App.jsx-ben.
```js
const [deviceHistoryImei, setDeviceHistoryImei] = useState(null);

function buildDeviceHistory(rawImei) {
  const key = normalizeImei(rawImei);
  if (!key) return null;
  const relatedProducts = stock.filter((p) => normalizeImei(p.imei) === key);
  const relatedTickets = tickets.filter((t) => normalizeImei(t.imei) === key);
  if (relatedProducts.length === 0 && relatedTickets.length === 0) return null;
  const ref = relatedProducts[0] || relatedTickets[0];

  const timeline = [];
  relatedProducts.forEach((p) => {
    timeline.push({
      date: p.dateAdded, kind: "purchase",
      label: p.condition === "New" ? "Beszerezve (új)" : "Beszerezve (felújított)",
      detail: `besz. ár ${money(p.costPrice)}${p.grade ? " · " + p.grade : ""}`,
      onOpen: () => { setProductDetailId(p.id); setDeviceHistoryImei(null); },
    });
    const saleTx = transactions.find((t) => t.productId === p.id && t.type === "income");
    if (saleTx) {
      timeline.push({ date: saleTx.date, kind: "sale", label: "Eladva", detail: `${saleTx.customerName || "—"} — ${money(saleTx.amount)}` });
    }
  });
  relatedTickets.forEach((t) => {
    const kindLabel = t.ticketKind === "Ügyfél" ? "Ügyfél szerviz"
      : t.ticketKind === "Saját készlet - garanciális" ? "Garanciális javítás (saját)" : "Előkészítés (saját)";
    timeline.push({
      date: t.dateIn, kind: "ticket",
      label: kindLabel,
      status: t.status, subStatus: t.subStatus,
      detail: `${ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))} — ${(t.issue || "").split(",").filter(Boolean).join(", ") || "—"}${t.price ? " · " + money(t.price) : ""}`,
      onOpen: () => { setDetailId(t.id); setDeviceHistoryImei(null); },
    });
  });
  timeline.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  return { imei: ref.imei, brand: ref.brand, model: ref.model, repeatCount: relatedProducts.length, timeline };
}

const deviceHistory = useMemo(
  () => (deviceHistoryImei ? buildDeviceHistory(deviceHistoryImei) : null),
  [deviceHistoryImei, stock, tickets, transactions]
);
```
Import: `normalizeImei` a `./lib/utils`-ból a már meglévő import sorba.

---

## 3. Új komponens: `src/components/DeviceHistoryPanel.jsx`

Ugyanaz a szerkezet, mint a már létező `CustomerDetailPanel.jsx`-é (időrendi lista, `dp-row` elemek) — csak eszközre, nem ügyfélre kulcsolva.
```jsx
import { money } from "../lib/utils";
import { CloseIcon } from "./icons";

const KIND_BADGE = {
  purchase: "badge-loc",
  sale: "badge-income",
  ticket: "badge-loc",
};

export default function DeviceHistoryPanel({ history, onClose }) {
  if (!history) return null;
  const { imei, brand, model, repeatCount, timeline } = history;
  return (
    <div className="detail-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="detail-panel">
        <div className="dp-head">
          <div>
            <div className="dp-sn">Eszköz előzmény</div>
            <div className="dp-name">{brand} {model} — <span className="mono">{imei}</span></div>
          </div>
          <button className="iconbtn" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="dp-body">
          {repeatCount > 1 && (
            <div className="statcard warn" style={{ marginBottom: 16 }}>
              <div className="lbl">Figyelem</div>
              <div className="val" style={{ fontSize: 13.5, lineHeight: 1.4 }}>
                Ez az IMEI eddig {repeatCount} alkalommal került be hozzánk termékként — érdemes átnézni, mi történik ezzel a készülékkel.
              </div>
            </div>
          )}
          <div className="dp-section">
            <div className="dp-section-title">Idővonal ({timeline.length} esemény)</div>
            {timeline.length === 0 && <div style={{ color: "#9CA3AF", fontSize: 12.5 }}>Nincs rögzített esemény.</div>}
            {timeline.map((e, i) => (
              <div key={i} className="dp-row" style={{ alignItems: "center", cursor: e.onOpen ? "pointer" : undefined }} onClick={e.onOpen}>
                <span className="dp-key">{e.date || "—"} · <span className={`st ${KIND_BADGE[e.kind]}`} style={{ marginLeft: 4 }}>{e.label}</span></span>
                <span className="dp-val">{e.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```
Megjegyzés: a `badge-loc`/`badge-income`/`st` osztályok már léteznek `src/index.css`-ben, nincs új CSS. A `.statcard.warn` osztály is már megvan (a `TASKS_SZERVIZ_NYOMONKOVETES.md` 3. pontjából).

---

## 4. Belépési pontok

**a) `src/components/ProductDetailPanel.jsx`** — a "Termék adatok" szekció végére, ha van IMEI:
```jsx
{product.imei && (
  <button type="button" className="btn sec sm" style={{ marginTop: 8 }} onClick={() => onShowHistory(product.imei)}>Eszköz előzmény megtekintése</button>
)}
```
Új prop: `onShowHistory`.

**b) `src/components/DetailPanel.jsx`** — a "Eszköz & Javítás" szekcióban, az IMEI sor (86. sor) alá:
```jsx
{ticket.imei && (
  <button type="button" className="btn sec sm" style={{ marginTop: 4, marginBottom: 4 }} onClick={() => onShowHistory(ticket.imei)}>Eszköz előzmény megtekintése</button>
)}
```
Új prop: `onShowHistory`.

**c) `src/App.jsx` render** — mindkét helyre add át: `onShowHistory={(imei) => setDeviceHistoryImei(imei)}`, és a JSX-fába (a többi overlay mellé, pl. a `ProductDetailPanel` blokk után) szúrd be:
```jsx
{deviceHistoryImei && <DeviceHistoryPanel history={deviceHistory} onClose={() => setDeviceHistoryImei(null)} />}
```
Import: `import DeviceHistoryPanel from "./components/DeviceHistoryPanel";`

---

## 5. A legfontosabb rész: élő egyezés-keresés IMEI gépelése közben (`TicketFormModal.jsx`)

Ez adja meg, hogy a recepciósnak **azonnal megérje** kitölteni az IMEI-t — nem elvi kérés, hanem rögtön lát is tőle valamit. Enélkül a fenti nézet ügyfél-szervizeknél gyakorlatilag üres marad, ahogy a 0. pontban látszik.

- Új prop kell: `tickets = []` — az `App.jsx`-ben a `<TicketFormModal ...>` hívásnál (kb. 1376–1395. sor) egészítsd ki `tickets={tickets}`-szel.
- Importáld a `normalizeImei`-t a `TicketFormModal.jsx`-ben: `import { PROBLEM_TAGS, WARRANTIES, STATUSES, SUB_STATUSES, statusLabel, normalizeImei, money, ticketCode } from "../lib/utils";`
- Élő találat számítása:
```js
const imeiKey = normalizeImei(f.imei);
const imeiMatch = imeiKey.length >= 6 ? {
  product: stock.find((p) => normalizeImei(p.imei) === imeiKey),
  tickets: tickets.filter((t) => normalizeImei(t.imei) === imeiKey && t.id !== ticket?.id),
} : null;
const hasImeiMatch = imeiMatch && (imeiMatch.product || imeiMatch.tickets.length > 0);
```
- Az IMEI mező (jelenlegi 126. sor) alá, még a `row2`-n belül nem fér el szépen, ezért tedd a `row2` blokk (125–133. sor) alá, önálló blokkként:
```jsx
{hasImeiMatch && (
  <div style={{ marginTop: -4, marginBottom: 12, padding: "10px 12px", background: "var(--primary-soft)", border: "1px solid var(--primary)", borderRadius: 10, fontSize: 12.5 }}>
    <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--primary-ink)" }}>Ezzel a készülékkel már dolgoztunk:</div>
    {imeiMatch.product && (
      <div>— nálunk vásárolt telefon ({imeiMatch.product.condition === "New" ? "új" : "felújított"}, {money(imeiMatch.product.salePrice)}{imeiMatch.product.status === "sold" ? ", eladva" : ", raktáron"})</div>
    )}
    {imeiMatch.tickets.map((t) => (
      <div key={t.id}>— korábbi szerviz: {t.dateIn} · {(t.issue || "").split(",").filter(Boolean).join(", ") || "—"}</div>
    ))}
  </div>
)}
```
Ez a doboz semmilyen adatot nem ment el, csak megjelenít — a mentés (`submit()`) változatlan marad.

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- Egy IMEI-vel rendelkező telefon adatlapján megjelenik az "Eszköz előzmény megtekintése" gomb; rákattintva látszik a beszerzés, eladás és minden hozzá köthető szerviz időrendben
- Egy IMEI-vel rendelkező munkalapon ugyanaz a gomb ugyanazt a nézetet nyitja meg
- Egy legalább kétszer felbukkanó IMEI-nél (pl. `863413043041442`) megjelenik a sárga figyelmeztető sáv
- Új munkalap felvételekor, ha az IMEI-mezőbe olyan számot írsz, ami már szerepel a `products` vagy egy korábbi munkalap IMEI-jében, azonnal megjelenik alatta a zöld "Ezzel a készülékkel már dolgoztunk" doboz
- A kézi garanciák (`warranties` tábla) nem jelennek meg az eszköz-előzményben — ez tudatos, nem hiba
- Más fülön semmi nem változott
- Nincs `git push`, csak lokális commit
