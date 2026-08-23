# TASKS — Hűségpont + ajánlói program (közös pontrendszer)

Kutatás alapján (Dropbox: kétoldalú jutalom +36% konverzió; Tesla: érdemi, célra szabott jutalom 42:1 megtérülés; Starbucks/Sephora: egyszerű, világos küszöb viszi a forgalom nagy részét — ~57%/~80%) és a veled egyeztetett konkrét döntés alapján: **egységes pontrendszer**, amibe a sima vásárlás/szerviz ÉS az ajánlás is pontot ad, a beváltás pedig szintezett — minél tovább gyűjt, annál jobb az "árfolyam" neki, miközben neked mindig bőven megéri.

**Elfogadott számok** (a te 3 példádból számolva, finomítható):
- 1 pont / elköltött 1 Lei
- Ajánlási bónusz: 200 pont mindkét félnek, amikor az ajánlott először vásárol/szervizeltet nálunk
- Beváltási szintek: Fólia 350 pont (10 Lei/neked, 50 Lei/érték), Tok 400 pont (10 Lei/50 Lei), Töltőfej 1400 pont (30 Lei/90 Lei)

## 0. Amire épül — és amire (még) nem

Megnéztem az élő adatbázist: a `customers` tábla ma `name, phone, phone_norm, email, notes, marketing_consent, cnp, address` mezőkkel létezik — **a korábban tervezett `/fiok` ügyfél-portál (`TASKS_UGYFEL_FIOK.md`, `customer_profiles`/`customer_requests` táblák) még nincs megépítve**. Emiatt ezt a programot **staff-közvetített** módon tervezem (a pultnál/kliens-lapon kezelve), nem önkiszolgáló ügyfél-bejelentkezéssel — ez ma is teljesen működőképes, és amint a `/fiok` portál elkészül, a pontegyenleg/kód oda is egyszerűen átkerülhet (5. pont végén jelezve).

A `transactions` és `service_tickets` táblák már ma is tartalmaznak `customer_id`-t (ellenőrizve) — erre épül a pontszámítás.

## 1. Adatmodell

```sql
alter table customers add column loyalty_points_balance integer not null default 0;
alter table customers add column referral_code text unique;
alter table customers add column referred_by_customer_id uuid references customers(id);

create table loyalty_points_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  points integer not null,  -- pozitív = jóváírás, negatív = beváltás/sztornó
  kind text not null check (kind in ('purchase_earn','service_earn','referral_bonus','redeem','manual_adjust','reversal')),
  transaction_id uuid references transactions(id),
  ticket_id uuid references service_tickets(id),
  reward_key text,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  reward_key text unique not null,
  label text not null,
  point_cost integer not null,
  our_cost numeric,        -- tájékoztató, mennyibe kerül nekünk
  customer_value numeric,  -- tájékoztató, mennyit ér a vevőnek
  active boolean not null default true,
  sort_order integer not null default 0
);
insert into loyalty_rewards (reward_key, label, point_cost, our_cost, customer_value, sort_order) values
  ('folia', 'Védőfólia felhelyezése', 350, 10, 50, 1),
  ('tok', 'Telefontok', 400, 10, 50, 2),
  ('toltofej', 'Töltőfej', 1400, 30, 90, 3);
```

A `loyalty_rewards` **tábla, nem kódba írt lista** — mert ez, ellentétben a fólia-akcióval (ami egy fix, egyszeri promóció volt), egy **bővülő katalógus**, amit idővel biztos alakítasz (új jutalom, árváltoztatás) — ezt jobb egy admin-felületről szerkeszthetővé tenni, mint minden módosításnál kódot íratni. (A Beállítások fülre kerülhet egy egyszerű lista-szerkesztő, hasonlóan az Alkatrészek-mintához.)

## 2. Pontszerzés — adatbázis-trigger, nem alkalmazás-kód

**Szándékosan trigger, nem az `App.jsx` egyes függvényeibe (sellProduct, setTicketStatus, webshop-rendelés stb.) beírt kód** — mert nagyon sok helyen keletkezik `transactions` sor (eladás, szerviz-átadás, hamarosan webshop-rendelés is), és egy triggerrel **mindegyiket egyszerre, biztosan** elkapjuk, nem kell minden jövőbeli új eladási útvonalba külön beleírni.

```sql
create or replace function award_loyalty_points() returns trigger language plpgsql as $$
declare v_points integer;
begin
  if NEW.type = 'income' and NEW.category in ('Készlet','Szerviz') and NEW.customer_id is not null and NEW.deleted_at is null then
    v_points := round(NEW.amount);
    insert into loyalty_points_ledger (customer_id, points, kind, transaction_id)
    values (NEW.customer_id, v_points, case when NEW.category = 'Készlet' then 'purchase_earn' else 'service_earn' end, NEW.id);
  end if;
  return NEW;
end;
$$;
create trigger trg_award_loyalty_points after insert on transactions for each row execute function award_loyalty_points();

create or replace function apply_loyalty_ledger() returns trigger language plpgsql as $$
begin
  update customers set loyalty_points_balance = loyalty_points_balance + NEW.points where id = NEW.customer_id;
  return NEW;
end;
$$;
create trigger trg_apply_loyalty_ledger after insert on loyalty_points_ledger for each row execute function apply_loyalty_ledger();
```

### 2b. Ajánlói bónusz — külön trigger a `loyalty_points_ledger`-en

Az ajánlói bónuszt **nem** a fenti `award_loyalty_points()`-be írjuk bele, hanem egy külön triggerbe, ami a most beszúrt `loyalty_points_ledger` sorra figyel — így tisztán elkülönül "pont jóváírása" és "ajánlói bónusz kiszámítása", és az "ez volt-e az első tranzakció" ellenőrzés is egyszerű `count(*)` lekérdezéssel megoldható:

```sql
create or replace function award_referral_bonus() returns trigger language plpgsql as $$
declare
  v_referrer uuid;
  v_is_first boolean;
begin
  if NEW.kind not in ('purchase_earn','service_earn') then return NEW; end if;

  select (count(*) = 1) into v_is_first
    from loyalty_points_ledger where customer_id = NEW.customer_id and kind in ('purchase_earn','service_earn');

  if v_is_first then
    select referred_by_customer_id into v_referrer from customers where id = NEW.customer_id;
    if v_referrer is not null then
      insert into loyalty_points_ledger (customer_id, points, kind, note) values (NEW.customer_id, 200, 'referral_bonus', 'Ajánlott lettél — üdvözlő bónusz');
      insert into loyalty_points_ledger (customer_id, points, kind, note) values (v_referrer, 200, 'referral_bonus', 'Sikeres ajánlás bónusz');
    end if;
  end if;
  return NEW;
end;
$$;
create trigger trg_award_referral_bonus after insert on loyalty_points_ledger for each row execute function award_referral_bonus();
```
(A `count(*) = 1` azért működik itt biztonságosan, mert ez a trigger már az ÚJONNAN beszúrt sor UTÁN fut, tehát ha ez az egyetlen `purchase_earn`/`service_earn` sor, akkor ez volt az első.)

### 2c. Törölt tranzakció → pontok visszavonása

Ha egy tranzakciót törölnek (`deleted_at` beállítása — a meglévő `deleteTransaction` mintáját követve), a hozzá tartozó pontot is vissza kell vonni, különben "ingyen" pont marad a rendszerben:

```sql
create or replace function reverse_loyalty_points() returns trigger language plpgsql as $$
begin
  if OLD.deleted_at is null and NEW.deleted_at is not null then
    insert into loyalty_points_ledger (customer_id, points, kind, transaction_id, note)
    select customer_id, -points, 'reversal', NEW.id, 'Törölt tranzakció miatt visszavonva'
    from loyalty_points_ledger where transaction_id = NEW.id and kind in ('purchase_earn','service_earn');
  end if;
  return NEW;
end;
$$;
create trigger trg_reverse_loyalty_points after update on transactions for each row execute function reverse_loyalty_points();
```

## 3. Ajánlói kód — generálás és megjelenítés

```sql
create or replace function generate_referral_code() returns text language sql as $$
  select upper(substr(md5(gen_random_uuid()::text), 1, 6));
$$;

create or replace function set_referral_code() returns trigger language plpgsql as $$
begin
  if NEW.referral_code is null then
    NEW.referral_code := generate_referral_code();
  end if;
  return NEW;
end;
$$;
create trigger trg_set_referral_code before insert on customers for each row execute function set_referral_code();
-- meglévő ügyfeleknek egyszeri backfill migrációval: update customers set referral_code = generate_referral_code() where referral_code is null;
```

**Hol látja a vevő a saját kódját?** A meglévő publikus oldalakon (`/status/:token`, `/receipt/:token`) — nincs szükség új oldalra. A `get_ticket_status_by_token`/`get_receipt_by_token` RPC-k bővülnek: `customer_points_balance` és `customer_referral_code` mezőkkel (join a `customers`-re a tranzakció/munkalap `customer_id`-ján keresztül). A `StatusLookup.jsx`/`ReceiptLookup.jsx` egy kis dobozban mutatja:

> **{balance} pontod van.** Ajánlói kódod: **{referral_code}** — add tovább egy barátnak, és ha nálunk vásárol vagy szervizeltet, mindketten +200 pontot kaptok!

## 4. Ajánló rögzítése — staff-oldali (mert még nincs önkiszolgáló fiók)

Amikor egy **új** ügyfél kerül fel (akár `CustomersTab.jsx` "Új ügyfél" űrlapján, akár a `StockModal`/`TicketFormModal` beépített gyors-ügyfélfelvételén, ahol a `CustomerAutocomplete` már ma is megvan), egy opcionális "Ajánlotta?" mező jelenik meg — ugyanaz a `CustomerAutocomplete` komponens, csak egy meglévő ügyfelet keresve. Ha a vevő elmondja a kódját, staff a kód alapján is kikeresheti (`customers` tábla `referral_code`-ra szűrve). Mentéskor ez tölti ki a `customers.referred_by_customer_id`-t — ez **csak új ügyfél létrehozásakor** értelmezhető (egy már meglévő ügyfélnél utólag nem, mert a bónusz az "első vásárlás/szerviz" pillanatához van kötve, ami akkor már megtörtént).

## 5. Beváltás — staff-oldali, a Kliens-lapon és eladás/átadás közben

- **`CustomersTab.jsx` kliens-részletnézet**: pontegyenleg (`loyalty_points_balance`) + rövid előzmény (`loyalty_points_ledger`, legutóbbi 10 sor) + "Pontbeváltás" gomb, ami megnyitja a `loyalty_rewards` (aktív, `point_cost <= balance`) listáját — kattintásra beváltja.
- **Eladáskor (`StockModal`) és szerviz-átadáskor (`DetailPanel`)**: ha a kiválasztott ügyfélnek elég pontja van legalább egy jutalomhoz, egy kis inline sáv jelzi ("Ennek az ügyfélnek {balance} pontja van — beváltható: Fólia, Tok"), hogy a pultos ne kelljen külön a Kliensek fülre menjen.
- **Beváltás technikailag**: negatív `loyalty_points_ledger` sor (`kind='redeem'`, `points = -point_cost`, `reward_key`) **plusz** egy kiadás-tranzakció a valós költséggel (`transactions` insert: `type='expense', category='Készlet', description='Pontbeváltás: {label}', amount={our_cost}`) — ez ugyanaz a minta, mint a `sellProduct()`-ban már ma is meglévő `accessories` tétel (Fólia/Kábel költség-könyvelés), így a haszonkimutatás pontos marad, a vevő pedig "ingyen" kapja a tételt (nincs hozzá bevétel-tranzakció).

**Amint a `/fiok` ügyfél-portál elkészül** (`TASKS_UGYFEL_FIOK.md`): a pontegyenleg/kód/előzmény oda egy új "Pontjaim" menüponttal egyszerűen átkerül (a `get_my_purchases`/`get_my_tickets` mintájára egy `get_my_loyalty_status()` RPC-vel), és a beváltás is önkiszolgálóvá tehető — ez a jelen terv változtatása nélkül ráépíthető, nem kell újratervezni.

## 6. Amit tisztázni kell / finomítani lehet

- A pontos számok (1 pont/Lei, 200 ajánlói bónusz, 350/400/1400 beváltási küszöb) a te elfogadásod szerint kerültek be — ha élesben úgy látod, hogy túl gyorsan/lassan gyűlik, ez csupán a `loyalty_rewards` sorok és a trigger `v_points`/bónusz-konstansainak módosítása, nem nagy munka.
- **`Bizomány` kategóriájú eladásoknál** (a `TASKS_BIZOMANYOS_ERTEKESITES.md` szerint) a trigger jelenleg csak `'Készlet'`/`'Szerviz'` kategóriára ad pontot — a bizományos eladás jutalék-bevétele ide még nincs betéve, mert ott a `transactions.amount` csak a jutalék, nem a teljes ár, ami pontszámításra más logikát igényelhet (a teljes eladási ár vagy csak a jutalék után járjon pont?) — jelezd, ha ezt is be szeretnéd venni, most kihagytam, nehogy rossz mennyiségű pontot adjon.

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes, migrációk (táblák, triggerek, RPC-bővítés) lefutnak
- Eladás/szerviz-átadás után a vevő pontegyenlege automatikusan nő, a `loyalty_points_ledger`-ben nyoma van
- Törölt tranzakciónál a pont visszavonódik
- Új ügyfél "Ajánlotta?" mezővel felvéve → az ajánlott ELSŐ vásárlása/szervize után mindkét fél +200 pontot kap, csak egyszer
- A `/status/:token` és `/receipt/:token` oldalon látszik a pontegyenleg és az ajánlói kód
- Kliens-lapon és eladás/átadás közben látszik az egyenleg, beváltható jutalom esetén jelez, beváltás után a pont levonódik és a valós költség kiadásként könyvelődik
- Nincs `git push`, csak lokális commit
