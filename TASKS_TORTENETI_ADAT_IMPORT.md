# Történeti adat import — Gyimes, 2025 Q1 (feljegyzés, nem terv)

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

## 4. Nyitott, amikor jön Szentgyörgy vagy a többi negyedév

- Ugyanez a formátum-felismerés (dátum lehet MM.DD és DD.MM keverve is egy fájlon belül — a script mindkettőt kezeli, a sorrend-folytonosságból dönti el, melyik a helyes).
- A kulcsszó-listát bővíteni kell, ha Szentgyörgyön más termékkör/elnevezés fordul elő.
- A kiadás-bontáshoz külön forrás kell (ld. 3. pont).
