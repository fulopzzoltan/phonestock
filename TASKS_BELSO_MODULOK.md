# TASKS — Belső modulok a napi működéshez

Ez egy végrehajtható feladatlista a kódoló agentnek (Claude Code). Kontextus: a tulajdonos átnézette velem, mi segítene a mindennapi belső (nem ügyfél felé néző) munkában. Könyvelési export **nem kell** (külön rendszeren fut), alkatrész min/max **nem kell egyelőre** (kézzel döntik el). Ami kell: egy "Mai teendők" widget, egy "lassan mozgó készlet" riport, egy "napi zárás" modul — plusz egy navigáció-átrendezés.

**Ne pusholj / ne deployolj**, csak lokális commit, amíg nem szólnak. Minden pontot külön commit-ban vidd fel, ebben a sorrendben (0. elsőnek, mert a többi erre épít).

---

## 0. Navigáció átrendezés

**Fájl:** `src/components/Sidebar.jsx`

Jelenlegi csoportok: "Napi munka" (Szerviz, Telefonok, Alkatrészek, Bevételek & Kiadások, Kliensek, Garancia), "Egyéb" (Szabadság, Kuka), "Admin" (csak `isAdmin`: Áttekintés, Felvásárlás, Szerviz árbecslő, Felhasználók).

Kért változás:
- **Bevételek & Kiadások** kerüljön egy új **"Pénzügyek"** csoportba (ide kerül majd a 3. pontban leírt "Napi zárás" is).
- **Kuka** kerüljön az **"Admin"** csoportba.
- **Szabadság** kerüljön az **"Admin"** csoport mellé/köré vizuálisan.

**Fontos, döntést igénylő pont, mielőtt implementálod:** a "Kuka" mozgatása az Admin csoportba azzal jár, hogy a kód jelenlegi felépítése miatt (`{isAdmin && (...)}` blokk, 28–36. sor) **csak adminnak** lesz elérhető — jelenleg employee is látja/eléri. Ez valószínűleg szándékos és helyes szigorítás (végleges törlés admin-döntés kellene legyen), de a Szabadság-nál ugyanez **hibás lenne**: a szabadság-igénylés employee-funkció is (ők adják be a kérést, admin hagyja jóvá — ld. `TASKS_SZABADSAG.md`). Ha a Szabadság gombot is az `isAdmin`-blokkba teszed, az alkalmazottak elveszítik a szabadságkérés lehetőségét.

Megoldás: tedd a "Szabadság" gombot **az isAdmin-blokkon kívülre** (tehát employee is lássa továbbra is), de **kódban közvetlenül az Admin-blokk elé/mögé helyezve**, így vizuálisan egy csoportban jelenik meg az Admin szekcióval anélkül, hogy hozzáférést vonnál el. Az "Egyéb" `nav-lbl` felirat ezzel elfogyna — töröld, és ha kell egy admin usernek külön vizuális elválasztás a Szabadság és az Admin-lista között, hagyj egy kis extra `margin-top`-ot a következő gombon.

Új szerkezet nagyjából:

```jsx
<div className="nav-lbl">Napi munka</div>
{/* Szerviz, Telefonok, Alkatrészek, Kliensek, Garancia — Bevételek & Kiadások kikerül innen */}

<div className="nav-lbl">Pénzügyek</div>
<button ...>Bevételek &amp; Kiadások</button>
<button ...>Napi zárás</button> {/* ld. 3. pont, employee-nek is látszik */}

<button className={`navbtn ${tab === "leave" ? "active" : ""}`} ...>Szabadság</button> {/* itt marad employee-nek is, csak fizikailag ide, az Admin elé mozgatva */}

{isAdmin && (
  <>
    <div className="nav-lbl">Admin</div>
    <button ...>Áttekintés</button>
    <button ...>Felvásárlás</button>
    <button ...>Szerviz árbecslő</button>
    <button ...>Felhasználók</button>
    <button ...>Kuka</button> {/* ide kerül, mostantól admin-only */}
  </>
)}
```

---

## 1. "Mai teendők" widget a Dashboardon

**Cél:** most 3 helyen kellene körülnézni reggel (Garancia fül lejáró garanciákért, Szerviz kanban SLA-badge-ekért), ez legyen egy helyen.

**Adatforrás — mindkettő már létezik, csak nincs összegyűjtve:**
- SLA-s munkalapok: `src/lib/utils.js` `slaInfo(ticket)` (85–92. sor) — `level: "warn"` (ma/holnap jár le) vagy `"overdue"` (lejárt). Szűrd az `activeTickets`-et (App.jsx 907. sor) erre.
- Hamarosan lejáró garanciák: `activeWarranties` (App.jsx, a `warranties`/`transactions`/`tickets`-ből számolt lista) — a pontos "14 napon belül lejár" logika már megvan `src/tabs/WarrantyTab.jsx` 22–26. sorában (`expiringSoon`), ugyanezt a szűrést használd, csak listaként, ne csak számként.

**Fájl:** `src/App.jsx`

Adj hozzá egy új `useMemo`-t (az `activeTickets` és `activeWarranties` után):

```js
const todoItems = useMemo(() => {
  const slaTickets = activeTickets
    .map((t) => ({ ticket: t, sla: slaInfo(t) }))
    .filter((x) => x.sla && (x.sla.level === "warn" || x.sla.level === "overdue"))
    .sort((a, b) => a.sla.days - b.sla.days);
  const soonWarranties = activeWarranties.filter((w) => {
    if (!w.expiry) return false;
    const daysLeft = Math.ceil((new Date(w.expiry) - new Date(today())) / 86400000);
    return daysLeft <= 14 && daysLeft >= 0;
  }).sort((a, b) => (a.expiry || "").localeCompare(b.expiry || ""));
  return { slaTickets, soonWarranties };
}, [activeTickets, activeWarranties]);
```

Add át `DashboardTab`-nak új propként (a `<DashboardTab ... />` hívásban, App.jsx ~1086–1090. sor): `todoItems={todoItems} setDetailId={setDetailId} setWarrantyDetailKey={setWarrantyDetailKey} setTab={setTab}`.

**Fájl:** `src/tabs/DashboardTab.jsx`

Tegyél be egy új szekciót a legtetejére (a `topbar` alá, minden más elé — ez legyen az első dolog, amit admin reggel meglát):

- Cím: "Ma figyelni kell rá" vagy hasonló, csak akkor jelenjen meg, ha `todoItems.slaTickets.length + todoItems.soonWarranties.length > 0` (ha nincs semmi, ne foglaljon helyet — ne legyen "0 teendő" doboz, az zaj).
- Két kompakt lista egymás mellett (`display:grid;grid-template-columns:1fr 1fr` mintára, mint a `Alkatrészek`/`Kliensek` blokk lent): "Lejáró/lejárt munkalapok" (piros ha overdue, sárga ha warn — használd a meglévő `.sla-badge`/`.sla-warn`/`.sla-overdue` osztályokat) és "Hamarosan lejáró garanciák". Mindkét lista sora kattintható legyen és nyissa meg a megfelelő rekordot (`setDetailId(t.ticket.id)` ill. `setTab("warranty")` + `setWarrantyDetailKey(...)`).
- Ha üres, ne jelenjen meg a szekció (nincs szükség `EmptyState`-re itt, mert az "nincs teendő" maga jó hír, nem üres-állapot amit jelezni kell).
- Vizuálisan használd a design-egységesítés után bevezetett `.tag`/token-rendszert (`var(--warning)`, `var(--danger)`).

---

## 2. "Lassan mozgó készlet" riport

**Fontos felfedezés:** a `products` táblán már megvan a `date_added` (date) oszlop, **teljesen fel van töltve mind a 918 sorra**, de a frontend jelenleg **nem is olvassa be** — a `src/lib/mappers.js` `pFromApi`/`pToApi` (9–28. sor) nem tartalmazza. Ez egy gyors, kis munka nagy haszonnal.

**Fájl:** `src/lib/mappers.js`

- `pFromApi`-ba: `dateAdded: r.date_added,`
- `pToApi`-ba (ha van ilyen export a fájlban a termék mentéséhez — ha eddig nem küldte a frontend, most se kell hozzáadnod írásra, elég csak olvasni; ha van insert-oldali mapper, ott alapértelmezettként a mai dátumot állítsd be, ha üres).

**Fájl:** `src/tabs/StockTab.jsx`

- Adj hozzá egy szűrő/kiemelés opciót: azok a termékek, ahol `status === "in_stock"` és `dateAdded` 45+ napja van (`(Date.now() - new Date(product.dateAdded)) / 86400000 >= 45`). A lista/kártya nézetben ezeken jelenjen meg egy `.tag` jellegű, halványsárga "X napja a polcon" jelzés (a `warning` tokent használd).
- A fül fejlécében (a stat-sor mellé) tegyél egy kis számot/gombot: "Lassan mozgó: N db" — kattintásra szűrjön csak ezekre (hasonlóan, mint a meglévő `Új`/`Felújított` állapot-szűrők).

**Fájl:** `src/tabs/DashboardTab.jsx` (opcionális, de olcsó hozzáadni)

- A "📱 Telefonok" statcard-sor mellé/alá tehetsz egy kis figyelmeztető sort, ha van 45+ napos tétel: "N telefon 45+ napja mozdulatlan — érdemes átnézni az árazást." Csak akkor jelenjen meg, ha `N > 0`.

---

## 3. "Napi zárás" modul

**Cél:** két helyszín, több eladó — a nap végén legyen egy formális "zárás": rendszer-számolt bevétel (készpénz/kártya/utalás bontásban, a már létező `transactions.payment` mezőből) vs. ténylegesen megszámolt készpénz, és ez elmentve, dátumozva, aláírva (ki zárta).

### 3a. Új tábla

**Eszköz:** Supabase MCP `apply_migration` (NE `execute_sql`, ez DDL).

```sql
create table shift_closes (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id),
  close_date date not null,
  cash_expected numeric not null default 0,   -- rendszer által számolt készpénz bevétel - kiadás aznapra
  cash_counted numeric not null,               -- amit ténylegesen megszámoltak
  card_income numeric not null default 0,
  transfer_income numeric not null default 0,
  total_expense numeric not null default 0,
  note text,
  closed_by uuid references profiles(id),
  closed_at timestamptz not null default now(),
  unique(location_id, close_date)
);
alter table shift_closes enable row level security;
```

RLS policy-k a meglévő minta szerint (nézd meg pl. hogy a `transactions`-on hogy van megoldva employee-vs-admin-vs-location szűrés, és kövesd ugyanazt): admin mindent lát/ír, employee csak a saját `location_id`-jét, mindkettő tud `insert`/`update`-elni **csak a saját helyszínére és mai/közelmúltbeli dátumra** (ne engedj tetszőleges múltbeli zárás-átírást employee-nek — ha ez fontos kontrollpont, admin bármikor módosíthasson, employee csak aznap).

### 3b. Mapper

**Fájl:** `src/lib/mappers.js` — adj hozzá `shiftCloseFromApi`/`shiftCloseToApi`-t a meglévő minta szerint (ld. pl. `leaveRequestFromApi`, 221–225. sor).

### 3c. UI

**Fájl:** új `src/tabs/ShiftCloseTab.jsx` (a meglévő tab-fájlok mintájára, pl. `LeaveTab.jsx` szerkezete jó referencia: statcard-sor + form + lista lent).

- Fejléc: "Napi zárás", helyszín-választó (ha admin, a `locFilter`-ből; employee-nél fix a saját helyszíne, mint a többi fülön).
- A mai napra a rendszer előre kiszámolja és megjeleníti (nem szerkeszthető mező): `cash_expected` = a mai `transactions` összesített `amount`-ja `payment==='Készpénz'` szűrve, bevétel mínusz kiadás (a `FinanceTab.jsx`-ben már megvan a napi csoportosítás logikája — ugyanazt a `transactions`-szűrést használd, csak `payment`-re bontva is). Ugyanígy `card_income` (`payment==='Kártya'` bevétel) és `transfer_income` (`payment==='Átutalás'`).
- Egy input: "Készpénz a fiókban most" (`cash_counted`) — ezt számolja meg fizikailag valaki.
- Élő eltérés-kijelzés: `cash_counted - cash_expected`, zöld ha 0, piros ha nem (± pár Lei toleranciával, kerekítési hibák miatt, pl. `Math.abs(diff) <= 1` legyen "OK" zöld).
- "Zárás rögzítése" gomb — insert/upsert a `shift_closes`-ba (`closed_by` = aktuális user, `closed_at` = most). Ha aznapra már van zárás (a `unique(location_id, close_date)` miatt), a gomb módosítson felülírás helyett kérdezzen rá (`confirm`-mal, mint más helyeken a projektben, ld. `ConfirmDelete` minta).
- Lent egy lista a korábbi zárásokról (dátum, helyszín, eltérés — pirossal kiemelve ha nem 0, ki zárta) — táblázat-stílus, mint a többi fülön (`.tw`/`table`).

**Fájl:** `src/components/Sidebar.jsx` — nav gomb "Napi zárás" a "Pénzügyek" csoportba (ld. 0. pont), employee-nek is látható, mert ő zár a pultnál.

**Fájl:** `src/App.jsx` — kösd be az új tab-ot a többi minta szerint (state, fetch a `loadAllData`-ba, render-ág a tab-switch blokkban).

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- Employee bejelentkezve: látja a Szabadság-ot és a Napi zárás-t, NEM látja a Kuka-t
- Admin bejelentkezve: mindent lát, a Kuka az Admin csoport alatt van
- A Dashboard tetején megjelenik a "Ma figyelni kell rá" szekció, ha van lejáró/lejárt tétel, és eltűnik, ha nincs
- A Telefonok fülön látszik, melyik tétel van 45+ napja polcon
- Napi zárás: egy teszt-tranzakcióval (készpénz) ellenőrizd, hogy a `cash_expected` tényleg egyezik a Bevételek & Kiadások "Ma" bucket készpénz-összegével
- Nincs `git push`, csak lokális commit-ok, amíg nem szólnak
