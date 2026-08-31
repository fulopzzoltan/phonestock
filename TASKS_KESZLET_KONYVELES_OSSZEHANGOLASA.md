# TASKS — Alkatrész / Telefon / Szerviz / Bevétel-Kiadás összehangolása

Kérés: "erzek egy kis osszevisszasagot abban hogy az alkatreszeknel van a rendeles pdfbol holott, lehet hogy telefon is tud igy erkezni, illetve meg nehany ilyen illogikatlansagot a szerviz, telefon, alakatresz es bevetel kiadaso kozotti kapcsolatban, kitudnad nekem dolgozni hogy ez az egyuttmukodes hogyan lenne smoothabb?" + kiegészítés: "amikor egy alkatresz fel lett hasznalva az nem a torold alkatreszek koze kerul hanem a felhasznalt alkatreszek koze és ott visszakövethető legyen egy ideig, főleg a garancia idejéig, hogy milyen alkatrészt honnan vettük — pl. egy akku honnan jött, tudjuk hogy abba a telefonba azt tettük, és tudjuk hova küldjük vissza."

## 0. Amit a kódban ténylegesen találtam — két konkrét könyvelési hiba

Ez nem csak "érzés" — végigkövettem a pénzmozgást a `products` (Telefonok), `parts` (Alkatrészek), `service_parts` (munkalapra felhasznált alkatrészek) és `transactions` (Bevételek/Kiadások) táblák között, mind a három felviteli úton (PDF-import, gyors-kiadás kosár, sima "+ Új" gomb), és két valós, ellentétes irányú hibát találtam.

### 0.1 Alkatrész sima felvétele → HIÁNYZÓ Kiadás

`App.jsx` `addPart()` (kb. 843. sor) **kizárólag** a `parts` táblába ír be egy `costPrice`-t — **soha nem hoz létre hozzá `transactions` sort**. Ez önmagában nem baj, ha valahol MÁSHOL mindig keletkezik a hozzá tartozó Kiadás — de nem mindig keletkezik:

- **PDF-import** (`importPdfOrder`, kb. 1431. sor): a ciklus **minden** sorra lefuttat egy `addTransaction({type:"expense", category:"Készlet", ...})`-t, `kind`-től függetlenül — tehát `"part"` típusú soroknál EZ adja a Kiadást, az `addPart()` maga nem.
- **Gyors-kiadás kosár** (`checkoutBasket`, kb. 1470. sor): szintén létrehozza a tranzakciót minden `items` elemre, utána nyitja meg a `PartModal`-t előtöltve — itt is a kosár adja a Kiadást.
- **Sima "+ Új alkatrész" gomb** (`PartsTab.jsx` 53. sor → `setPartModal("add")` → `onSave` → simán `addPart(data)`): **nincs semmilyen tranzakció-létrehozás ebben az útban.** Ha a pultos egy készpénzes vagy nem-PDF-es beszerzést (pl. egy helyi boltban vásárolt alkatrészt) így visz fel, a valós költség **soha nem jelenik meg** a Bevételek/Kiadásokban, csak az alkatrész `costPrice` mezőjén ül némán.

Ugyanaz a művelet (alkatrész-beszerzés) három különböző úton háromféle könyvelési eredményt ad — az egyik csendben kihagyja a Kiadást.

### 0.2 Telefon PDF-importból vagy gyors-kosárból → DUPLÁN könyvelt Kiadás

Ez a tükörképe. `StockModal.jsx` (39. sor) minden ÚJ termék felvitelénél `acqType` alapból `"purchase"` — és az `App.jsx` `addProduct()` (601-611. sor) logikája szerint `acquisitionType === "purchase"` esetén **mindig** `shouldPayoutNow = true`, ami **automatikusan létrehoz egy Kiadás-tranzakciót** (`"Felvásárlás: ..."`, `category: "Készlet"`, összeg = `costPrice`) — teljesen függetlenül attól, hogy honnan jött ide a felhasználó.

Ez a "Beszerzés típusa: Saját vásárlás / Bizomány" szekció valójában a **magánszemélytől való felvásárlásra** lett kitalálva (van hozzá "Eladó neve/telefonszáma" mező is) — de a kód nem tesz különbséget "magánszemélytől vásároltam most" és "egy nagyker-számláról már el lett könyvelve a költség" között. Emiatt:

- **PDF-import telefon-sor**: `importPdfOrder` már létrehozott rá egy Kiadást (ld. 0.1), UTÁNA megnyitja a `StockModal`-t előtöltve — ha a pultos elmenti (és miért ne mentené, ez a normál flow), az `addProduct` `acqType="purchase"` alapértelmezés miatt **megint** létrehoz egy Kiadást ugyanarra az összegre. **Duplán könyvelve.**
- **Gyors-kiadás kosár telefon-tétele**: ugyanez a minta — `checkoutBasket` már rögzítette a Kiadást, aztán a `StockModal` megnyitásakor MÉGEGYSZER rögzítődik mentéskor.

Ez pontosan ugyanabba a hibacsaládba tartozik, mint amit korábban a szerviz-átadásnál már egyszer kijavítottatok (`ff8bc5d` — "Szerviz átadás duplán írta fel a bevételt/hűségpontot, ha vissza-elore váltogatták a státuszt") — vagyis ez egy visszatérő mintázat: több helyen írjuk be a tranzakciót ad hoc módon, nincs egy közös szabály arról, hogy **melyik lépés felelős** a könyvelésért.

### 0.3 Ami viszont RENDBEN van

A szerviz ↔ alkatrész kapcsolat (`addPartToTicket`, 1625. sor) **nem** hoz létre tranzakciót — csak csökkenti a `parts.quantity`-t és növeli a munkalap `mat_cost`-ját (anyagköltség), ami csak akkor válik valódi bevétellé, amikor a munkalap "Átadva" lesz (ekkor a meglévő logika a teljes munkadíjat írja be egyszer). Ez logikus és nem kell hozzányúlni.

## 1. A javítás elve — egy közös szabály

**"A beszerzés-rögzítő függvény (`addProduct` / `addPart`) az EGYETLEN hely, ahol a beszerzési költség Kiadás-tranzakciója keletkezik. A hívó kontextus (PDF-import, gyors-kosár) soha nem hoz létre saját tranzakciót telefon/alkatrész tételekre — csak előtölti a modalt, és hagyja, hogy a mentés csinálja meg."**

Ez alól kivétel az, ami nem alkatrész/telefon (pl. PDF-en a szállítási díj, tok/tartozék sor) — azoknál marad a mai közvetlen `addTransaction` hívás, mert azokhoz nincs saját "beszerzés-modal".

### 1.1 `addPart()` bővítése — hogy a "+ Új alkatrész" is könyveljen

```js
async function addPart(data) {
  await withBusy(async () => {
    const r = unwrap(await supabase.from("parts").insert(partToApi(data)).select());
    setParts((prev) => [partFromApi(r[0]), ...prev]);
    setPartModal(null);
    const amount = (Number(data.costPrice) || 0) * (Number(data.quantity) || 0);
    if (amount > 0) {
      await addTransaction({
        type: "expense", category: "Készlet",
        description: `Alkatrész beszerzés: ${data.name}${data.source ? ` (${data.source})` : ""}`,
        amount, payment: "Készpénz", partId: r[0].id,
      }, defaultLocId /* vagy amit a PartModal kap paraméterként */);
    }
  });
}
```

`editPart()`-ban **nem** kell tranzakciót létrehozni még akkor sem, ha a mennyiséget felviszik szerkesztéskor — ez egy fontos nyitott kérdés, ld. 3. pont ("mi van, ha a meglévő alkatrészt csak utántöltik").

### 1.2 `importPdfOrder()` — a blanket tranzakció csak "expense" sorra fusson

```js
async function importPdfOrder(rows, supplier, payment, locId) {
  const basketId = rows.length > 1 ? crypto.randomUUID() : null;
  const phoneQueue = [];
  for (const row of rows) {
    if (row.kind === "part") {
      // addPart maga már létrehozza a tranzakciót (1.1) — itt NEM hívunk addTransaction-t.
      await addPart({ name: row.name, category: row.category, quantity: row.qty, costPrice: row.unitPrice, source: supplier, brand: "", modelFit: "", origin: "", supplierSku: "" });
    } else if (row.kind === "phone") {
      // A StockModal mentésekor az addProduct("purchase" acqType) hozza létre a tranzakciót — itt sem hívunk addTransaction-t.
      for (let i = 0; i < row.qty; i++) {
        phoneQueue.push({ model: row.name, costPrice: row.unitPrice, locationId: locId, source: "Számla" });
      }
    } else {
      // "expense" sorok (szállítás, tok stb.) — ezeknek nincs saját modaljuk, itt marad a közvetlen könyvelés.
      await addTransaction({ type: "expense", category: "Készlet", description: row.name, amount: row.lineTotal, costPrice: 0, payment, basketId }, locId);
    }
    if (row.waitingFor) {
      await addWaitingItem({ description: row.name, customerName: row.waitingFor, supplier, locationId: locId }, "megerkezett");
    }
  }
  setPdfImportModal(false);
  if (phoneQueue.length > 0) {
    setStockImportQueue(phoneQueue.slice(1));
    setStockModal({ model: phoneQueue[0].model, costPrice: phoneQueue[0].costPrice, locationId: phoneQueue[0].locationId, source: phoneQueue[0].source });
  }
}
```

### 1.3 `checkoutBasket()` — a `stockItem`/`partItem` tételeket ki kell hagyni a blanket ciklusból

```js
async function checkoutBasket(items, payment, locId) {
  const basketId = items.length > 1 ? crypto.randomUUID() : null;
  const stockItem = items.find((it) => it.stockKind === "Telefon");
  const partItem = items.find((it) => it.stockKind === "Alkatrész");
  for (const item of items) {
    if (item === stockItem || item === partItem) continue; // ezekhez a StockModal/PartModal mentése csinálja a tranzakciót
    await addTransaction({
      type: item.kind, description: item.label, amount: item.amount,
      costPrice: item.cost || 0, category: item.category, payment, basketId,
    }, locId);
  }
  if (stockItem) setStockModal({ costPrice: stockItem.amount, locationId: locId });
  if (partItem) setPartModal({ costPrice: partItem.amount, source: partItem.label });
}
```

Ez azt is jelenti, hogy a `PartModal`-nak / az `addPart`-nak tudnia kell a helyszínt (`locId`) is a tranzakcióhoz — jelenleg a `PartModal` nem kér helyszínt, mert az alkatrész-raktár helyszín-független (a `parts` táblán nincs `location_id`, a CLAUDE.md szerint szándékosan "közös raktár mindkét helyszínnek"). Ezt tisztázni kell: **melyik helyszínhez könyveljük a Kiadást**, ha az alkatrész maga nem helyszín-specifikus? Javaslat: a `PartModal`-ban (és a gyors-kosárban) legyen egy helyszín-választó **csak a könyveléshez**, alapértelmezetten az aktuálisan kiválasztott helyszín — ez már ma is megvan mintaként a `StockModal`-ban (`LocationField`).

## 2. Alkatrész-felhasználás nyomonkövethetősége — garanciális visszakereshetőség

### 2.1 A jelenlegi állapot — ami már megvan, és ami hiányzik

**Jó hír:** a "Felhasznált alkatrészek" nézet **már létezik** (`PartsTab.jsx` alján, `HistorySection`) — amikor egy alkatrészt felhasználsz egy munkalapon (`addPartToTicket`), az **nem törlődik és nem keveredik a törölt alkatrészekkel**: a `parts.quantity` csökken, de a sor megmarad (a `deletePart` egy teljesen külön, kézi művelet, `deleted_at` soft-delete-tel) — és a felhasználás egy `service_parts` sorként öröklődik, ami megjelenik ebben a külön "Felhasznált alkatrészek" listában (alkatrész neve, munkalap, vevő, mennyiség, ár, dátum).

**A hiányzó rész:** a `service_parts` tábla ma csak ezt tárolja: `service_ticket_id, part_id, part_name, quantity, cost_price`. **Nincs benne, hogy honnan jött az adott alkatrész** (`source`, `origin`, `supplier_sku`) — ezt csak a `parts` tábla JELENLEGI állapotából lehetne visszanézni a `part_id`-n keresztül. Ez a probléma: **ha az alkatrészt időközben utántöltötték** (pl. a "Akkumulátor iPhone 11" sor mennyiségét megint feltöltötték, most már egy MÁSIK beszállítótól, más áron), a `parts.source`/`costPrice` felülíródik az új beszerzés adataival (`editPart` a meglévő sort módosítja, nem hoz létre új tételt) — és ettől kezdve **nem lehet biztosan visszanézni**, hogy a fél évvel ezelőtt egy adott telefonba beszerelt akku pontosan melyik beszállítói tételből jött.

Pontosan ez az, amit garanciális visszakeresésnél te kérsz: "honnan vettük, tudjuk hova küldjük vissza."

### 2.2 A javítás — pillanatkép (snapshot) a felhasználás pillanatában

A legkisebb, legbiztonságosabb beavatkozás: a `service_parts` sor **ne csak a mai mezőket** tárolja, hanem a felhasználás pillanatában **másolja be** a `parts` tábla akkori `source`/`origin`/`supplier_sku` értékeit is — így ez a sor egy örök, változatlan pillanatkép marad, függetlenül attól, hogy a `parts` szülő-sor később hányszor lesz utántöltve/szerkesztve.

```sql
alter table service_parts add column source text;
alter table service_parts add column origin text;
alter table service_parts add column supplier_sku text;
```

```js
async function addPartToTicket(ticketId, part, qty) {
  await withBusy(async () => {
    const ticket = tickets.find((t) => t.id === ticketId);
    const unitCost = Number(part.costPrice) || 0;
    const r = unwrap(await supabase.from("service_parts").insert({
      service_ticket_id: ticketId, part_id: part.id, part_name: part.name, quantity: qty, cost_price: unitCost,
      source: part.source || null, origin: part.origin || null, supplier_sku: part.supplierSku || null, // ÚJ — pillanatkép
    }).select());
    // ... a többi (quantity csökkentés, mat_cost növelés) változatlan
  });
}
```

Ezután a "Felhasznált alkatrészek" táblázat (`PartsTab.jsx` `HistorySection`) egy új "Forrás" oszloppal bővül, és a kereső (`filterFn`) is kereshet rá — így ha egy ügyfél garanciával visszahoz egy telefont hibás akkuval, egyszerűen rákeresel a munkalapra vagy a telefonra a "Felhasznált alkatrészek" listában, és azonnal látod: melyik beszállítótól jött az az akku, mikor, milyen cikkszámmal — tudod, hova küldd vissza reklamációra.

### 2.3 Ami ennél tovább menne — de szerintem most nem szükséges

Egy **valódi batch/lot-rendszer** (minden egyes beérkezés külön tétel-sorral, még ugyanannál az alkatrésznél is, egyedi lot-azonosítóval) pontosabb lenne — pl. ha egyszerre 5 akkut veszel be egy beszállítótól, és csak 3-at használsz fel, a maradék 2 db is pontosan tudná, melyik lot-ból van. Ez viszont egy jóval nagyobb szerkezeti átalakítás (a mai `parts` tábla "egy sor = egy alkatrész-típus, mennyiséggel" modelljét kellene "egy sor = egy beérkezési tétel" modellre váltani, ami a `PartsTab`/`PartModal`/keresés/riportok nagy részét érintené). A 2.2-es "pillanatkép a felhasználáskor" megoldás **99%-ban ugyanazt a garanciális visszakereshetőséget adja**, sokkal kisebb kockázattal — csak akkor nem tökéletes, ha egyszerre TÖBB, különböző beszállítótól származó tétel van készleten UGYANABBÓL az alkatrészből A FELHASZNÁLÁS PILLANATÁBAN (mert akkor a `parts.source` csak az egyik, "aktuális" értéket tudja adni). Ha ez a te boltodban gyakori eset (pl. mindig több beszállítótól egyszerre van készleten ugyanolyan akku), jelezd, és akkor érdemes a batch-rendszert is megtervezni — egyelőre a pillanatkép-megoldással indulnék, mert egyszerűbb és a legtöbb esetben elég.

## 3. Amit tisztázni kell, mielőtt építjük

- **Alkatrész-utántöltés (mennyiség-emelés meglévő soron)**: ha valaki a `PartModal` szerkesztő nézetében csak felviszi a mennyiséget (pl. 5 db-ról 15 db-ra, mert újra rendeltetek), ez ma az `editPart()`-on megy át, ami **nem** hoz létre tranzakciót — ez is egy "hiányzó Kiadás" eset, csak nem az 1.1-ben tárgyalt "új alkatrész" úton. Szeretnéd, hogy a szerkesztő nézet is tudjon "csak a mennyiség-növekmény költségét" könyvelni (pl. egy extra mező: "ennyi db-ot vettem be most, ennyiért")? Ez egy kicsit bővíti a `PartModal` felületét, de lezárja ezt a rést is.
- **Helyszín a `PartModal`-on**: az 1.3 pontban jelzett módon a `PartModal`-nak (ill. a gyors-kosárnak) kapnia kell egy helyszín-választót a könyveléshez — jó lesz ez így, vagy legyen mindig "válassz helyszínt" kötelező mező?
- **PDF-import "phone" sor helyszíne**: ma a PDF-import a `locId`-t (amit a modal alján választasz) adja át a `phoneQueue`-nak — ez helyes marad, nem változik.

## Ellenőrzőlista implementálás után

- `+ Új alkatrész` gombbal felvitt alkatrész létrehoz egy pontos összegű Kiadás-tranzakciót
- PDF-importból vagy gyors-kosárból felvitt telefon **pontosan egyszer** könyvelődik Kiadásként (nem duplán)
- PDF-importból felvitt alkatrész **pontosan egyszer** könyvelődik Kiadásként (nem a blanket sor + `addPart` együtt)
- `service_parts` új sorai tartalmazzák a felhasználás pillanatában érvényes `source`/`origin`/`supplier_sku` pillanatképet
- "Felhasznált alkatrészek" nézet mutatja és kereshetővé teszi a forrást
- Régi (meglévő) `service_parts` sorok forrás nélkül maradnak — ez elfogadható, csak az új felhasználásoktól kezdve pontos
- `npm run build` hibamentes
- Nincs `git push`, csak lokális commit
