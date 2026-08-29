# TASKS — "Eladom" oldal újratervezése: konverziós landing + háromszintű kifizetési modell

Kérés: "most a flip.ro, a show.me, a backmarket és a bsgmag.ro alapján dolgozd ki, hogy amikor valaki rámegy az eladás gombra mit lát — csak nálunk kellene egy olyan opció is, ha jogilag lehetséges, hogy mi nem is utaljunk neki pénzt, hanem megnézzük, jóváírjuk az egyenleget és nálunk levásárolhatja, ebben az esetben 10%-al többet fizetünk; ha beküldi és bizományiban nálunk hagyja, akkor 15%-al többet fizetünk, mint ha csak megvennénk — ebben szeretnénk eltérni másoktól, ha jogilag lehetséges. Jelenleg szegényes az eladás oldal, fel kell tölteni infóval, landing/meggyőzés/konverziónövelés megközelítéssel."

## 0. Amit megnéztem, mielőtt bármit kitaláltam volna

**A `show.me` oldalt nem találtam** — sem közvetlen elérés, sem keresés nem hozott releváns, azonosítható telefon-felvásárlási oldalt ezen a néven. Ha egy konkrét, más nevű oldalra gondoltál, küldd el a linket, és belenézek — addig a másik hárommal dolgoztam.

**Flip.ro `/vinde` oldala** (a leggazdagabb a három közül) — amit onnan érdemes átvenni:
- Bizalmi jelvény-sor a hero alatt: kompetitív ár, ingyenes szállítás, bónusz/jutalom, gyors kiértékelés, pénz azonnal a számlán.
- **Számokkal alátámasztott social proof**: "4,9/5, 10 036 review", "+350 000 eladó", "+100 000 000 EUR kifizetve", "+700 000 felújított eszköz", "+40 000 tonna CO2 megspórolva" (a fenntarthatóság mint bizalmi elem).
- Márka/kategória-választó nagy, képes kártyákkal a hero alatt (Telefonos-nál ez már megvan a wizard 1. lépéseként, csak nincs előtte landing).
- **"Hogyan működik" 3 lépés**, fotóval: 1) látod az ajánlatot 2 percen belül, 2) ingyenes/biztonságos átadás, 3) megkapod a pénzt.
- **Népszerű modellek gyorslink-listája valós, konkrét árral** ("iPhone 13 — akár 1370 Lej") — ez direkt konverziós trükk: nem kell végigmenni a teljes űrlapon ahhoz, hogy lásd, mennyit érhet a telefonod.
- **Beépített GYIK a landing alján**, pont az eladási bizalmatlanságot oldva: "Milyen garanciám van, hogy megbízhatóak vagytok?", "Mikor kapom meg a pénzt?", "Mi van, ha törött a telefonom, eladhatom így is?" — ez utóbbira: igen, akkor is veszik, a hiba levonásra kerül az árból, nem dobják vissza az egész ajánlatot.
- **Kétsebességes fizetés**: "Plata rapidă" (gyors, 1-3 nap) vs. "Plata în 10 zile" (10 nap múlva, de magasabb ár) — ez lényegében ugyanaz a logika, amit te szeretnél (más elbírálás → más összeg), csak náluk az időzítésen, nálad a tulajdonjog-formán (készpénz/kredit/bizomány) alapul.

**BSGmag.ro `/vinde`** — sokkal szegényesebb, gyakorlatilag csak egy kategória-választó kártyarács, semmi meggyőző tartalom — **ez pontosan az a minta, amit NEM akarunk követni**, ez mutatja, hogy a landing-tartalom hiánya nálatok ma pontosan ez a szint, és ezen akarunk túllépni.

**Back Market "Trade-in" kategóriájának szerkezete** — ők inkább a garanciát/bizalmat/fiók-integrációt hangsúlyozzák a marketing helyett, kevésbé "landing-oldal", inkább súgó-jellegű.

**A `BuybackFlow.jsx` jelenlegi állapota (kód-audit)** — megerősíti a panaszod: az `/eladom` route-ra érkezve **azonnal a márka-választó wizard indul**, nincs előtte semmi — se hero, se bizalmi elem, se "hogyan működik", se GYIK. Ez az, amit fel kell tölteni.

## 1. A landing-rész terve (a wizard elé kerül, nem helyette)

Nem építek új, önálló landing-oldalt — a meglévő `/eladom` route-on, a mostani 1. lépés (márka-választás) **elé** kerül egy bevezető blokk, amit a felhasználó lát, mielőtt elkezdi kitölteni az űrlapot:

1. **Hero**: "Add be a régi telefonod — [ma kapott legjobb konkrét ajánlat] már ma a kezedben lehet." + a márka-választó kártyarács (ez már megvan, csak fel kell díszíteni fölötte).
2. **Bizalmi jelvény-sor** (valós, Telefonos-méretű állításokkal, NEM Flip nagyságrendű kitalált számokkal): "Azonnali fizetés, helyben" · "Törött telefont is beveszünk" · "2 fizikai üzletünkben, nem futárnak adod oda" · a meglévő `ReviewsBadge` (valós, 24 véleményes átlag).
3. **"Hogyan működik" 3 lépés**: 1) Válaszd ki a modelledet, 2 perc alatt látod az ajánlatot → 2) Hozd be bármelyik üzletünkbe → 3) Válassz: készpénz, kredit vagy bizomány — és viheted is a pénzt/egyenleget.
4. **Népszerű modellek gyorslink-sáv**, valós `buyback_models.base_price` adatból (ugyanaz a minta, mint a `StockShowcase` promó-kártyáinál, csak itt konkrét modell-árakkal) — pl. "iPhone 12 — akár 1400 Lej", ahogy a piaci pozicionálás dokumentumban is szerepelt anchor-árként.
5. **GYIK-blokk a landing alján**, a `TASKS_GYIK_OLDAL.md`-ben már megtervezett "Eladom a telefonom" kategóriából átvéve/bővítve, kiegészítve a három kifizetési móddal kapcsolatos várható kérdésekkel (ld. lent).

## 2. A háromszintű kifizetési modell — ez a fő megkülönböztető

Ez az, amivel **tényleg egyedi tudsz lenni** — sem a Flip, sem a Backmarket, sem a bsgmag nem ajánl fel bizományi opciót, ők kizárólag azonnali (vagy időzített) kifizetést csinálnak. A három szint:

| Opció | Kifizetés | Összeg (a mai alap-ajánlathoz képest) |
|---|---|---|
| **Készpénz** | Azonnal, helyben, a mai folyamat szerint | X (a mai `calculateBuybackPrice()` eredménye) |
| **Kredit-egyenleg** | Azonnal jóváírva, csak nálunk elkölthető | X × 1,10 (10%-kal több) |
| **Bizomány** | *(nyitott kérdés — ld. 4. pont)* | X × 1,15 (15%-kal több) |

Ez pontosan ráépül a korábban már megtervezett, de még nem épített kredit-mechanikára (`TASKS_BEVALTAS_KREDIT_BONUSZ.md`) — ott 15-20%-ot javasoltam kiindulásnak, **most te adtál egy konkrét, végleges számot (10%), ezt viszem tovább**, a spec-et ennek megfelelően frissítem.

**UI-terv**: a mai "offer" lépés (ahol most egyetlen árat mutat a `bb-offer-price` blokk) helyett egy **3-kártyás választó** — mint egy árazási táblázat —, mindegyik kártyán a konkrét, kiszámolt Lej-összeggel (nem csak a %-kal, hogy azonnal érthető legyen a különbség), és egy rövid, egy-mondatos magyarázattal, hogy melyik mit jelent. A vevő kiválasztja, melyiket akarja, mielőtt a kapcsolattartási adatokhoz érne.

## 3. Jogi/számviteli megjegyzés — fontos, mielőtt bármit építünk

Nem vagyok jogász vagy könyvelő, de ami a kódból/nyilvános forrásokból megállapítható: a **bizományi szerződés (contract de consignație) egy létező, szabályozott forma a román kereskedelmi jogban** — másodkezes boltok, zálogházak rutinszerűen használják, tehát *elvileg* nem kell "kitalálnotok" egy új jogi konstrukciót. Viszont van pár dolog, amit **egy könyvelővel/ügyvéddel muszáj tisztázni**, mielőtt élesítitek:

- **ÁFA- és bevétel-elszámolás eltér**: bizománynál a termék jogilag nem a ti tulajdonotok, amíg el nem adjátok — a könyvelésben ez nem ugyanaz, mint egy kiadás-tranzakció (ahogy a készpénzes felvásárlás ma a rendszeretekben megy).
- **Írásos bizományi szerződés kell tranzakciónként** — ez egy új dokumentum-típus, amit valakinek (ügyvéd vagy sablon alapján ti) meg kell fogalmazni.
- **Mi történik, ha nem sikerül eladni?** — időkorlát? visszaadjátok a készüléket? Ezt a vevőnek előre tudnia kell, mielőtt beadja.

Ezt **nem hagyom ki a specifikációból, de nem is teszek úgy, mintha jogilag rendben lenne** — a build-elési sorrendben (5. pont) ez az egyetlen rész, amit jogi/könyvelői megerősítés nélkül nem javaslok élesíteni.

## 4. Amit tisztázni kell, mielőtt megépítjük

- **Mikor kapja meg a vevő a bizományi összeget?** Ez a legfontosabb nyitott kérdés, mert ez dönti el a UI-szöveget és a jogi formát is:
  - **A) "Megemelt azonnali ajánlat"** — a vevő ugyanúgy azonnal (vagy kreditként) megkapja az X×1,15-öt, ti vállaljátok a kockázatot, hogy esetleg rosszabbul adjátok tovább. Ez tulajdonképpen nem valódi bizomány, csak egy magasabb, ti-kockáztatta felvásárlási ár — egyszerűbb jogilag, de nem osztja meg veletek a kockázatot.
  - **B) "Valódi bizomány"** — a vevő csak akkor kapja meg a pénzt, ha ti ténylegesen eladtátok a készüléket, és akkor az eladási ár egy (előre megbeszélt) hányadát vagy a fix X×1,15-öt fizetitek ki. Ez a klasszikus bizományi modell, nektek kevesebb a kockázatotok, de a vevőnek várnia kell, és ezt world-ösen kommunikálni kell (nem "azonnal 15%-kal többet", hanem "eladás után kapod a 15%-kal magasabb összeget").
- **Show.me** — pontosítsd, melyik oldalra gondoltál, ha volt konkrét elképzelésed egy negyedik referenciáról.
- **A landing bizalmi állításai** — a fenti 2. pontban felsorolt jelvényeket (pl. "törött telefont is beveszünk") jó, ha te is átnézed, mielőtt élesítjük, hogy tényleg mindegyik igaz-e úgy, ahogy megfogalmaztam.

## 5. Javasolt építési sorrend

1. **Landing-rész** a wizard elé (1. pont) — ez azonnal élesíthető, nincs jogi kockázata, gyors konverziós nyereség.
2. **Kredit-egyenleg opció** (10%) — ez a `TASKS_BEVALTAS_KREDIT_BONUSZ.md`-ben már megtervezett `store_credit_ledger` adatmodellre épül, nincs benne új jogi kérdés (a kredit egy egyszerű, náluk elkölthető jóváírás, nem bizomány).
3. **Bizomány opció** (15%) — csak azután, hogy a 4. pontban feltett kérdésre van válasz, és ha szükséges, jogi/könyvelői megerősítés is megvan.

---

## Ellenőrzőlista implementálás után

- Landing-blokk (hero, bizalmi jelvények, "hogyan működik", népszerű modellek, GYIK) a wizard 1. lépése elé kerül
- 3-kártyás kifizetési választó a "offer" lépésen, konkrét Lej-összegekkel
- `payout_type` mező bővítve `'keszpenz' / 'kredit' / 'bizomany'`-ra a `buyback_offers` táblán és a `submit_buyback_offer` RPC-ben
- Kredit-egyenleg logika a `TASKS_BEVALTAS_KREDIT_BONUSZ.md` szerint, 10%-os bónusszal
- Bizomány logika csak a 4. pontban tisztázott döntés + jogi megerősítés után épül
- `npm run build` hibamentes
- Nincs `git push`, csak lokális commit
