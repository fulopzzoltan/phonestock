# TASKS — Vélemény/review rendszer a webshophoz + a meglévő ~40 review felvitele

Kérés: "kikellene dolgozz egy review rendszert a webshopnak, nézd meg mit talál a neten mennyire növeli meg a vásárlási kedvet stb, és úgy kellene megcsinálni, hogy nekem van vagy 40 review előző oldalról, és azokat fel kellene tudjam vinni"

## 0. Amennyire számít — a kutatás

Vásárlók 93%-a keres véleményt vásárlás előtt, 40% egyenesen nem vesz olyan terméket, aminek nincs értékelése. Vélemény nélküli és véleményes termékoldal között **270%-os** konverziós különbség mérhető, elektronikánál (ide tartoztok) kifejezetten **38%-kal** magasabb a konverzió, ha vélemény van kirakva. 11-30 vélemény már ~68%-kal jobban konvertál, mint a nulla — a "hiteles, de nem túltolt" sáv kb. 26-50 vélemény, vagyis a **40, amid már megvan, pont a jó tartományban van**, nem kell 100-at hajkurászni. A "Ellenőrzött vásárló" jelzés önmagában kb. +15% konverziós löketet ad.

**SEO-bónusz**: ha a review-kat strukturált adatként (JSON-LD `AggregateRating`) is kiteszed, a csillagok megjelenhetnek magában a Google találati listában is — ez akár +35% átkattintást hozhat, mielőtt a látogató egyáltalán a site-ra érne.

## 1. Fontos felismerés a te boltodra nézve

Egy szokásos webshopnál (pl. ruha, elektronikai új termék) egy adott terméket sok vásárló értékel újra és újra — nálatok viszont **minden telefon egyedi, használt darab**, amit egyszer adtok el. Emiatt **nem termékenkénti** review-rendszert érdemes építeni (az egy konkrét, már eladott iPhone 13-hoz fűzött vélemény semmit nem mond a következő vevőnek, mert az a konkrét darab már elkelt) — hanem **bolt-szintű bizalmi review-szekciót**: "mit mondanak rólunk a vásárlóink" jellegű, ami a főoldalon, a szerviz-becslő és a felvásárlás oldalon egyaránt megjelenik, mindenhol ugyanazt az összesített csillagszámot és a legjobb véleményeket mutatva.

## 2. Adatmodell

```sql
create table reviews (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  rating integer not null check (rating between 1 and 5),
  body text not null,
  review_date date not null default current_date,
  source text not null default 'kezi' check (source in ('kezi','google','facebook','importalt')),
  location_id uuid references locations(id),        -- opcionális: melyik boltról szól, ha kiderül
  is_published boolean not null default true,
  reply_text text,                                   -- opcionális, ti válaszoltok rá nyilvánosan
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
```

Nincs `product_id` — direkt nem termékhez kötött, az 1. pont miatt.

## 3. Admin oldal — "Vélemények" fül (Webshop csoportba, a Felvásárlás/Szerviz árbecslő mellé)

- Lista nézet: minden review kártyaként (név, csillagok, szöveg, dátum, forrás-cimke), publikált/rejtett kapcsolóval és szerkeszthetően.
- **"Tömeges felvitel" gomb** — ez oldja meg a 40 meglévő review felvitelét: egy nagy szövegmező, ahova bemásolható több review egyszerre, egyszerű, sortöréssel elválasztott formátumban (pl. `Név | csillag | szöveg | dátum`), amit a rendszer soronként szétbont és előnézetben megmutat mentés előtt — így nem kell 40-szer egyesével kattintgatnod. Ha inkább Excel/CSV-ben van meg neked (pl. Google Business exportból), azt is be tudjuk olvasni ugyanoda.
- Minden importált review `source='importalt'`-tal jön be, hogy lásd, melyik honnan van.

**Ehhez most tőled kell a nyers anyag** — ha bemásolod ide a chatbe a 40 véleményt (vagy csatolod, ahonnan van: screenshot, exportált fájl, Google Business lista), rögtön be is tudom tölteni SQL-lel, nem kell megvárni, míg a másik munkamenet megépíti az admin felületet.

## 4. Publikus megjelenés

- **Bizalmi jelvény** a `PublicHeader.jsx`-ben vagy a `StockShowcase.jsx` hero szekciójában, mindig látható: "★ 4,8 (42 vélemény)" — az összesített `AVG(rating)`/`COUNT(*)` a publikált review-kból, egy `get_public_reviews()` RPC-vel (a meglévő `get_public_locations` mintájára, `security definer`, csak a publikált mezőket adja vissza).
- **Review-szekció** a főoldalon (`StockShowcase.jsx`), a `PublicFooter` előtt: kártyás sor/karusszel, 6-8 legjobb/legfrissebb véleménnyel, "Összes vélemény" linkkel egy dedikált `/velemenyek` oldalra (a többi publikus route mintájára, `main.jsx`-ben egy új regex-útvonal).
- Ugyanez a bizalmi jelvény kerüljön ki a `/becsles` (szerviz árbecslő) és `/eladom` (felvásárlás) oldalak tetejére is — ott dönt a látogató, hogy rátok bízza-e a telefonját, ott van a legnagyobb szüksége a bizalmi jelre.
- **JSON-LD** (`react-helmet-async`, ami már használatban van a projektben) minden publikus oldalra: `Product`/`LocalBusiness` + `AggregateRating` + néhány `Review` node, a fenti validálási szabály szerint (a séma számai pontosan egyezzenek a látható csillagszámmal/darabszámmal).
- RO nyelvi verzió (`lang="ro"`) is kapja meg ugyanezt, a meglévő `t(lang)`/i18n mintát követve.

## 5. Amit érdemes eldönteni — új vélemények gyűjtése (nem a 40 régi, hanem az ezután jövők)

Két út van, mindkettő ésszerű, csak más a ráfordítás:

- **A) Saját, site-on belüli gyűjtés**: szerviz-átadás vagy telefon-eladás után egy SMS-ben (a meglévő `send-sms` Edge Function-t már használjátok pl. "kész a javításod" értesítésre) egy link megy ki egy kis publikus `/velemeny/:token` űrlapra, ahol a vevő csillagoz + ír pár sort — ez bekerül a `reviews`-ba `is_published=false`-sal, amíg jóvá nem hagyod. Teljes kontroll nálatok, de ezt nektek kell moderálni.
- **B) Google-értékelésre tereljük őket**: az SMS/email egyszerűen a Google Business profilotok értékelő linkjére mutat. Ennek nagyobb a külső súlya (Google Maps/keresés helyi rangsorolásában is számít, nem csak nálatok a site-on), és nem kell moderálnotok — cserébe a saját oldalatokon nem jelenik meg automatikusan, azt kézzel kellene időnként átmásolnod (ugyanazzal a "Tömeges felvitel" gombbal, amit a 40 régihez is használtok).

Ha nincs erős preferenciád, a **B) az egyszerűbb induló lépés** (nulla extra fejlesztés az SMS-küldésen túl), az A) egy következő fázisban ráépíthető, ha úgy látod, hogy sokan lusták lennének kimenni Google-re.

---

## Ellenőrzőlista implementálás után

- `reviews` tábla, RLS: publikus `select` csak `is_published=true`-ra egy security-definer RPC-n (`get_public_reviews`) keresztül, admin mindent lát/szerkeszt
- Admin "Vélemények" fül: lista, szerkesztés, publikálás/elrejtés, tömeges (szöveg vagy CSV) felvitel előnézettel
- Bizalmi csillag-jelvény a főoldal hero-ban, a `/becsles` és `/eladom` oldalakon
- Review-szekció a főoldalon + dedikált `/velemenyek` oldal
- JSON-LD `AggregateRating` minden publikus oldalon, a látható számokkal egyezően
- RO nyelvi verzió ugyanezt kapja
- `npm run build` hibamentes
- Nincs `git push`, csak lokális commit

---

**Források**:
- [45 ecommerce conversion rate statistics you need to know in 2026 — Ringly](https://www.ringly.io/blog/ecommerce-conversion-rate-statistics-2026)
- [Ecommerce Product Reviews: Benefits, Strategies & Best Practices — Contentsquare](https://contentsquare.com/guides/ecommerce-ux/product-review-section/)
- [Ecommerce Product Reviews 2026: Conversion, Schema, AI Summaries — Velsof](https://www.velsof.com/blog/ecommerce-product-reviews-guide/)
- [Review and Rating Schema Markup for E-Commerce](https://blogarena360.com/review-and-rating-schema-for-ecommerce/)
