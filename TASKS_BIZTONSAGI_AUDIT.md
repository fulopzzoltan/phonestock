# Biztonsági audit + kódminőségi átvilágítás — PhoneStock (2026-09-01)

Módszer: Supabase beépített security/performance advisor lefuttatása, RLS-policy-k és
SECURITY DEFINER függvények definícióinak közvetlen SQL-lekérdezése (nem csak a
kliens-kód nézete), a publikus (bejelentkezés nélküli) útvonalak és RPC-k átnézése,
grep a kódbázison gyakori hibaosztályokra (secrets, `eval`, `dangerouslySetInnerHTML`,
`console.log`), `npm audit`, fájlméret/duplikáció-vizsgálat.

**Összkép: a fő architektúra (RLS mindenhol bekapcsolva, admin vs. helyszín-szintű
policy-k, publikus oldalak szűk SECURITY DEFINER RPC-ken keresztül, admin-felület
külön originen) alapvetően jól átgondolt.** A lenti listán 2 valóban kritikus,
kihasználható hiba van (mindkettő a webshop-checkout, ami "fejlesztés alatt" jelöléssel
fut), a többi közepes/alacsony súlyú, inkább hardening és kódminőség.

---

## KRITIKUS — ezeket érdemes elsőként megnézni

### 1. `mark_web_order_paid` — bárki ingyen "kifizetettre" állíthat egy webshop-rendelést

A `PaymentMock.jsx` (jelenleg élesen elérhető `/fizetes/:token` útvonalon, explicit
"TESZT FIZETŐOLDAL" felirattal, mert "a valódi Netopia-fizetés bekötése folyamatban
van") a `mark_web_order_paid(p_token)` RPC-t hívja meg — és ez az RPC **semmilyen
fizetési visszaigazolást nem ellenőriz**, csak annyit csinál:

```sql
update web_orders set status = 'fizetve' where public_token = p_token and status = 'uj';
```

A `public_token` egy random UUID, amit a vásárló amúgy is megkap a rendelés
leadásakor (`create_web_order` visszaadja) — tehát **bárki, aki leadott egy
rendelést, a böngésző konzoljából egyetlen `supabase.rpc('mark_web_order_paid', ...)`
hívással "kifizetettre" tudja állítani, fizetés nélkül.** Ha a raktárkezelés/kiszállítás
a `status = 'fizetve'` alapján dönt arról, hogy a telefon kimehet-e, ez közvetlen
pénzügyi kockázat, amint a webshop élesben fut.

**Javaslat:** amíg a valódi Netopia-integráció nincs kész, vagy (a) a checkout-ot
teljesen vegyétek le/rejtsétek el (ne legyen élesen elérhető "fizetés" gomb, ami
valójában nem fizet), vagy (b) a `mark_web_order_paid`-et kössétek egy szerver-oldali,
aláírt webhook-hoz (amit csak a fizetési szolgáltató hívhat, titkos aláírással
ellenőrizve), ne egy kliensről bárhonnan hívható RPC-hez.

### 2. Nincs se lejárat, se korlátozás a rendelés-létrehozáson — készlet-blokkolási támadás

A `create_web_order` lefoglalja a kiválasztott telefonokat (`stock_status = 'lefoglalt'`),
de a `web_orders` táblán **nincs lejárati időbélyeg**, és nincs semmi (rate-limit,
CAPTCHA), ami megakadályozná, hogy valaki emberi felügyelet nélkül, sokszor egymás
után meghívja ezt az RPC-t. Egy támadó így **az összes raktáron lévő telefont
"lefoglalt" állapotba tudja tenni**, anélkül hogy valaha fizetne vagy lemondaná —
a valódi vásárlók nem tudnának semmit megvenni, a készlet "eltűnik" a boltból.

**Javaslat:** adjatok a `web_orders`-nek egy lejárati mezőt (pl. 30 perc), és egy
időzített feladatot (Supabase cron / edge function), ami a lejárt, még 'uj' státuszú
rendeléseket automatikusan lemondja és felszabadítja a foglalt készletet — plusz
alap rate-limit a `create_web_order`-re.

---

## KÖZEPES

### 3. Telefonszám önmagában elég valaki teljes vásárlási/szerviz-előzményének megtekintéséhez

A publikus `/status` és `/receipt` kereső űrlap (`get_ticket_status_by_phone`,
`get_receipt_by_phone`) **kizárólag telefonszám alapján** keres, és visszaadja az
adott számhoz tartozó összes (max 15) munkalapot/bizonylatot — névvel, árral,
hűségpont-egyenleggel, referral-kóddal együtt. A `CLAUDE.md` "munkalapszám+telefonszám
kereső űrlap"-ot ír le, de a ténylegesen futó kód **csak telefonszámot kér** —
ez egyfaktoros, és a telefonszám nem titok (könnyen megszerezhető máshonnan).

**Javaslat:** vagy vezessetek be egy második azonosítót is (pl. az utolsó munkalap-
/bizonylatszám 4 számjegye), vagy legalább rate-limiteljétek az RPC-t, hogy ne
lehessen automatizáltan végigpróbálni telefonszámokat.

### 4. "Leaked Password Protection" kikapcsolva (Supabase Auth beállítás)

A Supabase automatikus advisor jelezte, hogy a jelszó-szivárgás elleni védelem
(HaveIBeenPwned-ellenőrzés regisztrációkor/jelszóváltáskor) ki van kapcsolva.
Mivel a `CLAUDE.md` szerint "bárki regisztrálhat", ez egy gyors, ingyenes hardening:
Supabase Dashboard → Authentication → Policies → kapcsold be.

### 5. Nincsenek alap biztonsági HTTP fejlécek

A `netlify.toml`-ban csak cache-header van, nincs `Content-Security-Policy`,
`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`. Ez nem akut sebezhetőség,
de egy admin-felületnél (még ha külön originen is fut) érdemes alap védelmet
beállítani clickjacking és MIME-sniffing ellen.

### 6. `anon` szerepkör tábla-szintű GRANT-jai nagyon szélesek — az egész védelem az RLS-en áll

Minden érzékeny táblán (bér, adó, alkalmazottak, ügyfelek, tranzakciók) az `anon`
Postgres-szerepkörnek technikailag SELECT/INSERT/UPDATE/DELETE joga van — ez a
Supabase alapértelmezett mintája, és jelenleg **minden ellenőrzött táblán helyesen
zárja az RLS policy** (leteszteltem: `current_role()`/`current_location_id()` NULL-t ad
vissza anonim/nem-staff felhasználóra, ami a policy-kban helyesen `false`-ra értékelődik
ki). Tehát ma nincs kihasználható rés emiatt — de architekturálisan ez azt jelenti,
hogy **egyetlen jövőbeli RLS-policy hiba önmagában teljes adatkiszivárgáshoz vezethet**,
mert nincs második védelmi réteg.

**Javaslat (nem sürgős, hardening):** ahol lehet, `REVOKE` a felesleges alapértelmezett
jogokból az `anon`/`authenticated` szerepkörtől azokon a táblákon, amikhez nincs
közvetlen kliens-oldali hozzáférés (csak RPC-n keresztül érhetők el) — pl. `employees`,
`payroll_payments`, `payroll_schedule`, `company_tax_obligations`.

---

## MÁR JAVÍTVA / JÓL MEGCSINÁLVA (nem akcióelem, csak megerősítés)

- **Jogosultság-eszkaláció ellen már véd a rendszer**: külön adatbázis-trigger
  (`prevent_self_privilege_escalation`, `protect_profile_privileges`) tiltja, hogy
  egy nem-admin felhasználó a saját `profiles` sorában megváltoztassa a `role`
  vagy `location_id` mezőt — ellenőriztem, működik. (Van viszont egy kis
  duplikáció, lásd lent.)
- RLS mindenhol be van kapcsolva, nincs kimaradt tábla.
- Nincs commitolt titok a repóban (`service_role` kulcs, `.env` sehol), az anon
  kulcs a `netlify.toml`-ban szándékosan publikus (ez helyes Supabase-mintázat).
- `npm audit`: 0 sebezhetőség.
- Nincs `eval(...)` vagy `dangerouslySetInnerHTML` a kódban.
- Admin-felület külön Netlify site-on, külön originen fut a publikus webshoptól
  (jó elkülönítés, session-átszivárgás ellen).
- A publikus oldalak nem közvetlen tábla-hozzáféréssel, hanem szűk, célzott
  SECURITY DEFINER RPC-kkel dolgoznak — ez a helyes minta nyílt `anon SELECT`
  helyett.

---

## KÓDMINŐSÉG / EGYSZERŰSÍTÉSI JAVASLATOK

### A. `App.jsx` — 3074 sor egyetlen fájlban

Ez messze a legnagyobb fájl a repóban (a második legnagyobb, `CustomerPortal.jsx`,
646 sor — nagyságrendekkel kisebb). Minden state, minden `useMemo`-statisztika,
minden CRUD-handler egy helyen van. Ez konkrétan **okozott is problémát ebben a
sessionben**: a párhuzamosan futó másik Claude Code session és ez a session
folyamatosan git-lock ütközésbe futott ugyanazon fájlok szerkesztésekor.

**Javaslat:** a domain-logikát (készlet-statisztikák, szerviz-statisztikák,
pénzügyi számítások) érdemes lenne kiszedni saját hook-okba
(`useStockStats`, `useServiceStats`, `useFinanceStats` stb.) `src/hooks/` alá,
és/vagy a CRUD-műveleteket a megfelelő `src/tabs/*Tab.jsx` fájlokba mozgatni.
Ez nem csak olvashatóság, hanem konkrét, mérhető munkafolyamat-probléma (merge-ütközés)
megoldása is.

### B. Duplikált adatbázis-trigger logika

`prevent_self_privilege_escalation` és `protect_profile_privileges` **szó szerint
ugyanazt** csinálja (mindkettő a `profiles.role`/`location_id` admin-only módosítását
kényszeríti ki, `BEFORE UPDATE` trigger-ben). Valószínűleg két különböző munkamenet
függetlenül fixálta ugyanazt a hibát. Nem veszélyes, de felesleges — ha az egyiket
később módosítjátok és a másikat elfelejtitek, inkonzisztencia lehet belőle.
Javaslat: egyet megtartani, a másikat törölni.

### C. `CLAUDE.md` néhol elavult a tényleges kódhoz képest

Pl. a publikus `/status` keresőt "munkalapszám+telefonszám" kettős azonosítóként
írja le, a valóságban csak telefonszámot kér (ld. fenti #3 pont). Érdemes a
projekt-dokumentációt frissen tartani, mert ez pont az a fájl, amit minden jövőbeli
Claude-session (és bárki más) elsőként olvas — ha téves, rossz feltételezésekre épül
a további munka.

### D. `TASKS_*.md` fájlok felhalmozódása a repo gyökerében

Jelenleg 10+ `TASKS_*.md` fájl van közvetlenül a projekt gyökerében (import-napló,
spec-ek, ez az audit is). Working-note-ként rendben van, de érdemes lehet egy
`docs/` vagy `notes/` alkönyvtárba rendezni, és a lezárt/megvalósult terveket
egy `docs/archive/` alá mozgatni, hogy a gyökér ne nőjön tovább kontroll nélkül.

### E. Supabase performance-advisor talált még (nem biztonsági, de érdemes egyszer átnézni)

- 15 idegen kulcs index nélkül (`Unindexed foreign keys`) — lassíthatja a JOIN-okat
  és az RLS-policy-kiértékelést, ahogy nő az adatmennyiség.
- ~35 tábla RLS-policy-ja `auth.uid()`-t / saját függvényt (`current_role()` stb.)
  hív soronként újra-kiértékelve (`Auth RLS Initialization Plan`) — Supabase
  ajánlása szerint `(select auth.uid())` formában cache-elhető lenne lekérdezésenként.
- ~15 sosem használt index (`Unused Index`) — törölhető, kicsit gyorsítja az írásokat.
- ~15 tábla, ahol több megengedő (`permissive`) policy fedi ugyanazt a műveletet —
  ezek mindegyike lefut minden lekérdezésnél, összevonhatók.

Ezek egyike sem sürgős a jelenlegi méretnél, de ha a forgalom nő, érdemes egy
külön kört rájuk szánni.

---

## Prioritási sorrend, ha csak néhányat csinálnátok meg most

1. `mark_web_order_paid` — zárjátok el vagy kössétek valódi fizetéshez, **mielőtt**
   a webshop-checkout-ot bárkinek hirdetitek.
2. Rendelés-lejárat + rate-limit a `create_web_order`-re.
3. Leaked Password Protection bekapcsolása (2 perc, Supabase Dashboard).
4. Telefonszám-alapú publikus kereső megerősítése (2. azonosító vagy rate-limit).
5. A többi (security headerek, GRANT-szűkítés, `App.jsx` bontása, duplikált trigger)
   ráérősen, amikor időtök engedi.
