# TASKS — Szerviz és csapat-chat hibajavítások

Ez egy végrehajtható feladatlista a kódoló agentnek (Claude Code). A tulajdonos több konkrét hibát/hiányosságot talált használat közben. Négy egymástól független csoportra bontva, mindegyiket külön commit(ok)ban vidd fel.

**Ne pusholj / ne deployolj**, csak lokális commit, amíg nem szólnak.

---

## 1. Csapat-chat hivatkozás-rendszer (`#` mention)

### Amit megnéztem — ez a gyökér-ok

**Fájl:** `src/components/TeamChatPanel.jsx`

- A `mentionQuery` regex jelenleg `/#(\d*)$/` (35. sor) — **kizárólag számjegyet fogad el** a `#` után. Emiatt a "SCS1023" vagy "scs1023" típusú kód beírására a rendszer szóra sem reagál, mert a betűket tartalmazó rész ki sem kerül a regex találatból.
- A munkalap-egyezés (`ticketMatches`, 44–47. sor) a nyers `t.ticketNo`-t hasonlítja (`String(t.ticketNo).startsWith(mentionQuery)`) — vagyis még ha be is írnád a puszta számot, a felhasználó szeme előtt sosem szereplő nyers sorszámot kellene ismernie, nem a mindenhol kiírt "SCS1023" kódot (`ticketCode()` függvény, `src/lib/utils.js` 54–58. sor).
- A termék-egyezés (`productMatches`, 48–51. sor) kizárólag **IMEI-re** szűr, a mindenhol látható "T123" kódra (`phoneCode()`) nem.
- **Alkatrészre, garanciára, ügyfélre jelenleg egyáltalán nincs egyezés-keresés.**
- A `internal_messages` tábla (Supabase) jelenleg csak `linked_ticket_id` és `linked_product_id` oszlopot ismer — alkatrészhez/garanciához/ügyfélhez nincs hova mentened a hivatkozást.

### 1a. DB migráció

**Eszköz:** Supabase MCP `apply_migration`.

```sql
alter table internal_messages
  add column linked_part_id uuid references parts(id),
  add column linked_customer_id uuid references customers(id),
  add column linked_warranty_id uuid references warranties(id);
```
Fontos döntés, amit itt hozz meg: a `warranties` tábla csak a **kézzel felvett** (nem ticket/eladás-eredetű) garanciákat tartalmazza — a legtöbb garancia a `service_tickets`/`transactions`-ból származik (ld. `activeWarranties` App.jsx-ben), azoknak nincs saját `warranties` sora. **Ne próbálj ezekhez mesterséges garancia-sort létrehozni** — ha valaki egy ilyen (ticket/eladás-eredetű) garanciára akar hivatkozni, hivatkozzon inkább magára a munkalapra/termékre (`linked_ticket_id`/`linked_product_id`), amin a garancia adatai amúgy is látszanak a részletpanelen. A `linked_warranty_id` csak a kézzel felvett garanciákhoz kell.

### 1b. Mapper

**Fájl:** `src/lib/mappers.js`, `internalMessageFromApi` (279–286. sor) — bővítsd:
```js
linkedPartId: r.linked_part_id,
linkedCustomerId: r.linked_customer_id,
linkedWarrantyId: r.linked_warranty_id,
```

### 1c. `useInternalChat.js` — a `send` függvény bővítése

**Fájl:** `src/lib/useInternalChat.js`, `send` (39–43. sor):
```js
const send = useCallback(async (body, linkedTicketId = null, linkedProductId = null, linkedPartId = null, linkedCustomerId = null, linkedWarrantyId = null) => {
  unwrap(await supabase.from("internal_messages").insert({
    sender_id: profile?.id, body,
    linked_ticket_id: linkedTicketId, linked_product_id: linkedProductId,
    linked_part_id: linkedPartId, linked_customer_id: linkedCustomerId, linked_warranty_id: linkedWarrantyId,
  }));
}, [profile?.id]);
```

### 1d. `TeamChatPanel.jsx` — a mention-keresés újraírása

- Bővítsd a propokat: `parts, customersTable, warranties, locName, onOpenPart, onOpenCustomer, onOpenWarranty` (a meglévő `tickets, stock, onOpenTicket, onOpenProduct` mellé).
- A regex cserélje `/#(\S*)$/`-re (nem-whitespace karakterek # után — ez már betűt és számot is elfogad, csak szóközzel áll meg; egyszavas ügyfélnév-kereséshez ez elég, többszavas név-keresés nem cél most).
- A találati logika legyen kis- és nagybetű-érzéketlen (`.toLowerCase()` mindkét oldalon), és a **látható kódokra** illeszkedjen elsősorban, ne a nyers adatbázis-mezőkre:
```js
const q = mentionQuery.toLowerCase();
const ticketMatches = tickets
  .filter((t) => ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))?.toLowerCase().includes(q) || String(t.ticketNo).startsWith(q))
  .slice(0, 5)
  .map((t) => ({ type: "ticket", id: t.id, label: `${ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))} — ${[t.brand, t.model].filter(Boolean).join(" ")}` }));
const productMatches = stock
  .filter((p) => phoneCode(p.productNo)?.toLowerCase().includes(q) || (p.imei || "").toLowerCase().includes(q) || [p.brand, p.model].join(" ").toLowerCase().includes(q))
  .slice(0, 5)
  .map((p) => ({ type: "product", id: p.id, label: `${phoneCode(p.productNo)} — ${[p.brand, p.model].filter(Boolean).join(" ")}` }));
const partMatches = parts
  .filter((pt) => partCode(pt.partNo)?.toLowerCase().includes(q) || (pt.name || "").toLowerCase().includes(q))
  .slice(0, 5)
  .map((pt) => ({ type: "part", id: pt.id, label: `${partCode(pt.partNo)} — ${pt.name}` }));
const customerMatches = customersTable
  .filter((c) => (c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q))
  .slice(0, 5)
  .map((c) => ({ type: "customer", id: c.id, label: `${c.name || "Névtelen"}${c.phone ? " — " + c.phone : ""}` }));
const warrantyMatches = warranties
  .filter((w) => (w.customerName || "").toLowerCase().includes(q) || (w.label || "").toLowerCase().includes(q))
  .slice(0, 5)
  .map((w) => ({ type: "warranty", id: w.id, label: `Garancia — ${w.customerName || "?"} (${w.label || "?"})` }));
```
(importáld `ticketCode, phoneCode, partCode`-ot a `../lib/utils`-ból.)
- `pickMention`/`submit`/a link-preview/chip renderelés bővüljön a 3 új típussal (`part`, `customer`, `warranty`) ugyanazzal a mintával, mint a `ticket`/`product` — ikonként `PartsIcon`, `CustomersIcon`, `WarrantyIcon` (már mind léteznek az `icons.jsx`-ben).
- A `submit()`-nál `onSend(body, link?.type==="ticket"?link.id:null, link?.type==="product"?link.id:null, link?.type==="part"?link.id:null, link?.type==="customer"?link.id:null, link?.type==="warranty"?link.id:null)`.
- A chip-renderelésnél (83–98. sor) hasonlóan 3 új ág `m.linkedPartId`/`m.linkedCustomerId`/`m.linkedWarrantyId`-ra.

### 1e. `App.jsx` bekötés

A `<TeamChatPanel>` hívásnál (1487–1497. sor körül) add hozzá: `parts={parts} customersTable={customersTable} warranties={warranties} locName={locName} onOpenPart={(id) => { setChatOpen(false); setPartDetailId(id); }} onOpenCustomer={(id) => { setChatOpen(false); setCustomerKey(id); }} onOpenWarranty={(id) => { setChatOpen(false); setTab("warranty"); /* nézd meg pontosan hogy nyit meg egy kézi garanciát a WarrantyDetailPanel — a warrantyDetailKey formátumát kövesd (ld. warranties.map kulcsok App.jsx-ben) */ }}`.

Ellenőrizd implementálás közben, hogy a `customerKey`/`setCustomerKey` pontosan mit vár (id-t vagy objektumot) — a `CustomerDetailPanel` meglévő megnyitásainál (`onEdit={(c) => { setCustomerKey(null); setCustomerModal(c); }}`) nézd meg a mintát, és kövesd azt.

---

## 2. Szerviz fül — statcard-feliratok pontosítása

**Fájl:** `src/tabs/ServiceTab.jsx` (21–24. sor)

```jsx
<div className="statcard accent"><div className="lbl">Aktív munkák</div><div className="val">{svcStats.inHouse}</div></div>
<div className="statcard"><div className="lbl">Átvehető (ügyfél)</div><div className="val" style={{ color: "#15803D" }}>{svcStats.kesz}</div></div>
<div className="statcard"><div className="lbl">Nem javítható (ügyfél)</div><div className="val" style={{ color: "#9D174D" }}>{svcStats.sikertelen}</div></div>
<div className="statcard"><div className="lbl">Kiadva (utolsó 7 munkanap)</div><div className="val">{svcStats.kiadvaRecent}</div></div>
```

**Egy pontosítás, amit tudnod kell, mielőtt átírod a feliratot:** a `kiadvaRecent` (App.jsx, `rollingBusinessWeekStart()` függvény, `src/lib/utils.js` 236–244. sor) **nem naptári 7 napot** számol, hanem 7 **munkanapot** (a vasárnapokat kihagyja) — tehát ha a 7 nap éppen egy vasárnapra esik, a tényleges naptári ablak 8 nap lehet. A tulajdonos "utolsó 7 nap" feliratot kért — ez technikailag pontatlan lenne a mögöttes logikához képest, ezért **"Kiadva (utolsó 7 munkanap)"** feliratot használj a fenti kódban, ne szó szerint "7 nap"-ot. Ha a tulajdonos ragaszkodik a szó szerinti "7 nap" felirathoz, akkor vagy a feliratot hagyd "7 nap"-nak és fogadd el a kis pontatlanságot, vagy váltsd a számítást valódi naptári 7 napra (`today()` mínusz 7 nap, vasárnap-kihagyás nélkül) — ez utóbbi esetén nézd meg, nem volt-e szándékos oka a vasárnap-kihagyásnak (pl. a bolt zárva van vasárnap, így az "elmúlt hét" heti ritmust ad vissza, nem sima 7 napot).

---

## 3. Nyomtatási hibák: garancia mező üresen marad + 2 oldalas nyomtatás

### 3a. A tényleges hiba: a Garanciaidő mező feltétele hibás

**Fájl:** `src/components/PrintSlip.jsx` (38. sor)

```jsx
{row("Garanciaidő", !handedOver ? "—" : ticket.warranty ? `${ticket.warranty} (${active ? "érvényes" : "lejárt"} ${expiry}-ig)` : "Nincs")}
```

Itt `handedOver = ticket.subStatus === "Átadva"` (5. sor) — vagyis a Garanciaidő mező **csak akkor** mutat bármit, ha a munkalap sub-státusza pontosan "Átadva". Ha valaki a garanciát beállítja, de a nyomtatás pillanatában a munkalap még nem lett hivatalosan "Átadva"-ra állítva (pl. előbb nyomtat, utána kattint át), a mező üresen marad **annak ellenére, hogy `ticket.warranty` ki van töltve** — ez pontosan az a hiba, amit találtál.

Javítás — mutassa a garanciát, ha van, függetlenül a `handedOver`-től, és csak a lejárat-dátum számításához használja a `dateOut`-ot (ha az még nincs meg, csak magát az időtartamot írja ki dátum nélkül):
```jsx
const expiry = ticket.dateOut ? warrantyExpiry(ticket.dateOut, ticket.warranty) : null;
const active = ticket.dateOut ? isWarrantyActive(ticket.dateOut, ticket.warranty) : true;
...
{row("Garanciaidő", ticket.warranty ? (expiry ? `${ticket.warranty} (${active ? "érvényes" : "lejárt"} ${expiry}-ig)` : ticket.warranty) : "Nincs")}
```

### 3b. Egy oldalas nyomtatás

**Fájl:** `src/index.css`, a `@media print` blokk (289–293. sor körül)

Jelenleg nincs `@page` méret/margó szabály, és a `PrintSlip.jsx`/`PrintWarrantySlip.jsx` (30px/36px belső padding + 13px táblázat + a teljes `SERVICE_WARRANTY_TERMS`/`SALE_WARRANTY_TERMS` szöveg 10.5px/1.6 sorközzel) együttesen az A4 lap alján épp csak beleférnek — egy kicsit hosszabb ügyfélnév/probléma-lista már 2. oldalra tolja. Tennivaló:
```css
@media print{
  @page{ size: A4; margin: 8mm; }
  body *{visibility:hidden}
  #print-slip-root,#print-slip-root *{visibility:visible}
  #print-slip-root{display:block;position:fixed;inset:0;background:#fff}
}
```
Emellett a `PrintSlip.jsx` és `PrintWarrantySlip.jsx` belső paddingját (`padding: "30px 36px"`) csökkentsd kb. `"18px 24px"`-re, a záró garanciaszöveg blokk betűméretét 10.5px-ről 9.5px-re, sorközét 1.6-ról 1.45-re — teszteld nyomtatási előnézetben (Chrome "Print preview"), hogy egy valós, hosszabb probléma-listás tétellel is egy oldalon maradjon.

---

## 4. 90+ napja átvehető, de át nem vett munkalapok jelzése

### Amit megnéztem — hiányzik hozzá egy időbélyeg

A `service_tickets` táblán **nincs olyan mező, ami rögzítené, mikor vált egy munkalap "Átvehető"-vé** — a `date_out` csak akkor íródik, amikor ténylegesen "Átadva"-ra vált (ld. `setTicketStatus`, App.jsx). Emiatt jelenleg nem lehet pontosan kiszámolni, hogy egy még át nem vett, de már kész telefon mióta várja a vevőt. Ezt kell először pótolni.

### 4a. DB migráció

```sql
alter table service_tickets add column ready_at timestamptz;
-- Backfill: a jelenleg is "Átvehető" állapotban lévő, még át nem adott munkalapoknál
-- nincs valódi történeti adat arra, mikor váltak késszé — a migráció pillanatát
-- állítjuk be kezdőértéknek (ez alábecsli a tényleges várakozást, de ez az egyetlen
-- becsületes kiindulópont hamisítás nélkül; mostantól pontos lesz).
update service_tickets set ready_at = now()
where status = 'Átadásra' and sub_status is null and deleted_at is null;
```

### 4b. `setTicketStatus` — a `ready_at` írása

**Fájl:** `src/App.jsx`, `setTicketStatus` (kb. 716–735. sor, a `becameReady` változó környékén)

A már meglévő `becameReady` feltétel pontosan azt a pillanatot azonosítja, amikor ez kellene — ne találj ki új logikát, ugyanazt a feltételt használd a `patch`-hez is:
```js
if (subStatus === "Átadva") patch.date_out = today();
if (status === "Átadásra" && subStatus === null) patch.ready_at = new Date().toISOString();
```
(A második sor akkor is lefut, ha valaki visszalép "Átvehető"-be egy korábbi "Sikertelen"-ből vagy "Átadva"-ból — ez helyes, mert onnantól számítva megint várja az átvételt.)

Vedd fel a `readyAt`/`ready_at` mezőt a `tFromApi`/`tToApi` mapperekbe (`src/lib/mappers.js`) is.

### 4c. Megjelenítés

**Fájl:** `src/tabs/ServiceTab.jsx` (a kanban "Átvehető" oszlopában) és/vagy `src/components/TicketCard.jsx`

Azoknál a kártyáknál, ahol `ticket.status === "Átadásra" && !ticket.subStatus && ticket.readyAt`, és `(ma − readyAt) >= 90 nap`, tegyél egy jól látható jelzést — a design-rendszer `.tag`/`var(--danger-soft)`/`var(--danger-ink)` tokenjeivel, pl. "90+ napja várja az átvételt". Opcionálisan egy összesítő számot a fül fejlécén ("Régóta várakozó: N db") a design-egységesítésnél bevezetett minta szerint (ld. a Telefonok fülön a "45+ napja mozdulatlan" jelzést, ugyanaz a vizuális nyelv).

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- Chat: írj be `#scs` (kisbetűvel) egy létező munkalap kódjának eleje — felajánlja, kiválasztva a chip megjelenik, elküldve a másik fél látja és rá tud kattintani
- Chat: ugyanígy próbáld ki `#a` (alkatrész-kód), egy ügyfél nevének eleje, és egy kézzel felvett garancia ügyfélnevének eleje
- Szerviz fül: a 4 statcard felirat a kért szöveget mutatja
- Nyomtass ki egy munkalapot úgy, hogy a garancia mezője ki van töltve, de a munkalap MÉG NEM "Átadva" — a Garanciaidő sor mutatja az értéket, nem "—"-t
- Ugyanez a nyomtatás egy oldalon fér el (teszteld egy hosszabb, több problémás tétellel is)
- Állíts egy munkalapot "Átvehető"-re, nézd meg hogy `ready_at` beíródik; 90+ napos teszt-adattal (vagy a `date_added`/`ready_at` érték kézi visszaírásával tesztadatban) ellenőrizd, hogy megjelenik a figyelmeztetés
- Nincs `git push`, csak lokális commit
