// Modellcsalád-kulcsok — ezekhez tartoznak árak a repair_prices táblában. Az iPhone-oknál
// modellenként pontos kulcs van (nem tág sorozat-csoport), mert az Airtable árlistában a valós
// árak modellenként jelentősen eltérnek (pl. iPhone 7 kijelző 130 Lei, iPhone 17 Pro Max 250 Lei) —
// egy tág csoportba zsúfolva sok modellnél pontatlan lenne az ügyfélnek mutatott ár.
// A Samsung/Xiaomi családok egyelőre tág csoportok maradnak, ár nélkül (külön kör, nincs
// megbízható forrásadat rájuk még).
export const REPAIR_FAMILIES = {
  "iphone-7": "iPhone 7",
  "iphone-7-plus": "iPhone 7 Plus",
  "iphone-8": "iPhone 8",
  "iphone-8-plus": "iPhone 8 Plus",
  "iphone-x": "iPhone X",
  "iphone-xr": "iPhone XR",
  "iphone-xs": "iPhone XS",
  "iphone-xs-max": "iPhone XS Max",
  "iphone-se-2nd-generation": "iPhone SE (2nd generation)",
  "iphone-11": "iPhone 11",
  "iphone-11-pro": "iPhone 11 Pro",
  "iphone-11-pro-max": "iPhone 11 Pro Max",
  "iphone-12-mini": "iPhone 12 mini",
  "iphone-12": "iPhone 12",
  "iphone-12-pro": "iPhone 12 Pro",
  "iphone-12-pro-max": "iPhone 12 Pro Max",
  "iphone-13-mini": "iPhone 13 mini",
  "iphone-13": "iPhone 13",
  "iphone-13-pro": "iPhone 13 Pro",
  "iphone-13-pro-max": "iPhone 13 Pro Max",
  "iphone-se-3rd-generation": "iPhone SE (3rd generation)",
  "iphone-14": "iPhone 14",
  "iphone-14-plus": "iPhone 14 Plus",
  "iphone-14-pro": "iPhone 14 Pro",
  "iphone-14-pro-max": "iPhone 14 Pro Max",
  "iphone-15": "iPhone 15",
  "iphone-15-plus": "iPhone 15 Plus",
  "iphone-15-pro": "iPhone 15 Pro",
  "iphone-15-pro-max": "iPhone 15 Pro Max",
  "iphone-16": "iPhone 16",
  "iphone-16-plus": "iPhone 16 Plus",
  "iphone-16-pro": "iPhone 16 Pro",
  "iphone-16-pro-max": "iPhone 16 Pro Max",
  "iphone-air": "iPhone Air",
  "iphone-17": "iPhone 17",
  "iphone-17-pro": "iPhone 17 Pro",
  "iphone-17-pro-max": "iPhone 17 Pro Max",
  "samsung-a-kozep": "Samsung Galaxy A közepes szint",
  "samsung-s-felso": "Samsung Galaxy S felső szint",
  "xiaomi-redmi": "Xiaomi Redmi sorozat",
};

// Konkrét modellek → melyik családba tartoznak. Az iPhone-lista az Airtable Árlista tábla
// teljes, valós modell-listája (2026-09-07-i állapot) — bővítsd, ahogy új modell érkezik.
export const REPAIR_MODELS = [
  { brand: "Apple", model: "iPhone 7", family: "iphone-7" },
  { brand: "Apple", model: "iPhone 7 Plus", family: "iphone-7-plus" },
  { brand: "Apple", model: "iPhone 8", family: "iphone-8" },
  { brand: "Apple", model: "iPhone 8 Plus", family: "iphone-8-plus" },
  { brand: "Apple", model: "iPhone X", family: "iphone-x" },
  { brand: "Apple", model: "iPhone XR", family: "iphone-xr" },
  { brand: "Apple", model: "iPhone XS", family: "iphone-xs" },
  { brand: "Apple", model: "iPhone XS Max", family: "iphone-xs-max" },
  { brand: "Apple", model: "iPhone SE (2nd generation)", family: "iphone-se-2nd-generation" },
  { brand: "Apple", model: "iPhone 11", family: "iphone-11" },
  { brand: "Apple", model: "iPhone 11 Pro", family: "iphone-11-pro" },
  { brand: "Apple", model: "iPhone 11 Pro Max", family: "iphone-11-pro-max" },
  { brand: "Apple", model: "iPhone 12 mini", family: "iphone-12-mini" },
  { brand: "Apple", model: "iPhone 12", family: "iphone-12" },
  { brand: "Apple", model: "iPhone 12 Pro", family: "iphone-12-pro" },
  { brand: "Apple", model: "iPhone 12 Pro Max", family: "iphone-12-pro-max" },
  { brand: "Apple", model: "iPhone 13 mini", family: "iphone-13-mini" },
  { brand: "Apple", model: "iPhone 13", family: "iphone-13" },
  { brand: "Apple", model: "iPhone 13 Pro", family: "iphone-13-pro" },
  { brand: "Apple", model: "iPhone 13 Pro Max", family: "iphone-13-pro-max" },
  { brand: "Apple", model: "iPhone SE (3rd generation)", family: "iphone-se-3rd-generation" },
  { brand: "Apple", model: "iPhone 14", family: "iphone-14" },
  { brand: "Apple", model: "iPhone 14 Plus", family: "iphone-14-plus" },
  { brand: "Apple", model: "iPhone 14 Pro", family: "iphone-14-pro" },
  { brand: "Apple", model: "iPhone 14 Pro Max", family: "iphone-14-pro-max" },
  { brand: "Apple", model: "iPhone 15", family: "iphone-15" },
  { brand: "Apple", model: "iPhone 15 Plus", family: "iphone-15-plus" },
  { brand: "Apple", model: "iPhone 15 Pro", family: "iphone-15-pro" },
  { brand: "Apple", model: "iPhone 15 Pro Max", family: "iphone-15-pro-max" },
  { brand: "Apple", model: "iPhone 16", family: "iphone-16" },
  { brand: "Apple", model: "iPhone 16 Plus", family: "iphone-16-plus" },
  { brand: "Apple", model: "iPhone 16 Pro", family: "iphone-16-pro" },
  { brand: "Apple", model: "iPhone 16 Pro Max", family: "iphone-16-pro-max" },
  { brand: "Apple", model: "iPhone Air", family: "iphone-air" },
  { brand: "Apple", model: "iPhone 17", family: "iphone-17" },
  { brand: "Apple", model: "iPhone 17 Pro", family: "iphone-17-pro" },
  { brand: "Apple", model: "iPhone 17 Pro Max", family: "iphone-17-pro-max" },
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
// A többinél (pl. "Nem tölt", "Alaplapi hiba", "Beázás") túl nagy a szórás ahhoz, hogy egy
// modellre egyetlen fix ár legyen adható — azok a nyilvános oldalon "kérj árajánlatot" leadet adnak.
// A "Kijelző csere" és "Akku csere" ára csak a munkadíjat jelenti (az alkatrészköltség a
// bevizsgáláskor adódik hozzá) — ld. RepairEstimator.jsx "-tól" jelzése ennél a két tételnél.
export const PRICED_PROBLEMS = [
  "Kijelző csere", "Akku csere", "Töltőcsatlakozó", "Hátlapi kamera", "Előlapi kamera",
  "Mikrofon", "Főhangszóró", "Hátlap csere", "Bekapcsoló gomb", "Adatmentés",
];

// Admin (belső) feliratok — ez marad magyar, ld. TASKS_SEO_GEO.md 9. pont ("belső admin nincs lefordítva").
export const PROBLEM_LABELS = {
  "Kijelző csere": "Kijelző csere", "Akku csere": "Akku csere",
  "Nem tölt": "Nem tölt", "Töltőcsatlakozó": "Töltőcsatlakozó hibás",
  "Gyorsan merül": "Gyorsan merül az akku", "Beszédhangszóró": "Beszédhangszóró hibás",
  "Főhangszóró": "Főhangszóró hibás", "Mikrofon": "Mikrofon hibás",
  "Hálózat hiba": "Hálózat / térerő hiba", "Hátlapi kamera": "Hátlapi kamera hibás",
  "Előlapi kamera": "Előlapi kamera hibás", "Kamera lencse": "Kamera lencse törött",
  "Face ID / Touch ID hiba": "Face ID / Touch ID hiba", "Hátlap csere": "Hátlap csere",
  "Készülékház": "Készülékház sérült", "Bekapcsoló gomb": "Bekapcsoló gomb hibás",
  "Hangerő gombok": "Hangerő gombok hibásak", "Beázás": "Beázott",
  "Nem kapcsol be": "Nem kapcsol be", "Alaplapi hiba": "Alaplapi hiba",
  "Bootloop": "Újraindulási hurok (bootloop)", "Adatmentés": "Adatmentés",
  "Bevizsgálás": "Csak bevizsgálás", "FRP zárolás": "Fiók / FRP zárolás",
  "Egyéb": "Egyéb probléma",
};
// Publikus (ügyfél felé mutatott) feliratok, nyelv szerint — a RepairEstimator.jsx ezt használja.
const PROBLEM_LABELS_BY_LANG = {
  hu: PROBLEM_LABELS,
  ro: {
    "Kijelző csere": "Înlocuire display", "Akku csere": "Înlocuire baterie",
    "Nem tölt": "Nu se încarcă", "Töltőcsatlakozó": "Conector de încărcare defect",
    "Gyorsan merül": "Bateria se descarcă rapid", "Beszédhangszóró": "Difuzor convorbire defect",
    "Főhangszóró": "Difuzor principal defect", "Mikrofon": "Microfon defect",
    "Hálózat hiba": "Problemă rețea / semnal", "Hátlapi kamera": "Cameră spate defectă",
    "Előlapi kamera": "Cameră față defectă", "Kamera lencse": "Geam cameră spart",
    "Face ID / Touch ID hiba": "Problemă Face ID / Touch ID", "Hátlap csere": "Înlocuire capac spate",
    "Készülékház": "Carcasă deteriorată", "Bekapcsoló gomb": "Buton pornire defect",
    "Hangerő gombok": "Butoane volum defecte", "Beázás": "Deteriorare cu lichid",
    "Nem kapcsol be": "Nu pornește", "Alaplapi hiba": "Problemă placă de bază",
    "Bootloop": "Repornire în buclă (bootloop)", "Adatmentés": "Recuperare date",
    "Bevizsgálás": "Doar diagnosticare", "FRP zárolás": "Blocare cont / FRP",
    "Egyéb": "Altă problemă",
  },
};
export const problemLabel = (tag, lang = "hu") => (PROBLEM_LABELS_BY_LANG[lang] || PROBLEM_LABELS)[tag] || tag;
