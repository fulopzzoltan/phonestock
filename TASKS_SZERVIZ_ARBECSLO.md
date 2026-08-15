# TASKS — Publikus szerviz árbecslő (`/becsles`)

**Kontextus:** jelenleg nincs semmilyen online ár-tájékoztatás a szervizről — az ügyfélnek be kell hívnia vagy be kell jönnie, hogy megtudja, mennyibe kerül egy kijelzőcsere. Ez a feladat egy 3 lépéses, publikus (bejelentkezés nélküli) árbecslő varázslót épít, ami:

1. Azonnal árat mutat a leggyakoribb javításokra (kijelző, akku, töltőcsatlakozó, kamera) — modellcsalád-szinten árazva, nem darabra pontosan modellenként (fenntarthatatlan lenne karban tartani több száz modellt).
2. **Élő raktárkészlet alapján jelzi, hogy MA megcsinálható-e** — ez az igazi egyedi elem, amit egy általános online kalkulátor nem tud, mert nincs élő raktáradata egy adott bolthoz. Ezt a meglévő `parts` táblához kötjük.
3. A végén nem engedi el a leadet: "Foglald le a helyed" — előregisztrálja az ügyfelet (`repair_leads`), amit a személyzet a fizikai átvételkor egy kattintással valódi munkalappá alakít (`service_tickets`).

**Tervezési döntés (a felhasználóval egyeztetve):** nem darabra pontos modell-árazás, hanem **modellcsalád**-szintű (pl. "iPhone 11–13", "iPhone 14–16") — ez a fenntartható középút. Csak a 4 alkatrész-alapú, kiszámítható javítás kap fix mátrix-árat: **Kijelző, Akku, Csatlakozó, Kamera** (ezek már léteznek a `PROBLEM_TAGS`-ban LCD/Akku/Csatlakozó/Kamera néven). A `FRP`, `Szoftver`, `Egyéb` problémák diagnózis-igényesek, ezeknél nincs mátrix-ár, csak lead-felvétel ("Hozd be ingyenes felméréshez").

**FONTOS — olvasd el a `TASKS_SEO_GEO.md`-t is EZ ELŐTT, ha még nem tetted.** A `RepairEstimator.jsx` (4. pont, lent) még meg nem írt fájl — ha a `TASKS_SEO_GEO.md` már készen van, azt is `lang` prop + `src/lib/i18n.js` szótár mintára írd meg, ne hardkódolt magyar szöveggel.

Ne pusholj / ne deployolj, csak lokális commit, amíg nem szólnak. A DB-migrációkat is a coding-agent session futtassa (`apply_migration`), ne külön.

---

## 1. DB migráció

```sql
-- Árazási mátrix: modellcsalád × probléma → ár. Az admin tölti ki a valós árakat (nincs kitalált szám a seed-ben).
create table public.repair_prices (
  id uuid primary key default gen_random_uuid(),
  family_key text not null,             -- pl. 'iphone-11-13' — a src/lib/repairCatalog.js-ben definiált kulcsokkal egyezik
  problem_tag text not null check (problem_tag in ('LCD', 'Akku', 'Csatlakozó', 'Kamera')),
  price_oem numeric,                    -- OEM alkatrésszel — null = nincs még beállítva, ilyenkor a becslőben nem jelenik meg ez a probléma az adott családra
  price_after numeric,                  -- utángyártott alkatrésszel — opcionális, ha nincs kitöltve csak az OEM ár jelenik meg
  warranty text,                        -- pl. '6 hó' — a WARRANTIES konstansból
  est_minutes int,                      -- becsült javítási idő percben, ha van rá alkatrész készleten (pl. 45)
  part_category text,                   -- 'Kijelző' / 'Akkumulátor' — a PART_CATEGORIES-ból, ehhez nézzük az élő készletet. Csatlakozó/Kamera-nál egyelőre null (nincs ilyen PART_CATEGORIES érték még), lásd 6. pont
  updated_at timestamptz not null default now(),
  unique (family_key, problem_tag)
);

create table public.repair_leads (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  brand text not null,
  model text not null,
  family_key text,
  problem_tag text,
  note text,
  estimated_price numeric,
  preferred_location_id uuid references public.locations(id),
  status text not null default 'Új' check (status in ('Új', 'Feldolgozva', 'Elvetve')),
  converted_ticket_id uuid references public.service_tickets(id),
  created_at timestamptz not null default now()
);

alter table public.repair_prices enable row level security;
alter table public.repair_leads enable row level security;

-- árak: mindenki (bejelentkezett staff) látja, csak admin szerkeszti — a publikus oldal RPC-n keresztül éri el, nem közvetlen SELECT-tel
create policy repair_prices_select on public.repair_prices for select to authenticated using (true);
create policy repair_prices_admin_write on public.repair_prices for all to authenticated
  using (public."current_role"() = 'admin') with check (public."current_role"() = 'admin');

-- leadek: admin vagy a saját helyszínéhez rendelt user látja/kezeli (a meglévő location-scope mintát követve)
create policy repair_leads_select on public.repair_leads for select to authenticated
  using (public."current_role"() = 'admin' or preferred_location_id = public.current_location_id() or preferred_location_id is null);
create policy repair_leads_update on public.repair_leads for update to authenticated
  using (public."current_role"() = 'admin' or preferred_location_id = public.current_location_id() or preferred_location_id is null);

-- publikus RPC-k (security definer, a meglévő get_public_stock/upsert_customer mintájára)
create or replace function public.get_repair_prices()
returns table(family_key text, problem_tag text, price_oem numeric, price_after numeric, warranty text, est_minutes int, part_category text)
language sql stable security definer set search_path = public
as $$
  select family_key, problem_tag, price_oem, price_after, warranty, est_minutes, part_category
  from public.repair_prices
  where price_oem is not null
$$;

-- csak azt árulja el, hogy VAN-e készleten az adott kategóriájú alkatrészből valamelyik helyszínen — nem darabszámot, nem árat
create or replace function public.get_repair_availability()
returns table(location_id uuid, part_category text, available boolean)
language sql stable security definer set search_path = public
as $$
  select l.id as location_id, pc.category as part_category,
    exists(
      select 1 from public.parts p
      where p.category = pc.category and p.quantity > 0 and p.deleted_at is null
    ) as available
  from public.locations l
  cross join (values ('Kijelző'), ('Akkumulátor')) as pc(category)
$$;
-- Megjegyzés: a `parts` táblán jelenleg nincs helyszín-korlátozás (közös raktár, ld. CLAUDE.md), ezért az "available"
-- ugyanaz mindkét helyszínre — ha valaha helyszínenkénti alkatrészkészlet lenne, ezt a függvényt kell módosítani.

create or replace function public.submit_repair_lead(
  p_customer_name text, p_customer_phone text, p_brand text, p_model text,
  p_family_key text, p_problem_tag text, p_note text, p_estimated_price numeric, p_location_id uuid
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  insert into public.repair_leads (customer_name, customer_phone, brand, model, family_key, problem_tag, note, estimated_price, preferred_location_id)
  values (p_customer_name, p_customer_phone, p_brand, p_model, p_family_key, p_problem_tag, p_note, p_estimated_price, p_location_id)
  returning id into v_id;
  return v_id;
end;
$$;
```

Használd `apply_migration`-t. A `repair_prices` sorokat üresen (ár nélkül) kell feltölteni a modellcsaládokhoz (ld. 2. pont) — a valós árakat az admin tölti ki utólag a felületen, **ne találj ki árakat**.

---

## 2. Modellcsalád-katalógus (statikus, kódban tartott)

**Új fájl:** `src/lib/repairCatalog.js` — ez ritkán változik (új telefon-generáció évente), ezért kódban van, nem DB-ben. Az árak viszont (amik gyakran változnak) a DB-ben vannak (1. pont).

```js
// Modellcsalád-kulcsok — ezekhez tartoznak árak a repair_prices táblában.
export const REPAIR_FAMILIES = {
  "iphone-11-13": "iPhone 11 – 13 sorozat",
  "iphone-14-16": "iPhone 14 – 16 sorozat",
  "samsung-a-kozep": "Samsung Galaxy A közepes szint",
  "samsung-s-felso": "Samsung Galaxy S felső szint",
  "xiaomi-redmi": "Xiaomi Redmi sorozat",
};

// Konkrét modellek → melyik családba tartoznak. Bővítsd, ahogy új modell érkezik.
export const REPAIR_MODELS = [
  { brand: "Apple", model: "iPhone 11", family: "iphone-11-13" },
  { brand: "Apple", model: "iPhone 12", family: "iphone-11-13" },
  { brand: "Apple", model: "iPhone 12 Pro", family: "iphone-11-13" },
  { brand: "Apple", model: "iPhone 13", family: "iphone-11-13" },
  { brand: "Apple", model: "iPhone 13 Pro", family: "iphone-11-13" },
  { brand: "Apple", model: "iPhone 14", family: "iphone-14-16" },
  { brand: "Apple", model: "iPhone 15", family: "iphone-14-16" },
  { brand: "Apple", model: "iPhone 16", family: "iphone-14-16" },
  { brand: "Samsung", model: "Galaxy A14", family: "samsung-a-kozep" },
  { brand: "Samsung", model: "Galaxy A34", family: "samsung-a-kozep" },
  { brand: "Samsung", model: "Galaxy A54", family: "samsung-a-kozep" },
  { brand: "Samsung", model: "Galaxy S22", family: "samsung-s-felso" },
  { brand: "Samsung", model: "Galaxy S23", family: "samsung-s-felso" },
  { brand: "Samsung", model: "Galaxy S24", family: "samsung-s-felso" },
  { brand: "Xiaomi", model: "Redmi Note 12", family: "xiaomi-redmi" },
  { brand: "Xiaomi", model: "Redmi Note 13", family: "xiaomi-redmi" },
];

// Melyik PROBLEM_TAGS-érték kap fix mátrix-árat vs. csak diagnózis-lead-et.
export const PRICED_PROBLEMS = ["LCD", "Akku", "Csatlakozó", "Kamera"];
export const PROBLEM_LABELS = {
  LCD: "Törött / hibás kijelző", Akku: "Lemerülő / cserélendő akku",
  Csatlakozó: "Nem tölt / töltőcsatlakozó hibás", Kamera: "Kamera nem működik",
  FRP: "Fiók/FRP zárolás", Szoftver: "Szoftverhiba", Egyéb: "Egyéb probléma",
};
```

**Fontos:** ez a lista induló javaslat — nézd át a valós forgalmi adatokat (leggyakoribb bejövő modellek a `service_tickets`-ből) és pontosítsd, mielőtt élesítitek. Nem kell minden valaha eladott modellt felvenni, csak amivel tényleg gyakran jönnek — a ritkább gépeknél a "Kérj egyedi árajánlatot" ág amúgy is lefedi az esetet (4. pont).

---

## 3. Mapperek

**Fájl:** `src/lib/mappers.js`:
```js
export const repairPriceFromApi = (r) => ({
  familyKey: r.family_key, problemTag: r.problem_tag,
  priceOem: r.price_oem, priceAfter: r.price_after,
  warranty: r.warranty, estMinutes: r.est_minutes, partCategory: r.part_category,
});
export const repairLeadFromApi = (r) => ({
  id: r.id, customerName: r.customer_name, customerPhone: r.customer_phone,
  brand: r.brand, model: r.model, familyKey: r.family_key, problemTag: r.problem_tag,
  note: r.note || "", estimatedPrice: r.estimated_price, preferredLocationId: r.preferred_location_id,
  status: r.status, convertedTicketId: r.converted_ticket_id, createdAt: r.created_at,
});
```

---

## 4. Publikus varázsló — `RepairEstimator.jsx`

**Új fájl:** `src/RepairEstimator.jsx` — a `StockShowcase.jsx` fejléc/lábléc mintáját követi (ugyanaz a `pub-header`/`pub-footer`, esetleg emeld ki közös `PublicHeader.jsx`-be, ha a `TASKS_WEBSHOP.md`-ben leírt `PhoneDetail.jsx` is megvan már addigra — 3 hely duplikálná ugyanazt a fejlécet).

**Állapotgép, 3 lépés + eredmény képernyő:**

```jsx
import { useState, useEffect, useMemo } from "react";
import { supabase } from "./lib/supabaseClient";
import { REPAIR_FAMILIES, REPAIR_MODELS, PRICED_PROBLEMS, PROBLEM_LABELS } from "./lib/repairCatalog";

export default function RepairEstimator() {
  const [step, setStep] = useState(1); // 1: modell, 2: probléma, 3: eredmény
  const [prices, setPrices] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState(null); // { brand, model, family }
  const [problem, setProblem] = useState(null);
  const [origin, setOrigin] = useState("oem"); // 'oem' | 'after'
  const [leadForm, setLeadForm] = useState({ name: "", phone: "", locationId: "" });
  const [leadSent, setLeadSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: a }] = await Promise.all([
        supabase.rpc("get_repair_prices"),
        supabase.rpc("get_repair_availability"),
      ]);
      setPrices(p || []);
      setAvailability(a || []);
    })();
  }, []);

  const matches = query.trim()
    ? REPAIR_MODELS.filter((m) => `${m.brand} ${m.model}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : [];

  const familyPriceRows = selectedModel
    ? prices.filter((p) => p.familyKey === selectedModel.family && PRICED_PROBLEMS.includes(p.problemTag))
    : [];
  const availableProblems = familyPriceRows.map((r) => r.problemTag);

  const selectedPriceRow = problem ? familyPriceRows.find((r) => r.problemTag === problem) : null;
  const displayPrice = selectedPriceRow ? (origin === "after" && selectedPriceRow.priceAfter ? selectedPriceRow.priceAfter : selectedPriceRow.priceOem) : null;
  const stockAvailable = selectedPriceRow?.partCategory
    ? availability.some((a) => a.part_category === selectedPriceRow.partCategory && a.available)
    : null;

  async function sendLead() {
    setBusy(true);
    try {
      await supabase.rpc("submit_repair_lead", {
        p_customer_name: leadForm.name, p_customer_phone: leadForm.phone,
        p_brand: selectedModel.brand, p_model: selectedModel.model,
        p_family_key: selectedModel.family, p_problem_tag: problem,
        p_note: null, p_estimated_price: displayPrice, p_location_id: leadForm.locationId || null,
      });
      setLeadSent(true);
    } finally {
      setBusy(false);
    }
  }

  // JSX-vázlat lépésenként — kövesd a StockShowcase.jsx pub-* class-ait a konzisztens megjelenésért:

  // Lépésjelző mindig felül: <div className="pub-steps">1/3 → 2/3 → 3/3, aktív lépés kiemelve</div>

  // 1. LÉPÉS — modell keresés
  //   <input> query-re, alatta a matches lista (mint a StockModal IMEI-keresés mintája),
  //   kattintásra: setSelectedModel(m); setStep(2)
  //   Ha a modell nincs a REPAIR_MODELS-ben (a keresés 0 találatot ad), mutass egy
  //   "Nincs a listában? Kérj egyedi árajánlatot" gombot, ami egyből a lead-formhoz visz
  //   (family/problem nélkül, csak brand/model szabad szöveg + megjegyzés mező).

  // 2. LÉPÉS — probléma választás
  //   PRICED_PROBLEMS.map — nagy kártyák, csak azok aktívak/kattinthatók, amikhez van ár
  //   (availableProblems.includes(tag)) — a többi PROBLEM_TAGS érték (FRP, Szoftver, Egyéb)
  //   mindig kattintható, de azonnal a "diagnózis szükséges" lead-formra visz ár nélkül.

  // 3. LÉPÉS — eredmény
  //   - Ha van priceOem és priceAfter is: kis váltógomb "Eredeti (OEM) / Utángyártott",
  //     azonnali árváltással (ld. Flip.ro mintája — komment a repairCatalog.js tetején)
  //   - Nagy ár kiírás + "Spórolsz X Lei" NINCS itt (az a telefon-eladásnál van, itt nincs "új ár")
  //   - Garancia sor a `selectedPriceRow.warranty`-ból
  //   - Élő készlet jelzés: stockAvailable === true → zöld "Ma bejöhetsz, kb. {estMinutes} perc alatt kész"
  //     stockAvailable === false → sárga "Alkatrészt rendelni kell, kb. 2-3 munkanap"
  //     stockAvailable === null (nincs part_category, pl. Csatlakozó/Kamera egyelőre) → nincs jelzés, csak az ár
  //   - "Foglald le a helyed" gomb → kinyit egy kis form-ot (név, telefon, preferált helyszín select)
  //     submit → sendLead() → leadSent true → "Köszönjük! Hamarosan hívunk, vagy hozd be a készüléked."
}
```

---

## 5. Routing + navigáció

**Fájl:** `src/main.jsx`:
```js
const repairMatch = window.location.pathname.match(/^\/becsles\/?$/i);
```
```jsx
if (repairMatch) return <RepairEstimator />;
```
(a `stockMatch` ág elé, `import RepairEstimator from "./RepairEstimator.jsx";`)

**Fájl:** `src/StockShowcase.jsx` (és a `TASKS_WEBSHOP.md`-ben leírt `PhoneDetail.jsx`, ha addigra megvan) — a `pub-nav` blokkba (~68–72. sor) egy új link:
```jsx
<a className="pub-nav-link" href="/becsles">Szerviz árbecslő</a>
```

---

## 6. Admin — árazási mátrix szerkesztő

**Fájl:** `src/App.jsx` — új admin-only nav pont, pl. `tab === "repair-prices"`, az "Admin" szekció alatt (a `navbtn` minta szerint, a "Felhasználók" mellé).

Táblázatos szerkesztő: sorok = `REPAIR_FAMILIES` kulcsai, oszlopok = `PRICED_PROBLEMS` (LCD, Akku, Csatlakozó, Kamera). Minden cellában egy kis inline szerkeszthető ár (OEM ár kötelező a megjelenéshez, utángyártott ár opcionális, garancia select a `WARRANTIES`-ból, becsült perc input). Mentés soronként/cellánként `upsert`-tel:
```js
async function saveRepairPrice(familyKey, problemTag, data) {
  await withBusy(async () => {
    const r = unwrap(await supabase.from("repair_prices")
      .upsert({ family_key: familyKey, problem_tag: problemTag, ...data }, { onConflict: "family_key,problem_tag" })
      .select());
    setRepairPrices((prev) => {
      const filtered = prev.filter((p) => !(p.familyKey === familyKey && p.problemTag === problemTag));
      return [...filtered, repairPriceFromApi(r[0])];
    });
  });
}
```
Töltsd be a `repair_prices` táblát is a meglévő `loadAll()`-ban (nem csak `get_repair_prices()` RPC-n keresztül — az csak a publikus, kitöltött árakat adja vissza; az admin szerkesztőnek a `price_oem is null` sorokat is látnia kell, tehát admin nézetben közvetlen `supabase.from("repair_prices").select("*")`-t használj).

**Megjegyzés a Csatlakozó/Kamera élő-készlet jelzéshez:** ezekhez jelenleg nincs `PART_CATEGORIES` érték (csak "Kijelző"/"Akkumulátor" létezik). Ha szeretnéd, hogy ezekre is működjön az élő-készlet jelzés, bővítsd a `PART_CATEGORIES`-t (`src/lib/utils.js`) "Töltőcsatlakozó" és "Kamera" értékekkel, és a `get_repair_availability()` RPC `cross join` sorát is egészítsd ki — ez egy 10 perces kiegészítés, de külön döntés kell hozzá, mert bővíti az alkatrész-kategorizálást is, nem csak a becslőt. **Nem kötelező az MVP-hez** — enélkül a Csatlakozó/Kamera problémáknál csak ár jelenik meg, élő-készlet jelzés nélkül.

---

## 7. Admin — lead inbox

Ugyanabban a `tab === "repair-prices"` nézetben (vagy külön alfülön) egy lista a `repair_leads`-ből, `status = 'Új'` szűrve alapból:
```
Ügyfél | Telefon | Eszköz | Probléma | Becsült ár | Preferált helyszín | Beérkezett | Művelet
```
A "Munkalap létrehozása" gomb megnyitja a meglévő `TicketFormModal`-t előtöltve (`customerName`, `customerPhone`, `brand`, `model`, a `problemTag`-nek megfelelő tag bejelölve, `price` a becsült árral) — sikeres létrehozás után a lead `status`-a `'Feldolgozva'`-ra vált és `converted_ticket_id` beállítódik. Az "Elvetés" gomb egyszerűen `status = 'Elvetve'`-re állítja (pl. ha valaki mégsem jön be, vagy téves adat).

---

## 8. CSS — `src/index.css`

A meglévő `--pub-*` tokenekre építve:
```css
.pub-steps{display:flex;gap:8px;justify-content:center;margin:20px 0}
.pub-step{width:10px;height:10px;border-radius:50%;background:var(--pub-line)}
.pub-step.active{background:var(--pub-accent);width:26px;border-radius:6px}
.pub-problem-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
.pub-problem-card{background:var(--pub-paper-raised);border:1px solid var(--pub-line);border-radius:12px;padding:18px;text-align:center;cursor:pointer;font-weight:600;font-size:13.5px;transition:border-color .12s}
.pub-problem-card:hover{border-color:var(--pub-accent)}
.pub-problem-card.disabled{opacity:.4;cursor:not-allowed}
.pub-stock-note{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;font-size:12.5px;font-weight:600;margin:14px 0}
.pub-stock-note.available{background:var(--pub-accent-soft);color:var(--pub-accent-ink)}
.pub-stock-note.unavailable{background:#FEF3C7;color:#92400E}
.pub-origin-toggle{display:flex;gap:8px;margin:10px 0}
.pub-origin-btn{border:1px solid var(--pub-line);background:var(--pub-paper-raised);padding:8px 14px;border-radius:9px;font-size:12.5px;font-weight:600;cursor:pointer}
.pub-origin-btn.active{border-color:var(--pub-accent);background:var(--pub-accent-soft);color:var(--pub-accent-ink)}
```

---

## Ellenőrzőlista implementálás után

- A `/becsles` oldal betölthető bejelentkezés nélkül, a `pub-nav`-ban is elérhető
- Ismert modellre a megfelelő probléma-választásra megjelenik a helyes ár (OEM/utángyártott váltással, ha mindkettő be van állítva)
- Ismeretlen modellre (nincs a `REPAIR_MODELS`-ben) egyből a "kérj egyedi árajánlatot" ág fut le, nem üres/hibás képernyő
- Az élő-készlet jelzés ténylegesen a `parts` tábla aktuális állapotát mutatja — teszteld úgy, hogy kifogysz egy Kijelző-kategóriás alkatrészből, és nézd meg, hogy a becslő "rendelni kell" jelzésre vált
- "Foglald le a helyed" ténylegesen létrehoz egy sort a `repair_leads`-ben, admin oldalon látszik
- Admin be tud állítani/módosítani egy árat a mátrixban, és az azonnal megjelenik a publikus oldalon (RPC-n keresztül)
- "Munkalap létrehozása" a lead-ből ténylegesen létrehoz egy valódi `service_tickets` sort a meglévő flow-n keresztül, és a lead átvált "Feldolgozva"-ra
- RLS-teszt: nem-admin employee csak a saját helyszínéhez (vagy helyszín nélküli) leadeket lássa
