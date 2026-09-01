> **FONTOS KORREKCIÓ (lásd 8. szakasz):** a lenti táblázatokban a telefon/szerviz bevétel-bontás egy ideig hibás volt, mert az "lcd" szó (pl. "redmi 9a lcd" = kijelző-csere) nem szerepelt a szerviz-felismerő kulcsszavak közt, így ezek tévesen telefon-eladásként lettek számolva. Ez 2026-09-01-én javítva lett, és a `monthly_summaries` teljes Gyimes-történelme (2025 jan – 2026 aug) újra lett számolva/frissítve. A lenti táblázatok szövege NEM lett visszamenőleg átírva (történeti feljegyzés), de a DB-ben már a javított számok vannak — az aktuális, helyes bontásért nézd az admin Áttekintés oldalt, ne ezt a fájlt.

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

## 4b. Korrekció (a te visszajelzésed alapján) — SEP/GSMnet/ServicePack/369/ThenX

Rámutattál, hogy a "telefon-beszerzés" kategóriába tett SEP/GSMnet/ServicePack/369/ThenX/telcsik/fisa tételek **többségében szerviz-oldali** (alkatrész-utánpótlás javításhoz, nem telefon-egység vásárlás) — ez saját/kliens felosztásban megoszlik, de a fő kategória szerviz. Emellett a Dom Mobile és Partnertele **tartozék-beszerzés**, nem telefon. Ezt javítottam, a Q2-es adat frissítve a DB-ben:

| Hónap | Telefon-beszerzés | Szerviz-alkatrész | Tartozék-beszerzés | Adó | Egyéb |
|---|---|---|---|---|---|
| Április | 13 034 Lej (46,7%) | 6 532 Lej (23,4%) | 6 137 Lej (22,0%) | 0 | 2 203 Lej (7,9%) |
| Május | 17 719 Lej (44,9%) | 10 899 Lej (27,6%) | 4 230 Lej (10,7%) | 5 184 Lej (13,1%) | 1 435 Lej (3,6%) |
| Június | 33 327 Lej (66,0%) | 6 637 Lej (13,1%) | 7 979 Lej (15,8%) | 0 | 2 530 Lej (5,0%) |

## 5. Q3 2025 (július–szeptember) — itt már a KÖNYVELŐ IS kategorizált

A Q3 CSV egy teljesen új, jobb formátum: a szokásos `Bevetel/Res/Kiadas/Arulas` mellett **7 további oszlop** van (`Kartyas Vasarlas`, `telefonok`, `aru`, `marketing`, `befektetes`, `kiadas`, `szerviz`) — a kiadás-tételek egy részét **már ti magatok kategorizáltátok**, egy pozitív szám kerül a megfelelő oszlopba. 234 kiadás-sorból 101-et így, expliciten be tudtam olvasni — ahol nem volt ilyen jelölés, ott a kulcsszavas becslést használtam (a te mai pontosításoddal: konkrét telefonnév → telefonvásárlás, Orange/feltöltés → telekom-feltöltés kiadás, "csomag" említés → többnyire szerviz-oldali).

### Bevétel-bontás

| Hónap | Telefon | Szerviz | Tartozék |
|---|---|---|---|
| Július | 47 155 Lej (71,1%) | 9 867 Lej (14,9%) | 8 442 Lej (12,7%) |
| Augusztus | 34 138 Lej (67,6%) | 8 172 Lej (16,2%) | 7 462 Lej (14,8%) |
| Szeptember | 20 305 Lej (50,0%) | 10 077 Lej (24,8%) | 9 422 Lej (23,2%) |

Szeptemberben feltűnő a szerviz+tartozék arány megugrása (50% telefon a szokásos 60-70% helyett) — érdemes lehet megnézni, mi történt (kevesebb telefon-eladás, vagy csak kevesebb új készlet érkezett be).

### Kiadás-bontás — most már `expense_marketing`, `expense_investment`, `expense_payroll` oszlopokkal is bővült a `monthly_summaries`

| Hónap | Telefon | Szerviz-alkatrész | Tartozék | Befektetés | Adó | Bér | Egyéb |
|---|---|---|---|---|---|---|---|
| Július | 29 853 (57,7%) | 5 770 (11,1%) | 5 495 (10,6%) | 7 234 (14,0%) | 0 | 0 | 3 406 (6,6%) |
| Augusztus | 29 787 (79,1%) | 3 151 (8,4%) | 2 449 (6,5%) | 1 175 (3,1%) | 0 | 0 | 1 093 (2,9%) |
| Szeptember | 19 866 (56,5%) | 4 740 (13,5%) | 2 060 (5,9%) | 0 | 177 (0,5%) | 2 800 (8,0%) | 5 540 (15,7%) |

**Fontos találat:** szeptemberben két konkrét tétel — "előleg augusztusra" -1400 Lej és "augusztusi fizu második fele" -1400 Lej — **egyértelműen alkalmazotti bérfizetés** (ez az `expense_payroll` = 2800 Lej sor forrása). Ez direkt, valós adat a korábban megírt `TASKS_BEREK_ADOK.md`-hez — tehát a bér-nyilvántartás nem elméleti, már most is folyik a könyvelésben, csak nincs még rá admin felület.

## 6. Q4 2025 (október–december) — megint más oszlop-elrendezés, és itt lett teljes a kép

A Q4 fájl fejléce: `Bevetel, Res, Kartyas Bevetel, Kiadas, Arulas, Res, Kartyas Kiadas, Endre, Zolti`. Fontos, amit ebből megértettem:

- A `Res` oszlop **kétszer** szerepel (2. és 6. oszlop) — úgy tűnik, novembertől/decembertől a táblázat szerkezete kicsit elcsúszott, és a napi margin-összeg innentől a 6. oszlopba került. Kezeltem, de jelzem, hogy legközelebb érdemes ránézni, miért csúszott el.
- A `Kartyas Bevetel` oszlopban **negatív** számok vannak — ez nem külön bevétel, hanem egyfajta egyeztető tétel (valószínűleg "ennyi NEM készpénzben jött be, mert kártyával fizettek" — a `Bevetel` oszlop már tartalmazza a teljes összeget). Ezt nem számoltam bele semmibe, csak jeleztem.
- A `Kartyas Kiadas` oszlop (kártyával fizetett kiadások) — ide tartozik pl. **"csongi oktober" -650 Lej** — ez a te legelső, hónapokkal ezelőtti tippedet igazolja vissza: **Csongi = a könyvelő**, itt van is konkrét havi könyvelési díj két hónapban (650 Lej októberre, 350 Lej decemberre — ezt kezeltem egy új `expense_accounting` oszlopban).
- Új tétel-típusok, amik eddig nem voltak: **"ado" -1500/-1587 Lej** (havi adóbefizetés, a Q2-es negyedéves "adó 3 hónapra"-tól függetlenül), **"hitel" -1511 Lej** decemberben (hiteltörlesztés — új `expense_loan` oszlop), **"novemberi fizetes" -1637 Lej** decemberben (megint egyértelmű bérfizetés).
- Az `Endre` és `Zolti` oszlopok (a két tulajdonos/admin neve) **üresek** ebben a negyedévben — a sablonban megvannak, de még nem lettek használva. Ha egyszer kitöltődnek, az valószínűleg személyes kivét/elszámolás lesz, azt is be tudom majd olvasni.

### Fontos: november/december `expenses`/`profit` eddig HIÁNYZOTT a rendszerből — most pótoltam

A `monthly_summaries`-ben november és december revenue/margin megvolt, de a kiadás és profit mező **üres (NULL)** volt — ezt a Q4 CSV-ből most kiszámoltam és feltöltöttem:

| Hónap | Bevétel | Kiadás | Profit |
|---|---|---|---|
| Október | 34 715 Lej (már megvolt) | 20 598 Lej (már megvolt) | 14 117 Lej |
| November | 42 473 Lej (már megvolt) | **24 628 Lej (most pótolva)** | **17 845 Lej (most pótolva)** |
| December | 61 729 Lej (már megvolt) | **19 464 Lej (most pótolva)** | **42 265 Lej (most pótolva)** |

### Bevétel-bontás

| Hónap | Telefon | Szerviz | Tartozék |
|---|---|---|---|
| Október | 65,0% | 14,1% | 17,1% |
| November | 70,3% | 8,7% | 15,2% |
| December | 67,7% | 9,7% | 19,1% |

### Kiadás-bontás (a `monthly_summaries`-en `expense_accounting`, `expense_loan` új oszlopokkal bővítve)

| Hónap | Telefon | Szerviz-alkatrész | Tartozék | Adó | Könyvelés | Hitel | Bér | Egyéb |
|---|---|---|---|---|---|---|---|---|
| Október | 8 775 (42,6%) | 4 694 (22,8%) | 1 397 (6,8%) | 1 324 (6,4%) | 0 | 0 | 0 | **2 978 (14,5%) befektetés** + 1 372 (6,7%) egyéb |
| November | 8 370 (34,0%) | 6 192 (25,1%) | 4 235 (17,2%) | 1 500 (6,1%) | 650 (2,6%) | 0 | 3 000 (12,2%) | 681 (2,8%) |
| December | 7 414 (38,1%) | 6 087 (31,3%) | 957 (4,9%) | 0 | 350 (1,8%) | 1 511 (7,8%) | 1 637 (8,4%) | 1 508 (7,7%) |

Megerősítetted: októberben a "szilardka mello" -1500, "soder" -240, "toldas szabo" -1238 (összesen 2 978 Lej) valóban **befektetés/felújítás** jellegű — átraktam az `expense_investment` oszlopba.

## 6b. Q1 2026 (január–március) — itt már ÉN építettem fel a hónapot nulláról

Ez volt az első negyedév, ahol a `monthly_summaries`-ben **semmi nem volt még** Gyimesre 2026-ra (se bevétel, se semmi) — eddig mindig már meglévő sorokat egészítettem ki kategória-bontással, itt viszont a fő `revenue`/`margin`/`expenses`/`profit`/`days_open` mezőket is nekem kellett kiszámolnom a CSV-ből, és teljesen új sorként beszúrni.

Ugyanaz a 10-oszlopos formátum, mint a Q4 2025-ösnél (`Bevetel, Res, Kartyas Bevetel, Kiadas, Arulas, Res, Kartyas Kiadas, Endre, Zolti`) — az `Endre`/`Zolti` oszlop itt is üres maradt.

| Hónap | Bevétel | Rés | Kiadás | Profit | Nyitvatartási nap |
|---|---|---|---|---|---|
| Január | 47 467 Lej | 23 809 Lej | 21 072 Lej | 26 395 Lej | 20 |
| Február | 40 047 Lej | 19 484 Lej | 20 443 Lej | 19 604 Lej | 20 |
| Március | 43 488 Lej | 21 360 Lej | 24 501 Lej | 18 987 Lej | 22 |

Bevétel-bontás mindhárom hónapban nagyon stabil: **~71-72% telefon**, ~8-11% szerviz, ~13-15% tartozék — ez az eddigi negyedéveknél tapasztalt legkiegyensúlyozottabb szakasz.

Kiadás-oldalon két új, korábban nem látott tétel-típus:
- **"Svicc" / "Sviccerlend"** (Svájc/Svájcerland) — ugyanaz a svájci telefon-beszerzési forrás, mint korábban "svajci"/"csingo" néven, csak új elnevezéssel. Februárban 2 785 Lej, márciusban 1 120 Lej — telefon-beszerzésbe soroltam.
- **"radio" -3150 Lej** márciusban — nagy tétel, `expense_marketing` alá soroltam (feltételezve, hogy rádiós hirdetés) — **ezt érdemes megerősítened**, mert csak találgatás.
- **"norbinak telefonyok" -3800 Lej** márciusban — explicit "telefonok" szó van benne, egyértelműen telefon-beszerzés.

**"ndpmagazin" -2 129 Lej (február)** — megerősítetted, hogy ez is telefon-beszerzés, átraktam. Azt is jelezted, hogy a **"BSGmag"** nevű tétel (ha legközelebb előjön) szintén telefon-beszerzés — ezt felírtam, a következő negyedévnél (vagy Szentgyörgynél) a kulcsszó-listába teszem `ndpmagazin`/`bsgmag` néven, telefon-beszállítóként.

## 6c. "Q2 2026" fájl (valójában április 1 – augusztus 24) — ezzel ér össze a Gyimes-import a live rendszerrel

A feltöltött fájl neve "Q2 2026 GY.csv", de valójában **5 hónapot** fed le (április-augusztus, augusztus 24-ig, mert onnantól már az élő appot használjátok). Formátuma a Q4 2025/Q1 2026-os 10-11 oszlopos elrendezés folytatása, plusz **hónap-jelző sorok** (pl. "MAJUS" sor a hónapváltásnál, benne az adott hónap trusted összesítőjével a 3/4/5/6. oszlopban) — ezeket a script most már felismeri és kihagyja tétel-listából (korábban egy bug miatt a "MAJUS" sor kiadás-oszlopa tévesen áprilishoz lett hozzáadva, ~14 569 Lej-jel megnövelve azt — javítva).

### Bevétel-bontás (a tétel-log összege pontosan egyezik a hónap-jelző sorok trusted összegével, nincs skálázás)

| Hónap | Bevétel | Telefon | Szerviz | Tartozék | Egyéb (telekom+besorolatlan) |
|---|---|---|---|---|---|
| Április | 41 022 Lej | 26 885 (65,5%) | 4 801 (11,7%) | 7 784 (19,0%) | 1 552 (3,8%) |
| Május | 31 515 Lej | 20 022 (63,5%) | 3 099 (9,8%) | 6 642 (21,1%) | 1 752 (5,6%) |
| Június | 50 631 Lej | 35 654 (70,4%) | 5 043 (10,0%) | 8 263 (16,3%) | 1 671 (3,3%) |
| Július | 54 541 Lej | 32 123 (58,9%) | 8 794 (16,1%) | 11 484 (21,1%) | 2 140 (3,9%) |
| Augusztus (24-ig) | 44 405 Lej | 26 382 (59,4%) | 5 659 (12,7%) | 9 229 (20,8%) | 3 135 (6,7%) |

### Kiadás-bontás

Június-augusztusnál a tétel-log összege pontosan egyezik a trusted hónap-összeggel (nincs skálázás). Áprilisnál és májusnál a hónap-jelző sor trusted kiadás-összege (26 633 / 14 569 Lej) **kisebb**, mint amit a tétel-szintű összeadás ad (30 349 / 15 296) — valószínűleg volt pár tétel, amit a könyvelés máshogy nettósított. Ott a kategória-bontást arányosan lehúztam a trusted összegre, hogy a `monthly_summaries` `expenses` mezője pontosan stimmeljen a hivatalos számmal.

| Hónap | Telefon | Szerviz-alkatrész | Tartozék | Adó | Könyvelés | Bér | Egyéb |
|---|---|---|---|---|---|---|---|
| Április | 15 891 | 4 727 | 337 | 0 | 0 | 2 777 | 2 901 |
| Május | 5 856 | 3 649 | 2 775 | 0 | 0 | 1 538 | 751 |
| Június | 7 419 | 8 010 | 1 135 | 1 500 | 0 | 3 000 | 2 702 |
| Július | 13 138 | 11 495 | 2 765 | 3 316 | 400 | 3 460 | 1 204 |
| Augusztus | 5 897 | 5 756 | 2 584 | 1 703 | 0 | 3 320 | 1 331 |

A `profit` mező képlete megerősítve az összes 2026-os hónapon: **profit = revenue − expenses** (nem a rés-ből számolva).

## 6d. Az utolsó időszak + átállás az élő rendszerre — KÉT KÜLÖN TÁBLA, KÉT KÜLÖN CÉLRA

A screenshot alapján ("itt van az utolsó időszak is Gyimesből, ezzel összeér az eddigi árulás Gyimesnél ezzel a rendszerrel... a bevétel/kiadásokhoz kérlek csak ilyen havi összesítésként tedd be az adatokat, és az augusztust számítsd a te adataiddal együtt") tisztázódott, hogy **két különböző dolgot** kell táplálni:

1. **`monthly_summaries`** — a Dashboard/Áttekintés trend-grafikonjának forrása, kategória-bontással (ez a fenti 6c). Ide most bekerült április-augusztus is (`INSERT`, mert korábban 2026 áprilistól nem volt sor).
2. **`transactions`** tábla — ez táplálja a Bevételek és Kiadások fül "Korábbi hónapok" archívumát (a `TransactionsCalendar.jsx`-ben lévő `archiveMonths` logika, ami a tranzakciókat hónap szerint csoportosítja). Ide **havi összesítő sorként** (nem napi/tételes, ahogy 2024 november-december mintájára eddig ment) került be 1-1 income + 1-1 expense sor hónaponként, április-augusztus, `category='Készlet'`/`'Egyéb'`, `payment='Készpénz'`, `cost_price` = bevétel−rés (hogy az "Árrés" oszlop is stimmeljen az archívum táblában). Az augusztusi sor a részleges (24-ig tartó) CSV-ből számolt saját összeg — ez a hónap majd az élő rendszerben folytatódik szeptembertől, ott már nem lesz szükség történeti importra.

**Ezzel a Gyimes-i történeti import lezárult**: 2024 november – 2026 augusztus 24. folyamatosan megvan a `monthly_summaries`-ben (kategória-bontással 2025 januártól), és a `transactions` archívum is összeér az élő rendszerrel. Szeptembertől már csak az élő, napi rögzítés megy tovább.

## 8. "lcd" bug — szerviz-bevétel alulszámolva volt mindenhol, javítva + Gyimes teljes újraszámolás

A Szentgyörgy-import közben a tulaj rámutatott: "amikor egy telefon és utána lcd vagy szervizes megnevezések vannak, akkor azok általában szervizek" — és tényleg, a kulcsszó-lista sosem tartalmazta az "lcd" szót (csak "kijelző"-t), pedig mindkét helyszínen rendszeresen "lcd" jelöli a kijelző-cserét (pl. "redmi 9a lcd", "samsung a12 lcd"). Emiatt ezek a tételek tévesen **telefon-eladásként** lettek beszámolva szerviz helyett — méghozzá nem kis mennyiségben (Gyimesen negyedévenként 5-70 előfordulás).

Javítás: "lcd" felvéve a szerviz-kulcsszavak közé minden klasszifikátor scriptben, és **a teljes Gyimes-történelem (2025 január – 2026 augusztus, 20 hónap) újraszámolva és frissítve** a `monthly_summaries`-ben (csak a `revenue_phone`/`revenue_service` oszlopok változtak, a `revenue`/`margin`/`expenses`/`profit` fő számok nem — azok maradtak, amik voltak). A szerviz-bevétel aránya jellemzően 3-8 százalékponttal nőtt, a telefon-eladás aránya ugyanennyivel csökkent havonta.

## 9. Szentgyörgy történeti import — 2025 szeptember – 2026 augusztus (teljes negyedik, immár mindkét helyszín összeér az élő rendszerrel)

A tulaj megerősítette: Szentgyörgy 2025 szeptemberben indult ebben a rendszerben. A `monthly_summaries`-ben Szept-Dec 2025-re már volt alap `revenue`/`margin` adat (feltehetően a másik session vagy korábbi kézi bevitel), de kategória-bontás és — november/decemberre — `expenses`/`profit` sem volt.

### Formátum-változatok Szentgyörgynél (megint mások, mint Gyimesen)

- **2025 Q3** (`,Bevetel,Res,Kiadas,Endre,Zolti,Arulas,Kartyas Vasarlas`): a "Kartyas Vasarlas" oszlop itt VEGYESEN tartalmazott kártyás-fizetés jelölőt ÉS valódi kiadást is (pl. "konyvelo szeptember" -300 ide került) — ezt kézzel különválasztottam.
- **2025 Q4** (`Bevetel,Res,Kartyas Bevetel,Kiadas,Arulas,Res,Kartyas Kiadas,Endre,Zolti`): megegyezik a Gyimes Q4/Q1-2026 formátumával.
- **2026 Q1+Q2** (`,Bevetel,Res,Kartyas Bevetel,Kiadas,Arulas,Res,Kartyas Kiadas`): **új, jobb formátum** — itt már **tételszinten is szerepel a Rés** (margin) minden egyes eladott tételnél, nem csak napi összesítőként! Ez sokkal pontosabb rés-kategória-bontást tenne lehetővé (telefon/szerviz/tartozék szerinti valódi haszonkulcs), de a jelenlegi `monthly_summaries` séma csak `revenue_phone/service/accessory/other` oszlopokat ismer, `margin_phone/service/...`-t nem — ha ez érdekel, szólj, és bővítem a táblát, hogy ezt az adatot is el tudjuk tárolni és megjeleníteni (most csak a `revenue`-bontáshoz használtam fel).

### Kártyás-fizetés könyvelési műtermék (a tulaj megerősítése)

A korábbi negyedeknél talált jelenség — amikor egy sorban a Bevétel ÉS egy azzal (közel) megegyező negatív Kiadás/Kartyás-oszlop is szerepel — a tulaj szerint **kártyás fizetésnél keletkező könyvelési duplikáció**, nem valódi kiadás. Ezeket kihagytam a kiadás-összegzésből (2025 Q3-nál volt jelentős, ~4300 Lej/hónap; Q4-től és 2026-tól már elhanyagolható, ahogy a tulaj is jelezte: "q4 tól már jó").

### Szeptemberi (2025) kiadás-eltérés — rendszerbevezetés kezdeti hónapja

A rendszerben már ott lévő szeptemberi `expenses` (7800 Lej) jelentősen elmaradt a CSV tétel-szintű összegétől (kb. 15 870 Lej kártyás-műtermék nélkül) — több ezer Lejes egyedi telefon-nagykereskedelmi tétel (pl. "csomag, két iphone 13 pro" -4080) hiányzott a hivatalos számból. A tulaj megerősítette: ez azért van, mert szeptember volt a rendszer bevezetésének első hónapja, "a sheets is alakult" — tehát a CSV a pontosabb forrás. A `expenses`/`profit` mezőt frissítettem a CSV-alapú, pontosabb értékre (15 870 / 7 636).

### "ber" tétel = bérleti díj (megerősítve)

Havonta megjelenő "ber" / "oktoberi ber" / "mamának bér" (~300 Lej) tétel — a tulaj megerősítette: **bérleti díj**, a helyiséget "mamától" (családtag) bérlik. `rezsi` kategóriába soroltam.

### Eredmény — Szentgyörgy, havi bontásban (revenue / expenses / profit)

| Hónap | Bevétel | Kiadás | Profit |
|---|---|---|---|
| 2025 szept. | 23 506 | 15 870 | 7 636 |
| 2025 okt. | 30 119 | 25 651 | 4 468 |
| 2025 nov. | 30 863 | 12 803 | 18 060 |
| 2025 dec. | 49 963 | 30 463 | 19 500 |
| 2026 jan. | 25 030 | 21 813 | 3 217 |
| 2026 febr. | 18 566 | 16 339 | 2 227 |
| 2026 márc. | 18 001 | 15 566 | 2 435 |
| 2026 ápr. | 16 914 | 15 384 | 1 530 |
| 2026 máj. | 19 106 | 15 794 | 3 312 |
| 2026 jún. | 25 291 | 12 985 | 12 306 |
| 2026 júl. | 27 506 | 15 722 | 11 784 |
| 2026 aug. (21-ig) | 11 313 | 9 204 | 2 109 |

Mind a `monthly_summaries` (kategória-bontással), mind a `transactions` archívum (havi összesítő sorokként, a Gyimes-mintát követve) fel van töltve — **Szentgyörgy is összeért az élő rendszerrel**, augusztus 21-től már csak élő adat megy.

### Nyitott, tisztázatlan tételek (kis összegek, nem befolyásolják érdemben a számokat, de érdemes tudni róluk)

- **"Csabi" / "Csabinak" / "Csabinak frkre"** — rendszeresen visszatérő, 30-260 Lej közti kifizetések egy Csabi nevű személynek. Lehet alkalmi segítő/beszállító, de nem tudom biztosan — jelenleg "egyéb" kategóriában van.
- **"eco csik" / "Eco csik"** — havonta 65-317 Lej, ismétlődő tétel, nem tudom mi ez.
- **"computertrade"** (-450, június), **"valto penz"** (-1000, augusztus — lehet, hogy ez csak pénztári váltópénz-mozgatás, nem valódi kiadás), **"Fitomag"**, **"Sanyinak"** — egyedi, kis összegű tételek, "egyéb"-ben hagyva.

## 7. Nyitott, a következő negyedéveknél / Szentgyörgynél

- Formátum-felismerés fájlonként újra ellenőrizendő (dátum-sorrend, záró pont, esetleges új oszlop-elrendezés).
- A kulcsszó-listát bővíteni kell, ha más termékkör/elnevezés fordul elő.
- A kiadás-kategóriák finomíthatók (jelenleg "Egyéb" alá esik: rezsi, üzemanyag, hatósági díj, visszatérítés, iroda — ha ezekre is külön bontás kell, szólj, az adat megvan hozzá, csak külön oszlopokba kell szedni).
- **Áttekintő oldal** (kérted: "a cég élete elejétől, 2024 novemberétől máig, összbevétel, eloszlások, kiadások") — az adat most már megvan hozzá (Nov 2024 – Jún 2025 Gyimes, bevétel/kiadás/kategória-bontással ahol volt hozzá forrás), de ehhez a Dashboard trend-grafikonját (`MonthlyTrendChart.jsx`) bővíteni kell, hogy ezeket az új oszlopokat is megjelenítse. Ez még nincs megépítve — szólj, ha ez legyen a következő lépés.
