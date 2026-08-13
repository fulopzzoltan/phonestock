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
