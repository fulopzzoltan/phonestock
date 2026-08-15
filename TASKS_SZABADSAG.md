# TASKS — Szabadság-menedzsment a Felhasználók fülön

**Kontextus:** kell egy hely, ahol látszik, kinek mennyi szabadsága van hátra, ki mikor van/lesz szabadságon (mindkét helyszínen), és ahol a dolgozók egymás felé is tudják jelezni, ha szabadságot vesznek ki — ne kelljen szóban/külön csatornán egyeztetni, hogy véletlenül ne legyen mindkét helyszínen egyszerre üres a bolt.

Elhelyezés: a meglévő **Felhasználók** fülön belül egy új "Szabadság" alnézet (admin-only fül, de a tartalma mindenki számára releváns — ld. jogosultság-részletek lent).

Ne pusholj / ne deployolj, csak lokális commit, amíg nem szólnak.

---

## 1. DB migráció

```sql
create table public.leave_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#22C55E'
);
insert into public.leave_types (name, color) values
  ('Fizetett szabadság', '#22C55E'),
  ('Betegszabadság', '#F59E0B'),
  ('Fizetetlen szabadság', '#94A3B8'),
  ('Egyéb', '#8B5CF6');

create table public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  year int not null,
  entitled_days numeric not null default 20,
  unique (user_id, year)
);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  leave_type_id uuid references public.leave_types(id),
  start_date date not null,
  end_date date not null,
  days numeric not null,
  note text,
  status text not null default 'Kérve' check (status in ('Kérve', 'Jóváhagyva', 'Elutasítva', 'Visszavonva')),
  requested_at timestamptz not null default now(),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.leave_types enable row level security;
alter table public.leave_balances enable row level security;
alter table public.leave_requests enable row level security;

-- típusokat mindenki látja, csak admin szerkeszti
create policy leave_types_select on public.leave_types for select to authenticated using (true);
create policy leave_types_admin_write on public.leave_types for all to authenticated
  using (public."current_role"() = 'admin') with check (public."current_role"() = 'admin');

-- keretet mindenki látja (kis csapat, átláthatóság), csak admin szerkeszti
create policy leave_balances_select on public.leave_balances for select to authenticated using (true);
create policy leave_balances_admin_write on public.leave_balances for all to authenticated
  using (public."current_role"() = 'admin') with check (public."current_role"() = 'admin');

-- kéréseket mindenki látja (hogy tudjanak egyeztetni, ki mikor van szabadságon), bárki felvehet sajátot,
-- de csak admin hagyhatja jóvá/utasíthatja el, és csak a saját "Kérve" állapotú kérését vonhatja vissza bárki
create policy leave_requests_select on public.leave_requests for select to authenticated using (true);
create policy leave_requests_insert on public.leave_requests for insert to authenticated
  with check (user_id = auth.uid());
create policy leave_requests_update on public.leave_requests for update to authenticated
  using (public."current_role"() = 'admin' or (user_id = auth.uid() and status = 'Kérve'))
  with check (public."current_role"() = 'admin' or (user_id = auth.uid() and status in ('Kérve', 'Visszavonva')));
```

Használd `apply_migration`-t. Az `entitled_days` alapértéke 20 (a romániai törvényes minimum), admin módosíthatja emberenként, ha valakinek több jár.

---

## 2. Munkanap-számoló segédfüggvény

**Fájl:** `src/lib/utils.js` — adj hozzá:
```js
export function countWorkdays(startStr, endStr) {
  const start = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  let count = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}
```
(Hétvégét kihagyja, ünnepnapokat nem — ha ez fontos lenne, később bővíthető egy romániai munkaszüneti nap listával, de MVP-hez elég a hétvége-kihagyás.)

---

## 3. Mapperek

**Fájl:** `src/lib/mappers.js`:
```js
export const leaveTypeFromApi = (r) => ({ id: r.id, name: r.name, color: r.color });
export const leaveBalanceFromApi = (r) => ({ id: r.id, userId: r.user_id, year: r.year, entitledDays: Number(r.entitled_days) });
export const leaveRequestFromApi = (r) => ({
  id: r.id, userId: r.user_id, leaveTypeId: r.leave_type_id,
  startDate: r.start_date, endDate: r.end_date, days: Number(r.days), note: r.note || "",
  status: r.status, requestedAt: r.requested_at, decidedBy: r.decided_by, decidedAt: r.decided_at,
});
```

---

## 4. Adatbetöltés

**Fájl:** `src/App.jsx` — a meglévő betöltő `useEffect` mellé állapotok: `leaveTypes`, `leaveBalances`, `leaveRequests`, mindhármat töltsd be `supabase.from(...).select("*")`-tal (nincs `deleted_at`/soft-delete ezekhez, egyszerű táblák).

---

## 5. UI — "Szabadság" alnézet a Felhasználók fülön

**Fájl:** `src/App.jsx`, a `tab === "users"` blokk (admin-only rész) — adj hozzá egy belső fül-váltót ("Felhasználók" / "Szabadság") a jelenlegi felhasználó-lista fölé, vagy ha egyszerűbb, egy teljesen új `tab === "leave"` nav-pontot az "Admin" szekció alatt (kövesd a meglévő `navbtn` mintát, 505–508. sor környékén).

**Tartalma:**

1. **Keret-áttekintő kártyák** — minden dolgozóhoz egy kis kártya: név, "X / Y nap felhasználva" (a `leave_requests`-ből a `Jóváhagyva` státuszú, idei évi napok összege / `leave_balances.entitled_days`), egy vékony progress bar.
2. **Naptár-szerű vagy lista-nézet** a következő ~3 hónapra: kik lesznek szabadságon mikor, helyszín szerint is jelezve (a `profiles.location_id`-ból), hogy egy pillantásra látszódjon, ha véletlenül mindkét helyszín üres lenne egy napon — ez a legfontosabb rész, emeld ki vizuálisan (pl. piros figyelmeztető sáv, ha egy adott napon egy helyszínen mindenki szabadságon van).
3. **"Szabadság kérése" gomb** — bárki (admin és employee is) felvehet magának egy kérést: dátum-tartomány, típus (`leave_types`), megjegyzés. A `days` mezőt a kliens számolja ki a `countWorkdays` függvénnyel, mielőtt beküldi.
4. **Admin jóváhagyás/elutasítás** — a "Kérve" státuszú kéréseknél admin két gombot lát (Jóváhagyás / Elutasítás), employee a saját "Kérve" kérését visszavonhatja.
5. **Jelzés a csapat felé** — ha a `TASKS_BELSO_CHAT.md`-ben leírt belső chat már megvalósult, új kérés beküldésekor / jóváhagyáskor automatikusan írj egy üzenetet az `internal_messages` táblába (pl. "📅 Kovács János szabadságot kért: 08.20–08.24"), hogy ez is átmenjen a hang+notification csatornán. Ha a belső chat még nincs kész, ezt a lépést hagyd ki egyelőre (ne blokkolja a szabadság-modult), és jelezd egy TODO-kommenttel a kódban, hogy később kösd össze.

---

## Ellenőrzőlista implementálás után

- Employee tud szabadságot kérni, a napok száma helyesen számolódik (hétvége nélkül)
- Admin lát minden kérést, jóváhagyás/elutasítás után a keret-kártyák helyesen frissülnek
- Employee csak a saját "Kérve" kérését vonhatja vissza, máséhoz nem fér hozzá írásra (teszteld RLS-szel: próbáljon meg egy másik user kérését módosítani, dobjon hibát)
- A naptár/lista nézet jól látható módon jelzi, ha egy adott napon egy helyszínen mindenki szabadságon lenne
- Ha a belső chat már megvan: új kérésnél/jóváhagyásnál valóban megjelenik egy üzenet a csapat-chatben
