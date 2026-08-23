# TASKS — "Szólunk, ha hozhatja a telefont" — ügyfél-visszahívás kezelése

Kérés: "van amikor a szerviznel ugy van hogy megbeszeljuk a kliensel hogy amikor szolunk akkor hozza be a telefonjat ezt kikellene dolgozd hogy hogy oldjuk meg"

## 0. Amit megnéztem — nem kell új rendszer, van rá kész alap

A `waiting_items` tábla (adatbázisban ellenőrizve) **pontosan erre az esetre való**, csak eddig kizárólag alkatrész-rendelésre használtátok (`src/components/WaitingList.jsx`, a Pult fülön, `src/tabs/PultTab.jsx` 134. sor). Az állapotgép már most is pont ez a folyamat:

```
megrendelve → megerkezett → ertesitve → lezarva
```
("Megrendelve" → "Megérkezett" → "Értesítve" → "Lezárva" — ezt az `advanceWaiting()` App.jsx 1236. sor kezeli.)

A tábla `customer_phone` mezője **már létezik és be is töltődik** (`waitingFromApi`, `mappers.js` 444. sor) — csak a `WaitingList.jsx` felvételi űrlapja nem kéri be (csak `description`, `customerName`, `supplier`). Tehát a "megbeszéljük vele, hogy szólunk, hozza be" eset **90%-ban már megvan**, 4 hiányzó darab van csak:

1. A felvételi űrlapon nincs telefonszám-mező (pedig a backend már várja).
2. Nincs megkülönböztetve "alkatrészre várunk" vs. "ügyféllel megbeszéltük, hogy visszahívjuk" — a "Megrendelve" felirat furcsán hangzik egy sima megbeszélésre.
3. Amikor az ügyfél tényleg behozza a telefont, nincs gomb, ami egyenesen munkalapot nyitna a már rögzített adatokból — most újra be kellene gépelni mindent a `TicketFormModal`-ban.
4. Nincs jelzés, ha egy tétel már régóta "lóg" (elfelejtettétek visszahívni).

Mind a 4-et megoldjuk, a meglévő infrastruktúrára építve — nincs új tábla, nincs új menüpont.

## 1. Adatbázis — 2 új oszlop

```sql
alter table waiting_items add column kind text not null default 'alkatresz' check (kind in ('alkatresz','ugyfel_visszahivas'));
alter table waiting_items add column linked_ticket_id uuid references service_tickets(id);
```

A `kind` csak a megjelenítést/feliratokat finomítja (lásd 3. pont), a `linked_ticket_id` pedig — a már meglévő `linked_part_id`/`linked_product_id` mintájára — nyomon követi, melyik munkalap lett belőle, ha lett.

## 2. `WaitingList.jsx` — a felvételi űrlap bővítése

```jsx
const [kind, setKind] = useState("alkatresz");
const [customerPhone, setCustomerPhone] = useState("");
// ...
function submit() {
  if (!description.trim()) return;
  onAdd({ description: description.trim(), customerName: customerName.trim() || null, customerPhone: customerPhone.trim() || null, supplier: supplier.trim() || null, kind });
  setDescription(""); setCustomerName(""); setCustomerPhone(""); setSupplier(""); setKind("alkatresz"); setOpen(false);
}
```
Az űrlap tetején egy kis `.seg` váltó ("Alkatrész" / "Ügyfél-visszahívás") dönti el, melyik `kind`; `ugyfel_visszahivas` esetén a "Forrás" mező eltűnik (nem releváns), és a "Telefonszám" mező kötelezővé válik (hisz enélkül nincs mit visszahívni), míg `alkatresz` esetén marad opcionális, ahogy ma.

## 3. Kind-függő feliratok és hívás-gomb

```jsx
const STATUS_LABEL = {
  alkatresz: { megrendelve: "Megrendelve", megerkezett: "Megérkezett", ertesitve: "Értesítve", lezarva: "Lezárva" },
  ugyfel_visszahivas: { megrendelve: "Megbeszélve", megerkezett: "Készen áll", ertesitve: "Értesítve", lezarva: "Behozta" },
};
const NEXT_LABEL = {
  alkatresz: { megrendelve: "Megérkezett", megerkezett: "Értesítettük", ertesitve: "Átadva / lezárva" },
  ugyfel_visszahivas: { megrendelve: "Készen áll", megerkezett: "Felhívtuk", ertesitve: "Behozta" },
};
```
Minden soron, ha van `customerPhone`, egy hívás-ikon (a meglévő `CallLink` komponens, amit a `DetailPanel.jsx`/`SaleReceiptPanel.jsx` is már használ ügyfél-telefonszámnál) — egy koppintással hívható, amikor eljön az ideje szólni neki.

## 4. "Munkalap felvétele" — a konvertálás

Ez a legfontosabb hiányzó darab. A kódban **már van rá bevált minta**: a Szerviz árbecslő ("Szerviz árbecslő" fül, `repair_leads`) pontosan így alakul munkalappá — `App.jsx` 185. sor `repairLeadConvert` state, 2101-2108. sor a `TicketFormModal` `prefill` propja. Ugyanezt a mintát követve, egy párhuzamos `waitingConvert` state:

```js
// App.jsx
const [waitingConvert, setWaitingConvert] = useState(null); // waiting_item obj, amit munkalappá alakítunk

// ticket mentés után (a repairLeadConvert-hez hasonló ág):
if (waitingConvert) {
  await advanceWaiting(waitingConvert.id, "lezarva");
  unwrap(await supabase.from("waiting_items").update({ linked_ticket_id: newTicket.id }).eq("id", waitingConvert.id));
  setWaitingConvert(null);
}
```

`TicketFormModal` hívásnál a `prefill` bővül:
```jsx
prefill={!editingTicket && waitingConvert ? {
  customerName: waitingConvert.customerName,
  customerPhone: waitingConvert.customerPhone,
  extra: waitingConvert.description,
} : !editingTicket && repairLeadConvert ? { /* ...változatlan... */ } : undefined}
```

A `WaitingList.jsx` soraiban egy "Munkalap felvétele" gomb jelenik meg minden `kind: 'ugyfel_visszahivas'` tételen (bármelyik státuszban, nem csak "Értesítve"-nél — a valóságban néha az ügyfél magától is beugrik, mielőtt hívnátok), ami `setWaitingConvert(w)` + megnyitja a munkalap-felvevő modalt (`setTicketModal("add")`).

## 5. Elfelejtett visszahívás jelzése

A meglévő `isStaleReady()` mintáját követve (`utils.js` 53-56. sor, 90 napos munkalap-figyelmeztetéshez), egy hasonló, de rövidebb küszöbű jelző a várakozási listához:

```js
export const WAITING_STALE_DAYS = 14; // ha ennyi napja "megrendelve"/"megerkezett" állapotban áll, jelezzük
export function isStaleWaiting(w) {
  if (w.status === "ertesitve" || w.status === "lezarva") return false;
  return Math.floor((Date.now() - new Date(w.createdAt)) / 86400000) >= WAITING_STALE_DAYS;
}
```
A `WaitingList.jsx` sorban, ha `isStaleWaiting(w)`, egy kis piros pötty/keret jelzi ("14+ napja nincs mozgás — hívtad már?") — ugyanaz a vizuális nyelv, mint a munkalapok 90 napos jelzésénél, csak itt rövidebb a türelmi idő, mert egy "szólunk, hozza be" megbeszélés jellegéből adódóan gyorsabban avul el, mint egy alkatrész-rendelés.

## 6. Amit tisztázni kell

- **A 14 napos küszöb csak becslés** — ha nálatok tipikusan hosszabb/rövidebb az átfutás (pl. alkatrész-rendelésnél hetekig is várhattok jogosan), szólj, és a két `kind`-hoz külön küszöböt is adhatunk (pl. `ugyfel_visszahivas`-nál rövidebb, `alkatresz`-nél hosszabb).

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes, `waiting_items` migráció (2 új oszlop) lefut
- A Pult fülön a "Várakozás felvétele" űrlapon választható "Alkatrész"/"Ügyfél-visszahívás", utóbbinál telefonszám kötelező
- A listasorokon a feliratok a `kind` szerint helyesen változnak, hívás-ikon működik, ahol van telefonszám
- "Munkalap felvétele" gomb `ugyfel_visszahivas` tételen megnyitja az előre kitöltött munkalap-felvevőt, mentés után a várakozási tétel automatikusan "Lezárva"/"Behozta" lesz és összekötve a munkalappal
- 14+ napja mozdulatlan, még nyitott tételek vizuálisan jelezve vannak
- Nincs `git push`, csak lokális commit
