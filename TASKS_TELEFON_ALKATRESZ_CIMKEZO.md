# TASKS — Vizuális alkatrész-címkézés saját készletes munkalapon

Ez egy végrehajtható feladatlista a kódoló agentnek (Claude Code). Kontextus: a tulajdonos egy vizuális ötletet vetett fel — amikor egy saját telefont javítunk/készítünk elő eladásra és több alkatrész is kell bele (pl. hátlap + kijelző + akku), szeretné egy telefon-rajzon, pöttyökre kattintva megjelölni melyik kellett, beírni az árát, és a végén látni a teljes beszerzési árat (alap ár + alkatrészek összege). Csináltam hozzá egy interaktív mockupot, a tulajdonos jóváhagyta az irányt.

**Ne pusholj / ne deployolj**, csak lokális commit, amíg nem szólnak.

---

## Amit már megnéztem — ez a jó hír: nincs szükség új adatmodellre

A háttér-logika **már most is pontosan ezt csinálja**, csak a felület nem vizuális:

- `src/App.jsx` `addPartToTicket(ticketId, part, qty)` (kb. 796–820. sor): amikor egy munkalaphoz alkatrészt adsz, (a) levonja a `parts` raktárból, (b) hozzáadja a munkalap `mat_cost`-jához, (c) **ha `ticket.ticketKind === "Saját készlet - előkészítés"` és van `ticket.productId`, akkor a linkelt `products` sor `cost_price`-át is élőben megnöveli ugyanazzal az összeggel** (808–815. sor). Ez szó szerint az "alap ár + 80 (akku) + 20 (hátlap) + 100 (kijelző) = 300 Lei beszerzési ár" logika, már működik.
- `removePartFromTicket` (821–835. sor) a fordítottja — jó lenne, ha ezt is szimmetrikusan kezelné a `cost_price`-ra (jelenleg **nem** vonja vissza a terméken, ld. 5. pont, ezt is javítsd ki menet közben, ha már itt vagy).
- `TicketFormModal.jsx` (69–108. sor): "Saját készlet — előkészítés eladás előtt" munkalap létrehozásakor **kötelező** egy meglévő `products` sort választani (`productId`) — tehát a telefon már ott van a Telefonok listában, a munkalap csak az előkészítés állapotát követi.
- A jelenlegi alkatrész-hozzáadás felület `src/components/DetailPanel.jsx` "Felhasznált alkatrészek" szekciójában van (113–142. sor): egy sima legördülő + darabszám + OK gomb, `onAddPart`/`onRemovePart` propokon keresztül hívja a fentieket.

**Vagyis a feladat kizárólag ennek a szekciónak a felület-cseréje** `ticket.ticketKind === "Saját készlet - előkészítés"` esetén — minden más ticket-típusnál (Ügyfél, Saját készlet - garanciális) a jelenlegi dropdown marad változatlanul, mert ott nincs "beszerzési ár épül" jelentése.

---

## 1. Két új alkatrész-kategória

**Fájl:** `src/lib/utils.js`

Jelenleg `PART_CATEGORIES = ["Kijelző", "Akkumulátor"]`. Bővítsd:

```js
export const PART_CATEGORIES = ["Kijelző", "Akkumulátor", "Hátlap", "Csatlakozó"];
```

Ellenőrizd, hogy a `PartModal.jsx` kategória-legördülője ebből olvas (valószínűleg igen) — ha igen, ott automatikusan megjelenik a két új opció, nincs más teendő.

---

## 2. Új komponens: a vizuális telefon-picker

**Fájl:** új `src/components/PhonePartsPicker.jsx`

Ez a Claude által mutatott interaktív mockup logikáját ülteti át valós adatra. Props: `usedParts` (a ticket már hozzáadott alkatrészei, `ticket.usedParts`), `availableParts` (a `parts` raktárból, csak `quantity > 0`), `onAdd(part, qty)`, `onRemove(usedPart)`, `busy`.

- Ugyanaz a telefon-SVG + 4 pötty (Kijelző, Akkumulátor, Hátlap, Csatlakozó) mint a mockupban, ugyanazokkal a pozíciókkal és a `.pin`/`.pinlbl` stílusokkal — de a design-egységesítés óta bevezetett tokeneket használd (`var(--primary)` a `#1DB954` helyett, `var(--primary-dark)` a hoverhez), ne hardcode-olt hex-eket.
- Minden pötty állapota a `usedParts`-ból származzon: egy pötty akkor "active" (zöld, kitöltött), ha `usedParts`-ban van olyan tétel, aminek a `partName`/kapcsolódó `part.category` egyezik a pötty kategóriájával (Kijelző→"Kijelző", Akkumulátor→"Akkumulátor"; Hátlap/Csatlakozó→"Hátlap"/"Csatlakozó" az 1. pontban bővített kategóriákkal).
- Pöttyre kattintva **ne egy szám-inputot** nyisson meg (mint a mockup, mert az kitalált árat engedne), hanem a **már meglévő valós raktár-választót**: egy kis inline panel jelenjen meg a pötty alatt, `availableParts.filter(p => p.category === <a pötty kategóriája>)` szűkítve (ha Hátlap/Csatlakozó-nál nincs találat, essen vissza a teljes listára), + darabszám input + "Hozzáadás" gomb — ugyanaz a minta, mint a jelenlegi `DetailPanel.jsx` 124–138. sorában lévő `showAddPart` blokk, csak pötty-eredetű, előszűrt select-tel.
- Ha egy kategóriához már van hozzáadva alkatrész, a pötty alatti feliratban jelenjen meg az ár is (pl. "Kijelző — 100 Lei"), és egy kis × gomb a pötty mellett hívja az `onRemove`-ot.
- A komponens alján (vagy a `DetailPanel` hívja ezt kívülről) jelenjen meg egy összegző sor: "Alkatrészek összesen: X Lei" — ez már számolható a `usedParts`-ból (`sum(costPrice * quantity)`), nem kell hozzá új state.

---

## 3. `DetailPanel.jsx` — feltételes beültetés

**Fájl:** `src/components/DetailPanel.jsx`

- A "Felhasznált alkatrészek" `dp-section`-t (113–142. sor) alakítsd feltételessé:
```jsx
{ticket.ticketKind === "Saját készlet - előkészítés" ? (
  <PhonePartsPicker
    usedParts={usedParts}
    availableParts={availableParts}
    onAdd={(part, qty) => onAddPart(ticket.id, part, qty)}
    onRemove={(sp) => onRemovePart(ticket.id, sp)}
    busy={busy}
  />
) : (
  /* a jelenlegi dropdown-os blokk változatlanul marad ide */
)}
```
- Importáld a `PhonePartsPicker`-t a fájl tetején.

---

## 4. Élő "Beszerzési ár" a Pénzügyek szekcióban

**Fájl:** `src/components/DetailPanel.jsx`, "Pénzügyek" szekció (143–148. sor körül) + `src/App.jsx` a `<DetailPanel>` hívásnál (kb. 1296–1310. sor)

- A `DetailPanel` jelenleg nem kapja meg a `products` listát — vedd fel egy `stock` propot (`stock={stock}`, App.jsx-ben már létező state, ugyanaz, amit a `ProductDetailPanel`-nek is átadsz máshol).
- `ticket.ticketKind === "Saját készlet - előkészítés"` esetén a Pénzügyek szekcióba tegyél egy extra sort a linkelt termék aktuális beszerzési árával:
```jsx
{ticket.ticketKind === "Saját készlet - előkészítés" && ticket.productId && (
  <Row k="Telefon beszerzési ára most" v={<span style={{ fontWeight: 700 }}>{money(stock.find((p) => p.id === ticket.productId)?.costPrice)}</span>} />
)}
```
Ez adja meg élőben azt az érzést, amit a tulajdonos kért: "a végén látom, hogy 100+80+20+100 = 300 Lei lett a beszerzési ár."

---

## 5. Javítás: `removePartFromTicket` jelenleg nem vonja vissza a termék `cost_price`-át

**Fájl:** `src/App.jsx`, `removePartFromTicket` (821–835. sor körül)

Jelenleg csak a `parts` raktárt és a munkalap `mat_cost`-ját állítja vissza, a linkelt `products.cost_price`-ot nem — emiatt ha tévedésből hozzáadsz egy alkatrészt majd törlöd, a telefon beszerzési ára tévesen magasabb marad. Tükrözd az `addPartToTicket`-ben lévő logikát (808–815. sor), csak kivonással:

```js
if (ticket.ticketKind === "Saját készlet - előkészítés" && ticket.productId) {
  const product = stock.find((p) => p.id === ticket.productId);
  if (product) {
    const newCostPrice = Math.max(0, (Number(product.costPrice) || 0) - (Number(usedPart.costPrice) || 0) * usedPart.quantity);
    unwrap(await supabase.from("products").update({ cost_price: newCostPrice }).eq("id", ticket.productId));
    setStock(stock.map((p) => (p.id === ticket.productId ? { ...p, costPrice: newCostPrice } : p)));
  }
}
```

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- Nyiss egy "Saját készlet — előkészítés" munkalapot: a dropdown helyett a telefon-pöttyös felület jelenik meg
- Adj hozzá 2-3 alkatrészt különböző pöttyökön keresztül — a Telefonok fülön ugyanannál a terméknél a beszerzési ár élőben nő
- Vedd le az egyiket — a beszerzési ár csökken vissza (ez az 5. pont teszteli)
- Egy sima ügyfél-munkalapon (`ticketKind === "Ügyfél"`) minden a régi módon működik, nincs telefon-pötty
- Nincs `git push`, csak lokális commit
