# TASKS — Márka mező kiválasztásos alapra (nincs több elírás)

Kérés: "eszkoz neve kerdes hogy a markakat nem e kellene pillkent kezelni hogy ne legyen soha eliras, tehat kivalasztasos alapon"

## 0. Amit az élő adatban találtam — ez nem elméleti probléma

Lekérdeztem a `products` és `service_tickets` tábla `brand` mezőjének **összes ténylegesen előforduló** értékét. A szétszóródás pontosan azt igazolja, amit sejtettél:

- **"Samsung"** ma 7 különböző alakban szerepel: `Samsung`, `samsung`, `samsung ` (szóköz), `Samsung ` (szóköz) — több variánsban is, összesen **944 db** eszköznél.
- **Az Apple-telefonok két KÜLÖNBÖZŐ márkanév alatt futnak**: `Apple` (296 db) és külön `iPhone` (158 db, plusz `Iphone`/`iphone `/`Iphone ` elírás-variánsok) — ugyanaz a gyártó, két külön "márkaként" kezelve.
- Hasonló szóköz/kis-nagybetű szórás: `Huawei`/`huawei`/`huawei `, `Honor`/`honor `, `iHunt`/`ihunt `/`Ihunt `, `Nokia`/`nokia`, `LG`/`lg`, `Oneplus`/`OnePlus`.
- `Moto` — feltehetően `Motorola` rövidítése, elírás.
- `sadas` — ez egy értelmetlen, feltehetően véletlen teszt-bejegyzés, nem valódi márka.
- `Cutoc` — nem tudom biztosan, hogy elgépelés-e (esetleg "Cubot"?) vagy egy valódi, ritka márka — ezt neked kell eldöntened.

Ez azt jelenti, hogy ma **statisztikailag lehetetlen** megbízhatóan lekérdezni "hány Samsung telefont adtunk el", mert a válasz 7 külön szűrést igényelne — pontosan azért, mert szabad szöveg a mező.

## 1. A megoldás — választólista + "Egyéb" menekülő út

```js
// src/lib/utils.js
export const PHONE_BRANDS = [
  "Samsung", "Apple", "Xiaomi", "Redmi", "Poco", "Huawei", "Honor", "Nokia",
  "Motorola", "OnePlus", "Oppo", "Realme", "Vivo", "Google", "LG", "Asus",
  "iHunt", "Allview", "Myria", "Maxcom", "Doro", "Alcatel", "Blackview",
  "Doogee", "Oukitel", "Ulefone", "Oscal", "TCL", "ZTE", "Lenovo",
  "Crosscall", "MobilWire", "Vodafone", "Orange", "Egyéb",
];
```

A mezőt mindenhol (ld. 3. pont) egy **pill-választóra** cserélem (ugyanaz a `ChipField`/hasonló minta, ami már ma is megvan pl. a `StockModal`-ban más mezőknél) — kattintással választasz, nincs begépelés. Ha a márka nincs a listában, az **"Egyéb"** választásra egy kis szövegmező bukkan fel, ahova be lehet írni a ritka márkát kézzel — így semmilyen valódi eset nem esik ki, csak a leggyakoribb ~30 márkánál tűnik el a begépelés-elírás lehetősége.

## 2. Apple vs iPhone — ez már el is dőlt, csak a mai adat nem követi

Ez a legnagyobb tétel (454 db összesen), de jó hír: a kódban **már létezik a helyes megoldás**, csak a mai adat egy része nem ezt a konvenciót követi. `src/lib/utils.js` `displayName()`:

```js
// "Apple iPhone 11" helyett elég csak "iPhone 11" — a brand adat marad "Apple", ez csak megjelenítés.
export function displayName(brand, model) {
  if (brand === "Apple" && (model || "").toLowerCase().startsWith("iphone")) return model;
  return [brand, model].filter(Boolean).join(" ");
}
```

Vagyis a **szándékolt, már megépített** konvenció: `brand = "Apple"`, `model = "iPhone 13"` (a modell mezőben van benne az "iPhone" szó) — a megjelenítés emiatt helyesen "iPhone 13"-at mutat, a márka mégis egységesen "Apple" marad a statisztikákhoz. A `PHONE_BRANDS` listában emiatt **nincs is önálló "iPhone" tétel** — csak "Apple". A migráció feladata: a ma `brand='iPhone'`/`'Iphone'`/`'iphone '`/`'Iphone '` sorokat át kell tenni `brand='Apple'`-re, és ha a `model` mező még nem tartalmazza az "iPhone" szót elöl, azt is ki kell egészíteni (pl. ha ma `brand='iPhone', model='13 Pro'`, az új sor `brand='Apple', model='iPhone 13 Pro'` legyen).

Ugyanez vonatkozik az `iPad` (1 db) tételre is — az is Apple lesz, "iPad ..." a modell-részben.

## 3. Hol kell lecserélni a mezőt

Öt helyen van ma szabad szöveges "Márka" mező, mindegyiket lecserélném ugyanarra a pill-választóra:

- `TicketFormModal.jsx` (szerviz-felvétel — ez volt a konkrét kérésed)
- `StockModal.jsx` (telefon felvétele készletre)
- `SellModal.jsx` (beszámított telefon márkája csere-ügyletnél)
- `BuybackModelModal.jsx` (felvásárlási modell-katalógus)
- `PartModal.jsx` — **itt kicsit más a helyzet**: az alkatrész "Márka" mezője gyakran NEM telefongyártót jelent, hanem az alkatrész saját gyártóját (pl. "Foxconn", "OEM") — ezt valószínűleg **nem** kell ugyanarra a `PHONE_BRANDS` listára váltani, marad szabad szöveg, hacsak nem te is úgy látod, hogy itt is van elírás-probléma.

## 4. Migráció a meglévő adatra

Két csoportra bomlik:

**A) Automatikusan, biztonságosan javítható** (trim + kis-nagybetű normalizálás, egyértelmű rövidítés-feloldás):

```sql
update products set brand = trim(brand);
update service_tickets set brand = trim(brand);
update products set brand = 'Samsung' where lower(brand) = 'samsung';
update products set brand = 'Huawei' where lower(brand) = 'huawei';
update products set brand = 'Honor' where lower(brand) = 'honor';
update products set brand = 'iHunt' where lower(brand) = 'ihunt';
update products set brand = 'Nokia' where lower(brand) = 'nokia';
update products set brand = 'LG' where lower(brand) = 'lg';
update products set brand = 'OnePlus' where lower(brand) = 'oneplus';
update products set brand = 'Motorola' where brand = 'Moto';
-- ugyanezek a service_tickets táblára is
```

**B) Kézi döntést igényel, mielőtt futtatjuk:**

- `Apple`/`iPhone`/`Iphone`/`iphone `/`Iphone ` egységesítése (ld. 2. pont — melyik opciót választod)
- `iPad` (1 db) — ugyanoda tartozik-e?
- `sadas` (1 db) — ez feltehetően egy hibás/teszt bejegyzés, megnézzem, melyik konkrét termék/munkalap ez, hogy tudd, kell-e vele foglalkozni?
- `Cutoc` (1 db) — valódi márka vagy elgépelés?
- `Redmi`/`Poco` — ezek a Xiaomi almárkái — külön márkaként maradjanak (ahogy ma is használjátok, jelentős darabszámmal), vagy vonjuk össze "Xiaomi" alá? A fenti listában külön hagytam őket, mert így már ma is jelentős mennyiségben külön kezelitek.

## 5. Amit tisztázni kell

- **`sadas`/`Cutoc`** — szeretnéd, hogy megnézzem pontosan melyik tétel ez, mielőtt döntünk?
- **`Redmi`/`Poco` Xiaomi alá vonása** — marad külön, vagy összevonjuk?
- **`PartModal.jsx` márka mezője** — marad szabad szöveg, vagy azt is át szeretnéd rakni választólistára?

---

## Ellenőrzőlista implementálás után

- `PHONE_BRANDS` konstans létrejön, a döntés szerint véglegesítve (Apple/iPhone kérdés lezárva)
- Az 5 érintett modalból 4-ben (vagy 5-ben, ha a `PartModal`-t is kéred) pill-választóra cserélve a márka-mező, "Egyéb" esetén szabad szöveges kiegészítő mezővel
- Meglévő adat migrálva: automatikus trim/case-fix lefutott, a kézi döntést igénylő tételek (Apple/iPhone, sadas, Cutoc) egyeztetve és javítva
- `npm run build` hibamentes
- Nincs `git push`, csak lokális commit
