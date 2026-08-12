# TASKS — Saját készlet szervizelése a meglévő Szerviz-kanbanon belül

**Kontextus:** kétféle eset, amikor nem ügyfél, hanem a bolt saját raktári telefonján dolgoztok:
1. **Előkészítés eladás előtt** (pl. FRP-oldás, akku/csatlakozó csere egy felújítottnak szánt darabon) — az alkatrészköltségnek be kell épülnie a telefon bekerülési árába (`products.cost_price`).
2. **Garanciális visszahozás** (egy már eladott saját darab jön vissza hibával) — ez nem bekerülési ár-kérdés (a telefon már el van adva), hanem valós **kiadás**, amit eddig sehol nem láttatok.

Mindkettő ugyanazt a munkafolyamatot igényli, mint a normál ügyfél-szerviz (kanban, QC-lépés, alkatrész-felhasználás) — ezért **nem külön modult** építünk, hanem kibővítjük a meglévő `service_tickets`-et egy `ticket_kind` mezővel, és a kanbanon belül **vizuálisan enyhén elkülönítjük** a saját készletes kártyákat, hogy első pillantásra lásd, melyik melyik, anélkül hogy külön nézetre kellene váltani.

Külön commit-onként, **ne pusholj / ne deployolj**, amíg nem szólnak.

---

## 1. DB migráció

```sql
alter table public.service_tickets
  add column ticket_kind text not null default 'Ügyfél'
    check (ticket_kind in ('Ügyfél', 'Saját készlet - előkészítés', 'Saját készlet - garanciális')),
  add column product_id uuid references public.products(id);
```

`product_id` nullable marad ügyfél-munkalapoknál, kötelezően kitöltött a két saját-készletes fajtánál (kliens oldalon validáld).

---

## 2. Bekerülési ár automatikus növelése (előkészítés esetén)

**Fájl:** `src/App.jsx`, `addPartToTicket` függvény (kb. 447–461. sor). A meglévő logika a `service_tickets.mat_cost`-ot növeli minden alkatrész-felhasználásnál — egészítsd ki:

```js
async function addPartToTicket(ticketId, part, qty) {
  await withBusy(async () => {
    const ticket = tickets.find((t) => t.id === ticketId);
    const unitCost = Number(part.costPrice) || 0;
    const r = unwrap(await supabase.from("service_parts").insert({
      service_ticket_id: ticketId, part_id: part.id, part_name: part.name, quantity: qty, cost_price: unitCost,
    }).select());
    const newQty = (Number(part.quantity) || 0) - qty;
    unwrap(await supabase.from("parts").update({ quantity: newQty }).eq("id", part.id));
    const newMatCost = (Number(ticket.matCost) || 0) + unitCost * qty;
    unwrap(await supabase.from("service_tickets").update({ mat_cost: newMatCost }).eq("id", ticketId));

    // ÚJ: ha ez egy saját-készletes ELŐKÉSZÍTÉS munkalap, a telefon bekerülési ára is nő
    if (ticket.ticketKind === "Saját készlet - előkészítés" && ticket.productId) {
      const product = stock.find((p) => p.id === ticket.productId);
      if (product) {
        const newCostPrice = (Number(product.costPrice) || 0) + unitCost * qty;
        unwrap(await supabase.from("products").update({ cost_price: newCostPrice }).eq("id", ticket.productId));
        setStock(stock.map((p) => (p.id === ticket.productId ? { ...p, costPrice: newCostPrice } : p)));
      }
    }

    setParts(parts.map((p) => (p.id === part.id ? { ...p, quantity: newQty } : p)));
    setTickets(tickets.map((t) => (t.id === ticketId ? { ...t, matCost: newMatCost, usedParts: [...(t.usedParts || []), spFromApi(r[0])] } : t)));
  });
}
```

(`ticket.ticketKind`/`ticket.productId` — bővítsd a `tFromApi`/`tToApi` mappereket a `src/lib/mappers.js`-ben az új mezőkkel.)

---

## 3. Kiadás-tranzakció garanciális visszahozásnál

**Fájl:** `src/App.jsx`, `setTicketStatus` (kb. 400–430. sor). A meglévő kód "Átadva"-nál csak akkor csinál bevétel-tranzakciót, ha `ticket.price > 0` — ez saját-készletes tételeknél amúgy is 0 lesz, tehát nem fut le, jó. Adj hozzá egy új ágat, ami garanciális visszahozásnál kiadást rögzít a felhasznált anyagköltségről:

```js
if (subStatus === "Átadva" && ticket && ticket.subStatus !== "Átadva" && ticket.ticketKind === "Saját készlet - garanciális" && (Number(ticket.matCost) || 0) > 0) {
  const product = stock.find((p) => p.id === ticket.productId);
  const r = unwrap(await supabase.from("transactions").insert(txToApi({
    type: "expense",
    category: "Szerviz",
    description: `Garanciális javítás — ${product ? `${product.brand} ${product.model}` : [ticket.brand, ticket.model].filter(Boolean).join(" ")}`,
    amount: ticket.matCost,
    productId: ticket.productId,
  }, ticket.locationId)).select());
  setTransactions((prev) => [txFromApi(r[0]), ...prev]);
}
```

---

## 4. `TicketFormModal.jsx` — "Kinek?" választó

**Fájl:** `src/components/TicketFormModal.jsx`. Adj egy mezőt a form tetejére (a Helyszín/Státusz sor fölé):

```jsx
<div className="field">
  <label>Kinek?</label>
  <select value={f.ticketKind} onChange={(e) => setF({ ...f, ticketKind: e.target.value, customerName: e.target.value === "Ügyfél" ? f.customerName : "Saját készlet" })}>
    <option value="Ügyfél">Ügyfél</option>
    <option value="Saját készlet - előkészítés">Saját készlet — előkészítés eladás előtt</option>
    <option value="Saját készlet - garanciális">Saját készlet — garanciális visszahozás</option>
  </select>
</div>
```

Ha `ticketKind !== "Ügyfél"`:
- rejtsd a "Kliens neve"/"Telefonszám" mezőket, helyettük egy **termékkereső** jelenjen meg (`stock` tömbből, IMEI/márka/modell szerint kereshető, egy kártyás lista, mint más termékválasztók a projektben), ami a `productId`-t állítja be. Kiválasztás után a márka/modell mezők automatikusan kitöltődnek a termékből (de maradjanak szerkeszthetők, ha eltér).
- a `valid` ellenőrzésbe vedd bele: ha nem "Ügyfél", akkor `productId` kötelező (customerName helyett).

---

## 5. Vizuális elkülönítés a kanbanon — enyhe, nem rikító

Ez a lényeg a mostani kérésedből: a kártyák **ugyanazon a kanbanon** maradnak (nem külön nézet), csak halkan elütnek egymástól.

**Fájl:** `src/index.css` — a meglévő `.t-card` szabály mellé (keresd meg, valószínűleg a `.t-card{...}` és a hozzá tartozó `.t-card-sla-*` szabályok közelében) adj hozzá két módosító osztályt. A projekt zöld-akcentusú, letisztult palettáját követve, de a meglévő `st-*` státusz-színektől (sárga/narancs/zöld/lila) tudatosan eltérő tónusokat választva, hogy ne keveredjen a jelentésük:

```css
/* Saját készlet — előkészítés: semleges, "belső munka" hangulat, nem figyelmeztető */
.t-card-kind-prep { background: #F8FAFC; border-left: 3px solid #64748B; }
.t-card-kind-prep .t-kind-pill { background: #F1F5F9; color: #475569; }

/* Saját készlet — garanciális visszahozás: halk jelzés, hogy ez egy "vissza kellett hozni" eset, érdemes odafigyelni rá */
.t-card-kind-warranty { background: #FDF2F8; border-left: 3px solid #DB2777; }
.t-card-kind-warranty .t-kind-pill { background: #FCE7F3; color: #BE185D; }

.t-kind-pill { display: inline-flex; align-items: center; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; margin-bottom: 4px; }
```

**Fájl:** `src/components/TicketCard.jsx` — a gyökér `div` osztályát egészítsd ki:
```jsx
const kindCls = ticket.ticketKind === "Saját készlet - előkészítés" ? " t-card-kind-prep"
  : ticket.ticketKind === "Saját készlet - garanciális" ? " t-card-kind-warranty" : "";
```
```jsx
<div className={`t-card${kindCls}${sla && sla.level !== "ok" ? ` t-card-sla-${sla.level}` : ""}`} onClick={() => onOpen(ticket.id)}>
```
és a kártya tetejére (a `#ticketNo` sor alá) tegyél egy kis pill-t, ha nem "Ügyfél":
```jsx
{ticket.ticketKind !== "Ügyfél" && (
  <span className="t-kind-pill">{ticket.ticketKind === "Saját készlet - előkészítés" ? "🔧 Saját — előkészítés" : "↩️ Saját — garanciális"}</span>
)}
```
Az ügyfél-név helyén (26. sor, `<div className="t-name">{ticket.customerName}</div>`) saját-készletes tételnél a termék neve jelenjen meg a customerName helyett (ami már úgyis "Saját készlet" placeholder lesz a 4. pont szerint) — ez már megoldott, mivel a mező tartalma automatikusan a termékadatra változik.

---

## 6. Kanban szűrő + statisztika-elkülönítés

**Fájl:** `src/App.jsx`, a Szerviz tab tetején (a keresősáv mellé) tegyél egy kis szűrő-chip sort: **Mind / Csak ügyfél / Csak saját készlet** (hasonló mintával, mint a `period` szegmens-váltó a Bevételek tabon). Alapértelmezett: "Mind" (látszik minden, csak vizuálisan elkülönítve — ez volt a kérésed), de legyen könnyen szűkíthető.

A Dashboard `svcStats`-ban (App.jsx, a `useMemo` a szerviz-számokhoz) az **Aktív / Kész / Sikertelen** mutatókat alapból csak `ticket.ticketKind === "Ügyfél"` tételekre számold — ezek ügyfél-élményt mérő KPI-k, ne torzítsa őket a saját-készletes belső munka. Tegyél mellé egy kis, külön statcard-ot: "Saját készlet szervizben: N db" (a nem-Ügyfél, nem-lezárt tételek száma).

---

## Ellenőrzőlista implementálás után

- Új munkalap felvehető mindhárom "Kinek?" típussal, saját-készletesnél a termékkereső működik és kitölti a `productId`-t
- Alkatrész hozzáadásakor **előkészítés**-típusú munkalapon a kapcsolódó `products.cost_price` ténylegesen nő az alkatrész beszerzési árával — nézd meg a Telefonok tabon, hogy a szám tényleg frissül
- **Garanciális**-típusú munkalap "Átadva"-ra zárásakor létrejön egy kiadás-tranzakció a Bevételek & Kiadások közt, helyes összeggel
- A kanbanon a három típus vizuálisan megkülönböztethető (halvány háttér + bal szegély + kis pill), de nem rikító, nem törli el a meglévő SLA-piros/sárga jelzéseket
- Az "Ügyfél"-only Dashboard-mutatók (Aktív/Kész/Sikertelen) nem tartalmazzák a saját-készletes tételeket
- SMS nem megy ki saját-készletes munkalapoknál (ellenőrizd, hogy tényleg üres a `customerPhone`)
- RLS/jogosultság: a termékkereső csak a saját helyszín (vagy admin esetén mindkettő) készletéből enged választani, ugyanúgy mint máshol a projektben
