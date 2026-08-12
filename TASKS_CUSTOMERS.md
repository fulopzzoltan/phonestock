# TASKS — Kliensek modul átépítése valódi táblára

**Kontextus:** a Kliensek tab jelenleg nem valódi adatból, hanem a `transactions` és `service_tickets` táblákból futásidőben számolt listából áll (`src/App.jsx`, `customers` useMemo, kb. 437–463. sor, telefonszám utolsó 9 számjegye alapján dedupolva). Emiatt: nem javítható egy elgépelt név/telefonszám, nincs jegyzet-mező, nincs marketing-hozzájárulás nyilvántartva, nem vehető fel ügyfél vásárlás nélkül, és két eltérő formátumú telefonszám két külön "ügyfelet" hozhat létre.

Ez a feladat egy valódi `customers` táblára állítja át a modult, backward-compatible módon (a meglévő `customer_name`/`customer_phone` szöveges mezők a `transactions`/`service_tickets` táblákon **megmaradnak**, csak kiegészülnek egy `customer_id` kapcsolattal).

Végezd egymás után, külön commit-onként, hogy visszakövethető legyen. **Ne pusholj / ne deployolj**, csak lokális commit, amíg nem szólnak.

---

## 1. DB migráció — `customers` tábla + kapcsolatok

Használd a Supabase MCP `apply_migration` eszközt (project_id: `aaiyyhskvxjqfhrgoulh`), ne `execute_sql`-t, mert ez séma-változtatás (DDL).

```sql
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone text,
  phone_norm text generated always as (right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 9)) stored,
  email text,
  notes text,
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  deleted_at timestamptz
);

create unique index customers_phone_norm_idx on public.customers (phone_norm) where phone_norm <> '' and deleted_at is null;

alter table public.customers enable row level security;
create policy customers_rw on public.customers for all to authenticated using (true) with check (true);
-- Indoklás: az ügyfél nem helyszín-specifikus (mindkét boltban vásárolhat), a `parts` táblához hasonlóan
-- szándékosan nincs location_id-alapú korlátozás rajta.

alter table public.transactions add column customer_id uuid references public.customers(id);
alter table public.service_tickets add column customer_id uuid references public.customers(id);
```

"Keresd meg vagy hozd létre" függvény — ezt hívja majd a kliens kód mentéskor:

```sql
create or replace function public.upsert_customer(p_name text, p_phone text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_norm text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
  v_id uuid;
begin
  if v_norm = '' then
    return null; -- nincs telefonszám, nem tudunk ügyfelet azonosítani
  end if;

  select id into v_id from public.customers where phone_norm = v_norm and deleted_at is null limit 1;

  if v_id is null then
    insert into public.customers (name, phone, created_by)
    values (nullif(trim(p_name), ''), p_phone, auth.uid())
    returning id into v_id;
  else
    update public.customers
      set name = coalesce(nullif(name, ''), nullif(trim(p_name), ''))
      where id = v_id and (name is null or name = '');
  end if;

  return v_id;
end;
$$;

grant execute on function public.upsert_customer(text, text) to authenticated;
```

Ellenőrizd `get_advisors` (security) hívással, hogy a `security definer` függvény nem nyit-e véletlenül anon hozzáférést — csak `authenticated`-nek legyen `EXECUTE` joga rajta (a fenti `grant` ezt már biztosítja, `anon`-nak nem adunk jogot).

---

## 2. Egyszeri backfill

Miután a fenti migráció lement, töltsd fel a `customers` táblát a meglévő adatokból, és kösd össze a régi sorokat. Futtasd `execute_sql`-lel (adat-módosítás, nem séma, de egyszeri jellegű — utána nézd meg `select count(*) from customers` és néhány mintasort, hogy értelmes-e az eredmény, mielőtt folytatod):

```sql
-- 1. customers feltöltése a tranzakciókból és munkalapokból, telefonszám szerint dedupolva
insert into public.customers (name, phone, created_at)
select
  (array_agg(name order by d) filter (where name is not null and name <> ''))[1] as name,
  (array_agg(phone order by d) filter (where phone is not null and phone <> ''))[1] as phone,
  min(d) as created_at
from (
  select customer_name as name, customer_phone as phone, date::timestamptz as d
  from public.transactions where type = 'income' and customer_name is not null and deleted_at is null
  union all
  select customer_name, customer_phone, created_at
  from public.service_tickets where customer_name is not null and deleted_at is null
) x
where right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 9) <> ''
group by right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 9)
on conflict (phone_norm) where phone_norm <> '' and deleted_at is null do nothing;

-- 2. transactions.customer_id visszatöltése
update public.transactions t
set customer_id = c.id
from public.customers c
where t.customer_id is null
  and t.customer_phone is not null
  and right(regexp_replace(t.customer_phone, '\D', '', 'g'), 9) = c.phone_norm;

-- 3. service_tickets.customer_id visszatöltése
update public.service_tickets st
set customer_id = c.id
from public.customers c
where st.customer_id is null
  and st.customer_phone is not null
  and right(regexp_replace(st.customer_phone, '\D', '', 'g'), 9) = c.phone_norm;
```

Megjegyzés: az `on conflict (phone_norm) where ...` szintaxis parciális unique indexnél Postgres 15+-on működik (a projekt Postgres 17-en fut, rendben van). Ha mégis hibát dobna, cseréld sima `insert ... where not exists (...)` mintára.

---

## 3. Kód: mapperek és adatbetöltés

**Fájl:** `src/lib/mappers.js` — adj hozzá:
```js
export const customerFromApi = (r) => ({
  id: r.id,
  name: r.name || "",
  phone: r.phone || "",
  email: r.email || "",
  notes: r.notes || "",
  marketingConsent: !!r.marketing_consent,
  marketingConsentAt: r.marketing_consent_at,
  createdAt: r.created_at,
});
export const customerToApi = (c) => ({
  name: c.name || null,
  phone: c.phone || null,
  email: c.email || null,
  notes: c.notes || null,
});
```

**Fájl:** `src/App.jsx` — a `stock`/`transactions`/`tickets`/`parts` betöltése mellé (kb. 90–100. sor) tölts be egy `customersTable` state-et is: `supabase.from("customers").select("*").is("deleted_at", null)`.

Cseréld le a jelenlegi, számolt `customers` useMemo-t (437–463. sor) úgy, hogy immár a `customersTable`-ból induljon ki, és a hozzá tartozó vásárlásokat/munkalapokat `customer_id` szerint (nem telefonszám-egyezés szerint) gyűjtse össze:
```js
const customers = useMemo(() => {
  return customersTable.map((c) => {
    const purchases = filteredTransactions.filter((t) => t.type === "income" && t.customerId === c.id);
    const tickets = filteredTickets.filter((t) => t.customerId === c.id);
    return {
      ...c,
      key: c.id,
      purchases,
      tickets,
      purchaseTotal: purchases.reduce((s, p) => s + (Number(p.amount) || 0), 0),
      ticketTotal: tickets.reduce((s, t) => s + (Number(t.price) || 0), 0),
      lastActivity: [...purchases.map((p) => p.date), ...tickets.map((t) => t.dateIn)].filter(Boolean).sort().reverse()[0] || "",
    };
  }).filter((c) => {
    const q = custSearch.trim().toLowerCase();
    return !q || [c.name, c.phone].join(" ").toLowerCase().includes(q);
  }).sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
}, [customersTable, filteredTransactions, filteredTickets, custSearch]);
```
(A `txFromApi`/`tFromApi` mappereket egészítsd ki `customerId: r.customer_id`-vel, hogy a `t.customerId` elérhető legyen.)

---

## 4. Kód: eladás és munkalap mentésekor kösd össze az ügyféllel

**Fájl:** `src/App.jsx`, az `addTransaction` és `addTicket` függvények (kb. 272. és 327. sor körül).

Mentés előtt hívd meg az `upsert_customer` RPC-t, és a kapott id-t tedd bele az insert payload-ba:

```js
async function addTransaction(data, locId) {
  await withBusy(async () => {
    let customerId = null;
    if (data.customerPhone) {
      const { data: cid } = await supabase.rpc("upsert_customer", { p_name: data.customerName, p_phone: data.customerPhone });
      customerId = cid;
    }
    const r = unwrap(await supabase.from("transactions").insert({ ...txToApi(data, locId), customer_id: customerId }).select());
    setTransactions([txFromApi(r[0]), ...transactions]);
  });
}
```

Ugyanígy az `addTicket`-ben is, `service_tickets` insertnél.

---

## 5. Kliensek tab — szerkesztés, új ügyfél, összevonás

**Új fájl:** `src/components/CustomerModal.jsx` — mezők: név, telefon, email, jegyzet, marketing-hozzájárulás checkbox. Használható létrehozásra ("Új ügyfél" gomb a Kliensek tab tetején, vásárlás nélkül is felvehető) és szerkesztésre (a `CustomerDetailPanel`-ből nyitva, "Szerkesztés" gombbal).

**Fájl:** `src/components/CustomerDetailPanel.jsx` — adj hozzá egy "Szerkesztés" gombot a fejlécbe, ami a fenti `CustomerModal`-t nyitja meg a jelenlegi ügyféladatokkal előtöltve. Mentéskor `supabase.from("customers").update(customerToApi(f)).eq("id", customer.id)`.

**Összevonás (admin-only, lehet ez a szakasz utolsó, ha időhiány van):** a Kliensek táblázatban egy sor kijelölésekor (checkbox) admin láthat egy "Összevonás a kijelölt ügyfelekkel" gombot — a legrégebbi (`created_at` szerint legkorábbi) rekord marad meg elsődlegesként, a többinél:
```sql
update public.transactions set customer_id = :primary_id where customer_id in (:duplicate_ids);
update public.service_tickets set customer_id = :primary_id where customer_id in (:duplicate_ids);
update public.customers set deleted_at = now() where id in (:duplicate_ids);
```

---

## 6. Marketing-hozzájárulás checkbox eladásnál/munkalapnál

**Fájl:** `src/components/SellModal.jsx` és `src/components/TicketFormModal.jsx` — adj hozzá egy jelölőnégyzetet: "Hozzájárulok, hogy akciókról/emlékeztetőkről SMS-ben értesítsenek" (alapból kikapcsolva). Ez **külön** a szerviznél már meglévő garanciafeltétel-elfogadás checkbox-tól — jogilag más célú hozzájárulásról van szó (tranzakciós/emlékeztető SMS vs. marketing SMS).

Ha be van pipálva, mentéskor (az `upsert_customer` hívás után) egy második hívással frissítsd a customer rekordot:
```js
if (data.marketingConsent && customerId) {
  await supabase.from("customers").update({ marketing_consent: true, marketing_consent_at: new Date().toISOString() }).eq("id", customerId);
}
```

---

## Ellenőrzőlista implementálás után

- Migráció lefutott, `get_advisors` (security) nem jelez új problémát az `upsert_customer` függvényre
- Backfill lefutott, `select count(*) from customers` és néhány minta-sor értelmes (nincs duplikáció, a nevek/telefonszámok stimmelnek)
- Új eladás/munkalap felvételekor tényleg létrejön vagy megtalálódik a megfelelő `customers` sor
- Kliensek tabon a lista, a vásárlás/munkalap-számok és összegek megegyeznek a régi (számolt) verzióval — érdemes egy pillanatra összevetni push előtt
- Ügyfél szerkeszthető (név/telefon/email/jegyzet), a változás látszik a listában
- "Új ügyfél" felvehető vásárlás nélkül is
- Marketing-hozzájárulás checkbox menti a `marketing_consent`/`marketing_consent_at` mezőket
- Nincs `git push`, csak lokális commit-ok, amíg nem szólnak
