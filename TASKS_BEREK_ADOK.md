# TASKS — Bérek & adók nyomon követése (admin oldal)

> "kikellene dolgozz admin reszre egy olyan oldalt ahol nyomon tudjuk kovetni hogy kifizettuke az adokat a ket cegnek, illetve mikor van az alkalmazottaknak a fizetese... illetve minden honapban fizetunk a munkas utan adot a kezere és a telefonosra is kulon, dolgozd ki ezt majd a designal keszittetek ra verziokat es akkor epitodik meg"

Ez egy **terv/spec** — nincs benne kód vagy DB-migráció. Szándékosan, mert te írtad: előbb a design készít rá verziót, csak utána épül meg. Ez a dokumentum azt rögzíti, hogy *mit* kellene tudnia az oldalnak, hogy a design ne találgasson.

## 0. Amit a mai adatból megerősítettem

Megnéztem a `locations` táblát — ott **már ma is van** `company_name`/`company_cui` mező, és ki van töltve:

| Helyszín | Cégnév | CUI |
|---|---|---|
| Gyimes | **TELEFONOS S.R.L.** | 50623366 |
| Szentgyörgy | **Telefonos Keze S.R.L.** | 51785064 |

Ebből indulok ki: a **"két cég"** = ez a két SRL, azaz a két helyszín egyben két külön cégbejegyzés is. (Ha nem erre gondoltál — pl. a taxis vállalkozásra is szeretnéd idehozni —, szólj, mert az más adatmodellt igényel.)

A `profiles` táblában két fizetést kapó ember van ma:
- **Gercui Kinga** — employee szerepkör, Gyimes helyszínhez rendelve
- **Hajdu Krisztina** — admin szerepkör (!), Szentgyörgy helyszínhez rendelve

Fontos: Krisztina a rendszerben **admin**, nem employee — a bérnyilvántartásnak ettől függetlenül kell működnie, nem kötném a `profiles.role`-hoz. Egy önálló "dolgozó" fogalom kell, ami csak annyiban kapcsolódik a `profiles`-hoz, hogy *ha* van neki bejelentkezése, azt hozzá lehet linkelni — de nem kötelező (később jöhet olyan alkalmazott is, akinek nincs admin-fiókja).

Nincs a DB-ben ma semmilyen bér/adó/fizetés-tábla — ez egy teljesen új terület.

## 1. Amit a kérésből kiolvastam — két külön nyilvántartás

### 1.1 Cég-szintű adók (2 SRL, havi tételek)

Havonta vissza kell tudni jelölni: *"a Gyimesi cégnek kifizettük-e ezt-és-ezt az adót"* — külön a két SRL-re. Nem tudom, nálatok pontosan milyen adónemek futnak (mikro-vállalkozási adó, ÁFA, helyi adó, stb.) — ezt neked kell megadnod, a listát szabadon bővíthetővé teszem, hogy ne kelljen kitalálnom.

### 1.2 Dolgozói bérek (ismétlődő, napra pontos ütemezéssel)

A leírt sémából ez jön ki:

| Dolgozó | Tétel | Nap | Összeg |
|---|---|---|---|
| Kinga | Előleg | 1. | 1500 Lej |
| Krisztina | Előleg | 10. | 1500 Lej |
| Kinga | Fizetés | 15. | 1000 Lej + előző havi árbevétel 1,5%-a |
| Krisztina | Fizetés | 25. | 2300 Lej |

Ez egy **ismétlődő sablon** (mindig ugyanaz a nap/összeg-logika hónapról hónapra), amiből minden hónapra generálódik egy konkrét, kipipálható tétel — ha egy hónapban másképp alakul (pl. változik az összeg), azt az adott hónapi tételen felül lehessen írni anélkül, hogy a sablon megváltozna.

### 1.3 Munkáltatói adó a bér után

Ezt a mondatot — *"minden honapban fizetunk a munkas utan adot a kezere és a telefonosra is kulon"* — úgy értelmezem, hogy a dolgozó után fizetett adó/járulék **cégenként külön** könyvelendő (mivel a két dolgozó két külön SRL-hez tartozik, a rájuk eső adó is a saját cégük adó-listájában jelenik meg). Ha ez nem így van — pl. van egy "kézhez" kifizetett rész és egy hivatalos bérrész, amit külön adóznak —, ezt pontosítsd, mert ez számít a 3. nyitott pontban.

Egyelőre úgy tervezem, hogy ez egy **saját, havonta kézzel beírt összeg** dolgozónként (nem próbálok RO bérszámfejtési képletet — CAS/CASS/jövedelemadó — automatikusan kiszámolni, mert nem ismerem a pontos konstrukciótokat, és egy rossz automatikus képlet rosszabb, mint egy üres mező, amit te/a könyvelőd tölt ki).

## 2. Javasolt adatmodell (csak terv, nincs migrálva)

```sql
-- 2.1 Dolgozók — független a profiles-tól, opcionálisan linkelhető hozzá
create table employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  location_id uuid references locations(id),     -- melyik céghez/helyszínhez tartozik
  profile_id uuid references profiles(id),        -- opcionális, ha van neki admin/employee fiókja
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2.2 Ismétlődő bér-sablon soronként (Előleg / Fizetés / stb.)
create table payroll_schedule (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  label text not null,                 -- "Előleg", "Fizetés", "Munkáltatói adó"
  pay_day int not null check (pay_day between 1 and 31),
  base_amount numeric not null default 0,
  commission_pct numeric,              -- pl. 1.5 — nullable, ha nincs jutalék
  commission_basis text,               -- pl. 'előző havi árbevétel (helyszín)' — szabad szöveg egyelőre
  active boolean not null default true,
  sort_order int not null default 0
);

-- 2.3 Az adott hónapra ténylegesen generált/kipipálható sor
create table payroll_payments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  schedule_id uuid references payroll_schedule(id),  -- null, ha eseti/ad-hoc tétel
  period date not null,                -- hónap 1. napja, pl. 2026-09-01
  label text not null,
  due_date date not null,
  computed_amount numeric,             -- amit a sablon+jutalék-képlet kiadott
  paid_amount numeric,                 -- ténylegesen kifizetett (ha eltér, itt látszik)
  paid boolean not null default false,
  paid_date date,
  note text,
  unique (employee_id, schedule_id, period)
);

-- 2.4 Cég-szintű (nem dolgozóhoz kötött) havi adótételek
create table company_tax_obligations (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id),
  tax_type text not null,              -- szabadon bővíthető lista, ld. 3. nyitott pont
  period date not null,
  due_date date,
  amount numeric,
  paid boolean not null default false,
  paid_date date,
  note text,
  unique (location_id, tax_type, period)
);
```

RLS: ez a legérzékenyebb adat az egész appban (bér + adó) — javaslat: kizárólag `role = 'admin'` érje el (sem az employee, sem a publikus RPC-k ne lássák), tehát új admin-only policy mindkét táblára, employee-knek nincs erre menüpontja sem.

## 3. Funkcionális oldal-terv (a designnak ehhez kell verziót készítenie)

Egy új admin menüpont, pl. **"Bérek & Adók"**, csak admin szerepkörnek látható. Felül hónapválasztó (mint a többi pénzügyi nézetnél).

**A) Cég-adók blokk** — 2 kártya, egy-egy a két SRL-nek (cégnév + CUI a kártya fejlécén). Kártyánként lista a hónap adótételeiről: adónem, összeg, határidő, kifizetve-kapcsoló + dátum. "+ Új adótétel" gomb szabad adónév-beírással (nem zárt lista, hogy ne kelljen előre kitalálnom az összes RO adónemet).

**B) Bérek blokk** — dolgozónkénti kártya/sor (Kinga, Krisztina, bővíthető). Minden dolgozónál a hónap sablon-tételei (Előleg/Fizetés/Munkáltatói adó) kipipálható listaként: nap, számított összeg (ha van jutalék, mutassa a bontást: "1000 + 1,5% × 45 000 Lej = 1675 Lej"), kifizetve-kapcsoló + dátum, és felülírható végösszeg, ha a tényleges eltér.

**C) Fejléc-KPI-k** — pl. "E havi teljes bér-kötelezettség", "Ebből kifizetve", "Hátralévő adó ez hónapban" — ugyanaz a statcard-minta, mint a Dashboardon.

**D) Beállítások (dolgozók/sablonok kezelése)** — külön kis admin-nézet vagy modal, ahol dolgozót fel lehet venni, és a bér-sablon sorait (nap, összeg, jutalék %) szerkeszteni — enélkül minden hónapban kézzel kellene újra beírni ugyanazt.

## 4. Amit tisztázni kell, mielőtt ez éles terv lesz

- **"Két cég" tényleg a két SRL (Gyimes/Szentgyörgy)?** — a fenti adat ezt támasztja alá, de szólj, ha mást gondoltál (pl. a taxis vállalkozást is ide szeretnéd).
- **Milyen adónemek fussanak alapból a cég-adók listájában?** — nem ismerem a pontos RO adókonstrukciótokat (mikro-adó? ÁFA-alanyok vagytok-e? helyi adó?) — mondd meg, milyen tételeket látnál havonta mindkét/egyik cégnél, azt beírom alapértelmezettnek.
- **A "munkáltatói adó a kezére"** — cégenként külön tétel-e (ahogy feltételeztem), vagy van egy külön "kézhez kapott" vs. "hivatalos" bontás, amit nem fedtem le?
- **Az 1,5%-os jutalék alapja** — a Kinga helyszínén (Gyimes) az előző havi *összes* bevétel, vagy csak bizonyos kategóriák (pl. csak telefon-eladás, szerviz nélkül)? Ez pontosan számít, mert ez tényleges pénz.
- **Ki lát rá erre az oldalra?** — csak te (admin), vagy Krisztina/Hajdu Endre is admin lévén hozzáférhet a saját bérükhöz is? (Ha zavaró, hogy Krisztina a saját bérét is látná egy admin-only nézetben, azt külön kell kezelni.)

---

## Ellenőrzőlista (majd, ha jön a design + engedélyt adsz az építésre)

- `employees`, `payroll_schedule`, `payroll_payments`, `company_tax_obligations` táblák létrehozva, admin-only RLS
- Kinga/Krisztina felvéve dolgozóként, a fenti 4 sablon-tétellel
- Havi generálás logika (a hónap megnyitásakor, ha nincs még `payroll_payments` sor az adott sablonhoz/periódushoz, számolja ki és mutassa "esedékes" állapotban)
- Jutalék-számítás a megfelelő bevétel-kategóriákból (a nyitott kérdés eldőlése után)
- Admin oldal: cég-adók blokk, bérek blokk, KPI fejléc, dolgozó/sablon-szerkesztő
- `npm run build` hibamentes
- Nincs `git push`, csak lokális commit
