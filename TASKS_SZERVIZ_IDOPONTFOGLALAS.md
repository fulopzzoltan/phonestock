# TASKS — Időpontfoglalás a szervizhez (belső "programálás" + weboldali önkiszolgáló foglalás)

Kérés: "lehet hogy kellene egy ilyen programalas szeru dolgot elkesziteni hogy tudjuk hogyha valakivel lebeszelunk egy idosavot hogy mikor jon be illetve majd a siterol a szerviz reszen akar idopontot is foglalhat valaki hogy neki akkor lenne jo megcsinalni a telefonjat"

## 0. Amit megnéztem — van egy félkész előzmény, erre építünk

A publikus szerviz árbecslő (`src/RepairEstimator.jsx`, `/becsles`) **már ma is mutat egy "Időpont foglalása" gombot** (`s.repairBookSlot` felirat, 302. sor) — de valójában ez **nem valódi időpont-választás**, csak egy név+telefonszám+helyszín űrlap (`submit_repair_lead` RPC, `repair_leads` tábla), amit ti hívtok vissza. Ez pontosan az a "hívjatok vissza" eset, amit már megoldottatok — most azt kéred, hogy emellé kerüljön egy **valódi, dátum+idősáv-választós** foglalás is, mind a pultnál (veletek egyeztetve), mind a weboldalon (önkiszolgálóan).

A `repair_leads` táblán már van precedens a "web-lead → munkalap" konverzióra (`converted_ticket_id` oszlop, adatbázisban ellenőrizve) — ugyanezt a mintát követi az új `service_appointments` tábla is.

**Fontos, amit előre jelzek**: a `locations` táblában (ellenőrizve) **nincs nyitvatartás-adat** — ezt nem találhatom ki helyetted (mikor van nyitva Gyimes/Szentgyörgy, hétvégén hogyan). A tervben egy szerkeszthető mező lesz erre, de az **első, éles nyitvatartást neked kell megadnod** a Beállításokban, mielőtt élesítitek a foglalást.

## 1. Adatmodell

```sql
alter table locations add column opening_hours jsonb;
-- formátum: {"mon":["09:00","18:00"],"tue":["09:00","18:00"],...,"sat":["09:00","13:00"],"sun":null}
-- null = zárva aznap. Kezdeti érték NULL marad, amíg a Beállításokban ki nem töltöd — foglalás
-- csak azokra a napokra ajánlható fel, amikhez van kitöltött nyitvatartás.
alter table locations add column appointment_slot_minutes integer not null default 30;
alter table locations add column appointment_capacity integer not null default 1;
-- appointment_capacity: hány párhuzamos időpont fér egy idősávba (kb. hány szerelő dolgozik egyszerre) — alapból 1, állítsd, ha több.

create table service_appointments (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id),
  slot_date date not null,
  slot_time time not null,
  duration_minutes integer not null default 30,
  customer_name text not null,
  customer_phone text not null,
  brand text,
  model text,
  problem_tag text,
  note text,
  estimated_price numeric,
  status text not null default 'foglalt' check (status in ('foglalt','megerositve','lezarva','lemondva','nem_jott_el')),
  source text not null default 'staff' check (source in ('staff','website')),
  converted_ticket_id uuid references service_tickets(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index on service_appointments (location_id, slot_date, slot_time);
```

RLS: staff a saját helyszínét látja/kezeli, admin mindet — a `service_tickets`-nél már bevált minta szerint. A `service_appointments` INSERT-hez publikus (anon) jogosultság **nem** kell közvetlenül a táblára — a weboldali foglalás egy SECURITY DEFINER RPC-n megy (2b. pont), ugyanúgy, mint a `submit_repair_lead` ma.

## 2. Elérhető idősávok kiszámítása — `get_available_slots`

```sql
create or replace function get_available_slots(p_location_id uuid, p_days_ahead integer default 14)
returns table(slot_date date, slot_time time, remaining integer)
language plpgsql security definer set search_path = public as $$
declare
  v_hours jsonb;
  v_slot_min integer;
  v_capacity integer;
  d date;
  wd text;
  day_hours jsonb;
  t time;
  booked integer;
begin
  select opening_hours, appointment_slot_minutes, appointment_capacity
    into v_hours, v_slot_min, v_capacity
    from locations where id = p_location_id;
  if v_hours is null then return; end if; -- nincs kitöltött nyitvatartás, nincs mit felajánlani

  for d in select generate_series(current_date, current_date + (p_days_ahead - 1), interval '1 day')::date loop
    wd := lower(to_char(d, 'dy')); -- 'mon','tue',...
    day_hours := v_hours -> wd;
    if day_hours is not null then
      t := (day_hours ->> 0)::time;
      while t < (day_hours ->> 1)::time loop
        select count(*) into booked from service_appointments
          where location_id = p_location_id and slot_date = d and slot_time = t and status <> 'lemondva';
        if booked < v_capacity then
          return query select d, t, v_capacity - booked;
        end if;
        t := t + (v_slot_min || ' minutes')::interval;
      end loop;
    end if;
  end loop;
end;
$$;
grant execute on function get_available_slots(uuid, integer) to anon, authenticated;
```

Ez a logika **implementáció közben biztos finomításra szorul** (pl. mai nap már elmúlt idősávjainak kiszűrése aktuális órához képest, ebédszünet kezelése, ünnepnapok) — architektúra-szinten jó kiindulás, de ne vedd készen tesztelt kódnak, nézzétek át implementáláskor.

## 3. Foglalás rögzítése

### 3a. Staff-oldali (pultnál/telefonon lebeszélve)

Egyszerű `insert into service_appointments (..., status='megerositve', source='staff', created_by=auth.uid())` — mivel ezt staff rögzíti, egyből "megerősítve" állapotban van (nincs szükség külön jóváhagyásra, hiszen élőben egyeztettétek).

### 3b. Weboldali (önkiszolgáló) — `book_appointment_by_slot`

```sql
create or replace function book_appointment_by_slot(
  p_location_id uuid, p_slot_date date, p_slot_time time,
  p_customer_name text, p_customer_phone text,
  p_brand text, p_model text, p_problem_tag text, p_note text, p_estimated_price numeric
) returns table(success boolean, message text)
language plpgsql security definer set search_path = public as $$
declare v_capacity integer; v_booked integer;
begin
  select appointment_capacity into v_capacity from locations where id = p_location_id;
  select count(*) into v_booked from service_appointments
    where location_id = p_location_id and slot_date = p_slot_date and slot_time = p_slot_time and status <> 'lemondva';
  if v_booked >= v_capacity then
    return query select false, 'Ezt az idősávot közben lefoglalták — válassz másikat.'; return;
  end if;
  insert into service_appointments (location_id, slot_date, slot_time, customer_name, customer_phone, brand, model, problem_tag, note, estimated_price, status, source)
  values (p_location_id, p_slot_date, p_slot_time, p_customer_name, p_customer_phone, p_brand, p_model, p_problem_tag, p_note, p_estimated_price, 'foglalt', 'website');
  return query select true, 'Rendben, számítunk rád!';
end;
$$;
grant execute on function book_appointment_by_slot(uuid, date, time, text, text, text, text, text, text, numeric) to anon;
```
A kapacitás-ellenőrzés **a beszúrás pillanatában újra lefut** (nem csak a lekérdezéskor), hogy két egyidejű foglaló ne csúsztassa túl a kapacitást — ugyanaz az elv, mint a webshop-foglalás versenyhelyzet-védelménél (`TASKS_WEBSHOP_ONLINE_FIZETES.md`).

## 4. Weboldal — `RepairEstimator.jsx` bővítése

A meglévő `leadFormBlock` (190-208. sor) egy választóval bővül, **nem cseréli le a mai "hívjatok vissza" utat**, csak melléteszi:

```jsx
<div className="seg">
  <button type="button" className={bookMode === "slot" ? "active" : ""} onClick={() => setBookMode("slot")}>Foglalok időpontot</button>
  <button type="button" className={bookMode === "callback" ? "active" : ""} onClick={() => setBookMode("callback")}>Hívjatok vissza</button>
</div>
```
- **"Hívjatok vissza"** ág: pontosan a mai `leadFormBlock`, változatlanul (`submit_repair_lead`).
- **"Foglalok időpontot"** ág: helyszín-választó (ha 1-nél több boltnak van kitöltött nyitvatartása) → `get_available_slots` betöltése → egy egyszerű, napokra bontott idősáv-rács (pl. napi fül, alatta a szabad időpontok gombokként) → időpont kiválasztása → név+telefon mező → "Foglalás megerősítése" gomb → `book_appointment_by_slot`.
- Siker után egy megerősítő képernyő: "Foglalva: {dátum}, {idő} — {helyszín}. Várunk!" (ugyanaz a `bb-done` stílus, mint a mai `leadSent` állapotnál, 169-188. sor).

## 5. Staff-oldali "Mai időpontok" — a Pult fülön

A `WaitingList`-hez hasonló kis widget, a Pult fülre (`src/tabs/PultTab.jsx`, a `WaitingList` szekció mellé): mai és holnapi `service_appointments` sorok, időrendben, hívás-ikonnal (`CallLink`), és egy **"Munkalap felvétele"** gombbal — ugyanaz a konverziós minta, mint a `waiting_items`-nél és a `repair_leads`-nél (`TicketFormModal` `prefill` az appointment adataiból, mentés után `status='lezarva'` + `converted_ticket_id` beállítva).

Egy "+ Időpont foglalása" gomb is ide kerül, ami megnyit egy kis `AppointmentModal.jsx`-et (ugyanaz a dátum+idősáv-választó UI, mint a weboldalon, csak staff-oldali `insert`-tel, `status='megerositve'`-vel, lásd 3a).

**Ha valaki nem jön el**: egy "Nem jött el" gomb (`status='nem_jott_el'`) az időpont mellett — ez leválasztja a listáról, de megmarad a nyilvántartásban (nem törlődik).

## 6. Amit tisztázni kell, mielőtt élesítjük

1. **A tényleges nyitvatartás** (Gyimes és Szentgyörgy külön-külön, hétköznap/szombat/vasárnap) — enélkül a foglalási rendszer nem tud mit felajánlani. Ezt a Beállítások fülön egy egyszerű heti táblázattal (7 sor, nyitás/zárás óra vagy "Zárva") kell rögzítened.
2. **Idősáv hossza és kapacitás helyszínenként** — alapból 30 perc / 1 párhuzamos időpont a tervben; ha a valóságban pl. 2 szerelő dolgozik egyszerre valamelyik boltban, azt a `appointment_capacity`-vel be lehet állítani.
3. **SMS-emlékeztető** — ezt **nem** terveztem bele (nincs jelenleg SMS-gateway a rendszerben, és az egy külön, fizetős szolgáltatás bekötését igényelné) — ha ez fontos, jelezd, azt egy külön specifikációban dolgoznánk ki (pl. Twilio/SMS.ro-integráció), most csak a foglalás-nyilvántartás készül el.

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes, migrációk (2 tábla-bővítés, 1 új tábla, 3 RPC) lefutnak
- Beállításokban a nyitvatartás szerkeszthető helyszínenként
- A weboldalon (`/becsles`) "Foglalok időpontot" úton valódi, szabad idősávok közül lehet választani, foglalás után visszaigazolás jelenik meg
- Két egyidejű foglalás ugyanarra az idősávra nem csúszhat túl a kapacitáson (az egyik "közben lefoglalták" hibát kap)
- A Pult fülön látszik a mai/holnapi időpontok listája, hívható telefonszámmal, "Munkalap felvétele" előre kitöltött munkalapot nyit
- Staff is tud saját maga (pultnál egyeztetve) időpontot rögzíteni
- Nincs `git push`, csak lokális commit
