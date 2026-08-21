# TASKS — Szerviz Kanban átdolgozása (letisztítás + drag&drop + gyors átadás)

A user pontos, kész specifikációt adott, ezt a jelenlegi kód (`src/tabs/ServiceTab.jsx`, `src/components/TicketCard.jsx`, `App.jsx` `setTicketStatus`) alapján pontosítom, hogy 1:1 implementálható legyen.

## 1. Felső sáv letisztítása — `ServiceTab.jsx`

Töröld a 21-29. sor `statrow` blokkját (KPI kártyák: Aktív munkák / Átvehető / Nem javítható / Kiadva / Saját készlet) **és** a 31-43. sor `statcard warn` blokkját ("Figyelmet igényel — 90+ napja nem átvett").

**Nem vész el infó**: a 90+ napos figyelmeztetés kártyánként külön is megjelenik már (`TicketCard.jsx` 29-33. sor, `isStaleReady(ticket)` alapján) — ez marad, csak az összesítő banner tűnik el a tetejéről.

A `svcStats` prop ezután nem lesz használva a fájlban — vedd ki a destructuringból (9-12. sor), és ha máshol sem kell, az `App.jsx` 1519. sorából (`svcStats={svcStats}`) is elhagyható, nem kötelező.

Keresőmező placeholder törlése (46. sor): `<input placeholder="Keresés vevő, márka, modell..." ...>` → `<input value={svcSearch} onChange={...} />`, placeholder attribútum nélkül.

## 2. Szűrőgombok átnevezése — `ServiceTab.jsx` 47-51. sor

```jsx
<div className="seg">
  <button type="button" className={svcKindFilter === "all" ? "active" : ""} onClick={() => setSvcKindFilter("all")}>Mind</button>
  <button type="button" className={svcKindFilter === "customer" ? "active" : ""} onClick={() => setSvcKindFilter("customer")}>Ügyfél</button>
  <button type="button" className={svcKindFilter === "own" ? "active" : ""} onClick={() => setSvcKindFilter("own")}>Saját</button>
</div>
```
Csak a felirat változik ("Csak ügyfél"→"Ügyfél", "Csak saját készlet"→"Saját"), a `svcKindFilter` értékek (`all`/`customer`/`own`) és a sorrend marad, semmi mást nem érint.

## 3. Drag & Drop + léptető nyilak

### a) Könyvtár
Natív HTML5 drag&drop helyett (ami touch-eszközön/tableten megbízhatatlan, és a boltban valószínűleg tableten/érintőképernyőn is használjátok) telepítsd a **`@dnd-kit/core`**-t (`npm install @dnd-kit/core`) — karbantartott, touch-barát, jól dokumentált.

### b) `ServiceTab.jsx` kanban-blokk (54-84. sor) átalakítása
- Csomagold a `.kanban` div-et `<DndContext onDragEnd={handleDragEnd}>`-be.
- Minden `k-col-body`-t tegyél `useDroppable`-lel droppable zónává (`id: col.key`).
- Minden `TicketCard`-ot csomagolj `useDraggable`-lel (`id: ticket.id`).
- `handleDragEnd(event)`: ha `event.over` létezik és `event.over.id !== ticket.status`, hívd `setTicketStatus(ticket.id, event.over.id, null)` — a `subStatus` szándékosan nullázódik, mert a régi alstátusz (pl. "Garanciális") az új oszlopban már nem értelmezhető, staff a `DetailPanel`-en tudja pontosítani, ha kell.
- **`setTicketStatus`-t fel kell venni a `ServiceTab` propjai közé** — jelenleg nincs átadva (`App.jsx` 1514-1520. sor), pótold: `setTicketStatus={setTicketStatus}` a JSX hívásban, és vedd fel a `ServiceTab` destructuringjába.

### c) Léptető nyilak a kártyán — `TicketCard.jsx`
Új prop: `onStep(ticketId, direction)` ("prev"/"next"). A kártya tetejére (`t-card-top` mellé vagy a lábléc mellé) kerüljön két kis ikon-gomb:
```jsx
{stepPrev && <button type="button" className="t-card-step prev" onClick={(e) => { e.stopPropagation(); onStep(ticket.id, "prev"); }} title="Előző státusz"><ChevronLeftIcon width={14} height={14} /></button>}
{stepNext && <button type="button" className="t-card-step next" onClick={(e) => { e.stopPropagation(); onStep(ticket.id, "next"); }} title="Következő státusz"><ChevronRightIcon width={14} height={14} /></button>}
```
**`e.stopPropagation()` kritikus** — a kártya `onClick`-je nyitja a `DetailPanel`-t, ez nélküle minden nyíl-kattintás véletlenül megnyitná a részletnézetet is.

`ServiceTab.jsx`-ben a Kanban-render résznél számítsd ki oszloponként az index alapján, hogy van-e előző/következő (`STATUSES` tömb sorrendje: Átvett → Javítás alatt → Minőségellenőrzés → Átadásra), és egy `handleStep(id, dir)` függvény hívja `setTicketStatus(id, STATUSES[newIndex].key, null)`-t — ugyanaz a logika, mint drag&dropnál, csak egy lépés balra/jobbra.

`ChevronLeftIcon`/`ChevronRightIcon` — ha nincs még ilyen a `src/components/icons.jsx`-ben, vedd fel (a meglévő `ChevronDownIcon` mintájára, elforgatva vagy külön path-tal).

## 4. "Átvehető" oszlop — összeg-feliratú lezáró gomb

A `TicketCard.jsx`-en, csak akkor jelenjen meg, ha `ticket.status === "Átadásra" && ticket.subStatus !== "Sikertelen"` (a lábléc közelébe, pl. a `t-footer` alá):

```jsx
{ticket.status === "Átadásra" && ticket.subStatus !== "Sikertelen" && (
  <button type="button" className="t-card-close-btn" onClick={(e) => { e.stopPropagation(); onClose(ticket.id); }}>
    {Number(ticket.price) > 0 ? money(ticket.price) : "Ingyenes átadás"}
  </button>
)}
```
Új prop: `onClose(ticketId)` → `ServiceTab.jsx`-ben ez hívja `setTicketStatus(ticket.id, "Átadásra", "Átadva")`-t — **ez a hívás már ma is létezik és mindent elvégez** (`App.jsx` 967-999. sor: beállítja a `date_out`-ot, felveszi a bevételt a Bevételek/Kiadásokba, garanciális saját-készlet esetén a kiadást is), tehát nincs új backend-logika, csak UI-bekötés. A gomb megnyomása után a kártya automatikusan eltűnik a Kanbanból, mert az `activeTickets` szűrő már ma is kizárja az `subStatus === "Átadva"` tételeket.

A "Sikertelen" kártyák (összecsukott szekció az Átvehető oszlopban) nem kapnak ilyen gombot — azoknak nincs "átadás", más a lezárási logikájuk, ez marad, ahogy ma van (DetailPanel-en keresztül).

## 5. CSS

Új osztályok a `src/index.css`-be: `.t-card-step` (kis kör alakú ikon-gomb, `prev`/`next` pozicionálással, `position: absolute` vagy flex-lábléc), `.t-card-close-btn` (teljes szélességű, kiemelt zöld gomb, hasonló mint a meglévő `.btn` stílus), és drag-közbeni vizuális visszajelzés (`@dnd-kit` `isDragging`/`isOver` állapotokhoz opacity/border-highlight a `.k-col-body`-n és a húzott kártyán).

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes, `@dnd-kit/core` bekerült a `package.json`-ba
- KPI-sor és a sárga figyelmeztető box eltűnt, a 90+ napos jelzés kártyánként megmaradt
- Keresőmezőben nincs előre beírt placeholder-szöveg
- Szűrőgombok: "Mind" / "Ügyfél" / "Saját"
- Kártya egérrel/érintéssel húzható oszlopok között, a húzás után a `service_tickets.status` frissül, `sub_status` nullázódik
- Nyíl-gombokkal egy kattintással léptethető a kártya szomszédos oszlopba, első oszlopnál nincs "előző", utolsónál nincs "következő" nyíl
- "Átvehető" oszlopban (a nem-Sikertelen kártyákon) a gomb az összeget mutatja, megnyomásra a munkalap átadásra kerül, bevétel felkerül, kártya eltűnik a Kanbanról
- Nincs `git push`, csak lokális commit
