# TASKS — Bevétel/Kiadás: valódi pénzmozgás vs. elszámolási tétel szétválasztása + napzárás/szerviz-fizetés javítás

Kérés: "a bevetel kiadasok fulet... 3 dolgot szeretnek tudni... mennyi volt a kiadasunk, mennyi a bevetel cashban es kartyan es mennyi volt a margin... ha eladok egy telefont es amelle adok egy kabelt es egy foliat az tunhet kiadasnak de per pill akkor nem lesz kevesebb a cashem... plusz legyen napzaras (a tegnapi nem mukodott) es szerviz atadasnal kerdezze meg keszpenz vagy kartya"

## 0. Amit a kódban és az adatbázisban találtam — ez nem csak elrendezés kérdése, van benne 2 valódi hiba

Lekérdeztem a `transactions` táblát tegnapra (2026-08-24, Gyimes): **15 kiadás-sor, összesen 7619 Lei, mindegyiken `payment` mező üresen (null)**. Ez nem hiba a lekérdezésben — ez a kód működése. Megnéztem, honnan jönnek ezek, és pontosan a te észrevételedet igazolják, sőt rosszabb a helyzet, mint gondolnád:

**A. `sellProduct()` (App.jsx 557-558. sor) minden egyes telefon-eladásnál automatikusan, hardcode-olva felvesz egy hamis kiadást:**
```js
const accessories = [{ description: "Fólia", amount: 10 }];
if (product?.condition === "Refurbished") accessories.push({ description: "Kábel", amount: 5 });
```
Ez **nem attól függ, hogy ténylegesen adtatok-e fóliát/kábelt** az adott eladáshoz — minden egyes telefon eladásnál lefut, fix 10 / 5 Lei értékkel, és külön `expense` tranzakcióként kerül be (583-587. sor), fizetési mód nélkül. Vagyis a rendszer ma is pontosan azt csinálja, amitől félsz — egy nem-valós kiadást könyvel el minden eladásnál —, csak épp (véletlenül, mert a `payment` mező üres) ez egyelőre nem vonódik le a készpénzből. **De levonódik a profitból**: az Elszámolás fülön (`CashSettlementTab.jsx` 53-55. sor) `totalExpenseAll` MINDEN kiadást összead, függetlenül a `payment`-től, és ez az összeg csökkenti a `totalProfit`-ot — vagyis a fejenként szétosztott profitszámotokat ma ez a 15 Lei/eladás hamis tétel ténylegesen torzítja.

**B. Szerviz-átadásnál a fizetési mód tényleg hardcode-olva van, sose kérdezi meg** (App.jsx 1440. sor):
```js
payment: "Készpénz",   // mindig ez, sosem kérdez rá
```
A hívás helye: `ServiceTab.jsx` 46-48. sor `handleCloseReady(id)` → `setTicketStatus(id, "Átadásra", "Átadva")` — nincs átadva fizetési mód, így ha valaki kártyával fizet a szervizért, az rendszerben mégis készpénzként könyvelődik. Ez pontosan az a hiba, amit jeleztél.

**C. A napzárás ténylegesen lefutott tegnap** (`day_closes` táblában van sor: 2026-08-24, Gyimes, zárva 14:34-kor, sosem lett visszavonva) — **de 14:34 után még 15+ tranzakció bekerült ugyanarra a napra**, és a zárás "pecsétje" erről nem tud, nem frissül. A felületen (`FinanceTab.jsx` 52-55. sor) egyszerűen "✓ Lezárva 14:34-kor" jelenik meg, holott a nap dandárja utána történt — ez adja a hamis biztonságérzetet, hogy "le van zárva", miközben a valódi napvégi állapot már nem egyezik azzal, amit lezártatok. Szerintem ez az, ami "nem működött".

**D (mellékesen, ugyanebből a hibaosztályból):** Webshop-rendelés átadásakor (App.jsx 1284-1292. sor) szintén nincs `payment` beállítva — az online webshop-bevétel is kimarad a készpénz/kártya bontásból.

## 1. A helyes elv, amit ez alapján kikristályosítok

Kétféle "kiadás" van, és ma a rendszer nem tesz köztük különbséget:

- **Valódi pénzmozgás** — ténylegesen kevesebb lesz a kasszában/számlán aznap (árubeszerzés, csomagköltség, felvásárlás, bérleti díj stb.). Ezeknek **mindig van `payment` mezője**.
- **Elszámolási/COGS tétel** — csökkenti a hasznot, de nem mozgat pénzt *most* (pl. egy garanciális javítás alkatrészköltsége — az alkatrészt régen megvetted; egy hűségpont-beváltás önköltsége — a termék nagytételben már ki lett fizetve). Ezeknek **nincs és nem is kell `payment`**.

A hamis Fólia/Kábel tétel egyik kategóriába sem illik jól, mert **nem valós, kitalált szám** — ezt egyszerűen ki kell venni, és helyette valós, opcionális, szerkeszthető tétellé kell tenni (2. pont).

## 2. `sellProduct()` — a hamis accessories-lista eltávolítása

App.jsx 557-558. és 583-587. sor: **töröld a hardcode-olt `accessories` tömböt és az azt beszúró ciklust.**

Helyette az eladási felületen (ahol a `sellProduct(txData, ...)` hívás elindul — a telefon eladási modal) egy opcionális, alapból kikapcsolt választó: *"Fólia is ment vele"* / *"Kábel is ment vele"* pipa, mindkettőhöz szerkeszthető ár mezővel (ne legyen fix 10/5 Lei). Ha be van pipálva, **ne külön `expense` tranzakcióként kerüljön be** — hanem adódjon hozzá a fő eladási tranzakció `costPrice` mezőjéhez (`txData.costPrice += foliaAr + kabelAr`). Így:
- helyesen csökkenti a haszonkulcsot (mert a fő eladás `amount - costPrice` különbsége a "Haszon" oszlopban),
- nincs önálló, zavaró "kiadás" sor a mai listában,
- nincs pénzmozgás-kérdés sem, mert nem is kiadás — csak alacsonyabb a margó ezen az eladáson.

## 3. Szerviz-átadás — fizetési mód kérése

`ServiceTab.jsx` `handleCloseReady(id)` (47. sor) előtt egy kis inline választó (nem kell teljes modal): a "Átadva" gomb megnyomásakor egy apró popover/segmented control jelenjen meg — *Készpénz / Kártya / Átutalás* — és csak a választás után fusson le `setTicketStatus(id, "Átadásra", "Átadva", payment)`. `setTicketStatus` (App.jsx 1414. sor) kap egy negyedik paramétert, és az 1440. sornál a hardcode-olt `payment: "Készpénz"` helyett ezt használja. Alapértelmezett kiválasztás legyen "Készpénz" (ez a leggyakoribb), hogy egy kattintással gyors maradjon, ha tényleg készpénz volt.

## 4. FinanceTab "Ma" fejléc — a te 3(+1) számod, jól elkülönítve

A jelenlegi fejléc (`FinanceTab.jsx` 49-59. sor) csak egy összevont `+bevétel / -kiadás` sort mutat. Ehelyett 4 statcard, pontosan amit a Sheets-ben is figyeltél:

```
Bevétel (készpénz) | Bevétel (kártya) | Kiadás (valódi) | Haszon (mai)
```

- **Kiadás (valódi)** = mai `expense` tranzakciók, **ahol `payment` ki van töltve** (a COGS-only, payment nélküli tételek — pl. garanciális anyagköltség, pontbeváltás önköltsége — nem számítanak bele, mert nem fogyasztották a kasszát *ma*).
- **Haszon (mai)** = mai `income` tételek `amount - costPrice` összege, **mínusz** a mai COGS-only (payment nélküli) `expense` tételek összege — a jelenlegi margin-képlet (`TransactionsPeriodList.jsx` 196. sor) ezt még nem vonja le, ezt is javítani kell, különben túlbecsüljük a hasznot.
- A `cashByLocation` (24-29. sor) blokk lényegében már ma is jó (készpénz bevétel−kiadás helyszínenként) — ezt megtartjuk, csak kiegészítjük a kártya-bevétel és a valódi-kiadás/haszon kártyákkal.

**Elrendezés**, a beküldött Sheets-képernyőkép mintájára: a "Ma" táblázatban (`TransactionRowsTable`) a leírás-oszlop maradjon a legszélesebb, de a kategória/helyszín oszlopok tömörebbek legyenek (rövidebb, kisebb betűs badge-ek, ahogy már ma is azok) — ez nagyrészt megvan, nem kell nagy átalakítás, inkább a fejléc a fő hiányosság.

## 5. Napzárás — pillanatkép-elv, hogy ne legyen hamis "lezárva" jelzés

`day_closes` tábla bővítése:
```sql
alter table day_closes add column snapshot_income_cash numeric;
alter table day_closes add column snapshot_income_card numeric;
alter table day_closes add column snapshot_expense_cash numeric;
alter table day_closes add column snapshot_margin numeric;
alter table day_closes add column snapshot_tx_count integer;
```
`closeDay(date, locId)` (App.jsx 918. sor) mentse el a záráskori 4 számot + a tranzakciószámot is. A `FinanceTab.jsx`-ben, ha `todayClose` létezik, de a mai tranzakciók száma **több**, mint `todayClose.snapshotTxCount`, jelenjen meg egy figyelmeztető sáv: *"X új tétel érkezett a zárás óta — érdemes újranézni"* + egy **"Zárás frissítése"** gomb, ami újra lefuttatja a `closeDay`-et (felülírva a snapshotot, nem hoz létre új sort). Ez direkt nem blokkoló (a te korábbi kérésed szerint továbbra is szerkeszthető marad minden), csak vizuálisan jelzi, hogy a "lezárva" pecsét már elavult.

## 6. Webshop-rendelés átadás — fizetési mód pótlása (mellékes találat)

App.jsx 1284-1292. sor: állítsd be a `payment` mezőt a rendelés fizetési módja szerint (ha van ilyen adat a `web_orders` táblán — ha nincs, ez egy külön, kisebb kérdés, amit jelzek, de nem oldok meg itt találgatással).

## 7. Amit tisztázni kell

- **A garanciális javítás anyagköltsége és a pontbeváltás önköltsége** (App.jsx 1453-1459. és 1147-1150. sor) — ezek jelenleg helyesen COGS-only tételek (nincs `payment`, nem mozgatnak kasszát), ezt **nem** bántanám, csak a hamis Fólia/Kábel tételt veszem ki. Ha szerinted ezeket is máshogy kellene kezelni, szólj.
- **A bizományos "letéteményesé" (payout) tétel** (App.jsx 573. sor, `isPassthrough: true`) — ez a vevőtől kapott teljes összeg azon része, ami majd a beszállítónak jár. Jelenleg ugyanazzal a fizetési móddal (pl. Készpénz) könyvelődik, mint a fő eladás — vagyis a mai "valódi kiadás" számban máris szerepelne, pedig lehet, hogy csak akkor hagyja el ténylegesen a kasszát, amikor tényleg kifizeted a beszállítót. Ez összefügg a korábbi `TASKS_BIZOMANYOS_ERTEKESITES.md` nyitott kérdésével (3-tranzakciós modell) — itt csak jelzem, nem oldom meg most.
- **A webshop-rendelések fizetési módja** (6. pont) — ha nincs ilyen adat eltárolva a rendelésnél, jelezd, hogy kártyás/utánvét/egyéb-e alapból, vagy kérdezze meg a rendszer átadáskor, ugyanúgy, mint a szerviznél.

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes, migrációk (day_closes 5 új oszlop) lefutnak
- Telefon-eladásnál nincs automatikus, hardcode-olt Fólia/Kábel kiadás — helyette opcionális, szerkeszthető ár, ami a fő eladás `costPrice`-ába megy
- Szerviz-átadásnál (mind Kanban gomb, mind bárhol máshol, ahol "Átadva" állítható) megkérdezi a fizetési módot, alapértelmezett Készpénz
- A "Ma" fejlécben 4 külön szám: Bevétel (készpénz), Bevétel (kártya), Kiadás (valódi, csak payment-es tételek), Haszon (COGS-only kiadásokkal helyesen csökkentve)
- Zárt nap, ha utána új tétel érkezik, vizuálisan jelzi, hogy elavult a pecsét, "Zárás frissítése" gombbal frissíthető
- Webshop-rendelés átadásnál is van fizetési mód a tranzakción
- Nincs `git push`, csak lokális commit
