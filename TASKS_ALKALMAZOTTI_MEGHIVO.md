# TASKS — Alkalmazotti/admin regisztráció lezárása: meghívó-kódos rendszer

Kiegészíti a `TASKS_UGYFEL_FIOK.md`-t. Azért kell most, mert az ügyfél-fiók miatt megjelenik egy publikus "Regisztrálj" gomb (`/fiok`), és ezzel párhuzamosan **nem maradhat nyitva** az `/admin` oldal saját regisztrációja — jelenleg bárki, aki odatalál, alkalmazottként tud regisztrálni (helyszín nélkül indulna, admin rendelné hozzá — ez volt eddig az elfogadott kockázat a CLAUDE.md szerint, de innentől jobb lezárni).

Cél: `/admin`-on regisztrálni **csak** érvényes meghívó-linkkel lehessen. Meghívót admin generál a Felhasználók fülön.

---

## 1. `staff_invites` tábla

```sql
create table staff_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  role text not null default 'employee' check (role in ('admin','employee')),
  location_id uuid references locations(id),
  created_by uuid references auth.users(id),
  expires_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table staff_invites enable row level security;
create policy staff_invites_admin_all on staff_invites for all
  using (current_role() = 'admin') with check (current_role() = 'admin');
```
`used_by`/`created_by` szándékosan `auth.users`-re mutat, nem `profiles`-ra — a trigger a meghívót azelőtt jelöli felhasználtnak, hogy a `profiles` sor létrejönne, így elkerüljük a sorrendi FK-problémát.

## 2. `create_staff_invite` RPC (admin hívja a Felhasználók fülről)

```sql
create or replace function create_staff_invite(p_location_id uuid default null, p_role text default 'employee', p_expires_days int default 7)
returns table(code text)
language plpgsql security definer as $$
declare v_code text;
begin
  if current_role() <> 'admin' then
    raise exception 'Csak admin hozhat létre meghívót.';
  end if;
  v_code := upper(encode(gen_random_bytes(6), 'hex'));
  insert into staff_invites (code, role, location_id, created_by, expires_at)
  values (v_code, coalesce(p_role, 'employee'), p_location_id, auth.uid(),
          case when p_expires_days is null then null else now() + (p_expires_days || ' days')::interval end);
  return query select v_code;
end;
$$;
grant execute on function create_staff_invite(uuid, text, int) to authenticated;
```
Listázás/törlés nem igényel külön RPC-t — admin a `staff_invites_admin_all` policy miatt közvetlenül tud `select`/`delete`/`update` hívást indítani a táblán a Supabase klienssel.

## 3. `handle_new_user` — invite-ellenőrzés a staff-ágba építve

**Ez a `TASKS_UGYFEL_FIOK.md`-ben leírt függvényt bővíti tovább** (az ottani `is_customer` ág változatlan, csak az `else` ág egészül ki):

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
  v_invite staff_invites%rowtype;
  v_invite_code text;
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

    if not is_first then
      -- alkalmazotti/admin regisztráció csak érvényes meghívóval (a legelső, bootstrap admin kivétel)
      v_invite_code := new.raw_user_meta_data->>'invite_code';
      if v_invite_code is null then
        raise exception 'Alkalmazotti regisztrációhoz érvényes meghívó szükséges.';
      end if;
      select * into v_invite from public.staff_invites
        where code = v_invite_code and used_by is null
          and (expires_at is null or expires_at > now())
        for update;
      if v_invite.id is null then
        raise exception 'Érvénytelen vagy már felhasznált meghívó.';
      end if;
      update public.staff_invites set used_by = new.id, used_at = now() where id = v_invite.id;
    end if;

    insert into public.profiles (id, full_name, email, role, location_id)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', new.email),
      new.email,
      case when is_first then 'admin' else coalesce(v_invite.role, 'employee') end,
      case when is_first then null else v_invite.location_id end
    );
  end if;

  return new;
end;
$$;
```
`raise exception` a triggerben visszagörgeti a **teljes** tranzakciót, az `auth.users` sor beszúrását is — tehát a Supabase Auth `signUp()` hívás egyszerűen hibával tér vissza a kliens felé, nem marad félkész user. Az `is_first` bootstrap-kivétel csak elméleti védőháló (pl. friss dev/teszt projektnél, ahol még senki sincs) — éles adatbázisban ma már van admin, tehát ez az ág valójában sosem fut le.

Ha az invite tartalmazott `location_id`-t, a profil **rögtön** azzal a helyszínnel jön létre — nem kell utólag kézzel hozzárendelni.

## 4. Admin UI — Felhasználók fül

Keresd meg a jelenlegi "Felhasználók" fület (valószínűleg `src/tabs/UsersTab.jsx` vagy hasonló), és egészítsd ki egy "Meghívók" szekcióval:
- **"Új meghívó" gomb** → mini form (Helyszín — legördülő, opcionális "nincs megadva"; Szerepkör — Alkalmazott/Admin, alap: Alkalmazott; Lejárat — 7 nap alapértelmezett) → `create_staff_invite()` hívás → a kapott kóddal összeállított link (`${window.location.origin}/admin?invite=${code}`) megjelenítése, "Másolás" gombbal.
- **Meghívók listája**: kód (rövidítve, pl. első 6 karakter + „…"), helyszín, szerepkör, létrehozva, állapot-jelvény (Aktív / Felhasznált — kinek / Lejárt), "Visszavonás" gomb nem-felhasznált sorokon (`delete` a `staff_invites`-on, vagy `expires_at = now()`).

## 5. Admin bejelentkező/regisztráció komponens módosítása

Keresd meg a jelenlegi `/admin` login/regisztráció komponenst (az `AuthContext.jsx` közelében, pl. `src/components/Login.jsx`). Jelenleg feltehetően van egy "Regisztráció" váltó/link a login form mellett — ezt így módosítsd:

- Olvasd ki az URL-ből: `new URLSearchParams(window.location.search).get('invite')`.
- **Ha nincs `invite` paraméter**: a "Regisztráció" opció **teljesen eltűnik** (csak bejelentkező form látszik, ahogy a `/fiok`-nál a "vedd ki azt hogy kinek" mintát követve: nem finom terelés, hanem tényleges eltávolítás).
- **Ha van `invite` paraméter**: megjelenik a regisztrációs form, és a `supabase.auth.signUp()` hívás `options.data`-jába bekerül `invite_code: inviteParam` (értelemszerűen `is_customer` **nélkül**, hogy a trigger a staff-ágra fusson).
- Sikertelen regisztráció esetén (a trigger `raise exception`-je Supabase-hibaként jön vissza) jelenjen meg emberi hibaüzenet: "Érvénytelen vagy lejárt meghívó — kérj újat egy admintól."

---

## 6. Kötelező tesztek élesítés előtt

1. `/admin` meghívó-paraméter nélkül → nincs regisztráció opció, csak login.
2. Admin generál egy meghívót → a linkkel eldobható teszt-userrel sikeres regisztráció, `profiles`-ban a megadott szerepkör/helyszín jön létre, a `staff_invites` sor `used_by`/`used_at` kitöltődik.
3. Ugyanaz a link **másodszor** már ne engedjen regisztrálni (felhasznált meghívó → hiba).
4. Lejárt meghívóval (állítsd `expires_at`-t múltra teszthez) szintén hiba.
5. A meglévő admin/alkalmazott bejelentkezés (már létező userekkel) változatlanul működik.
6. Takarítsd el a teszt-usert és a teszt-meghívót a végén.

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes, migráció lefut
- A 6. pont mind az 5 tesztje sikeres, mielőtt éles meghívót küldenél ki valós alkalmazottnak
- Admin tud meghívót generálni, linket másolni, listázni, visszavonni a Felhasználók fülön
- `/admin` regisztráció érvényes meghívó nélkül nem lehetséges
- Nincs `git push`, csak lokális commit
