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
// A többinél (pl. "Nem tölt", "Alaplapi hiba", "Beázás") túl nagy a szórás ahhoz, hogy egy
// modellcsaládra egyetlen fix ár legyen adható — azok a nyilvános oldalon "kérj árajánlatot" leadet adnak.
export const PRICED_PROBLEMS = ["Kijelző csere", "Akku csere", "Töltőcsatlakozó", "Hátlapi kamera", "Előlapi kamera"];

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
