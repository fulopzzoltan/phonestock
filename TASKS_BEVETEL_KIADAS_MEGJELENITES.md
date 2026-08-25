# TASKS — Bevétel/Kiadás nézet: zajcsökkentés, helyszín-szétválasztás, iparági sztenderd szerint

Kérés: "nezz utana hogy az ilyen budget, sales, tracking spender hogy nezne ki nagyon jol atlhatoan... tul sok a zaj, a ket helyszin arulasat nem akarom ugy egyben latni hogy egyik sor innen masik onnan, van nehany szinhasznalat ami feleslegesnek erzek, lehet hogy keskenyebbek lehetnenek a sorok"

## 0. Amit a kutatásból leszűrtem

Utánanéztem, hogyan épülnek fel a jól átlátható, adat-sűrű pénzügyi/POS táblázatok (forrásokat lásd lent). A visszatérő elvek:

1. **A szín csak a jelentésre van fenntartva** — zöld/piros KIZÁRÓLAG a bevétel/kiadás (nyereség/veszteség) jelzésére, egy darab accent-szín a fő akciógombokra, minden más adat semleges szürke. Minél több szín verseng a figyelemért, annál nehezebb egy pillantással leolvasni a lényeget.
2. **A számoszlopok jobbra igazítva, monospace betűvel**, hogy egymás alatt összehasonlíthatók legyenek — ez nálatok már részben megvan (`.mono` = JetBrains Mono), csak a jobbra-igazítás hiányzik.
3. **Sűrű nézetnél a sor-padding kisebb** (kb. 8-9px függőlegesen a jelenlegi 12px helyett), a fejléc-sor marad kompakt, nagybetűs, halvány.
4. **Több telephely/számla adatát NEM egy közös, időrendi listában, apró jelvényekkel megkülönböztetve mutatják, hanem külön, önálló blokkban** — ez a szabvány minta minden többtelephelyes POS/könyvelő nézetnél, amit találtam: telephelyenként külön kártya/szekció saját összesítővel, nem egy összefésült lista.

## 1. Helyszín-szétválasztás — a fő szerkezeti változás

Jelenleg (`App.jsx` 1564-1567. sor) amikor te, adminként a "Mind" nézetet választod a bal sávban, a `filteredTransactions` **egyben, időrendi sorrendben** tartalmazza mindkét üzlet tranzakcióit — a `FinanceTab.jsx` ezt egyetlen táblázatként rendereli, telephelyenként csak egy apró zöld `badge-loc` jelvénnyel jelölve sorról sorra. Ez pontosan az, amit nem szeretnél.

**Javaslat**: ha `effectiveLocFilter === "all"`, a `FinanceTab` ne egy közös listát rendereljen, hanem **helyszínenként külön blokkot**, egymás alatt (nem egymás mellett — mobilon/keskeny nézetben ez törne):

```
── Gyimes ──────────────────────────
  Bevétel (készpénz) · Bevétel (kártya) · Kiadás · Haszon
  [Ma táblázat — csak Gyimes tételei]

── Szentgyörgy ─────────────────────
  Bevétel (készpénz) · Bevétel (kártya) · Kiadás · Haszon
  [Ma táblázat — csak Szentgyörgy tételei]
```

Ha admin egy konkrét helyszínt választ a bal sávban (nem "Mind"), marad a jelenlegi egyszerű, egy-blokkos nézet (hiszen akkor már eleve csak az az egy helyszín van szűrve) — a `badge-loc` oszlop ott el is hagyható a táblázatból, mert felesleges infó, ha úgyis csak egy helyszín tételei látszanak.

Technikailag: a `FinanceTab.jsx`-ben, ha `effectiveLocFilter === "all"`, a jelenlegi egy hívás helyett `allowedLocations.map(loc => ...)` ciklussal helyszínenként külön számolt `todayTx`/`cashByLocation`/stat-sor és külön `TransactionRowsTable` — a meglévő `buildBasketEntries`/`TransactionRowsTable` komponensek újrafelhasználhatók, csak a bemenő `rows` szűrve helyszínre.

## 2. Színhasználat csökkentése

Jelenleg (`index.css` 181-186. sor) 6 különböző színes jelvény verseng egymással egy sorban: `badge-loc` (zöld), `badge-income` (zöld), `badge-expense` (piros), `badge-refurb` (narancs), `badge-new` (lila), `badge-buyin` (kék) — plusz a kosár-tételek zöld bal szegélye (`basket-item-tr`, 164. sor) és a kosár-fejléc zöld háttere (`basket-head-row`, 156. sor). Ez a kutatás szerint pont az, ami "zajossá" tesz egy pénzügyi táblázatot.

**Javaslat — mi maradjon színes, mi nem:**
- **Marad zöld/piros**: kizárólag a Bevétel/Kiadás típusjelvény és az összeg-oszlop előjele — ez a fő, azonnal leolvasandó jel.
- **`badge-loc` eltűnik** a "Ma" táblázatból (miután helyszínenként külön blokk van, nincs rá szükség) — a történeti/"Mind" nézetben, ahol esetleg mégis kell, sima szürke szöveggé alakul, nem zöld pill.
- **`badge-refurb` / `badge-new` / `badge-buyin`** — ezek hasznos infók (állapot, bevásárlás), de nem kell hogy tömör, feltűnő színes pill legyen mindegyik. Javaslat: halványabb, kontúros (outline) verzió — fehér/szürke háttér, vékony színes szegély, színes szöveg — így megkülönböztethető marad, de nem "kiabál" a bevétel/kiadás zöld-piros mellett.
- **Kosár-tételek zöld szegélye/háttere** (`basket-item-tr`, `basket-head-row`) → semleges szürke (`#F3F4F6` háttér, szürke bal szegély), a zöld szín maradjon kizárólag a bevétel-jelzésnek fenntartva.

## 3. Sűrűbb sorok

`index.css` 114-115. sor: `th{padding:12px 16px} td{padding:12px 16px}` → a Bevétel/Kiadás "Ma" táblázatára egy dedikált, tömörebb class (`.tw-compact td{padding:7px 14px} .tw-compact th{padding:8px 14px}`), amit csak a `FinanceTab` "Ma" táblázata kap meg — a többi táblázat (Szerviz, Készlet stb.) marad a jelenlegi, kényelmesebb méretben, hogy ne kelljen az egész appot átszabni egy kérés miatt.

Emellé: `Összeg` és `Haszon` oszlopok kapjanak `text-align:right`-ot (jelenleg nincs explicit igazítás, csak a `.mono` betűtípus) — ez a szabvány minden pénzügyi táblázatnál, és segít a szemnek gyorsan összeadni/összehasonlítani a számokat.

## 4. Amit NEM bántanék

A leírás-oszlop már ma is a legszélesebb, kompakt jelvényekkel (nem foglal sok helyet) — ez már megfelel annak, amit a Sheets-es példádban jónak találtál, ezen nem változtatnék. A "Ma"/"Korábbi napok" összecsukható szerkezet is marad, ez maga is zajcsökkentés (nem kell scrollozni a régi napok között).

---

## Ellenőrzőlista implementálás után

- "Mind" helyszín-nézetben a Bevétel/Kiadás fülön két külön, egymás alatti blokk van (Gyimes / Szentgyörgy), mindkettőnek saját 4 statcard-ja (készpénz/kártya bevétel, kiadás, haszon) és saját táblázata — nincs interleaved, időrendben összefésült lista
- Egy konkrét helyszín kiválasztásakor a `badge-loc` oszlop eltűnik a táblázatból (felesleges, ha úgyis egy helyszín van)
- `badge-refurb`/`badge-new`/`badge-buyin` kontúros, halkabb stílusra vált; a kosár-tételek zöld szegélye/háttere semleges szürkére
- A "Ma" táblázat sorai tömörebbek (kisebb padding), csak ezen a táblán, a többi nézet változatlan
- `Összeg`/`Haszon` oszlopok jobbra igazítva
- `npm run build` hibamentes
- Nincs `git push`, csak lokális commit

---

**Források** (iparági sztenderd data table / pénzügyi dashboard tervezési elvek):
- [Data table UI design reference guide for 2026 — Setproduct](https://www.setproduct.com/blog/data-table-ui-design)
- [Designing effective data table UI – best practices and tips — Justinmind](https://www.justinmind.com/ui-design/data-table)
- [Data-Dense Dashboard — DESIGN.md](https://designmd.app/library/data-dense-dashboard)
- [Designing Data-Dense Dashboards: 8 Lessons from Building a Trading Journal — Pixel Show](https://pixel-show.com/blog/designing-data-dense-dashboards)
- [Best Color Palettes for Financial Dashboards — Phoenix Strategy Group](https://phoenixstrategy.group/blog/best-color-palettes-for-financial-dashboards)
