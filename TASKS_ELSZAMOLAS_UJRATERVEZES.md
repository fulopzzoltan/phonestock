# TASKS — Elszámolás fül: teljes újratervezés helyszínek közötti készpénz-kiegyenlítésre

Kérés: "az Elszámolás arra szolgál, hogy ha pl. Gyimesben egy nap 100 lej, ma 200 lej, Szentgyörgyön tegnap 100 lej, ma 400 lej, akkor én adjak Endrének 300/2-t, ő adjon 500/2=250-et, tehát ő ad nekem 100 lejt, mert nála annyival több van. Ez van, hogy naponta megtörténik, van, hogy egy héten csak egyszer jutunk el hozzá. Ha minuszos nap van, azt is összeadjuk. A jelenlegi adatokat töröld ki, gondold újra az egészet."

## 0. Amit a jelenlegi oldalon találtam — ez tényleg egy másik kérdésre válaszol

A mai `CashSettlementTab.jsx` egyetlen, **összevont** "Profit (megosztandó)" számot állít elő (készpénz + nettó kártya + átutalás − egyéb kiadás), és ezt egyszerűen elfelezi ("fejenként"). A "kinél mennyi készpénz van most" blokk 4 névre (`cash_holders` tábla: Zoli, Endre, Kinga, Krisztina) kér bevitt összeget, és az egészet egy közös várt-készpénz-számhoz hasonlítja. **Ez nem azt a kérdést válaszolja meg, amit feltettél** — nálad a kérdés az, hogy *helyszínenként* mennyi készpénz gyűlt össze, és emiatt *ki tartozik kinek mennyivel*, hogy fele-fele legyen a végén. A jelenlegi oldal ezt a helyszín-bontást el sem végzi, egy nagy közös számot bont csak személyekre, számolás nélkül, hogy melyik helyszínen keletkezett.

Kiveszem a teljes oldalt, és a lenti logikára építem újra.

## 1. A számítás — pontosan a te példáddal ellenőrizve

Helyszínenként, a legutóbbi elszámolás óta eltelt időszakra: **nettó készpénz = készpénz-bevétel − készpénz-kiadás**, ugyanaz a képlet, amit a Bevétel/Kiadás fülön a `dayStats()` már ma is számol (`FinanceTab.jsx` 8-16. sor) — csak itt nem egy napra, hanem a teljes elszámolási időszakra összegezve. Ha egy adott napon a kiadás nagyobb volt, mint a bevétel, az a nap negatív számmal megy bele az összegbe — ez automatikusan "összeadódik" a többivel, nincs szükség külön kezelésre ("ha minuszos nap van, azt is összeadjuk" — ez a sima összegzésből magától adódik).

```
Gyimes nettó   = 100 + 200 = 300
Szentgyörgy nettó = 100 + 400 = 500
Összesen       = 800
Fejenkénti (fele-fele) igazságos rész = 800 / 2 = 400

Gyimesnél 300 van, neki 400 járna → 100-zal KEVESEBB van nála, mint járna
Szentgyörgynél 500 van, neki 400 járna → 100-zal TÖBB van nála, mint járna

→ Szentgyörgy ad át Gyimesnek 100 Lejt, utána mindkettőnél 400 van.
```

Ez pontosan a te levezetésed (300/2=150, 500/2=250, a kettő közti különbség 100) — csak általánosabban felírva, N helyszínre is működik, nem csak kettőre, és nem kell benne személynevet hardcode-olni, mert a helyszín-tulajdonos megfeleltetés (Gyimes↔te, Szentgyörgy↔Endre) a fejekben már úgyis megvan.

## 2. Az új oldal felépítése

**A.** Fejlécben az időszak (mint ma: a legutóbbi elszámolás vége + 1 naptól máig — ez a rész jó, marad, mert pont a "van, hogy naponta, van, hogy egy héten egyszer" rugalmasságot már ma is tudja).

**B.** **Fő kártya, helyszínenkénti bontással** — ez váltja le az 5 db profit/kártya/átutalás statcardot:

```
              Gyimes        Szentgyörgy      Összesen
Nettó cash     300            500              800
Jár (fele)     400            400              800
Egyenleg      −100           +100                0
```

Alatta egyetlen, nagy, jól olvasható mondat: **"Szentgyörgy ad át Gyimesnek 100 Lejt."** (vagy fordítva, előjeltől függően; ha az egyenleg 0, "Nincs teendő, egyenlőek.") Ez a lényeg, ami elsőre látszódjon, ne kelljen számolgatni.

**C.** Kártya- és átutalás-bevétel **csak informatív, kis sorban**, NEM statcard, NEM megy bele a fenti egyenlegbe — mert az a közös bankszámlára érkezik, nincs mit fizikailag szétosztani rajta. ("Ebben az időszakban emellett: 610 Lei kártyás, 0 Lei utalásos bevétel — ez a közös számlán van, nem kell elosztani.")

**D.** **Fizikai ellenőrzés (opcionális)** — helyszínenként (nem 4 névre, ahogy ma, hanem a ténylegesen létező helyszínekre) egy-egy mező: "Ténylegesen most Gyimesen / Szentgyörgyön mennyi készpénz van?" — ha ez eltér a rendszer által számolt nettó összegtől, piros jelzés (mint ma az `isOk`/`diff` logika, csak helyszínenként, nem egy összevont számra).

**E.** Az adott időszak tételes listája (a meglévő `TransactionsPeriodList`, marad, jó ellenőrzésnek, ha valaki vissza akar nézni egy tételt) — összecsukható, mert ez már nem a fő tartalom.

**F.** "Elszámolás rögzítése" gomb — elmenti a fenti számokat, ez zárja le az időszakot (a következő megnyitáskor a periódus a mai naptól indul újra).

**G.** "Korábbi elszámolások" — új oszlopok: Időszak | (helyszínenként) Nettó | Ki fizetett kinek, mennyit | Rögzítette.

## 3. Adatbázis — a `cash_settlements` tábla átalakítása

A jelenlegi, egy-számra-épülő oszlopokat (`cash_income`, `cash_expense`, `cash_expected`, `cash_counted_total`, `cash_by_holder`, `card_income`, `transfer_income`, `other_expense`, `total_profit`) lecserélem egy helyszín-bontott, tetszőleges helyszínszámra skálázódó szerkezetre:

```sql
alter table cash_settlements
  drop column cash_income, drop column cash_expense, drop column cash_expected,
  drop column cash_counted_total, drop column cash_by_holder,
  drop column card_income, drop column transfer_income, drop column other_expense, drop column total_profit;

alter table cash_settlements add column location_breakdown jsonb not null default '[]';
-- [{ location_id, location_name, net_cash, counted_cash, fair_share, balance }, ...]
alter table cash_settlements add column card_income numeric default 0;   -- csak infó
alter table cash_settlements add column transfer_income numeric default 0; -- csak infó
alter table cash_settlements add column payer_location_id uuid references locations(id);
alter table cash_settlements add column payee_location_id uuid references locations(id);
alter table cash_settlements add column transfer_amount numeric default 0;
```

A `cash_holders` táblát **nem törlöm** (nem árt, ha megmarad), csak ezen az oldalon nem használjuk többé — ha valahol máshol sem kell, egy külön kéréssel bármikor kivehető.

## 4. Amit tisztázni kell

- **A helyszín↔személy megfeleltetés** (Gyimes = te, Szentgyörgy = Endre) — ez a fejekben van, a rendszerben sehol nincs explicit rögzítve. A fenti tervben szándékosan helyszín-alapú a számítás (mert az van a tranzakciókban), a szöveg pedig helyszín-nevet mond ("Szentgyörgy ad át Gyimesnek") — ha inkább nevekkel szeretnéd látni ("Endre ad át Neked"), azt meg lehet oldani egy `locations.owner_name` mezővel, csak szólj.
- **A kártyás/utalásos bevétel tényleg csak infó, nem oszlik meg fizikailag?** Ezt feltételeztem, mert a leírásod kizárólag a fizikai készpénzről szólt — ha a közös bankszámla egyenlegét is el akarjátok tartani egymás közt könyvelni ezen a fülön, szólj, az egy külön blokk lenne.
- **A "profit/árrés" fogalmat teljesen kivettem** erről az oldalról (az már ma is látszik napi/havi bontásban a Bevétel/Kiadás fülön) — ha mégis kellene ide egy árrés-összesítő is (pl. hogy lássátok, mennyi volt a haszon ugyanabban az időszakban, a kiegyenlítéstől függetlenül), az egy külön, informatív sor lehet, nem befolyásolja a fenti számítást.

---

## Ellenőrzőlista implementálás után

- A fő kártya helyszínenként mutatja a nettó készpénzt, a "jár (fele)" összeget és az egyenleget, alatta egy jól olvasható mondat, hogy ki kinek mennyit ad
- A számítás negatív napi egyenleget is helyesen összegez (nincs speciális eset rá, sima összeadás)
- Kártya/átutalás csak informatív sorban, nem megy bele az egyenlegbe
- A fizikai készpénz-ellenőrzés helyszínenként (nem 4 fix névre) kérhető be, eltérésnél piros jelzés
- "Korábbi elszámolások" táblázat helyszín-bontott oszlopokkal, "ki fizetett kinek" olvasható sorral
- `npm run build` hibamentes, `cash_settlements` migráció lefut
- Nincs `git push`, csak lokális commit
