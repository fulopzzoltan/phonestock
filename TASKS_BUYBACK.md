# TASKS — Publikus "Add el a telefonod" felvásárló szolgáltatás

**Kontextus:** ez már nem belső bolti eszköz, hanem egy nyilvános, bejelentkezés nélküli oldal (mint a `/status` vagy a publikus stock showcase), amivel bárki, otthonról beadhatja a régi telefonját eladásra — a Backmarket/Flip.ro/ShowMe.hu felvásárló-eszközeinek UX-mintáit követve, de a ti egyedi előnyötökre építve: **két fizikai bolt van, tehát személyes átadást is fel tudtok ajánlani**, ahol a tisztán online versenytársak nem tudnak (nincs várakozás postára, azonnal kézhez kapja a pénzt).

Nagy feature, fázisokban implementáld, külön commit-onként. **Ne pusholj / ne deployolj**, csak lokális commit, amíg nem szólnak.

---

## 0. Pszichológiai alapelvek — ez adja a "elad, nem csak szép" faktort

Minden UI-döntésnek legyen indoka, ne csak esztétikai. Ezeket vedd figyelembe minden lépésnél:

- **Horgonyzás (anchoring).** A Flip.ro és a ShowMe.hu is a *modell-választó rácson* rögtön kiírja: "Akár X Lei" — mielőtt egyetlen kérdésre válaszolna a user. Ez beég mint referenciapont, és utána minden levonás ehhez képest tűnik kicsinek. Ugyanezt csináld: a modellválasztó kártyákon rögtön a `buyback_models.base_price` alapján számolt maximum ár legyen kiírva.
- **Progresszió / befektetett erőfeszítés (sunk cost, Zeigarnik-effektus).** A ShowMe explicit 1-6 lépésjelzője pszichológiailag "lezár" — ha már a 3. lépésnél tartasz, sokkal nehezebb kilépni, mint egy hagyományos formnál, ahol nem látod a végét. Legyen mindig látható lépésszámláló ("3/7"), és a haladás legyen vizuálisan is jutalmazó (checkmark-ok, kitöltött progress bar).
- **Veszteségkerülés (loss aversion), nem csak nyereség.** Az ár-újraszámításnál (ld. 4. pont) a UI ne csak azt mondja "az ár csökkent X-re emiatt", hanem árnyald: mutasd az eredeti horgony-árat áthúzva, és mellette az újat — a vizuális "elvesztett" összeg erősebb motivátor, mint egy puszta szám.
- **Azonnaliság / alacsony súrlódás.** Minden képernyőn max 1 döntés. Ne kelljen scrollozni egy kérdéshez. Nagy, kattintható kártyák (nem apró radio gombok) — ujjal/egérrel egy mozdulat.
- **Bizalmi jelek (social proof + biztonság).** A Flip a "4.9/5, 9931 vásárló" adatot rögtön a hero alatt mutatja. Nektek is kell egy hasonló sor (akár csak "X sikeres felvásárlás" számláló, ha lesz elég adat, vagy egyelőre "2 fizikai bolt, azonnali kifizetés helyben" mint bizalmi állítás).
- **Reciprocitás + azonnali jutalom.** Az ajánlat-képernyőn (5. lépés vége) ne csak egy szám legyen, hanem egy pozitív megerősítés ("Szuper ajánlatot kaptál!") + a három ígéret felsorolva (mennyi idő, hogyan kapja meg a pénzt, mi történik ezután) — ugyanaz a minta, mint a ShowMe "2 perc / ingyenes futár / 3 munkanapon belül" sávja.
- **Egyediség kiemelése (unique selling point).** Emeld ki vizuálisan a személyes-átadás opciót: "Hozd be Gyimesbe vagy Szentgyörgyre, és **azonnal** viheted a pénzt" — ez az egyetlen dolog, amit Backmarket/Flip nem tud kínálni egy helyi ügyfélnek. Ne süllyesszd el a postai opció mellé egyenrangú gombként — legyen ez az alapértelmezett/kiemelt választás.

---

## 1. Adatmodell

Használd a Supabase MCP `apply_migration`-t.

```sql
-- Bázisárak modellenként (admin karbantartja)
create table public.buyback_models (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model text not null,
  storage text,
  base_price numeric not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Levonási szabályok (állapot-kérdésenként), admin karbantartja
create table public.buyback_deduction_rules (
  id uuid primary key default gen_random_uuid(),
  question_key text not null,      -- pl. 'screen_condition', 'battery_health', 'powers_on', 'network_lock', 'accessories'
  answer_key text not null,        -- pl. 'cracked', 'below_80', 'no', 'locked', 'missing'
  label text not null,             -- felhasználónak mutatott szöveg
  deduction_type text not null check (deduction_type in ('percent', 'fixed')),
  deduction_value numeric not null,
  active boolean not null default true
);

-- Ügyfél-ajánlatok
create table public.buyback_offers (
  id uuid primary key default gen_random_uuid(),
  offer_no bigint generated always as identity unique,
  public_token uuid not null default gen_random_uuid() unique,
  short_code text not null default substr(md5(gen_random_uuid()::text), 1, 8) unique,
  customer_id uuid references public.customers(id),
  customer_name text not null,
  customer_phone text not null,
  brand text not null,
  model text not null,
  storage text,
  color text,
  imei text,
  answers jsonb not null default '{}',       -- { screen_condition: 'cracked', battery_health: 'below_80', ... }
  estimated_price numeric not null,
  final_price numeric,
  status text not null default 'Ajánlat elkészült'
    check (status in ('Ajánlat elkészült', 'Elfogadva - várjuk a készüléket', 'Beérkezett', 'Bevizsgálás alatt', 'Végleges ajánlat', 'Kifizetve', 'Elutasítva')),
  delivery_method text check (delivery_method in ('Személyes átadás', 'Postai')),
  location_id uuid references public.locations(id),   -- ha személyes átadás, melyik bolt
  consent_at timestamptz,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.buyback_models enable row level security;
alter table public.buyback_deduction_rules enable row level security;
alter table public.buyback_offers enable row level security;

-- Admin/employee mindent lát-szerkeszt (mint a parts), a nyilvános oldal csak RPC-ken keresztül fér hozzá
create policy buyback_models_rw on public.buyback_models for all to authenticated using (true) with check (true);
create policy buyback_deduction_rules_rw on public.buyback_deduction_rules for all to authenticated using (true) with check (true);
create policy buyback_offers_rw on public.buyback_offers for all to authenticated
  using (public."current_role"() = 'admin' or location_id = public.current_location_id() or location_id is null)
  with check (public."current_role"() = 'admin' or location_id = public.current_location_id() or location_id is null);
```

**Publikus (anon) hozzáférés security-definer RPC-ken keresztül** — kövesd pontosan a meglévő `get_ticket_status`/`get_ticket_status_by_token` mintát (lásd CLAUDE.md "Publikus oldalak" szakasz):

```sql
-- ártáblázat lekérdezése (csak aktív modellek, nyilvánosan böngészhető)
create or replace function public.get_buyback_models()
returns setof public.buyback_models
language sql security definer set search_path = public
as $$ select * from public.buyback_models where active and deleted_at is null; $$;
grant execute on function public.get_buyback_models() to anon, authenticated;

create or replace function public.get_buyback_deduction_rules()
returns setof public.buyback_deduction_rules
language sql security definer set search_path = public
as $$ select * from public.buyback_deduction_rules where active; $$;
grant execute on function public.get_buyback_deduction_rules() to anon, authenticated;

-- ajánlat beküldése
create or replace function public.submit_buyback_offer(
  p_customer_name text, p_customer_phone text, p_brand text, p_model text, p_storage text,
  p_color text, p_imei text, p_answers jsonb, p_estimated_price numeric,
  p_delivery_method text, p_location_id uuid, p_marketing_consent boolean
) returns table (public_token uuid, short_code text)
language plpgsql security definer set search_path = public
as $$
declare
  v_customer_id uuid;
  v_row public.buyback_offers;
begin
  v_customer_id := public.upsert_customer(p_customer_name, p_customer_phone); -- a TASKS_CUSTOMERS.md-ben leírt függvény
  insert into public.buyback_offers (
    customer_id, customer_name, customer_phone, brand, model, storage, color, imei,
    answers, estimated_price, delivery_method, location_id, consent_at, marketing_consent
  ) values (
    v_customer_id, p_customer_name, p_customer_phone, p_brand, p_model, p_storage, p_color, p_imei,
    p_answers, p_estimated_price, p_delivery_method, p_location_id, now(), p_marketing_consent
  ) returning * into v_row;
  return query select v_row.public_token, v_row.short_code;
end;
$$;
grant execute on function public.submit_buyback_offer(text,text,text,text,text,text,text,jsonb,numeric,text,uuid,boolean) to anon, authenticated;

-- publikus állapot-lekérdezés (token vagy rövid kód alapján, mint a szerviznél)
create or replace function public.get_buyback_offer_status(p_token uuid)
returns table (offer_no bigint, brand text, model text, status text, estimated_price numeric, final_price numeric, delivery_method text, created_at timestamptz)
language sql security definer set search_path = public
as $$
  select offer_no, brand, model, status, estimated_price, final_price, delivery_method, created_at
  from public.buyback_offers where public_token = p_token and deleted_at is null;
$$;
grant execute on function public.get_buyback_offer_status(uuid) to anon, authenticated;

create or replace function public.get_buyback_offer_status_by_short_code(p_code text)
returns table (offer_no bigint, brand text, model text, status text, estimated_price numeric, final_price numeric, delivery_method text, created_at timestamptz)
language sql security definer set search_path = public
as $$
  select offer_no, brand, model, status, estimated_price, final_price, delivery_method, created_at
  from public.buyback_offers where short_code = p_code and deleted_at is null;
$$;
grant execute on function public.get_buyback_offer_status_by_short_code(text) to anon, authenticated;
```

Fontos: ez a `submit_buyback_offer` az `upsert_customer` függvényre épít, ami a `TASKS_CUSTOMERS.md`-ben van leírva — ha az még nincs megvalósítva, azt előbb kell.

---

## 2. Árazási motor (kliens oldalon számolt, élő)

**Új fájl:** `src/lib/buybackPricing.js`
```js
export function calculateBuybackPrice(basePrice, answers, rules) {
  let price = basePrice;
  const applied = [];
  for (const rule of rules) {
    const answer = answers[rule.question_key];
    if (answer !== rule.answer_key) continue;
    const before = price;
    price = rule.deduction_type === "percent"
      ? price * (1 - rule.deduction_value / 100)
      : price - rule.deduction_value;
    applied.push({ label: rule.label, before, after: price });
  }
  return { price: Math.max(0, Math.round(price)), applied };
}
```
Ez fusson le minden válaszváltozás után élőben (nem csak a végén) — ld. 4. pont.

---

## 3. Publikus flow — új route és komponensek

**Fájl:** `src/main.jsx` — kövesd a meglévő regex-routing mintát (10–17. sor):
```js
const buybackMatch = window.location.pathname.match(/^\/eladom\/?$/i);
const buybackStatusMatch = window.location.pathname.match(/^\/eladom-allapot\/?([0-9a-f-]{36})?$/i);
const buybackShortMatch = window.location.pathname.match(/^\/e\/([a-f0-9]{8})\/?$/i);
```
és a `Root()`-ban a megfelelő ágak.

**Új fájl:** `src/BuybackFlow.jsx` — a fő wizard, saját state-gép (nem kell router-lib, ugyanúgy mint a többi publikus oldal). Lépések:

1. **Márka/kategória választás** — nagy kártyák (Apple/Samsung/Huawei/Xiaomi/Egyéb), ikonnal.
2. **Modell választás** — kártyarács, keresővel, **minden kártyán "Akár X Lei"** felirat a `buyback_models.base_price`-ból (horgonyzás, ld. 0. pont).
3. **Tárhely + szín** — egy képernyő, nagy gombok.
4. **Állapot-kérdések, egyenként egy képernyő** (Backmarket-stílus, egy kérdés = egy fókusz):
   - Bekapcsol-e / működik-e rendesen?
   - Kijelző állapota (ép / karcos / repedt)
   - Akkuegészség (ha tudja: 90%+ / 80-90% / 80% alatt / nem tudja)
   - Hálózatfüggetlen-e (igen / operátorhoz kötött)
   - Tartozékok megvannak-e (doboz, töltő)
   - IMEI (opcionális — ha nem olvasható, kihagyható, ugyanúgy mint a szerviz munkalapnál)
5. **Élő ár-kijelzés** minden lépés tetején/alján rögzítve (sticky): "Jelenlegi ajánlat: **X Lei**" — ez frissül minden válasznál, ne csak a legvégén jelenjen meg (ld. pszichológiai indoklás 0. pontban).
6. **Végső ajánlat képernyő** — nagy, ünnepélyes szám, alatta a 3 ígéret-sáv (idő, hogyan kapja a pénzt, mi történik ezután), és a két szállítási opció kártyaként, a **személyes átadás kiemelve/alapértelmezettként kiválasztva**.
7. **Kapcsolattartási adatok** — név + telefon (mindkettő kötelező, ellentétben a boltos SellModal-lal, mert itt nincs más módja azonosítani az ügyfelet), + marketing-hozzájárulás checkbox (külön a GDPR-jellegű adatkezelési elfogadástól, ugyanúgy mint a `TASKS_CUSTOMERS.md`-ben leírt minta), ha "Személyes átadás", helyszín-választó (Gyimes/Szentgyörgy).
8. **Elküldés** → `supabase.rpc("submit_buyback_offer", {...})`, majd SMS (a meglévő `send-sms` function-nel, `stripAccents`-szel, rövid linkkel `/e/<short_code>`), majd átirányítás/megjelenítés: "Köszönjük! Ajánlatod: X Lei. SMS-ben is elküldtük a követő linket."

**Design-rendszer:** ne hozz be új UI-libet, kövesd a meglévő `index.css` class-okat (`.btn`, `.field`, `.card`-szerű minták a `StockShowcase.jsx`-ből), hogy konzisztens maradjon a publikus stock oldallal.

---

## 4. Élő ár-újraszámítás komponens

**Új fájl:** `src/components/BuybackPriceBar.jsx` — sticky sáv (fent vagy lent rögzítve), ami mindig mutatja:
- az eredeti horgony-árat áthúzva (ha van már levonás)
- a jelenlegi becsült árat nagy, kiemelt számmal
- opcionálisan egy kis "miért ennyi?" lenyitható lista (`applied` tömb a pricing motorból)

Ez legyen jelen a 3–6. lépésekben folyamatosan (nem csak a végén jelenik meg) — ez a Flip.ro élő-kép mintájának megfelelője, csak árral.

---

## 5. Publikus állapotkövető oldal

**Új fájl:** `src/BuybackStatusLookup.jsx` — kövesd pontosan a `src/StatusLookup.jsx` mintáját (token vagy rövid kód alapján `get_buyback_offer_status`/`get_buyback_offer_status_by_short_code` RPC hívás), mutassa a jelenlegi státuszt, a becsült és (ha van) végleges árat, szállítási módot.

---

## 6. Staff/admin oldal — "Felvásárlás" tab

**Fájl:** `src/App.jsx` — új nav tab (`FelvasarlásIcon`, kövesd a meglévő navbtn mintát), új `tab === "buyback"` blokk. Kanban-szerű nézet a `service` tab mintájára (`TicketCard.jsx` → `BuybackOfferCard.jsx` analógia), oszlopok a `status` enum szerint.

Munkalap-részletnézetben (staff a bevizsgáláskor):
- Az `estimated_price` mellett egy `final_price` mező, amit a staff a fizikai bevizsgálás után módosíthat (ha a készülék rosszabb/jobb állapotú, mint amit az ügyfél online megadott).
- **"Kifizetve" gomb** — erre kattintva:
  1. `status = 'Kifizetve'`, `final_price` rögzítve.
  2. Automatikusan létrejön egy **kiadás**-tranzakció a `transactions` táblában (`type: 'expense'`, `category: 'Készlet'`, `amount: final_price`, `customer_id`/`customer_name`/`customer_phone` átvéve) — pont fordítva, mint a szerviz-átadásnál (ott bevétel keletkezik automatikusan, itt kiadás).
- **"Termékké alakítás" gomb** — előtölti a meglévő `StockModal`-t a felvásárlási adatokkal (brand/model/storage/color/imei, `costPrice = final_price`), staff csak a grade-et és az eladási árat adja meg, majd `products` sor jön létre — így a felvásárolt telefon egy kattintással bekerül a Telefonok készletbe.
- **"Elutasítva" gomb** — ha a bevizsgálás után nem felel meg (pl. lopott IMEI — ld. a korábbi "Telefon készlet — profi szintre húzás" roadmap-pontot, itt is érdemes IMEI blacklist-ellenőrzést végezni, mielőtt kifizetitek).

---

## 7. Admin — bázisár és levonási szabály karbantartás

Egyszerű CRUD felület (lehet a "Felvásárlás" tab egy al-nézete, admin-only) a `buyback_models` és `buyback_deduction_rules` táblákhoz — hasonló mintával, mint a `PartModal.jsx`/Alkatrészek tab.

---

## Szándékosan kihagyva ebből a körből (ne építsd bele, kérdezd meg előbb, ha mégis kell)

- **Automata banki kifizetés/IBAN-gyűjtés.** Ez fizetési/fintech integrációt igényelne — a "Kifizetve" gomb egyelőre csak rögzíti, hogy a staff kézzel/helyben kifizette (készpénz vagy átutalás), nem indít tényleges utalást.
- **Postai csomagküldés-integráció** (futárszolgálat API, címke-generálás) — most csak "Postai" mint választható opció jelenik meg, a tényleges logisztika egyelőre kézi/telefonos egyeztetés staff és ügyfél között.

---

## Ellenőrzőlista implementálás után

- Végigmentél a teljes publikus flow-n (`/eladom`) legalább 2 különböző eszköz/állapot-kombinációval, az élő ár helyesen frissül minden lépésnél
- A horgony-ár (base_price) és a végső becsült ár közötti eltérés vizuálisan egyértelmű (áthúzott eredeti + új ár)
- SMS kiment a beküldéskor, a rövid link (`/e/xxxxxxxx`) működik és a helyes ajánlatra mutat
- Staff oldalon a Felvásárlás kanban helyesen mutatja az új ajánlatokat, a "Kifizetve" gomb valóban létrehoz egy kiadás-tranzakciót
- "Termékké alakítás" helyesen előtölti a StockModal-t
- RLS/RPC teszt: anon felhasználó (kijelentkezve) tud ajánlatot beküldeni és lekérdezni, de NEM lát más ajánlatokat, és nem fér hozzá közvetlenül a `buyback_offers` táblához RPC nélkül
- Admin tudja szerkeszteni a bázisárakat és levonási szabályokat, employee nem (ha ezt így akarjátok)
- Mobilon (keskeny nézet) a flow végig használható — ez lesz a fő belépési csatorna, sokan telefonról töltik ki épp azzal a telefonnal, amit el akarnak adni
