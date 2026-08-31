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

## 2. Alkatrészek egyedi tételként — REVÍZIÓ a visszajelzésed alapján

> "nalunk az alkatreszek ugyan olyan egyedi termekek mint a telefon, lehet hogy van ket samsung a07 de kulonbozik az imei, az alkatreszekkel az a helyzet hogy egyik lehet elromlik a masik lehet nem"

Ez fontos pontosítás, és **felülírja** az előző verzió 2.2-es "pillanatkép" javaslatát — az ugyanis még azt feltételezte, hogy a `parts` tábla "egy sor = egy alkatrész-TÍPUS, `quantity` számlálóval" modellje jó marad, csak a felhasználáskor kell egy pillanatkép. De ha **egyik akku elromolhat, a másik nem**, akkor a `quantity`-számláló modell alapból hibás gondolkodás — ugyanúgy kell kezelni az alkatrészt, mint a telefont: **minden fizikai darab a saját sora, saját sorsa**. Ez a rész teljesen újraírva:

### 2.1 A jelenlegi állapot

A `parts` tábla ma "egy sor = egy alkatrész-típus" — pl. "Akkumulátor iPhone 11" egyetlen sor, `quantity: 15`. Ha ebből 15-ből egy meghibásodik, vagy az egyiket visszaküldöd egy garanciás javítás miatt a beszállítónak, a rendszer ezt nem tudja megkülönböztetni — csak azt látja, hogy "15 db van", utána "14 db van", de nem tudja, hogy *melyik* a hiányzó, honnan jött, mi történt vele.

A "Felhasznált alkatrészek" nézet (`PartsTab.jsx` alján, `HistorySection`) már ma is jól elkülöníti a felhasznált tételeket a törölt alkatrészektől (a `deletePart` egy teljesen külön, kézi soft-delete, nem keveredik a `addPartToTicket` felhasználással) — ez a rész jó volt már az első verzióban is, ez nem változik.

### 2.2 Az új modell — a `parts` tábla a `products` (Telefonok) mintájára

Ahelyett, hogy a `quantity` mezőt számlálóként használnánk, **minden egyes fizikai alkatrész-darab a saját sora** legyen a `parts` táblában, saját sorszámmal (a `part_no` mező már ma is megvan, csak eddig egy batch-hez tartozott — mostantól egy konkrét darabhoz tartozik, pont úgy, ahogy a telefonoknál az IMEI is az adott fizikai készüléké).

```sql
alter table parts add column status text not null default 'raktáron'
  check (status in ('raktáron', 'felhasznalva', 'hibás', 'visszaküldve'));
alter table parts add column used_in_ticket_id uuid references service_tickets(id);
alter table parts add column used_at timestamptz;
alter table parts add column rma_note text;  -- "2026.09.02, visszaküldve GSMnet-nek, csereszám: ..."
```

- **`raktáron`** — készleten van, felhasználható
- **`felhasznalva`** — beépítve egy telefonba (`used_in_ticket_id` mutatja, melyik munkalapba/telefonba)
- **`hibás`** — meghibásodott (akár raktáron állva derült ki, akár beépítés után, garanciás visszahozatalkor)
- **`visszaküldve`** — visszaküldve a beszállítónak (RMA), az `rma_note` tartalmazza a részleteket

A `quantity` mező ezután **mindig 1** lesz egy `parts` soron (vagy törölhető is, ha semmi más nem olvassa — ezt a build közben át kell nézni, hogy hol hivatkozik még rá kód).

### 2.3 Bevételezés — egy űrlap, N egyedi sor, egy összesített Kiadás

A `PartModal`/`addPart` felület **nem** változik a pultos szemszögéből (egy űrlap: név, kategória, db, ár, forrás) — csak a mentés logikája:

```js
async function addPart(data, locId) {
  await withBusy(async () => {
    const qty = Number(data.quantity) || 1;
    const rows = Array.from({ length: qty }, () => partToApi({ ...data, quantity: 1 }));
    const r = unwrap(await supabase.from("parts").insert(rows).select());
    setParts((prev) => [...r.map(partFromApi), ...prev]);
    setPartModal(null);
    const amount = (Number(data.costPrice) || 0) * qty;
    if (amount > 0) {
      // EGY összesített tranzakció a teljes tételre — nem darabonként, mert egy beszállítói
      // számla is egy sor, és senki nem akar 15 külön Kiadás-sort ugyanarra a beszerzésre.
      await addTransaction({
        type: "expense", category: "Készlet",
        description: `Alkatrész beszerzés: ${data.name} (${qty} db)${data.source ? ` — ${data.source}` : ""}`,
        amount, payment: "Készpénz",
      }, locId);
    }
  });
}
```

Ugyanez vonatkozik a PDF-importra (1.2 pont) — a `row.qty` most nem egy `quantity` mezőt tölt fel, hanem `row.qty` darab egyedi `parts` sort hoz létre, egy közös Kiadás-tranzakcióval.

### 2.4 Raktár-nézet — csoportosítva marad, de alatta egyedi tételek

A `PartsTab.jsx` mai listája NEM válik 15 egyforma sorrá a felhasználó szemében — a lista továbbra is **csoportosítva** mutatja ("Akkumulátor iPhone 11 — 12 raktáron"), csak a csoportosítás most `GROUP BY name + category + source` a `status='raktáron'` sorokon, `COUNT(*)` a db-oszlopban a mai `quantity` helyett. A csoportra kattintva (vagy egy "Részletek" gombbal) kibontható az egyedi tételek listája — pont úgy, ahogy a Telefonoknál a `ProductDetailPanel` mutatja az egy konkrét darab adatait.

### 2.5 Felhasználás — konkrét darab kiválasztása

Amikor a pultos "Felhasználás"-t nyom egy munkalapon, a rendszer **automatikusan a legrégebb óta raktáron lévő, `status='raktáron'` darabot** választja (FIFO — ez a legtöbb esetben elég, és nem terheli extra döntéssel a pultost), de a Részletek-nézetből kézzel is kiválasztható egy konkrét darab, ha valamiért fontos (pl. tudottan két különböző forrásból van készleten, és az egyiket direkt el akarod kerülni).

```js
async function addPartToTicket(ticketId, partGroup, qty) {
  await withBusy(async () => {
    // partGroup = { name, category, source, ... } — a csoport, amiből a pultos választott.
    // A konkrét darabokat itt választjuk ki: FIFO, a legrégebbi part_no-jú raktáron lévő sorok.
    const available = parts
      .filter((p) => p.status === "raktáron" && p.name === partGroup.name && p.category === partGroup.category)
      .sort((a, b) => (a.partNo || 0) - (b.partNo || 0))
      .slice(0, qty);
    for (const unit of available) {
      unwrap(await supabase.from("parts").update({
        status: "felhasznalva", used_in_ticket_id: ticketId, used_at: new Date().toISOString(),
      }).eq("id", unit.id));
      unwrap(await supabase.from("service_parts").insert({
        service_ticket_id: ticketId, part_id: unit.id, part_name: unit.name, quantity: 1, cost_price: unit.costPrice,
      }));
    }
    // mat_cost növelése a kiválasztott darabok költségével — a többi (mai) logika változatlan
  });
}
```

Mivel maga a `parts` sor **soha nem íródik felül más beszerzésből** (minden beérkezés saját sorokat hoz létre, ld. 2.3), a `service_parts`-on **nem is kell** pillanatkép-mező (`source`/`origin`/`supplier_sku`) — a `part_id`-n keresztül a `parts` tábla MINDIG az adott fizikai darab valós, változatlan eredetét adja vissza, örökre. Ez egyszerűbb, mint az előző verzió snapshot-javaslata, és pontosabb is.

### 2.6 Garanciális visszakeresés — a konkrét use case

Ügyfél visszahozza a telefont, hibás az akku, ami 3 hónapja lett beépítve. A "Felhasznált alkatrészek" listában rákeresel a munkalapra vagy a telefonra → látod a pontos `parts` sort → azon rajta van: melyik `source`-ból jött, milyen `supplier_sku`-val, mikor lett beépítve. Az adott `parts` sor státuszát átállítod `hibás`-ra, majd ha visszaküldöd a beszállítónak, `visszaküldve`-re, az `rma_note`-ba beírod a részleteket. Így bármikor lekérdezhető: "melyik beszállítótól jött alkatrészek hibásodtak meg leggyakrabban" — ez már egy hasznos minőség-ellenőrzési riport is lehet hosszabb távon (melyik beszállítót érdemes elkerülni).

### 2.7 Migráció a meglévő adatokra

A ma élő `parts` sorok (amik `quantity > 1`-gyel rendelkeznek) egyszeri migrációval szét lesznek bontva N darab `quantity=1` sorra, mindegyik `status='raktáron'`-nal — ez egy egyszeri SQL-script, amit a build előtt lefuttatunk. A már felhasznált (`service_parts`-ban szereplő) tételekhez **nem** tudunk visszamenőleg egyedi `parts`-sort rendelni (azok már ma is csak számlálóként csökkentek) — ez elfogadható, a rendszer a bevezetés pillanatától kezdve lesz pontos, a régi előzmények a mai (kevésbé részletes) formában maradnak.

## 3. Amit tisztázni kell, mielőtt építjük

- **Helyszín a `PartModal`-on**: az 1.3 pontban jelzett módon a `PartModal`-nak (ill. a gyors-kosárnak) kapnia kell egy helyszín-választót a könyveléshez — jó lesz ez így, vagy legyen mindig "válassz helyszínt" kötelező mező? (Az egyedi `parts` sorokon magukon nincs helyszín — a CLAUDE.md szerint szándékosan közös raktár mindkét helyszínnek — csak a Kiadás-tranzakcióhoz kell.)
- **Raktáron lévő, de hibásnak bizonyuló alkatrész**: ha egy még be sem épített darab bizonyul hibásnak (pl. kicsomagoláskor látszik, hogy sérült), a `Részletek` nézetből egyenként átállítható `hibás`-ra — kell-e ehhez egy gyors, tömeges "ez az egész tétel sérült érkezett" művelet is, vagy a legtöbbször csak 1-1 darabról lesz szó?
- **`quantity` mező sorsa**: a régi kódban több helyen olvashatják még (`p.quantity`, keresés, rendezés "Készlet: kevés → sok") — ezeket a csoportosított nézetre (2.4) kell átállítani (`COUNT(*) where status='raktáron'`), ez apró, de sok helyen érintő átírás.
- **Egyedi darab kézi kiválasztása felhasználáskor**: az alap a FIFO automatikus választás (2.5) — szükséges-e MOST már a kézi kiválasztás UI-ja is, vagy elég, ha ez egy második körben kerül rá, ha a FIFO a gyakorlatban nem elég?

## Ellenőrzőlista implementálás után

- `+ Új alkatrész` gombbal felvitt N db alkatrész N egyedi `parts` sort hoz létre, EGY összesített Kiadás-tranzakcióval
- PDF-importból vagy gyors-kosárból felvitt telefon **pontosan egyszer** könyvelődik Kiadásként (nem duplán)
- PDF-importból felvitt alkatrész-tétel egyedi sorokat hoz létre, EGY Kiadás-tranzakcióval (nem a blanket sor + `addPart` együtt duplán)
- Raktár-nézet csoportosítva mutatja az alkatrészeket (`status='raktáron'` szerinti darabszámmal), kibontható egyedi tételekre
- Felhasználáskor a rendszer FIFO alapon konkrét egyedi `parts` sort jelöl `felhasznalva`-ra, `used_in_ticket_id`-val
- Egy adott felhasznált (vagy raktáron hibásnak bizonyuló) darab `hibás`/`visszaküldve` státuszba állítható, `rma_note`-tal
- "Felhasznált alkatrészek" nézetben/Részletek panelen visszakereshető egy adott darab pontos forrása, beszerzési ára, mikor lett beépítve, melyik munkalapba
- Meglévő `parts` sorok migrálva egyedi (`quantity=1`, `status='raktáron'`) sorokra
- `npm run build` hibamentes
- Nincs `git push`, csak lokális commit
