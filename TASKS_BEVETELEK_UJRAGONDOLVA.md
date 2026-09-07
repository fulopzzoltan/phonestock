# TASKS — Bevételek & Kiadások újragondolva (POS-logika)

Ez egy végrehajtható feladatlista a kódoló agentnek (Claude Code). Ez a fül a legtöbbet használt felület (akár napi 20 tétel), ezért ez egy nagyobb, strukturális átalakítás, nem csak kozmetika — érdemes óvatosabban, kisebb, egymásra épülő commitokban haladni, és minden lépés után ténylegesen kipróbálni éles-szerű adaton.

**Kontextus / miért így:** megnéztük, hogyan old meg ezt a valódi kereskedelmi POS-rendszerek (Square, Toast) — ezek nem soronkénti "tranzakció-bevitelt" csinálnak, hanem **kosarat/blokkot**: egy vásárlás (pl. telefon + tok + fólia) egyben, egy fizetési móddal zárul, gyors előre-definiált tételekkel ("speed items"), nem gépeléssel. Ez a feladatlista ezt ülteti át.

**Ne pusholj / ne deployolj**, csak lokális commit, amíg nem szólnak. Az alábbi sorrendben, külön commitban haladj — a 0–1. pont az alap, utána bármi másra épül.

---

## 0. Amit már megnéztem

- A `transactions` tábla minden sora automatikusan kap egy `receipt_no`-t (sorozatszám), **egyenként** — nincs jelenleg semmilyen mező, ami több sort egy vásárláshoz kötne. A kosár-koncepcióhoz ezt kell pótolni (ld. 1. pont), nem kell új tábla, elég egy új oszlop.
- `category` mező a `transactions`-on **NOT NULL** — a "kevesebb súrlódás kiadásnál" ötletet emiatt nem null-lal oldjuk meg, hanem alapértelmezett "Egyéb" értékkel, amit a felület nem kérdez rá kötelezően (ld. 6. pont).
- A jelenlegi `QuickSaleButtons.jsx` minden kattintásra **azonnal** külön tranzakciót ír be, fix `QUICK_SALES` listából (`src/lib/utils.js`). A `TransactionQuickAdd.jsx` egy 6-7 mezős, egysoros form. Mindkettőt ez a feladatlista váltja le egy közös kosár-komponensre.
- `addTransaction(data, locId)` (App.jsx, 683. sor) már kezeli az ügyfél-upsertet, a beszúrást és a state-frissítést — a kosár-checkoutnál ezt hívjuk meg tételenként, csak közös `basketId`-vel megjelölve.

---

## 1. DB migráció: `basket_id`

**Eszköz:** Supabase MCP `apply_migration`.

```sql
alter table transactions add column basket_id uuid;
create index idx_transactions_basket_id on transactions(basket_id) where basket_id is not null;
```

A régi sorok `basket_id = null` maradnak — a listázásnál ezeket egy-tételes blokként kezeljük (ld. 7. pont), semmi nem törik el visszamenőleg.

---

## 2. Mapper bővítés

**Fájl:** `src/lib/mappers.js`

- `txFromApi`-ba (49–66. sor): `basketId: r.basket_id,`
- `txToApi`-ba (68. sor környéke): `basket_id: t.basketId || null,`

---

## 3. Numerikus billentyűzet komponens

**Fájl:** új `src/components/AmountKeypad.jsx`

Cél: az összeg beírása gyorsabb legyen tapogatással, mint mezőre kattintás + rendszer-billentyűzet váltogatás. Props: `value`, `onChange(newValue)`, `onDone()` (opcionális, pl. Enter-szerű).

- Nagy, jól tapintható gombrács: `1 2 3 / 4 5 6 / 7 8 9 / törlés 0 OK`, a design-token rendszerből (`var(--radius-md)`, `var(--primary)` az OK gombon).
- Minden számgomb a `value` string végéhez fűz egy karaktert, a törlés gomb levág egyet, tizedesvessző nem kell (Lei-ben egész szám elég, ahogy eddig is).
- Ez egy **inline megjelenő panel** legyen (nem modal/overlay), ami az összeg-mező alatt nyílik ki, amikor a mezőre kattintasz, és bezárul, ha OK-t nyomsz vagy máshova kattintasz — így nem kell új overlay-mintát bevezetni, illeszkedik a meglévő `.field`/inline UI nyelvhez.
- Legyen egy sima szám-input is mögötte/mellette azoknak, akik gépelni szeretnék (ne zárd ki a billentyűzetes bevitelt, csak legyen a nagy gombos mód az elsődleges, gyorsabb út).

---

## 4. Kosár (blokk) komponens — a szív

**Fájl:** új `src/components/BasketBar.jsx`, ez váltja fel a `QuickSaleButtons.jsx` + `TransactionQuickAdd.jsx` páros helyét a `FinanceTab.jsx`-ben (a két régi fájlt ne töröld egyből, hagyd meg referenciának, amíg nem vagy biztos, hogy minden funkciójuk átkerült).

**Állapot (helyben, a komponensben vagy egy szülő hook-ban):**
```js
const [basketItems, setBasketItems] = useState([]); // [{label, amount, cost, category, kind: "income"|"expense"}]
const [basketPayment, setBasketPayment] = useState("Készpénz");
```

**Felület:**
- Alapállapotban (üres kosár) csak egy kompakt sor látszik: a gyors-tétel gombok (ld. 5. pont) + egy "+ Szabad tétel" gomb. Ez NEM foglalhat annyi állandó helyet, mint a jelenlegi `TransactionQuickAdd` doboz — csak akkor nő meg, ha ténylegesen van valami a kosárban.
- Gyors-tétel gombra kattintva vagy "+ Szabad tétel" kitöltése után a tétel bekerül a `basketItems`-be (nem azonnal DB-be), és megjelenik egy kis lista fölötte: tétel neve, ár, egy × eltávolító gomb, futó összeg.
- "Szabad tétel" felvitelénél: Leírás (szöveg), Összeg (az `AmountKeypad`-del), Bekerülési ár (csak ha bevétel), Kategória (select, alapértelmezett "Készlet" bevételnél / "Egyéb" kiadásnál) — ugyanaz a mezőkészlet, mint eddig a `TransactionQuickAdd`-ban, csak "hozzáadás a kosárhoz" gombbal zár, nem azonnali mentéssel.
- A fizetési mód (`basketPayment`) egyszer van kiválasztva a **kosár szintjén** (Készpénz/Kártya/Átutalás gombok, mint a mockupban), nem tételenként — ez az egyik fő nyeresége a kosár-modellnek.
- "Blokk lezárása" gomb: ekkor fut le a checkout (ld. lent), és a kosár kiürül.

**Checkout logika — `src/App.jsx`-be egy új függvény:**
```js
async function checkoutBasket(items, payment, locId) {
  const basketId = crypto.randomUUID();
  for (const item of items) {
    await addTransaction({ ...item, payment, basketId }, locId);
  }
}
```
Nézd meg a `withBusy` implementációját (App.jsx eleje) — mivel `addTransaction` már saját maga hívja a `withBusy`-t, döntsd el: (a) ha a `withBusy` egyszerű busy-flag, ami tűri az egymásba ágyazott hívást, hagyd így, a ciklus egyszerűen többször hívja meg `addTransaction`-t; (b) ha nem tűri jól (pl. race condition a `busy` state-en több gyors egymás utáni hívásnál), emeld ki `addTransaction` törzsét egy `insertTransactionRaw(data, locId)` segédfüggvénybe, amit mind az egyedi `addTransaction`, mind a `checkoutBasket` egy közös `withBusy`-n belülről hív.

Kiadásnál (amikor a kosárban csak egy kiadás-tétel van, nincs "vásárlás" jellege) engedd meg az egy-tételes gyors zárást is — ne kényszerítsd rá a felhasználót, hogy mindig "kosaraztassa" az egyszerű, egytételes kiadásokat is, ha nem akarja; egy sima "Rögzítés" gomb is maradjon elérhető közvetlenül kiadás módban.

---

## 5. Dinamikus gyors-tételek (a fix lista helyett)

**Fájl:** `src/App.jsx` — új `useMemo`, kb. a `svcStats` közelébe:

```js
const smartQuickItems = useMemo(() => {
  const cutoff = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
  const recentSales = transactions.filter((t) => t.type === "income" && t.category === "Készlet" && !t.productId && t.date >= cutoff);
  const grouped = {};
  recentSales.forEach((t) => {
    const key = t.description;
    if (!grouped[key]) grouped[key] = { label: key, amounts: [], costs: [], count: 0 };
    grouped[key].amounts.push(Number(t.amount) || 0);
    grouped[key].costs.push(Number(t.costPrice) || 0);
    grouped[key].count += 1;
  });
  const computed = Object.values(grouped)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((g) => ({
      label: g.label,
      amount: Math.round(g.amounts.reduce((s, a) => s + a, 0) / g.amounts.length),
      cost: Math.round(g.costs.reduce((s, a) => s + a, 0) / g.costs.length),
    }));
  return computed.length ? computed : QUICK_SALES; // friss telepítésnél/kevés adatnál essen vissza a fixre
}, [transactions]);
```
(A `!t.productId` szűrő azért kell, hogy a telefon-eladások — amiknek van `product_id`-ja — ne kerüljenek be tartozék-gyorsgombként, csak a valódi tartozék-eladások, mint a Tok/Kábel/Fólia.)

Add át `smartQuickItems`-t a `BasketBar`-nak a jelenlegi `QUICK_SALES` import helyett.

---

## 6. Kiadás gyors-felvétel — kevesebb súrlódás

**Fájl:** `src/components/BasketBar.jsx` (kiadás-ág)

- Kiadás módban alapból csak 2 mező legyen kötelező: Leírás + Összeg. A Kategória select maradjon látható, de legyen előre "Egyéb"-re állítva, és **ne blokkolja** a mentést, ha a felhasználó nem nyúl hozzá.
- A `TransactionsPeriodList.jsx`-ben (vagy a `FinanceTab.jsx` fejlécében) tegyél egy kis szűrő-chipet: "Egyéb kategóriás kiadások" — erre kattintva a lista csak azokat mutatja, amiket gyorsan, kategorizálás nélkül vittek fel, hogy időnként át lehessen nézni és pontosítani (a meglévő szerkesztés-ikon/`TransactionModal` már tudja ezt, nincs hozzá új UI, csak a szűrés).

---

## 7. Blokk-szalag megjelenítés a listában

**Fájl:** `src/components/TransactionsPeriodList.jsx`

- A napi csoporton belül (73–94. sor a `rows.map`) csoportosítsd a sorokat `basket_id` szerint, mielőtt kirajzolod: azok a tranzakciók, amiknek van közös `basketId`-je, kerüljenek egy közös, enyhén kiemelt kártyába (pl. `var(--surface-1)` háttér, kicsit beljebb húzott sorok), a kártya fejlécén a blokk összesített összegével és a közös fizetési móddal. Azok a sorok, amiknek nincs `basketId`-je (régi adat vagy egytételes gyors kiadás), maradjanak úgy, ahogy most vannak — egyszerű sorként.
- Ez tisztán megjelenítési réteg, az alap tranzakció-sorok (és a hozzájuk tartozó szerkesztés/törlés/nyugta-megnyitás) nem változnak.

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- Adj hozzá a kosárhoz 2-3 tételt (egy gyors-gombot és egy szabad tételt is), válassz fizetési módot, zárd le a blokkot — a mai listában egy közös blokként jelenik meg, helyes összeggel
- A `smartQuickItems` valóban a tényleges eladási előzményekből számol, és üres/kevés adatnál visszaesik a fix `QUICK_SALES`-re
- Egy gyors kiadás felvétele Leírás+Összeg megadásával, Kategória érintése nélkül is sikeresen mentődik ("Egyéb" kategóriával)
- A régi, `basket_id`-t nem tartalmazó tranzakciók (a teljes eddigi adatbázis) továbbra is helyesen jelennek meg, egyesével
- A napi/heti/havi összecsukós csoportosítás (ami már eddig is jól működött) nem sérül
- Nincs `git push`, csak lokális commit
