# TASKS — Bizományosi értékesítés (Consignație) + felvásárlás (Borderou) rendes lekezelése

## 0. Fontos előszó — nem vagyok könyvelő

Az alábbi adatbázis-séma és üzleti logika **a te leírt szabályaid alapján** épül fel (közvetlen felvásárlásnál a teljes eladási ár a bevétel, bizománynál csak a jutalék). A pontos romániai adó-/számviteli kezelést (pl. hogy a *Borderou de achiziție* és a *Contract de Consignație* pontosan milyen adattartalommal jogilag érvényes, hogyan kell a bizományosi jutalékot a mikro-vállalkozási forgalom (cifra de afaceri) számításába venni, kell-e ehhez külön nyilvántartás a könyvelő felé) **véglegesen a könyvelőddel erősítsd meg**, mielőtt élesben használod — ez itt egy technikailag helyes, a te szabályaidat követő rendszer-terv, nem jogi/adótanácsadás.

## 1. Jelenlegi állapot — amit megnéztem az élő adatbázisban

- `products` tábla: nincs benne semmilyen "honnan szereztük" / "kié a tulajdonjog" mező. Csak `cost_price` (beszerzési ár) van, dokumentum-szám vagy eladó-adat nélkül.
- `addProduct()` (`App.jsx` 422-428. sor): telefon felvételekor **nem keletkezik semmilyen tranzakció** — a `cost_price` csak egy mező marad a terméken, nincs hozzá kapcsolt "Kiadás" a Bevételek/Kiadásokban. Ez azt jelenti, hogy **ma a felvásárlás pénzmozgása sincs sehol nyomon követve** — csak eladáskor, a profit-számításban jelenik meg különbségként. Ez volt a te felvetésed lényege ("amikor megvásárolunk egy telót, ki kellene legyen dolgozva") — jelenleg tényleg nincs.
- `sellProduct()` (442-472. sor): eladáskor a **teljes `sale_price`** bekerül `type:'income', category:'Készlet'` tranzakcióként — ez ma minden eladott telefonnál helyes a felvásárolt (saját) készletre, de **helytelen lenne bizományos tételre**, mert az nem a cégé.
- `transactions.category` egy fix CHECK-listára korlátozva: `Fix, Készlet, Marketing, Eszköz, Szerviz, Egyéb` — bővíteni kell egy `Bizomány` értékkel.

## 2. Új tábla: `product_acquisitions` — minden termékhez pontosan egy "honnan került hozzánk" rekord

```sql
create table product_acquisitions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) not null unique,
  acquisition_type text not null check (acquisition_type in ('purchase','consignment')),

  -- Eladó/tulajdonos adatai — mindkét típusnál kellenek (Borderou-hoz és a szerződéshez is)
  seller_name text not null,
  seller_id_doc text,              -- személyi igazolvány száma
  seller_phone text,
  customer_id uuid references customers(id),  -- ha van hozzá ügyfél-rekord (phone_norm alapján auto-linkelve, a meglévő mintát követve)

  -- Borderou de achiziție — csak acquisition_type = 'purchase' esetén releváns
  purchase_doc_no text,

  -- Contract de Consignație — csak acquisition_type = 'consignment' esetén releváns
  consignment_doc_no text,
  consignor_payout_amount numeric,   -- mennyit kap az ügyfél, ha eladjuk (ez a szerződésben rögzített "elvárt összeg")
  consignment_expires_at date,       -- opcionális: meddig tartjuk, ha addig nem kel el
  payout_status text default 'fizetesre_var' check (payout_status in ('fizetesre_var','kifizetve')),
  payout_date date,

  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
alter table product_acquisitions enable row level security;
create policy product_acquisitions_staff_all on product_acquisitions for all
  using (current_role() = 'admin' or exists (select 1 from profiles pr where pr.id = auth.uid() and pr.location_id is not null))
  with check (current_role() = 'admin' or exists (select 1 from profiles pr where pr.id = auth.uid() and pr.location_id is not null));
```

**Kulcs-döntés: `products.cost_price` bizomány esetén = `consignor_payout_amount`.** Ezzel a meglévő profit-számítás **mindenhol** (ProductDetailPanel "Várható profit", StockTab, Dashboard-aggregátumok) automatikusan helyesen mutatja a cég valódi hasznát (= jutalék), **anélkül, hogy egyetlen meglévő profit-megjelenítő helyet át kellene írni** — ez a legegyszerűbb módja annak, hogy a rendszer többi része "csak működjön" az új típussal is.

## 3. `transactions.category` bővítése

```sql
alter table transactions drop constraint transactions_category_check;
alter table transactions add constraint transactions_category_check
  check (category = any (array['Fix','Készlet','Marketing','Eszköz','Szerviz','Bizomány','Egyéb']));
```

## 4. Felvásárlás (purchase) — intake flow

A `StockModal`-ban (telefon felvétele) új választó: **"Saját vásárlás" / "Bizomány"** (alapértelmezett: Saját vásárlás, hogy a mai megszokott flow ne törjön). Saját vásárlás esetén:
- Kötelező mezők: eladó neve, személyi igazolvány szám, (opcionális) telefonszám.
- Automatikusan generált **Borderou-szám** (a meglévő rövid-kód generátorok mintájára, `src/lib/utils.js`-ben, pl. `borderouNo()` egy egyszerű sorszámozott formátummal).
- **Új, explicit döntés kell tőled**: amikor mented a terméket, keletkezzen-e **automatikusan egy `type:'expense', category:'Készlet', amount: cost_price` tranzakció** (vagyis a kifizetett vételár azonnal megjelenjen a Bevételek/Kiadásokban kiadásként)? Ha igen — ez az első alkalom, hogy a felvásárlás pénzmozgása egyáltalán nyomon van követve a rendszerben. **Fontos**: ha ma kézzel már berögzítitek ezt külön Kiadásként, akkor ezt a manuális lépést utána **abba kell hagyni**, különben duplán számolódna a kiadás. Ezt neked kell megerősítened, mielőtt élesedik.

## 5. Bizomány (consignment) — intake flow

Ugyanabban a választóban "Bizomány" esetén:
- Kötelező mezők: eladó (ügyfél) neve, telefonszám, (ajánlott) személyi igazolvány szám, **`consignor_payout_amount`** (mennyit kap, ha eladjuk).
- Automatikusan generált **szerződésszám** (`consignmentDocNo()`).
- `products.cost_price` automatikusan `consignor_payout_amount`-ra áll (ld. 2. pont).
- **Nincs automatikus kiadás-tranzakció** felvételkor — a bizományba vett tárgyért a cég **nem fizet ki semmit előre**, ez a lényege.
- A StockTab/ProductDetailPanel-en jól látható **"Bizomány" jelvény** jelenjen meg ezeken a tételeken (nem külön raktári hely/`location_id`, hanem vizuális megkülönböztetés — a *hol* van tárolva (`location_id`) és a *kié* (acquisition_type) két különböző kérdés, nem kell hozzá új helyszín-fogalom). A StockTab szűrőihez érdemes egy "Saját / Bizomány / Mind" chip-sort hozzáadni.

## 6. Eladási logika — ez a lényeg (3. kérésed)

### a) `purchase` típusnál — változatlan
A meglévő `sellProduct()` logika (teljes `sale_price` mint `category:'Készlet'` bevétel) marad, semmi nem változik.

### b) `consignment` típusnál — jutalék-alapú, de a pénztár-egyenleg is helyesen kezelve

Itt egy valódi számviteli csapdát kell elkerülni: a vásárló a **teljes eladási árat** fizeti be a pénztárba (a kassza fizikailag ennyivel nő), de a cég **hivatalos bevétele/adóalapja csak a jutalék** — a különbözetet ki kell fizetni az eredeti tulajdonosnak. Ha csak a jutalékot könyvelnéd be, a pénztárzárás (`CashSettlementTab`) nem fog egyezni a valós készpénzzel. Ezért **két tranzakció** keletkezzen eladáskor:

1. `type:'income', category:'Bizomány', amount: (sale_price - consignor_payout_amount)` — ez a cég **valódi, adóalapba számító bevétele** (a jutalék).
2. `type:'income', category:'Bizomány', amount: consignor_payout_amount, is_passthrough: true` — ez a vásárlótól befolyt, de **átfutó** (az eredeti tulajdonosé) összeg. Új `transactions.is_passthrough boolean not null default false` oszlop kell.

Ez a felbontás azért jó, mert:
- A pénztárzárás/kassza-egyeztetés az **összes** bevételi tranzakciót összegzi (1+2 együtt = a ténylegesen befolyt teljes összeg, egyezik a fizikai pénztárral).
- A pénzügyi riportok (Dashboard, Bevételek/Kiadások összegzés) **kizárhatják** az `is_passthrough = true` sorokat, amikor a "cég tényleges bevétele" számot mutatják — így az valóban csak a jutalékot tartalmazza, a te 3. kérésed szerint.

3. Amikor ténylegesen kifizeted az eredeti tulajdonost (készpénzben átadod neki a részét — nem feltétlenül azonnal, lehet később is), egy külön gomb ("Bizományos kifizetése", a `ProductDetailPanel`-en vagy egy dedikált "Bizományos kifizetések" listán) hozza létre a **harmadik** tranzakciót: `type:'expense', category:'Bizomány', amount: consignor_payout_amount` — ez veszi ki ténylegesen a pénzt a kasszából, és állítja `product_acquisitions.payout_status = 'kifizetve'`-re, `payout_date`-tel.

**Ha ez túl bonyolult** a napi használathoz, és nem fontos neked a fillérre pontos pénztár-egyeztetés bizományos tételeknél, egyszerűsíthető egyetlen tranzakcióra (`category:'Bizomány', amount: jutalék`) — de akkor a pénztárzárás és a valós készpénz el fog térni a bizományos eladások napján. Mondd meg, melyik verziót szeretnéd, mielőtt ez implementálódik — alapértelmezésben a 3-tranzakciós, pontosabb verziót specifikáltam.

## 7. Riportok / Dashboard érintése

Minden helyen, ahol jelenleg `transactions.filter(t => t.type === 'income')`-ból összegződik a "bevétel" (Dashboard KPI-k, FinanceTab összesítők), egészítsd ki `&& !t.isPassthrough`-val, hogy az átfutó bizományos tételek ne torzítsák a tényleges céges bevétel-számokat. A pénztárzárás (`CashSettlementTab`) viszont **ne** szűrje ki — annak a fizikai készpénzzel kell egyeznie.

## 8. UI-érintések összefoglalva

- `StockModal.jsx`: "Saját vásárlás / Bizomány" váltó + a hozzá tartozó extra mezők (eladó adatai, Borderou-szám vagy szerződésszám + payout).
- `ProductDetailPanel.jsx`: "Beszerzés" szekció mutassa az acquisition_type-ot, a dokumentumszámot, bizomány esetén a payout-státuszt + "Bizományos kifizetése" gombot.
- `StockTab.jsx`: "Bizomány" jelvény a kártyákon/sorokon, opcionális szűrő-chip.
- `src/lib/utils.js`: `borderouNo()`/`consignmentDocNo()` generátorok, a meglévő `phoneCode()`/`partCode()` mintájára.

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes, migrációk lefutnak
- Telefon felvételekor választható Saját vásárlás / Bizomány, a megfelelő mezőkkel és dokumentumszám-generálással
- Bizományos tételnél `products.cost_price` = `consignor_payout_amount`, a profit-kijelzések ezt automatikusan helyesen mutatják
- Saját vásárlásnál a döntésed szerint (4. pont) keletkezik vagy nem keletkezik automatikus kiadás-tranzakció
- Bizományos eladásnál a döntésed szerint (6b pont) 1 vagy 3 tranzakció keletkezik, a pénztárzárás és a "tényleges bevétel" riport egyaránt helyesen egyezik
- Bizományos kifizetés gombbal nyomon követhető, hogy az eredeti tulajdonos megkapta-e a részét
- Nincs `git push`, csak lokális commit — **és mielőtt élesben használod, a könyvelőddel nézesd át a kategorizálást és a Borderou/Contract de Consignație jogi tartalmát**
