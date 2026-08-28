export const STRINGS = {
  hu: {
    navStock: "Telefonok", navBuyback: "Eladás", navRepair: "Szerviz",
    navStatus: "Nyomonkövetés", navLogin: "Bejelentkezés", langSwitch: "RO",

    // Készlet-vitrin
    searchPlaceholder: "Keresés — pl. iPhone 13...", filters: "Szűrők",
    allBrands: "Minden márka", allConditions: "Összes állapot", os: "Operációs rendszer",
    conditionNew: "Új", conditionRefurb: "Felújított", clearFilters: "Szűrők törlése",
    showMoreBrands: (n) => `+${n} további márka`, showFewerBrands: "Kevesebb mutatása",
    sortRecommended: "Ajánlott sorrend", sortPriceAsc: "Ár: olcsóbb elöl", sortPriceDesc: "Ár: drágább elöl", sortBrand: "Márka szerint",
    loading: "Betöltés...", noResults: "Nincs találat a szűrésre — próbálj más márkát vagy keresőszót.",
    warrantyTag: (w) => `${w} garancia`, interested: "Érdekel",
    footer: "Telefonos — az árak és a raktárkészlet folyamatosan frissülnek, végleges ár a szervizben/üzletben.",
    footerShop: "Vásárlás", footerCart: "Kosár", footerAccount: "Fiók", footerMyAccount: "Fiókom",
    footerLocations: "Üzleteink", footerLegal: "Jogi", footerTerms: "ÁSZF", footerReturns: "Visszaküldés", footerPrivacy: "Adatvédelem",
    footerRights: (y) => `© ${y} Telefonos — minden jog fenntartva.`,
    saveLabel: (n) => `Spórolsz ${n} Lei`,
    backToStock: "Vissza a készlethez", soldOut: "Ez a darab már elkelt, vagy nem található.",
    wishlistToggle: "Kedvencekhez adás",
    promoBuybackTitle: "Van egy régi telefonod?", promoBuybackDesc: "Egy iPhone 11-ért pl. akár 900 Lejt is adunk — nézd meg a tiédet 30 másodperc alatt.", promoBuybackCta: "Megnézem, mennyit ér →",
    promoRepairTitle: "Elromlott a telefonod?", promoRepairDesc: "Akkumulátorcsere már 200 Lejtől — nézd meg a te hibádra mennyibe kerülne, ingyen.", promoRepairCta: "Megnézem az árat →",
    promoTrustTitle: "Nem csak egy raktár", promoTrustDesc: "2 fizikai üzlet (Gyimes, Szentgyörgy) — új, felújított és gombos telefon egy helyen, szerviz is ugyanott.", promoTrustCta: "📍 Gyimes & Szentgyörgy",

    // Telefon-választó segítő
    finderNavTitle: "Melyik telefon illik hozzád?",
    finderNavCta: "Segíts választani →",
    finderPromoTitle: "Nem tudod, melyik telefont válaszd?", finderPromoDesc: "Válaszolj 4 gyors kérdésre, és mi kiválasztjuk a hozzád illő 2-3 telefont a készletből.", finderPromoCta: "Segíts választani →",
    finderPageTitle: "Telefon-választó segítő — Telefonos",
    finderPageDesc: "4 gyors kérdés, és kiválasztjuk a hozzád illő telefonokat a készletünkből.",
    finderAny: "Bármelyik",
    finderConditionQ: "Milyen állapotú telefont keresel?",
    finderBudgetQ: "Mennyit szánnál rá?",
    finderBudgetUnder: (n) => `${n} Lej alatt`, finderBudgetRange: (a, b) => `${a}-${b} Lej`, finderBudgetOver: (n) => `${n} Lej felett`,
    finderStorageQ: "Mennyi tárhelyre van szükséged?",
    finderBrandQ: "Van kedvenc márkád?", finderBrandHint: "Válassz akár többet is, vagy hagyd üresen, ha mindegy",
    finderShowResults: "Ajánlatok megnézése",
    finderResultTitle: (n) => n === 1 ? "1 telefon, ami illik hozzád:" : `${n} telefon, ami illik hozzád:`,
    finderResultFallback: "A pontos igényed szerint nem volt találat, de ezek állnak hozzá legközelebb:",
    finderRetryCta: "Újrapróbálom más válaszokkal",
    finderNoStock: "Jelenleg nincs elérhető készlet — nézz vissza hamarosan.",

    // Vélemények
    reviewsTitle: "Amit a vásárlóink mondanak", reviewsBadge: (avg, n) => `${avg} · ${n} vélemény alapján`,
    reviewsSubtitle: "Valós vélemények, valódi vásárlóktól.",
    reviewsBasedOn: (n) => n === 1 ? "1 vélemény alapján" : `${n} vélemény alapján`,
    reviewsEmpty: "Hamarosan itt lesznek az első véleményeink.",

    // Telefon-részletoldal
    storageLabel: "Tárhely", colorLabel: "Szín", batteryLabel: "Akkumulátor", warrantyLabel: "Garancia",
    interestedCall: "Érdekel — hívj minket",
    priceNote: "Az ár és a készlet folyamatosan frissül, végleges adásvétel az üzletben történik.",
    detailTrustWarranty: (w) => `${w} garancia`, detailTrustWarrantySub: "A készülékre és a benne lévő alkatrészekre",
    detailTrustCondition: "Ellenőrzött, tesztelt állapot", detailTrustConditionSub: "Kijelző, akku, kamerák és gombok átvizsgálva átadás előtt",
    detailTrustPickup: "Személyes átvétel", detailTrustPickupSub: (loc) => `${loc} üzletünkben, mielőtt fizetsz, kipróbálhatod`,
    detailConditionNewTitle: "Vadonatúj állapot", detailConditionNewDesc: "Ez a készülék bontatlan vagy szinte használatlan állapotban van, gyári tartozékokkal.",
    detailConditionRefurbTitle: "Felújított állapot", detailConditionRefurbDesc: "Ezt a készüléket átvizsgáltuk és teszteltük, mielőtt polcra került — kijelző, akkumulátor, kamerák és minden gomb, port működését ellenőriztük. Apró, futólag látható kopásnyomok lehetnek rajta.",
    detailSpecsTitle: "Specifikáció", detailRelatedTitle: "Hasonló telefonok",

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
    crossOfferBuybackValue: (n) => `Ezt is beszámítjuk: kb. ${n} Lej.`,
    crossOfferSwapCta: "Ha inkább becseréled, ennyiért viheted ezek egyikét:",
    repairDoneTitle: "Köszönjük, foglaltunk neked helyet!",
    repairDoneCall: "Hamarosan hívunk egyeztetni",
    repairDoneVisit: "Vagy hozd be a készüléket bármelyik boltunkba",
    backToHome: "Vissza a főoldalra", back: "← Vissza",
    nameRequired: "Add meg a neved és a telefonszámod.",
    genericError: "Hiba történt.",
  },
  ro: {
    navStock: "Telefoane", navBuyback: "Vinde", navRepair: "Service",
    navStatus: "Urmărire", navLogin: "Autentificare", langSwitch: "HU",

    searchPlaceholder: "Căutare — ex. iPhone 13...", filters: "Filtre",
    allBrands: "Toate mărcile", allConditions: "Toate stările", os: "Sistem de operare",
    conditionNew: "Nou", conditionRefurb: "Recondiționat", clearFilters: "Șterge filtrele",
    showMoreBrands: (n) => `+${n} mărci suplimentare`, showFewerBrands: "Arată mai puține",
    sortRecommended: "Recomandat", sortPriceAsc: "Preț: crescător", sortPriceDesc: "Preț: descrescător", sortBrand: "După marcă",
    loading: "Se încarcă...", noResults: "Niciun rezultat — încearcă altă marcă sau alt cuvânt cheie.",
    warrantyTag: (w) => `garanție ${w}`, interested: "Sunt interesat",
    footer: "Telefonos — prețurile și stocul se actualizează constant, prețul final se stabilește în magazin/service.",
    footerShop: "Cumpărături", footerCart: "Coș", footerAccount: "Cont", footerMyAccount: "Contul meu",
    footerLocations: "Magazinele noastre", footerLegal: "Legal", footerTerms: "Termeni și condiții", footerReturns: "Retur", footerPrivacy: "Confidențialitate",
    footerRights: (y) => `© ${y} Telefonos — toate drepturile rezervate.`,
    saveLabel: (n) => `Economisești ${n} Lei`,
    backToStock: "Înapoi la stoc", soldOut: "Această bucată s-a vândut deja sau nu a fost găsită.",
    wishlistToggle: "Adaugă la favorite",
    promoBuybackTitle: "Ai un telefon vechi?", promoBuybackDesc: "Pentru un iPhone 11 dăm chiar și până la 900 Lei — vezi cât valorează al tău în 30 de secunde.", promoBuybackCta: "Văd cât valorează →",
    promoRepairTitle: "Ți s-a stricat telefonul?", promoRepairDesc: "Schimb de baterie de la 200 Lei — vezi cât ar costa exact problema ta, gratuit.", promoRepairCta: "Văd prețul →",
    promoTrustTitle: "Nu doar un depozit", promoTrustDesc: "2 magazine fizice (Ghimeș, Sfântu Gheorghe) — telefoane noi, recondiționate și cu taste într-un singur loc, plus service la fața locului.", promoTrustCta: "📍 Ghimeș & Sfântu Gheorghe",

    // Asistent de alegere telefon
    finderNavTitle: "Ce telefon ți se potrivește?",
    finderNavCta: "Ajută-mă să aleg →",
    finderPromoTitle: "Nu știi ce telefon să alegi?", finderPromoDesc: "Răspunde la 4 întrebări rapide și îți alegem 2-3 telefoane potrivite din stoc.", finderPromoCta: "Ajută-mă să aleg →",
    finderPageTitle: "Asistent de alegere telefon — Telefonos",
    finderPageDesc: "4 întrebări rapide, și îți alegem telefoanele potrivite din stocul nostru.",
    finderAny: "Oricare",
    finderConditionQ: "Ce stare de telefon cauți?",
    finderBudgetQ: "Cât ai vrea să cheltui?",
    finderBudgetUnder: (n) => `Sub ${n} Lei`, finderBudgetRange: (a, b) => `${a}-${b} Lei`, finderBudgetOver: (n) => `Peste ${n} Lei`,
    finderStorageQ: "Câtă stocare ți-ar trebui?",
    finderBrandQ: "Ai o marcă preferată?", finderBrandHint: "Poți alege mai multe, sau lasă necompletat dacă nu contează",
    finderShowResults: "Vezi recomandările",
    finderResultTitle: (n) => n === 1 ? "1 telefon care ți se potrivește:" : `${n} telefoane care ți se potrivesc:`,
    finderResultFallback: "Nu a fost o potrivire exactă, dar acestea sunt cele mai apropiate:",
    finderRetryCta: "Încerc din nou cu alte răspunsuri",
    finderNoStock: "Momentan nu avem stoc disponibil — revino curând.",

    // Recenzii
    reviewsTitle: "Ce spun clienții noștri", reviewsBadge: (avg, n) => `${avg} · pe baza a ${n} recenzii`,
    reviewsSubtitle: "Recenzii reale, de la clienți reali.",
    reviewsBasedOn: (n) => n === 1 ? "pe baza a 1 recenzie" : `pe baza a ${n} recenzii`,
    reviewsEmpty: "În curând vor apărea aici primele noastre recenzii.",

    storageLabel: "Stocare", colorLabel: "Culoare", batteryLabel: "Baterie", warrantyLabel: "Garanție",
    interestedCall: "Sunt interesat — sună-ne",
    priceNote: "Prețul și stocul se actualizează constant, tranzacția finală are loc în magazin.",
    detailTrustWarranty: (w) => `Garanție ${w}`, detailTrustWarrantySub: "Pentru dispozitiv și piesele incluse",
    detailTrustCondition: "Stare verificată și testată", detailTrustConditionSub: "Ecran, baterie, camere și butoane verificate înainte de predare",
    detailTrustPickup: "Ridicare personală", detailTrustPickupSub: (loc) => `La magazinul nostru din ${loc} — îl poți încerca înainte să plătești`,
    detailConditionNewTitle: "Stare nou-nouță", detailConditionNewDesc: "Acest dispozitiv este nedesfăcut sau aproape neutilizat, cu accesoriile originale.",
    detailConditionRefurbTitle: "Stare recondiționată", detailConditionRefurbDesc: "Acest dispozitiv a fost verificat și testat înainte să ajungă pe raft — am verificat ecranul, bateria, camerele și fiecare buton, port. Pot exista mici urme de uzură, vizibile doar de aproape.",
    detailSpecsTitle: "Specificații", detailRelatedTitle: "Telefoane similare",

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
    crossOfferBuybackValue: (n) => `Preluăm și telefonul tău: aprox. ${n} Lei.`,
    crossOfferSwapCta: "Dacă preferi să-l schimbi, cu atât poți lua unul dintre acestea:",
    repairDoneTitle: "Mulțumim, ți-am rezervat locul!",
    repairDoneCall: "Te sunăm în curând să stabilim detaliile",
    repairDoneVisit: "Sau adu telefonul la oricare dintre magazinele noastre",
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
