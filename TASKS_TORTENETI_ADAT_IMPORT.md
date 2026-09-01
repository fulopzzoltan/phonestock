# Történeti adat import — Gyimes, 2025 Q1 + Q2 (feljegyzés, nem terv)

> "van ez a csv beszeretnem taplalni az elozo evi adatokat, egyenlore kezdjuk gyimessel 2025 elso negyedevvel... a bevetelnel es lehetoleg tobb adat, mibol kb milyen %-ban jott... a kiadasoknal kb milyen %-ban mire ment..."

Ez nem terv, hanem **feljegyzés arról, mit csináltam és mit találtam**, hogy legközelebb (Szentgyörgynél, vagy ha bővítjük) ne kelljen újra kitalálni a CSV formátumát.

## 1. Amit találtam a `monthly_summaries` táblában — a fő kérés már kész volt

Mielőtt bármit importáltam volna, megnéztem a `monthly_summaries` táblát: **18 sor már benne volt** — Gyimes 2024 novembertől 2025 decemberig, Szentgyörgy 2025 szeptembertől. A számok (bevétel, rés, kiadás, profit, napok száma, Gombos/Felújított/Új darabszám) **pontosan egyeznek** a feltöltött CSV jobb oldali havi összesítő táblájával. Ezt tehát már korábban (a másik Claude Code session vagy te magad) beimportálta — nincs mit újra beírni ide.

## 2. Amit hozzátettem — bevétel-bontás telefon/szerviz/tartozék szerint

Ez a bontás **nem volt** sem a CSV összesítőjében, sem a DB-ben — ehhez a bal oldali napi tételsort (~950 sor, tétel + ár) kellett soronként kategorizálni kulcsszavak alapján:

- **Szerviz**: "csere", "javítás", "kijelző", "hátlap", "kamera lencse", "aksi"/"akku" (önmagában), "csatlakozó", "FRP", "feloldás", stb.
- **Tartozék**: "tok", "fólia"/"üvegfólia", "devia" (a te megerősítésed szerint ez mindig szilikonfólia), "kábel", "töltő", "fülhallgató", memóriakártya, stb.
- **Telefon**: márkanevek (Samsung, iPhone, Xiaomi, stb.) és modell-rövidítések (a52, s10, se2...), plusz "előleg"/"részlet" szavas részletfizetéses tételek.
- Ami egyikbe sem fért bele (SIM-feltöltés, néhány egyedi/kézzel írt megjegyzés) → **"egyéb"** gyűjtő.

Fontos technikai csapda, amit közben találtam és javítottam: a CSV-ben 3 sor dátumformátuma eltért a többitől (szóközös "23 01 2025" forma a pontos "23.01.2025" helyett) — ez a 3 sor tévesen tételként lett volna beolvasva 7061 Lej értékben, ami pont a januári eltérést okozta a hivatalos összeghez képest. Kiszűrve a januári tétel-log összege **pontosan** 57 047 Lej lett — egyezik a `monthly_summaries`-ben már ott lévő hivatalos számmal. Februárban/márciusban is 0,2–0,5%-os eltérés maradt csak (kerekítés/apró korrekciók a papíron), ez nem számít.

### Eredmény (Gyimes, 2025 Q1) — most már a `monthly_summaries` táblában is (új oszlopok: `revenue_phone`, `revenue_service`, `revenue_accessory`, `revenue_other`)

| Hónap | Telefon | Szerviz | Tartozék | Egyéb |
|---|---|---|---|---|
| Január | 39 675 Lej (69,5%) | 8 363 Lej (14,7%) | 8 140 Lej (14,3%) | 869 Lej (1,5%) |
| Február | 30 821 Lej (67,9%) | 8 194 Lej (18,0%) | 6 084 Lej (13,4%) | 310 Lej (0,7%) |
| Március | 24 278 Lej (60,4%) | 9 427 Lej (23,5%) | 5 558 Lej (13,8%) | 916 Lej (2,3%) |

Látszik egy trend: a szerviz-bevétel aránya hónapról hónapra nő (14,7% → 18,0% → 23,5%), a telefon-eladás aránya csökken — ez egy valós, számokkal alátámasztott megfigyelés, nem csak becslés.

**Ez egy kulcsszavas becslés, nem tökéletes** — soronként ~1-2% maradt "egyéb"/besorolatlan (pár egyedi, kézzel írt megjegyzés, amit nem lehetett biztonsággal beazonosítani). A `revenue`/`margin`/`expenses`/`profit` fő számok viszont a már meglévő, hivatalos `monthly_summaries` adatok — azokhoz nem nyúltam.

## 3. Amit NEM tudtam csinálni — kiadás-bontás (Csongi/Tommy/Svájc)

Kérted, hogy a kiadásoknál is legyen %-os bontás (könyvelő, telefon-beszerzés Tommy-tól/Svájcból, stb.) — **ehhez ez a fájl nem elég**. A feltöltött CSV-ben a kiadások **csak havi összegben** szerepelnek (a jobb oldali "Kiadasok" sor), tételes/névvel ellátott kiadás-lista **nincs benne**. Ha van egy külön fül/export, ahol a kiadások soronként, dátummal és megjegyzéssel (pl. "Csongi", "Tommy", "Svájc") szerepelnek, azt is töltsd fel, és ugyanígy végigmegyek rajta.

## 4. Q2 2025 (április–június) — itt már volt tételes kiadás is

A Q2 CSV más formátumú: nincs jobb oldali összesítő tábla, viszont 5 tiszta oszlopa van (`Bevetel`, `Res`, `Kiadas`, `Arulas`) — a kiadás-tételek (negatív szám a `Kiadas` oszlopban) **soronként, névvel** szerepelnek. Ez pontosan az, amit kértél (Csongi/Tommy/Svájc-szerű bontás).

Két újabb formátum-csapda, amit itt találtam:
- Ez a fájl **DD.MM.ÉÉÉÉ** sorrendet használ (nap.hónap), a Q1 fájl viszont MM.DD-t — tehát **fájlonként külön kell eldönteni**, nem lehet egy közös szabályt ráhúzni. Itt a "17.06.2025" sor (17 nem lehet hónap) árulta el a sorrendet.
- Június 17. után a dátumok végén **pont** van ("18.06.2025.") — ez simán kicsúszott az első reguláris kifejezésen, és majdnem tévesen az előző napi tételként számolta be a teljes napi bevételt. Javítva.

### Bevétel-bontás (ugyanaz a 3 kategória, mint Q1-nél)

| Hónap | Telefon | Szerviz | Tartozék | Egyéb |
|---|---|---|---|---|
| Április | 23 727 Lej (59,0%) | 10 342 Lej (25,7%) | 5 745 Lej (14,3%) | 403 Lej (1,0%) |
| Május | 29 341 Lej (62,7%) | 10 270 Lej (22,0%) | 5 445 Lej (11,6%) | 1 728 Lej (3,7%) |
| Június | 43 581 Lej (67,6%) | 10 582 Lej (16,4%) | 9 250 Lej (14,4%) | 1 045 Lej (1,6%) |

(Q1: 69,5→67,9→60,4% telefon, Q2: 59,0→62,7→67,6% — a szerviz-arány Q1 végén megugrott, Q2-ben visszaállt 16-26% közé; ez inkább szezonális ingadozásnak tűnik, nem tartós trendnek.)

### Kiadás-bontás — ÚJ, a `monthly_summaries` táblán is (`expense_phone_stock`, `expense_accessory_stock`, `expense_tax`, `expense_other`)

| Hónap | Telefon-beszerzés | Alkatrész/tartozék-beszerzés | Adó | Egyéb (rezsi, üzemanyag, hatósági, visszatérítés, iroda) |
|---|---|---|---|---|
| Április | 21 166 Lej (75,8%) | 4 537 Lej (16,3%) | 0 | 2 203 Lej (7,9%) |
| Május | 29 633 Lej (75,1%) | 3 215 Lej (8,1%) | 5 184 Lej (13,1%) | 1 435 Lej (3,6%) |
| Június | 42 099 Lej (83,4%) | 5 844 Lej (11,6%) | 0 | 2 530 Lej (5,0%) |

A "telefon-beszerzés"-t a te megadott kulcsaid alapján ismertem fel: **Tommy**, **Svájc/csingó**, plusz **SEP**, **GSMnet**, **Dom Mobile** nevű tételek (ezek is telefon-nagykereskedők, nem csak Tommy/Svájc), és az egyedi telefonmodell + IMEI-szerű tételek (pl. "samsung a35 356192194062019" -1499). Az "adó" sor a **májusi "adó 3 hónapra" -5 184 Lej** tétel — ez egyenesen kapcsolódik a korábban megírt `TASKS_BEREK_ADOK.md`-hez, ott ez pontosan a "cég-szintű adó" kategória egy valós, konkrét példája.

**Fontos, tisztán mondva:** ez a 4 kiadás-kategória **saját magával** összead pontosan (mert a saját tétel-log összegemből számoltam), de **nem egyezik pontosan** a `monthly_summaries` hivatalos `expenses` oszlopával (pl. június: az én tétel-log összegem -50 473, a hivatalos `expenses` -40 174). Ennek látszik egy oka: néhány telefon-eladásnál a beszerzési ár **ugyanazon a napi soron, ugyanakkora negatív `Kiadas` tételként** szerepel, mint amennyi bevételként be lett írva (feltehetően azért, hogy a "Res" margin-oszlop helyesen jöjjön ki) — ezek részben már benne lehetnek a hivatalos `Margin`/`Kiadasok` számításban is, más módon. Ha ez zavaró, jelezd, és megnézem pontosan, hogyan számolta ezt az eredeti táblázat, hogy a kettő tényleg összeérjen.

## 5. Nyitott, a következő negyedéveknél / Szentgyörgynél

- Formátum-felismerés fájlonként újra ellenőrizendő (dátum-sorrend, záró pont, esetleges új oszlop-elrendezés).
- A kulcsszó-listát bővíteni kell, ha más termékkör/elnevezés fordul elő.
- A kiadás-kategóriák finomíthatók (jelenleg "Egyéb" alá esik: rezsi, üzemanyag, hatósági díj, visszatérítés, iroda — ha ezekre is külön bontás kell, szólj, az adat megvan hozzá, csak külön oszlopokba kell szedni).
- **Áttekintő oldal** (kérted: "a cég élete elejétől, 2024 novemberétől máig, összbevétel, eloszlások, kiadások") — az adat most már megvan hozzá (Nov 2024 – Jún 2025 Gyimes, bevétel/kiadás/kategória-bontással ahol volt hozzá forrás), de ehhez a Dashboard trend-grafikonját (`MonthlyTrendChart.jsx`) bővíteni kell, hogy ezeket az új oszlopokat is megjelenítse. Ez még nincs megépítve — szólj, ha ez legyen a következő lépés.
