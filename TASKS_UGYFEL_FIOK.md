# TASKS — Ügyfél-fiók: "Fiókom" portál (vásárlások, szervizek, garanciák, visszaküldés/garancia-igény)

## 0. Amit átnéztem, és egy kritikus felfedezés

A `flip.ro` fiókoldala (email + jelszó bejelentkezés, bal oldali menü: Vásárlásaim / Eladásaim / Garanciáim / Biztosításaim / Visszaküldéseim) jó, ismerős mintát ad — ezt követjük, a rájuk nem releváns pontok (Eladásaim, Biztosításaim — ezek marketplace-specifikusak) nélkül.

**Mielőtt belevágtam volna, megnéztem az élő adatbázist, és fontos dolgot találtam:** a jelenlegi `handle_new_user` trigger **minden** új regisztrációt (bárkit, aki a Supabase Auth-on keresztül feliratkozik) automatikusan `profiles` táblába ír be `role='employee'`-ként (az első valaha regisztrált user `admin` lesz). Ez azt jelenti, hogy **nem lehet csak úgy ráengedni az ügyfeleket ugyanarra a regisztrációs csatornára** — akkor mindenki, aki fiókot nyit a webshopban, automatikusan "alkalmazott" profilt kapna a belső admin appban (igaz, helyszín nélkül, ami a meglévő RLS-minták szerint eleve korlátozza a hozzáférését — de ez így sem helyes, egy vásárlónak nincs helye az admin oldalon).

**Emiatt az ügyfél-fiók egy teljesen külön, szűkre szabott adatkörre épül** (`customer_profiles` tábla, nem `profiles`), a `handle_new_user`-t óvatosan, minimális, jól tesztelhető változtatással bővítjük — a meglévő admin/alkalmazott-regisztráció logikája **egy bájtot sem változik**, csak egy új ág kerül mellé.

A `CLAUDE.md` szerint egyébként ma sincs publikus regisztráció-tiltás — bárki regisztrálhat alkalmazottnak is (helyszín nélkül indul, amíg admin hozzá nem rendel egyet) — ez a terv ugyanezt az elvet követi az ügyfeleknél is, csak egy még szűkebb, saját-adat-only jogosultsági körrel.

**Ne pusholj / ne deployolj**, csak lokális commit, amíg nem szólnak. A `handle_new_user` módosítása különösen kockázatos hely (minden bejelentkezés ezen megy át) — a 7. pontban leírt teszteket **kötelező** lefuttatni éles adatbázison, mielőtt bármi más hozzányúl ehhez.

---

## 1. Adatbázis migráció

### a) `customer_profiles` — az ügyfél-fiók saját "profilja"

```sql
create table customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  customer_id uuid references customers(id), -- összekötve a meglévő CRM-rekorddal, ha a telefonszám egyezik
  created_at timestamptz not null default now()
);
alter table customer_profiles enable row level security;
create policy customer_profiles_self_select on customer_profiles for select using (id = auth.uid());
create policy customer_profiles_self_update on customer_profiles for update using (id = auth.uid());
create policy customer_profiles_staff_select on customer_profiles for select
  using (current_role() = 'admin' or exists (select 1 from profiles pr where pr.id = auth.uid() and pr.location_id is not null));
```

### b) `customer_requests` — visszaküldés / garancia-igény bejelentések

```sql
create table customer_requests (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid references customer_profiles(id) not null,
  type text not null check (type in ('return','warranty_claim')),
  description text not null,
  linked_transaction_id uuid references transactions(id),
  linked_ticket_id uuid references service_tickets(id),
  status text not null default 'uj' check (status in ('uj','attekintve','lezarva')),
  staff_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table customer_requests enable row level security;
create policy customer_requests_customer_insert on customer_requests for insert
  with check (customer_profile_id = auth.uid());
create policy customer_requests_customer_select on customer_requests for select
  using (customer_profile_id = auth.uid());
create policy customer_requests_staff_all on customer_requests for all
  using (current_role() = 'admin' or exists (select 1 from profiles pr where pr.id = auth.uid() and pr.location_id is not null))
  with check (current_role() = 'admin' or exists (select 1 from profiles pr where pr.id = auth.uid() and pr.location_id is not null));
```
Az ügyfél **csak bejelentheti** a kérést (insert + a sajátjait látja) — a `status`-t módosítani, vagy más kérését látni nem tudja (nincs rá update/select policy-ja). A tényleges visszavétel/szerviz-indítás **kézzel, staff által történik**, a meglévő eszközökkel (pl. `ProductDetailPanel` "Visszavétel" gombja, vagy új munkalap felvétele) — a kérés csak jelzés, nem automatikus végrehajtás. (Ez tudatos döntés: egy ügyfél-fiókból automatikusan elindított visszavétel/pénzvisszatérítés komoly visszaélési kockázat lenne, emberi jóváhagyás nélkül nem javaslom.)

### c) `handle_new_user` bővítése — **csak ág hozzáadása, a meglévő ág változatlan**

```sql
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  is_first boolean;
  is_customer boolean;
  matched_customer_id uuid;
  norm_phone text;
begin
  is_customer := coalesce((new.raw_user_meta_data->>'is_customer')::boolean, false);

  if is_customer then
    norm_phone := regexp_replace(coalesce(new.raw_user_meta_data->>'phone', ''), '\D', '', 'g');
    if length(norm_phone) >= 6 then
      select id into matched_customer_id from public.customers
        where phone_norm = norm_phone limit 1;
    end if;
    insert into public.customer_profiles (id, full_name, email, phone, customer_id)
    values (new.id, new.raw_user_meta_data->>'full_name', new.email, new.raw_user_meta_data->>'phone', matched_customer_id);
  else
    select not exists (select 1 from public.profiles) into is_first;
    insert into public.profiles (id, full_name, email, role, location_id)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email, case when is_first then 'admin' else 'employee' end, null);
  end if;

  return new;
end;
$$;
```
Ez a meglévő függvény **teljes** eredeti törzsét megtartja az `else` ágban, szó szerint — csak előtte egy `if is_customer` elágazás kerül be. Migrációként `create or replace function`-nel vidd fel (a trigger maga, ami a függvényre hivatkozik, nem változik).

---

## 2. Saját adatok lekérése — security-definer RPC-k (a `get_receipt`/`get_ticket_status` mintáját követve)

Ne adj RLS-t az ügyfeleknek közvetlenül a `transactions`/`service_tickets`/`products` táblákra — mindent szűk, célzott RPC-n keresztül adjunk oda, pontosan úgy, ahogy a publikus `/status` és `/receipt` oldalak is működnek ma (nincs nyílt `anon`/authenticated SELECT ezeken a táblákon).

```sql
create or replace function get_my_purchases()
returns table (id uuid, receipt_no bigint, description text, amount numeric, date date, warranty text, public_token uuid, brand text, model text, imei text)
language sql security definer as $$
  select t.id, t.receipt_no, t.description, t.amount, t.date, t.warranty, t.public_token, p.brand, p.model, p.imei
  from transactions t
  left join products p on p.id = t.product_id
  where t.category = 'Készlet' and t.type = 'income' and t.deleted_at is null
    and regexp_replace(coalesce(t.customer_phone,''), '\D','','g') = (select regexp_replace(coalesce(phone,''), '\D','','g') from customer_profiles where id = auth.uid())
  order by t.date desc;
$$;

create or replace function get_my_tickets()
returns table (id uuid, ticket_no bigint, brand text, model text, issue text, price numeric, status text, sub_status text, date_in date, date_out date, warranty text, public_token uuid)
language sql security definer as $$
  select t.id, t.ticket_no, t.brand, t.model, t.issue, t.price, t.status, t.sub_status, t.date_in, t.date_out, t.warranty, t.public_token
  from service_tickets t
  where t.ticket_kind = 'Ügyfél' and t.deleted_at is null
    and regexp_replace(coalesce(t.customer_phone,''), '\D','','g') = (select regexp_replace(coalesce(phone,''), '\D','','g') from customer_profiles where id = auth.uid())
  order by t.date_in desc;
$$;

create or replace function submit_customer_request(p_type text, p_description text, p_linked_transaction_id uuid default null, p_linked_ticket_id uuid default null)
returns uuid
language plpgsql security definer as $$
declare new_id uuid;
begin
  insert into customer_requests (customer_profile_id, type, description, linked_transaction_id, linked_ticket_id)
  values (auth.uid(), p_type, p_description, p_linked_transaction_id, p_linked_ticket_id)
  returning id into new_id;
  return new_id;
end;
$$;
```
A "Garanciáim" nézethez nem kell külön RPC — a `get_my_purchases()` és `get_my_tickets()` eredményéből a kliens (ugyanúgy, mint az App.jsx `activeWarranties` logikája) kiszámolja, melyiknek van még érvényes garanciája (`warrantyExpiry`/`isWarrantyActive` a meglévő `utils.js`-ből, ugyanaz a logika, csak kliensoldalon a lekért adaton).

`grant execute` ezekre a függvényekre `authenticated` szerepkörnek szükséges (a projekt meglévő migrációs mintáját követve, ahogy a `get_receipt`/`get_ticket_status` is engedélyezve van).

---

## 3. Kliens-oldali auth réteg — külön a staff `AuthContext`-től

**Új fájl: `src/lib/CustomerAuthContext.jsx`** — a meglévő `src/lib/AuthContext.jsx` mintáját követve (session figyelés, `supabase.auth.onAuthStateChange`), de `customer_profiles`-t olvas `profiles` helyett, és **nem** ellenőriz admin/employee role-t.

Regisztráció:
```js
await supabase.auth.signUp({
  email, password,
  options: { data: { is_customer: true, full_name: name, phone } },
});
```
A `is_customer: true` metaadat kritikus — enélkül a `handle_new_user` a staff-ágra futna. Bejelentkezés: sima `supabase.auth.signInWithPassword({ email, password })`, ugyanaz a Supabase Auth, mint a stáfnál, csak más a session utáni profil-betöltés.

---

## 4. Routing — `src/main.jsx`

Új útvonal-minta a meglévők közé (14–30. sor táján):
```js
const accountMatch = window.location.pathname.match(/^\/fiok(\/.*)?$/i);
```
és a `Root()` függvénybe:
```jsx
if (accountMatch) return <CustomerPortal />;
```
**Új fájl: `src/CustomerPortal.jsx`** — belül kezeli a bejelentkezett/nem bejelentkezett állapotot (nem kell külön útvonal login/register/dashboard-hoz, egy komponens dönt session alapján, ahogy a `StatusLookup`/`ReceiptLookup` is egy fájlban van). `PublicHeader`/`PublicFooter` újrahasznosítva a meglévő publikus oldalak vizuális konzisztenciájáért.

---

## 5. UI — "Fiókom" portál (flip.ro mintára, egyszerűsítve)

Nem bejelentkezve: email+jelszó login form, alul "Nincs még fiókod? Regisztrálj" (regisztrációnál: név, telefonszám, email, jelszó — a telefonszám kritikus, ez köti össze a meglévő vásárlási előzményekkel).

Bejelentkezve, bal oldali menü (a `flip.ro` mintája, a nem releváns pontok — Eladásaim, Biztosításaim — nélkül):
- **Áttekintés** — üdvözlés, gyors összegzés ("2 vásárlás, 1 aktív garancia")
- **Vásárlásaim** — `get_my_purchases()` lista, kártyánként: telefon neve, dátum, ár, garancia-állapot, "Bizonylat megtekintése" (a meglévő `/receipt/:token` linkre, a `public_token` mezőt felhasználva — nem kell újraépíteni a bizonylat-nézetet)
- **Szervizeim** — `get_my_tickets()` lista, hasonlóan, "Állapot megtekintése" a meglévő `/status/:token`-re linkelve
- **Garanciáim** — a fenti kettőből számolt, még aktív garanciák, lejárati dátummal
- **Kéréseim** — saját beküldött `customer_requests` (RLS miatt csak a sajátjait látja), + "+ Új kérés" gomb: típus (Visszaküldés / Garancia-igénylés), melyik vásárláshoz/munkalaphoz kapcsolódik (legördülő a saját `get_my_purchases`/`get_my_tickets` eredményéből), leírás — `submit_customer_request()` RPC hívás

Design: kövesd a már meglévő publikus oldalak (`StatusLookup.jsx`, `ReceiptLookup.jsx`) `.pub-shop`/`.login-card`/`.dp-section`/`.dp-row` osztályait — ne találj ki új vizuális nyelvet, ez már működik és konzisztens a webshoppal.

---

## 6. Staff oldal — "Ügyfél-kérések" a Pulton

A `src/tabs/PultTab.jsx`-be (a `TASKS_PULT_DESIGN_JAVITAS.md` szerinti, javított designdal) kerüljön egy negyedik `.pult-section`: "Ügyfél-kérések", ami a `customer_requests` tábla `status != 'lezarva'` sorait listázza (staff teljes RLS-hozzáféréssel látja mindet). Minden sor: típus-jelvény (Visszaküldés/Garancia-igény), ügyfél neve (a `customer_profiles`-ból), leírás, kapcsolódó vásárlás/munkalap (kattintható, megnyitja a `ProductDetailPanel`/`DetailPanel`-t), és egy állapot-léptető gomb (Új → Áttekintve → Lezárva), a már meglévő `WaitingList.jsx` mintáját követve.

---

## 7. Kötelező biztonsági tesztek élesítés előtt

1. Hozz létre egy eldobható teszt-regisztrációt `is_customer: true` metaadattal (a `CLAUDE.md`-ben leírt eldobható-teszt-user mintát követve) — **ellenőrizd élesben SQL-lel**, hogy a `profiles` táblába **nem** került be sor, és a `customer_profiles`-ba igen.
2. Jelentkezz be ezzel a teszt-fiókkal az **admin app** (`/admin`) oldalon — győződj meg róla, hogy `AuthContext`/`profiles`-lookup hiányában nem enged be (üres/hiba állapot, nem admin/employee nézet).
3. Ellenőrizd, hogy a `get_my_purchases()`/`get_my_tickets()` tényleg csak a teszt-telefonszámhoz tartozó sorokat adja vissza, más ügyfél adatát nem.
4. Utána töröld a teszt-usert (`auth.users` + a hozzá tartozó `customer_profiles` sor, cascade törli).

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes, migrációk lefutnak
- A 7. pont mind a 4 tesztje sikeres, **mielőtt** bármi mást csinálnál ezzel a branch-csel
- `/fiok` oldalon regisztráció + bejelentkezés működik, meglévő vásárlóknál (akiknek egyezik a telefonszáma) rögtön látszik a korábbi vásárlás/szerviz-előzmény
- "Vásárlásaim"/"Szervizeim" pontosan azt mutatja, amit a telefonszám alapján kellene, és a "Bizonylat"/"Állapot" linkek a már meglévő publikus oldalakra visznek
- Visszaküldés/garancia-igény bejelentés után a Pulton, "Ügyfél-kérések" alatt megjelenik, staff tudja léptetni az állapotát
- Egy ügyfél-fiók **semmilyen módon** nem fér hozzá az admin alkalmazáshoz vagy más ügyfél adataihoz
- A meglévő admin/alkalmazott regisztráció és bejelentkezés változatlanul működik
- Nincs `git push`, csak lokális commit
