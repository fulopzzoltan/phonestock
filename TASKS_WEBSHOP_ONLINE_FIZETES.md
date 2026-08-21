# TASKS — Online bankkártyás fizetés a webshophoz (Stripe Checkout)

## 0. Kontextus és döntés

Ez a `TASKS_WEBSHOP_FLIP_BSGMAG_STIL.md` 6c pontjának folytatása — a user eldöntötte: **valódi online fizetés kell**, nem "fizetés átvételkor". Megerősítve: **kizárólag Romániában értékesítünk** — ez egyértelműen eldönti a szolgáltató kérdést.

### Fizetési szolgáltató: **Netopia Payments** (nem Stripe) — indoklás

Utánanéztem élőben a jelenlegi (2026-os) román piaci árazásoknak/feltételeknek, ez alapján:

1. **A bsgmag.ro — az egyik minta-webshop, amit kifejezetten követni szeretnél — maga is Netopiát használ** (ez látszik a lábléc fizetési ikonjai között, `netopiacolor-bsgmag.png`). Ha "ilyen webshopot" akarunk, ez egy közvetlen, konkrét precedens, nem csak elméleti érv.
2. **Kizárólag RO piac → a helyi szolgáltató előnyei súlyosabban esnek latba, mint Stripe API-jának kényelme.** Netopia/PayU/euPlătesc mind RON-ban, közvetlenül román bankokon keresztül számol el (nincs EUR-RON konverziós felár), és van magyar/román nyelvű telefonos ügyfélszolgálatuk — ez egy kétboltos, nem IT-háttércsapatos vállalkozásnál nagyon számít, ha egy fizetés beragad vagy a fiók zárolva lesz.
3. **Stripe kontra Netopia konkrét számokban** (2026, forrás lásd lent): Stripe 1.4% + 0.25€ (EU kártya), de **nem állít ki román fiskális számlát** és csak angol nyelvű email-supportja van (nincs telefonos RO support). Netopia ~1.5-2% + fix díj, RON-elszámolás, román support, e-Factura-kompatibilis könyvelő-szoftverekkel (SmartBill, Oblio) jobban összeköthető.
4. **Hátrány, amit tudnod kell**: a Netopia API-ja kevésbé modern/jól dokumentált, mint a Stripe-é, és néhány csomagjuknál szerződéses lock-in (12-24 hónap) lehet — ezt kérdezd meg konkrétan a szerződéskötéskor, mielőtt aláírod. A másik fejlesztői session számára ez azt jelenti, hogy az integrációt a Netopia hivatalos API-dokumentációja (docs.netopia-payments.ro) alapján kell pontosítania — ez a spec az architektúrát adja meg, a pontos mezőneveket/aláírás-formátumot a hivatalos dokumentáció alapján kell véglegesíteni.

**Amit nekem nem szabad/nem lehet megtennem helyetted:** Netopia-fiók regisztrációja, cégadatok/bankszámla megadása, API-kulcsok/tanúsítvány generálása — ezt neked kell elvégezned. A kulcsokat soha ne oszd meg velem chatben.

## 1. Fiók és kulcsok — a te teendőd, mielőtt ez implementálódik

1. Regisztrálj Netopia Payments (mobilPay) kereskedői fiókot (netopia-payments.ro), add meg a cégadatokat, bankszámlát (RON).
2. Igényeld a **POS szignatúrát** (signature) és a fizetéshez szükséges **publikus/privát kulcspárt** (RSA — a fizetési kérést ezzel írja alá a rendszer).
3. Állítsd be a **confirm URL**-t (ahova a Netopia az IPN-értesítést küldi fizetés után) és a **return URL**-t (ahova a vásárlót visszairányítja) — ezek a lenti Edge Function-ök URL-jei lesznek.
4. A privát kulcs + signature a Supabase projekt Edge Function environment secrets közé kerül (`supabase secrets set NETOPIA_SIGNATURE=... NETOPIA_PRIVATE_KEY=...`, terminálban, közvetlenül — nem chates átadással).

## 2. Adatbázis

### a) `web_orders` + `web_order_items`

```sql
create table web_orders (
  id uuid primary key default gen_random_uuid(),
  order_no bigserial,
  customer_profile_id uuid references customer_profiles(id),
  guest_name text,
  guest_email text,
  guest_phone text,
  location_id uuid references locations(id) not null, -- átvételi helyszín
  status text not null default 'fizetesre_var' check (status in (
    'fizetesre_var',   -- Stripe Checkout Session létrehozva, még nem fizetett
    'fizetve',         -- webhook megerősítette a fizetést
    'elokeszitve',     -- staff előkészítette átvételre
    'atadva',          -- vásárló átvette, lezárva
    'lemondva',        -- staff/vásárló lemondta, nem fizetett / töröltük
    'visszateritve'    -- 14 napos elállás / visszatérítés megtörtént
  )),
  hold_expires_at timestamptz, -- 'fizetesre_var' állapotban a foglalás lejárati ideje (15 perc)
  netopia_order_id text, -- a mi oldalunkon generált egyedi rendelés-azonosító, amit a Netopia felé küldünk
  netopia_ntp_id text, -- a Netopia által visszaadott tranzakció-azonosító (IPN-ből)
  total_amount numeric not null,
  public_token uuid not null default gen_random_uuid(), -- /rendeles/:token követéshez
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table web_order_items (
  id uuid primary key default gen_random_uuid(),
  web_order_id uuid references web_orders(id) not null,
  product_id uuid references products(id) not null,
  price numeric not null
);
alter table web_orders enable row level security;
alter table web_order_items enable row level security;
create policy web_orders_staff_all on web_orders for all
  using (current_role() = 'admin' or exists (select 1 from profiles pr where pr.id = auth.uid() and pr.location_id is not null))
  with check (current_role() = 'admin' or exists (select 1 from profiles pr where pr.id = auth.uid() and pr.location_id is not null));
create policy web_orders_customer_select on web_orders for select using (customer_profile_id = auth.uid());
```
Vendég/nem bejelentkezett vásárló **nem** kap közvetlen RLS-hozzáférést — a saját rendelését csak a `public_token`-t ismerő RPC-n (`get_web_order_by_token`) keresztül látja, ugyanúgy, mint a meglévő `/status`/`/receipt` publikus oldalak.

### b) `products` — foglalási állapot
Ha még nincs rá dedikált mező, egészítsd ki a `products` állapot-kezelését egy `'foglalva'` értékkel, amit a `get_public_stock()` RPC kizár a listából, pontosan úgy, ahogy az eladott darabok ma sem jelennek meg.

## 3. Edge Functions (Supabase) — nincs külön backend szerver, ez marad a Supabase-en belül

**Fontos:** a pontos Netopia API mezőneveket/aláírás-formátumot a hivatalos dokumentáció (docs.netopia-payments.ro, API v2) alapján kell véglegesíteni implementáláskor — itt az architektúra és a lépések sorrendje a lényeg, nem a bájtra pontos payload.

### a) `create-netopia-payment`
A checkout-oldal hívja, miután a vásárló megadta az adatait:
1. Tranzakción belül ellenőrzi, hogy a kosárban lévő `product_id`-k még elérhetők — ha valamelyik már `'foglalva'`/eladva, hibát ad vissza ("Ezt a darabot közben más megvette").
2. `products.status = 'foglalva'` mindegyikre + létrehoz egy `web_orders` sort (`status='fizetesre_var'`, `hold_expires_at = now() + interval '15 minutes'`, generál egy egyedi `netopia_order_id`-t).
3. A Netopia API v2 szerint összeállítja és a `NETOPIA_PRIVATE_KEY`-jel aláírja a fizetési kérést (összeg RON-ban, `netopia_order_id`, confirm URL, return URL → `/rendeles/:token`).
4. Visszaadja a Netopia hosted fizetőoldal URL-jét, a frontend odairányít — a vásárló **a Netopia oldalán** adja meg a kártyaadatokat, nálunk soha nem futnak át (PCI-egyszerűsítés, ugyanaz az elv, mint Stripe-nál lett volna).

### b) `netopia-ipn` (Instant Payment Notification — ez a Netopia "webhook"-ja)
A Netopia szerver-szerver POST-ot küld erre a `confirmUrl`-re, amikor a fizetés állapota változik. **Az IPN aláírás-ellenőrzés kötelező** a Netopia publikus tanúsítványával — enélkül bárki hamis "sikeres fizetés" értesítést küldhetne.
- Sikeres fizetés → `web_orders.status = 'fizetve'`, elmenti a `netopia_ntp_id`-t, felveszi a bevételt a `transactions` táblába (a meglévő eladási mintát követve, `category='Készlet'`). A `products.status` marad `'foglalva'` — most már "eladva, átvételre vár" értelemben. A függvénynek a Netopia által elvárt XML/JSON visszaigazolást kell adnia válaszul (ez az IPN-protokoll része, a hivatalos doksiban pontosan le van írva).
- Sikertelen/megszakadt fizetés, vagy a mi `hold_expires_at`-unk lejár → `web_orders.status = 'lemondva'`, `products.status` visszaáll elérhetőre.

### c) Lejárt foglalások takarítása
Időzített job (Supabase Scheduled Function / `pg_cron`) percenként megnézi a `fizetesre_var` + lejárt `hold_expires_at` sorokat, felszabadítja a hozzájuk tartozó `products` sorokat — ez véd az ellen, hogy valaki elkezdi a fizetést, otthagyja, és a telefon örökre "foglalva" maradjon.

## 4. Frontend

- Kosár állapot (a fő webshop-spec szerint), Checkout oldal (`/penztar`): adatok megadása után hívja a `create-netopia-payment` Edge Function-t, majd a kapott URL-re navigál — Netopia hosted oldalra kerül a vásárló, **nincs saját kártya-beviteli mező** (ez a PCI-egyszerűsítés lényege).
- `/rendeles/:token` publikus, nem bejelentkezést igénylő állapot-oldal (a `/status`/`/receipt` mintájára), ami a Netopia return URL-jéről érkező vásárlónak mutatja a rendelés állapotát.
- **14 napos elállási jog tájékoztatás** kötelezően jól látható a checkout oldalon ("Az online megrendelt terméket a kézhezvételtől számított 14 napon belül indoklás nélkül visszaküldheted") — **ezt könyvelővel/jogi tanácsadóval pontosítsd**, én nem vagyok jogi tanácsadó, ez a szöveg csak vázlat, nem helyettesíti a szakmai ellenőrzést.

## 5. Staff oldal — "Webes rendelések" a Pulton
Új `.pult-section`: `fizetve` és `elokeszitve` állapotú rendelések listája, léptethető állapotokkal (`elokeszitve` → `atadva` a boltban, fizikai átadáskor).

## 6. Kötelező tesztek élesítés előtt

1. Netopia **sandbox/teszt módban** (teszt szignatúra, teszt kártyaszámok) végigfuttatva a teljes flow: kosár → checkout → Netopia fizetés → IPN → `web_orders.status='fizetve'` → `products.status` helyesen frissül.
2. Verseny-helyzet teszt: két böngészőben egyszerre ugyanazt a darabot kosárba téve, csak az egyiknek szabad sikeresen fizetnie.
3. Lejárt foglalás felszabadulása (rövidített hold-idővel tesztkörnyezetben).
4. IPN aláírás-ellenőrzés: hamis/aláíratlan IPN-hívás **nem** fogadható el.
5. Csak ezután kapcsolható élő (production) Netopia-kulcsra — **ez kizárólag a te kifejezett jóváhagyásoddal történjen**, amíg teszt módban van, semmi valódi pénz nem mozog.

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes, migrációk lefutnak
- Teszt-fizetés Netopia teszt-kártyával sikeresen végigmegy
- Verseny-helyzet teszt helyesen kezelve (nincs dupla-eladás)
- IPN aláírás-ellenőrzés működik, hamis kérés elutasítva
- Staff látja és kezelni tudja a webes rendeléseket a Pulton
- 14 napos elállási tájékoztatás megjelenik a checkout oldalon
- Nincs `git push`, csak lokális commit
- Élő Netopia-kulcsra váltás nem történik meg automatikusan, csak jóváhagyás után
