# TASKS — Szerviz ↔ Felvásárlás ↔ Vásárlás összekötése (trade-up keresztajánlat)

Kérés: "össze kellene kötni a szervizt és a telefonbevásárlást — ha az illetőnek a telefon értékéhez képest igen keveset tudnánk adni javításra (vagyis a javítás nem éri meg), akkor ajánljuk fel, hogy beszámítjuk, ő pótolja meg, és vegyen mást — minden funkció oda kellene vezessen, hogy vagy felvásárlás, vagy szerviz, vagy telefonvásárlás, vagy ezek kombinációja legyen, ezzel egyediek leszünk a piacon."

## 0. Amit megnéztem, mielőtt bármit kitaláltam volna

Három, egymástól ma **elszigetelt** publikus flow létezik, mindegyik saját adatforrással:
- **Szerviz-becslő** (`RepairEstimator.jsx`) — `REPAIR_MODELS` (`lib/repairCatalog.js`, pl. `Apple`/`iPhone 11`) + `repair_prices` RPC-vel ad árat egy hibára.
- **Felvásárlás** (`BuybackFlow.jsx`) — `get_buyback_models` RPC-vel (`buyback_models` tábla, pl. `Apple`/`iPhone 11`, `base_price`) ad beszámítási árat.
- **Telefon-választó segítő** (most speceltem, `TASKS_TELEFON_VALASZTO_SEGITO.md`, még nincs megépítve) — `get_public_stock` RPC-vel ajánl 2-3 telefont a készletből.

**Fontos, amit ellenőriztem**: a `REPAIR_MODELS` és a `buyback_models` márka/modell-elnevezése **pontosan egyezik**, ahol mindkettőben szerepel a modell (`Apple`/`iPhone 11`, `Samsung`/`Galaxy S23` stb.) — nincs elnevezés-eltérés, csak **lefedettségi rés**: pl. az `iPhone 12 Pro`, `iPhone 15/16`, `Galaxy S22/S24` szerepel a szerviz-katalógusban, de nincs rá beszámítási ár, és fordítva (`iPhone SE (2020)`, `Huawei P30` csak felvásárlásban van). Ez azt jelenti: a párosítás **egyszerű `brand+model` egyezéssel megoldható**, de mindig kell egy "nincs referenciaérték erre a modellre" ág, ahol egyszerűen nem jelenik meg a keresztajánlat (nem találunk ki hamis számot).

A `get_buyback_models` már ma is **publikus, biztonságos RPC** (`security definer`, `anon`-nak grantolva) — a szerviz-oldalon való felhasználásához **nincs szükség új backend-munkára**, csak egy plusz RPC-hívásra.

## 1. A koncepció egy mondatban

> **"Bármivel jössz be — törött telefonnal vagy régi telefonnal —, mindig van 3 utad: megjavítjuk, beszámítjuk, vagy beszámítjuk és ráteszel egy kicsit egy jobbra. Sose mész el üres kézzel, és sose fizetsz rá egy javításra, ami nem éri meg."**

Ez a piaci pozicionálás **negyedik lába** (a `STRATEGIA_PIACI_POZICIONALAS.md`-ben eddig 3 volt: fizikai bolt, új+felújított+gombos kombó, hely-specifikus bizalom) — a versenytársak (flip.ro, seria9.ro) tisztán online piacterek, nekik nincs szervizük egy helyen a felvásárlással és az eladással, úgyhogy fizikailag sem tudnák ezt megcsinálni egy tranzakcióban. Ez **valódi, másolhatatlan előny**, nem csak marketing-szöveg.

## 2. Mikor "nem éri meg" egy javítás

Küszöb-javaslat: **ha a javítás ára (`price_oem`, a jobb minőségű opció) eléri vagy meghaladja a telefon `buyback_models.base_price`-jának kb. 50-60%-át**, a javítás gazdaságilag kérdéses — ilyenkor jelenik meg a keresztajánlat (nem helyette, hanem *mellette*, a javítási ár is látszik továbbra is, csak van egy alternatíva is).

Példa a valós adatokból: `iPhone 11` akkumulátor-csere OEM-mel 250 Lej, beszámítási alapár 900 Lej → 250/900 ≈ 28%, ez **simán megéri javítani**, nem jelenik meg keresztajánlat. De ha egy régebbi, alacsonyabb értékű modellnél a kijelző-csere 400 Lej lenne egy 500 Lej-et érő telefonnál, az 80% — **itt igen**, ide kell a "lehet, hogy jobban jársz, ha becseréled" blokk.

*(A pontos %-küszöböt neked kell megerősítened — 50-60%-ot javaslok kiindulásnak, ez finomodhat, ahogy látjátok, hányan élnek vele.)*

## 3. Hol jelenik meg a keresztajánlat — mindhárom flow összekötve

**a) Szerviz-becslő eredmény lépése (`RepairEstimator.jsx`, `step === "result"`)**
Ha a kiválasztott modellre van `buyback_models` találat ÉS a javítás a 2. pont szerint "nem éri meg": az ár alatt megjelenik egy inline blokk — *"Ezt is beszámítjuk: kb. [X] Lej. Ha inkább becseréled, ennyiért viheted ezek egyikét:"* + 2-3 telefon-kártya a készletből (a telefon-választó segítő pontozó-motorjával kiválasztva, költségvetés = X + ésszerű ráfizetés, hasonló vagy jobb kategóriában). Ha nincs referenciaérték a modellre, ez a blokk egyszerűen nem jelenik meg — a szerviz-ár marad az egyetlen infó, ahogy ma.

**b) Felvásárlás eredmény lépése (`BuybackFlow.jsx`)**
Az ajánlat megjelenésekor (ma csak egy `finalPrice`) **mindig** (nem csak alacsony ajánlatnál) felkínáljuk: *"Vidd tovább kredit formájában [ld. 5. pont] + fizess rá [Y] Lejt, és már viheted is:"* + 2-3 telefon-ajánlás, ár = telefon ára mínusz a (bónusszal növelt) beszámítási érték. Ez direkt ráépül a már spec'elt kredit-mechanikára (`TASKS_BEVALTAS_KREDIT_BONUSZ.md`).

**c) Telefon-választó segítő (`TASKS_TELEFON_VALASZTO_SEGITO.md`, még építés előtt)**
Az eredeti 4 kérdés (állapot, ár, tárhely, márka) után egy **opcionális 5. kérdés**: *"Van egy régi/törött telefonod, amit beszámítanál?"* → ha igen, egy gyors márka+modell+állapot mini-választó (nem a teljes felvásárlási folyamat, csak egy becslés) → a beszámítási becslést levonja a javasolt telefonok árából, és az eredmény-oldalon mindkét szám látszik: *"1200 Lej, de a beszámítással csak 700 Lej"*.

## 4. Közös motor — ne írjuk meg háromszor

Egy megosztott `src/lib/tradeEngine.js` modul, ami tartalmazza:
- a telefon-választó segítő pontozó/ajánló függvényét (`scorePhone`, `recommendPhones` — a `TASKS_TELEFON_VALASZTO_SEGITO.md` 3. pontjából, ott terveztem meg először),
- egy `findBuybackValue(brand, model, buybackModels)` helper-t (a szerviz-oldal és a segítő 5. kérdése is ezt hívja),
- egy `isRepairUneconomical(repairPrice, buybackValue, threshold=0.55)` helper-t.

Mindhárom flow (`RepairEstimator`, `BuybackFlow`, `PhoneFinder`) ugyanazt a modult importálja — egy helyen módosítjuk a logikát, ha finomítani kell.

## 5. Kapcsolat a kredit-bónusz mechanikával

A "beszámítjuk, pótold meg, vegyél mást" **pontosan az a mechanika**, amit a `TASKS_BEVALTAS_KREDIT_BONUSZ.md`-ben már megterveztem (`store_credit_ledger`, kredit-választás bónusz-árral) — az ott leírt technikai réteg (adatmodell, kredit-egyenleg) változatlanul kell ehhez. Ami **itt új**: a UI-ban *proaktívan* felkínáljuk ezt minden releváns ponton, nem csak lehetőségként létezik valahol elrejtve. Ha ezt a keresztajánlat-funkciót építjük, a kredit-mechanikát vele együtt érdemes megépíteni — enélkül a "pótold meg és vegyél mást" csak szöveg lenne, nincs mögötte működő fizetési út.

## 6. Amit tisztázni kell

- **A "nem éri meg" küszöb pontos %-a** (50-60%-ot javaslok, de a te tapasztalatod/árréseid alapján finomítható).
- **Építsük-e egyszerre a kredit-mechanikával**, vagy induljunk úgy, hogy a keresztajánlat egyelőre csak *mutatja* a lehetőséget (telefon-kártyák + becsült ár), de a tényleges fizetés/beszámítás még mindig a boltban, helyben történik (mint ma), és a kredit-fizetési út egy következő lépés? Ez gyorsabb induláshoz vezet, de kevésbé "zárt" élmény.
- **A telefon-választó segítő 5. kérdése** (c) pont) legyen benne az első verzióban, vagy jöhet külön, később, miután a segítő alap-verziója már működik és látjuk a használatot?
- **Bolti (admin) oldal**: érdemes-e ugyanezt a logikát (gazdaságtalan javítás jelzése) a szerviz munkalap felvételi űrlapján is megjeleníteni az alkalmazottaknak, hogy élőben is felajánlhassák? Ez más scope (admin `App.jsx`), de logikusan ugyanerre a `tradeEngine.js`-re épülne — jelezd, ha ez is kelljen, vagy maradjunk a publikus oldalnál egyelőre.

## 7. Javasolt építési sorrend (ha mind a hármat építjük)

1. `lib/tradeEngine.js` (megosztott logika) + a telefon-választó segítő (`PhoneFinder.jsx`) megépítése — ez már önmagában is konverziónövelő, és ez adja a "recommendPhones" motort, amire a másik kettő épül.
2. Keresztajánlat beépítése a `RepairEstimator.jsx` eredmény-lépésébe.
3. Keresztajánlat beépítése a `BuybackFlow.jsx` eredmény-lépésébe + kredit-mechanika (`TASKS_BEVALTAS_KREDIT_BONUSZ.md`) egyszerre, mert ott a kredit nélkül a javaslat "üres" marad.

---

## Ellenőrzőlista implementálás után

- `lib/tradeEngine.js` létrejön, mindhárom flow ezt hívja
- `RepairEstimator` eredmény-lépésben megjelenik a keresztajánlat, ha van referenciaérték és a javítás a küszöb felett van
- `BuybackFlow` eredmény-lépésben mindig megjelenik a "pótold meg és vigyél mást" blokk
- Nincs hamis/kitalált szám sehol — ha nincs adat, a blokk egyszerűen nem jelenik meg
- `npm run build` hibamentes
- Nincs `git push`, csak lokális commit
