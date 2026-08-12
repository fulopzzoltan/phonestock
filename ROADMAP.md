# PhoneStock — Roadmap

Utolsó frissítés: 2026-08-12

Cél ezzel a fájllal: legyen egy közös referencia arról, hol tart az app, és mi a sorrend, amivel haladunk. Fázisokban gondolkodunk (Most / Következő / Később), konkrét dátum nélkül — frissítjük, ahogy haladunk.

---

## Hol tartunk most

Kb. 1 hét fejlesztés alatt (aug 7–12) egy éles, működő appot építettünk két helyszínre (Gyimes, Szentgyörgy).

### Kész

- **Auth + szerepkörök** — admin mindent lát, employee csak a saját helyszínét (RLS-sel kikényszerítve)
- **Dashboard** — napi KPI-k egy helyen: készlet érték, várható profit, szerviz állapotok, bevétel/kiadás, alkatrész raktár érték, ügyfél bevétel + készletérték trend grafikon
- **Telefonok (készlet)** — helyszínenkénti bontás, keresés, termékfotó feltöltés, új/felújított állapot+grade
- **Szerviz** — 3 oszlopos kanban (Átvett / Javítás alatt / Átadásra) sub-státuszokkal, SLA határidő jelzés, alkatrész-felhasználás automatikus raktárlevonással és árbaépítéssel
- **Alkatrészek** — közös raktár mindkét helyszínnek, kategóriázva
- **Bevételek & Kiadások** — napi/heti/havi nézet, gyorsgombok tartozék-eladásra (upsell), margin tracking
- **Kliensek** — ügyfél dedup, vásárlási/szerviz történet
- **Garanciális** — digitális + nyomtatható garanciajegy, publikus lookup ügyfélnek (token linkkel vagy szám+telefonszám kereséssel)
- **Felhasználók** (admin) — szerepkör és helyszín kiosztás
- **Kuka** — soft delete + visszaállítás + **végleges törlés** (FK-ütközés esetén érthető hibaüzenettel)
- **Publikus stock showcase** — landing page, ahol bárki böngészheti a készletet bejelentkezés nélkül
- **SMS-értesítés (ClickSend)** — ügyfél automata SMS-t kap munkalap felvételkor és amikor kész a szerviz, mindkettő rövid követő linkkel (`/s/xxxxxxxx`)
- **Kliensek — vásárlási/szerviz előzmény** — ügyfél profilban látszik minden korábbi telefon-vásárlás és munkalap, összesített értékkel
- **Kötelező telefonszám eladásnál** — a Kliensek/SMS/garancia-lánc innentől nem tud "lyukas" ügyfélrekorddal indulni
- **SMS-hiba láthatóvá téve** — sikertelen küldésnél hibaüzenet jelenik meg, nem tűnik el csendben
- **Garanciális tab — hívás + emlékeztető SMS gomb** minden lejáró garanciás soron
- **Szerviz — profi szintre húzva** (ld. lent volt "Később" pont, 2026-08-12 este megvalósítva): IMEI mező a munkalapon, állapotfotók átvételkor, alkatrész-eredet (OEM/Utángyártott) + beszállítói cikkszám, 4. kanban-oszlop mint explicit QC/tesztelés lépés `qc_by`/`qc_at` mezőkkel, technikus-hozzárendelés (`assigned_to`), digitális ügyfél-beleegyezés checkbox + időbélyeggel
- **Kliensek — valódi táblára átépítve** (ld. `TASKS_CUSTOMERS.md`, 2026-08-12 este megvalósítva): eddig az ügyfél csak számolt/származtatott adat volt a `transactions`/`service_tickets` telefonszám-egyezéséből, nem volt szerkeszthető, nem lehetett vásárlás nélkül felvenni, és a `customer_name`/`customer_phone` szöveges mezők megmaradtak backward-compatible módon. Most: saját `customers` tábla (`phone_norm` generated column a dedupra), `upsert_customer` security-definer RPC (csak `authenticated`-nek, anon nem hívhatja) find-or-create eladásnál/munkalap-felvételnél, `customer_id` FK a `transactions`/`service_tickets` táblákon (backfillelve a meglévő adatokból), szerkeszthető ügyfél (név/telefon/email/jegyzet) `CustomerModal`-lal, "Új ügyfél" felvehető vásárlás nélkül is, külön marketing-hozzájárulás checkbox (a szervizgarancia-elfogadástól elkülönítve) eladásnál/munkalapnál. **Hiányzik még:** admin "duplikátumok összevonása" funkció a Kliensek listában (a task-lista opcionálisként jelölte, ha időhiány van).

- **Heti automata adatmentés** — a Supabase Free csomagon nincs beépített backup, ezért ütemezett feladat exportálja a teljes adatbázist (9 tábla) JSON-ba, `phonestock/backups/` mappába, 8 hetes rolling retentionnel. Ismert korlát: a termékfotókat (Storage) egyelőre nem tölti le, csak a táblákat.

### Hiányzik / félkész

- Nincs export/riport (havi zárás, Excel, könyvelésnek való kimutatás)
- Nincs beszerzési/utánrendelési javaslat a készletből
- Motoros üzlet nincs benne — most tisztán telefonos

*(Ha valamit rosszul látok fentebb, vagy van valami ami már fájóbb ennél, szólj és átrendezem.)*

---

## Most — stabilizálás

A 2026-08-12-i átnézésben talált 4 pont (kötelező telefonszám, SMS-hiba jelzés, garanciális hívás/SMS gomb, Kuka végleges törlés) **kész és a repóban van** (lásd `TASKS.md`, 4 külön commit — még nincs pusholva/deployolva).

Hátravan még:
- Kritikus flow-k élesben tesztelve: eladás → automatikus bevétel, szerviz-átadás → automatikus bevétel + garancia indul, alkatrész-felhasználás → raktárlevonás
- Jogosultság-teszt: employee tényleg csak a saját helyszínét látja/módosítja-e mindenhol
- Deploy-folyamat tisztázása — mikor és hogyan megy éles egy-egy változtatás (jelenleg csak lokális commit a szabály, amíg nem szólsz) — a 4 friss commit is push-ra vár, ha jónak látod

## Következő — ami több pénzt hoz, nem csak adminisztrál

Hormozi-elv: a legjobb feature az, ami vagy pénzt hoz be gyorsabban, vagy visszahozza az ügyfelet.

- **Riportolás** — heti/havi export, hogy lásd melyik helyszín / termékkategória hozza ténylegesen a pénzt
- **Tartozék-upsell mélyítése** — a gyorsgomb megvan, ebből lehet valódi ajánlat: pl. telefon eladásnál automatikusan felajánlott tok+fólia csomag
- **Garancia-emlékeztető rendszeresítése** — a gomb megvan a Garanciális tabon, de valakinek még mindig be kell mennie és rendszeresen végignéznie a listát; érdemes megnézni, hogy legyen-e ebből automata/heti rutin (pl. dashboard-figyelmeztetés a hamarosan lejáró garanciákra)

## Később — skálázás, ha a 2 helyszín stabilan fut

- Készlet-előrejelzés / beszerzési javaslat (mi fogy, mit kell rendelni)
- Ügyfél LTV tracking — ki vásárol vissza, ki hozza a legtöbb szervizt
- Eldönteni: a többi vállalkozás (taxi, stb.) bekerül-e egy közös rendszerbe, vagy külön marad
- PWA / mobilbarátabb felület a helyszíni gyors munkához

### Telefon készlet — profi szintre húzás (iparági gyakorlat alapján, 2026-08-12-i kutatás)

A grading (A/B/C dropdown) és az akkuegészség mező már megvan — ez jobb, mint amit a piac nagy része csinál (sok helyen ad-hoc). Ami hiányzik:

1. **IMEI blacklist-ellenőrzés vétel előtt** — a GSMA és a szolgáltatók közös adatbázisában szerepelnek a lopott/eltiltott készülékek. Ez jogi és hírnévvédelem: ha egy lopott telefon bekerül a készletbe, az a bolt baja lesz. Mező: `imei_checked_at`, `imei_status`.
2. **Lock-státusz rögzítése** (iCloud/Google fiók törölve, hálózatfüggetlen-e) — enélkül könnyen bekerülhet egy gyakorlatilag eladhatatlan tétel a készletbe.
3. **Akkuegészség-küszöb figyelmeztetés** — van `battery_health` mező, de nincs UI-jelzés, ha felújítottnál 85% alatt van (piaci minimum-elvárás, ez alatt gyakori a reklamáció).
4. **"Lassan mozgó készlet" riport** — `date_added` megvan, de nincs kiemelve, ha egy tétel 60+ napja áll a polcon (cash flow védelem).
5. Az A/B/C grading kritériumait érdemes **írásban is rögzíteni** (mit jelent pontosan egy "B" tétel), hogy konzisztens legyen helyszínek/eladók között, és hitelesen kommunikálható legyen a publikus stock oldalon is.

### Alkatrész készlet — profi szintre húzás

Az origin (OEM/Utángyártott) + beszállítói cikkszám már megvan a `parts` táblán (2026-08-12 este, a szerviz-fejlesztéssel együtt bekerült). Ami még hiányzik:

1. **Min/max küszöb + újrarendelési pont** — ipari képlet: *újrarendelési pont = átlagos napi fogyasztás × szállítási idő + biztonsági készlet*. Most semmi nem jelzi, ha kifogy egy gyakran cserélt alkatrész.
2. **Alacsony készlet figyelmeztetés** a Dashboardon vagy az Alkatrészek tabon (erre épül rá a régi "beszerzési javaslat" pont is).
3. **Időszakos leltár (cycle count)** — nincs mechanizmus a fizikai és rendszerbeli mennyiség összevetésére; kis raktárnál elég egy negyedéves "leltár mód", ami logolja az eltérést (lopás/könyvelési hiba szűrése).

### Szerviz — profi szintre húzás ✅ kész (ld. fent a Kész listában)
