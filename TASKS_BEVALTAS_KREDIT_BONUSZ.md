# TASKS — Felvásárlásnál kredit-választás bónusz-árral (kapcsolódik: STRATEGIA_PIACI_POZICIONALAS.md 4. pont)

## 0. Amit megnéztem

A mai felvásárlási folyamat (`/eladom`, `BuybackFlow.jsx` + `lib/buybackPricing.js` `calculateBuybackPrice()`) **egyetlen árat** számol ki a beadott telefonra, és ez az ár kerül kifizetésre — nincs benne "készpénz vagy kredit" választás. A `customer_profiles`/`loyalty_points_ledger` táblák pontrendszert kezelnek, de **nincs Lej-alapú, egyenlegszerű kredit** a rendszerben — ezt most kell megépíteni.

## 1. Adatmodell

```sql
alter table customer_profiles add column store_credit_balance numeric not null default 0;

create table store_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer_profiles(id),
  amount numeric not null,              -- pozitív = jóváírás, negatív = felhasználás
  reason text not null,                 -- pl. 'beszamitas_kredit', 'felhasznalva_vasarlasnal'
  ref_offer_id uuid references buyback_offers(id),
  ref_transaction_id uuid references transactions(id),
  created_at timestamptz not null default now()
);
```
A `store_credit_balance` mindig a ledger összegével egyezzen (trigger vagy insert-kor egyenes frissítés — a `loyalty_points_ledger` mintáját érdemes követni, ott is hasonlóan van megoldva).

## 2. Felvásárlási ajánlat — készpénz vagy kredit választás

`BuybackFlow.jsx` az ajánlat megjelenítésekor (ahol ma egy `finalPrice`-ot mutat) két opciót kínáljon:
- **Készpénz**: a `calculateBuybackPrice()` által számolt ár, változatlanul.
- **Kredit**: a készpénz-ár × (1 + bónusz-szorzó, pl. 1.15-1.20 — pontos érték `app_settings`-ből konfigurálható legyen, ne legyen hardcode, hogy admin bármikor állíthassa).

Választás után a `buyback_offers` táblán egy `payout_type` mező ('keszpenz'/'kredit') rögzíti, melyiket választotta az ügyfél.

## 3. Beváltáskor (amikor ténylegesen átveszitek a telefont)

- **Készpénz** esetén: a mai folyamat változatlan (App.jsx `acceptBuybackOffer` — kiadás-tranzakció, ahogy ma).
- **Kredit** esetén: **nincs kiadás-tranzakció** (nem hagyja el pénz a kasszát!), helyette `store_credit_ledger` insert a bónusz-árral, `customer_profiles.store_credit_balance` növelve. (Ez direkt összefügg a korábbi `TASKS_BEVETEL_KIADAS_PENZMOZGAS_JAVITASOK.md` elvvel — a kredit jóváírás nem valódi, mai pénzmozgás, csak jövőbeli kötelezettség.)

## 4. Felhasználás vásárláskor

A pénztár/eladás felületen (`sellProduct`/`Checkout.jsx`), ha a vevőnek van `store_credit_balance`-a, felajánlható, hogy abból vonjon le — a fizetendő összeg csökken, a `store_credit_ledger`-be egy negatív tétel kerül. Ügyfél-fiókban (`CustomerPortal.jsx`) is látszódjon az egyenleg, hogy a vevő maga is lássa, mennyi kredite van.

## 5. Amit tisztázni kell

- **A bónusz-szorzó pontos értéke** (a stratégiai dokumentumban 15-20%-ot javasoltam kiindulásnak — a te árréseid alapján kell finomítani).
- **Van-e lejárati idő a kreditnek**, vagy örökre érvényes marad?
- **Mi történik, ha valaki kredit helyett mégis készpénzt akarna később** — engedjük-e visszaváltani, vagy a kredit egyirányú (csak vásárlásra költhető)?

---

## Ellenőrzőlista implementálás után

- `store_credit_ledger` + `customer_profiles.store_credit_balance` migráció lefut
- Felvásárlási ajánlatnál választható készpénz vagy kredit (bónusz-szorzóval, `app_settings`-ből konfigurálható)
- Kredit-beváltás nem hoz létre kiadás-tranzakciót, csak ledger-bejegyzést
- Vásárláskor a kredit levonható, ügyfél-fiókban látszik az egyenleg
- `npm run build` hibamentes
- Nincs `git push`, csak lokális commit
