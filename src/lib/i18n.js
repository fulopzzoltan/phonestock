export const STRINGS = {
  hu: {
    navStock: "Készlet", navBuyback: "Add el a telefonod", navRepair: "Szerviz árbecslő",
    navStatus: "Szerviz / vásárlás státusz", navLogin: "Bejelentkezés", langSwitch: "RO",

    // Készlet-vitrin
    searchPlaceholder: "Keresés — pl. iPhone 13, Samsung A07...",
    allBrands: "Minden márka", allConditions: "Összes állapot",
    conditionNew: "Új", conditionRefurb: "Felújított",
    sortPriceAsc: "Ár: olcsóbb elöl", sortPriceDesc: "Ár: drágább elöl", sortBrand: "Márka szerint",
    resultsCount: (n) => `${n} telefon készleten`,
    loading: "Betöltés...", noResults: "Nincs találat a szűrésre — próbálj más márkát vagy keresőszót.",
    warrantyTag: (w) => `${w} garancia`, interested: "Érdekel",
    footer: "Telefonos — az árak és a raktárkészlet folyamatosan frissülnek, végleges ár a szervizben/üzletben.",
    scarcity: "Utolsó darab", saveLabel: (n) => `Spórolsz ${n} Lei`,
    backToStock: "Vissza a készlethez", soldOut: "Ez a darab már elkelt, vagy nem található.",

    // Telefon-részletoldal
    storageLabel: "Tárhely", colorLabel: "Szín", batteryLabel: "Akkumulátor", warrantyLabel: "Garancia",
    interestedCall: "Érdekel — hívj minket",
    priceNote: "Az ár és a készlet folyamatosan frissül, végleges adásvétel az üzletben történik.",

    // Szerviz árbecslő
    repairWhatPhone: "Milyen telefonod van?",
    repairSearchPlaceholder: "Keresés — pl. iPhone 12, Galaxy A54...",
    repairNoMatch: "Nincs találat ilyen modellre.",
    repairNotFoundCta: "Nem találod a modelledet? Kérj egyedi árajánlatot →",
    repairCustomTitle: "Kérj egyedi árajánlatot",
    repairCustomHint: "A modelled nincs a listánkban, de szívesen adunk egyedi árat — írd le, miről van szó.",
    brandLabel: "Márka", modelLabel: "Modell", repairProblemQ: "Mi a probléma?",
    repairProblemPlaceholder: "pl. törött kijelző",
    repairOtherProblem: "Más a probléma?",
    repairOem: "Eredeti (OEM)", repairAfter: "Utángyártott",
    repairWarrantyFor: (w) => `${w} garancia a javításra`,
    repairStockAvail: (m) => `✓ Ma bejöhetsz, kb. ${m} perc alatt kész`,
    repairStockUnavail: "⏳ Alkatrészt rendelni kell, kb. 2-3 munkanap",
    repairBookSlot: "Foglald le a helyed",
    nameLabel: "Név", phoneLabel: "Telefonszám",
    repairLocationOptional: "Melyik bolt lenne jó? (opcionális)", repairAnyLocation: "— mindegy —",
    repairSendBooking: "Foglalás elküldése", sending: "Küldés...",
    repairNeedsAssessment: "Ehhez személyes felmérés szükséges — hozd be ingyenes felméréshez, vagy foglald le a helyed és hívunk.",
    repairDoneTitle: "Köszönjük, foglaltunk neked helyet!",
    repairDoneCall: "📞 Hamarosan hívunk egyeztetni",
    repairDoneVisit: "🏬 Vagy hozd be a készüléket bármelyik boltunkba",
    backToHome: "Vissza a főoldalra", back: "← Vissza",
    nameRequired: "Add meg a neved és a telefonszámod.",
    genericError: "Hiba történt.",
  },
  ro: {
    navStock: "Telefoane", navBuyback: "Vinde telefonul", navRepair: "Estimare service",
    navStatus: "Stare service / achiziție", navLogin: "Autentificare", langSwitch: "HU",

    searchPlaceholder: "Căutare — ex. iPhone 13, Samsung A07...",
    allBrands: "Toate mărcile", allConditions: "Toate stările",
    conditionNew: "Nou", conditionRefurb: "Recondiționat",
    sortPriceAsc: "Preț: crescător", sortPriceDesc: "Preț: descrescător", sortBrand: "După marcă",
    resultsCount: (n) => `${n} telefoane în stoc`,
    loading: "Se încarcă...", noResults: "Niciun rezultat — încearcă altă marcă sau alt cuvânt cheie.",
    warrantyTag: (w) => `garanție ${w}`, interested: "Sunt interesat",
    footer: "Telefonos — prețurile și stocul se actualizează constant, prețul final se stabilește în magazin/service.",
    scarcity: "Ultima bucată", saveLabel: (n) => `Economisești ${n} Lei`,
    backToStock: "Înapoi la stoc", soldOut: "Această bucată s-a vândut deja sau nu a fost găsită.",

    storageLabel: "Stocare", colorLabel: "Culoare", batteryLabel: "Baterie", warrantyLabel: "Garanție",
    interestedCall: "Sunt interesat — sună-ne",
    priceNote: "Prețul și stocul se actualizează constant, tranzacția finală are loc în magazin.",

    repairWhatPhone: "Ce telefon ai?",
    repairSearchPlaceholder: "Căutare — ex. iPhone 12, Galaxy A54...",
    repairNoMatch: "Niciun rezultat pentru acest model.",
    repairNotFoundCta: "Nu-ți găsești modelul? Cere o ofertă personalizată →",
    repairCustomTitle: "Cere o ofertă personalizată",
    repairCustomHint: "Modelul tău nu e în listă, dar îți facem cu drag o ofertă personalizată — descrie despre ce este vorba.",
    brandLabel: "Marcă", modelLabel: "Model", repairProblemQ: "Care e problema?",
    repairProblemPlaceholder: "ex. ecran spart",
    repairOtherProblem: "Altă problemă?",
    repairOem: "Original (OEM)", repairAfter: "Neoriginal",
    repairWarrantyFor: (w) => `garanție ${w} pentru reparație`,
    repairStockAvail: (m) => `✓ Poți veni azi, gata în aprox. ${m} minute`,
    repairStockUnavail: "⏳ Piesa trebuie comandată, aprox. 2-3 zile lucrătoare",
    repairBookSlot: "Rezervă-ți locul",
    nameLabel: "Nume", phoneLabel: "Număr de telefon",
    repairLocationOptional: "Ce magazin ți-ar conveni? (opțional)", repairAnyLocation: "— oricare —",
    repairSendBooking: "Trimite rezervarea", sending: "Se trimite...",
    repairNeedsAssessment: "Pentru asta e nevoie de o evaluare personală — vino pentru o evaluare gratuită, sau rezervă-ți locul și te sunăm noi.",
    repairDoneTitle: "Mulțumim, ți-am rezervat locul!",
    repairDoneCall: "📞 Te sunăm în curând să stabilim detaliile",
    repairDoneVisit: "🏬 Sau adu telefonul la oricare dintre magazinele noastre",
    backToHome: "Înapoi la pagina principală", back: "← Înapoi",
    nameRequired: "Introdu numele și numărul de telefon.",
    genericError: "A apărut o eroare.",
  },
};

export const t = (lang) => STRINGS[lang] || STRINGS.hu;

// A termékadatok (szín, garancia) az adminok által magyarul rögzített szabad/félig-szabad szöveg —
// a publikus RO oldalakon ezeket is fordítjuk, ismeretlen/angol értéknél változatlanul hagyva.
const WARRANTY_HU_TO_RO = {
  "1 hó": "1 lună", "3 hó": "3 luni", "6 hó": "6 luni", "1 év": "1 an", "2 év": "2 ani",
};
export function translateWarranty(warranty, lang) {
  if (lang !== "ro" || !warranty) return warranty;
  return WARRANTY_HU_TO_RO[warranty] || warranty;
}

const COLOR_HU_TO_RO = {
  "Fekete": "Negru", "Fehér": "Alb", "Kék": "Albastru", "Zöld": "Verde", "Ezüst": "Argintiu",
  "Szürke": "Gri", "Piros": "Roșu", "Sárga": "Galben", "Rózsaszín": "Roz", "Arany": "Auriu",
  "Lila": "Mov", "Bordó": "Bordo", "Barna": "Maro",
};
export function translateColor(color, lang) {
  if (lang !== "ro" || !color) return color;
  return COLOR_HU_TO_RO[color] || color;
}
