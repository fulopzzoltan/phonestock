export const money = (n) => Math.round(Number(n) || 0).toLocaleString("hu-HU") + " Lei";
// mindig az éles domaint tegyük ügyfélnek küldött linkekbe (SMS, garanciajegy-link),
// sose window.location.origin-t — az localhost lenne, ha valaki fejlesztés közben
// (npm run dev) hoz létre/módosít egy valós tételt, az ügyfél meg nem tudná megnyitni
export const SITE_URL = "https://phonestock-manager.netlify.app";
// ékezetek eltávolítása — SMS-eknél 1 szegmensben (160 karakter) marad az üzenet,
// ékezetekkel a GSM-7 kódolás elesik és 70 karakterenként darabolódik (2x drágább)
export const stripAccents = (str) => (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
// rom\u00e1n nemzetk\u00f6zi el\u0151h\u00edv\u00f3 (+40 / 0040) \u2192 helyi 0-s forma, minden m\u00e1s elt\u00e1vol\u00edt\u00e1s ut\u00e1n
// nem 10 jegy\u0171 0-val kezd\u0151d\u0151 sz\u00e1mot (hib\u00e1s/hi\u00e1nyos adat) \u00fcresre v\u00e1lt, hogy ne mutassuk
export function formatPhone(raw) {
  if (!raw) return "";
  let digits = String(raw).trim().replace(/[\s\-().]/g, "");
  if (digits.startsWith("+4")) digits = digits.slice(2);
  else if (digits.startsWith("004")) digits = digits.slice(3);
  digits = digits.replace(/\D/g, "");
  if (digits.length === 9) digits = "0" + digits;
  return /^0\d{9}$/.test(digits) ? digits : "";
}
// FONTOS: helyi (böngésző) dátumot ad vissza, NEM UTC-t — new Date().toISOString() UTC-re
// vált, ami Románia (UTC+2/+3) idézónájában éjfél után pár óráig a tegnapi dátumot adná
// vissza (pl. helyi 01:00-kor UTC még előző nap 22:00/23:00), és emiatt a mai határidejű
// munkalapok, garanciák stb. tévesen nem "mainak" számítanának.
export const today = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const LOCS = { gyimes: "Gyimes", szentgy: "Szentgyörgy" };

// márkánként konzisztens szín a fotó nélküli termékek avatar-monogramjához (StockTab)
const BRAND_COLORS = {
  Apple: "#111827", Samsung: "#1D4ED8", Xiaomi: "#EA580C", Huawei: "#DC2626",
  Oppo: "#059669", Vivo: "#7C3AED", OnePlus: "#B91C1C", Nokia: "#0EA5E9", Google: "#EAB308",
};
export function brandColor(brand) {
  if (BRAND_COLORS[brand]) return BRAND_COLORS[brand];
  let h = 0;
  for (let i = 0; i < (brand || "").length; i++) h = (h * 31 + brand.charCodeAt(i)) % 360;
  return `hsl(${h}, 55%, 42%)`;
}
// "Apple iPhone 11" helyett elég csak "iPhone 11" — a brand adat marad "Apple", ez csak megjelenítés.
// Terméknél és szerviz munkalapnál is ugyanaz a brand/model pár, ezért közös helyen.
export function displayName(brand, model) {
  if (brand === "Apple" && (model || "").toLowerCase().startsWith("iphone")) return model;
  return [brand, model].filter(Boolean).join(" ");
}

export const SLOW_MOVING_DAYS = 45;
export function daysOnShelf(dateAdded) {
  if (!dateAdded) return null;
  return Math.floor((Date.now() - new Date(dateAdded + "T00:00:00")) / 86400000);
}
export function isSlowMoving(p, reserveLocId) {
  if (reserveLocId && p.locationId === reserveLocId) return false;
  const days = daysOnShelf(p.dateAdded);
  return days != null && days >= SLOW_MOVING_DAYS;
}

export const READY_STALE_DAYS = 90;
export function isStaleReady(t) {
  if (t.status !== "Átadásra" || t.subStatus === "Átadva" || !t.readyAt) return false;
  return Math.floor((Date.now() - new Date(t.readyAt)) / 86400000) >= READY_STALE_DAYS;
}

// Rövid, kimondható azonosítók — szám elöl, utána nagybetűs kategória-jelölés, kötőjel nélkül.
// T = Telefon, GY/SGY+S = Szerviz munkalap (helyszín szerint, pl. 2199GYS), A = Alkatrész.
// A bizonylatszámhoz (receipt_no) szándékosan nem nyúlunk — az pénzügyi/könyvelési sorszám.
export function phoneCode(productNo) {
  return productNo == null ? null : `${productNo}-T`;
}
export function partCode(partNo) {
  return partNo == null ? null : `${partNo}-A`;
}
export function normalizeImei(imei) {
  return (imei || "").replace(/\D/g, "");
}
// A products.brand is szabad szöveg — előfordul véletlen záró szóköz az admin oldali gépelésből
// ("Samsung " vs "Samsung"), ami a webshop szűrőiben duplikált márka-sorként jelenne meg.
export function normalizeBrand(raw) {
  return (raw || "").trim();
}
// A products.storage szabad szöveg — "32 GB", "32GB", "64" mind ugyanazt jelentheti,
// mert admin oldalon szabadon gépelhető be. Ezt egységesítjük a webshop szűrőiben/listáiban,
// hogy ne szerepeljen többször ugyanaz az érték.
export function normalizeStorage(raw) {
  if (!raw) return raw;
  const m = String(raw).match(/(\d+)\s*(GB|TB)?/i);
  if (!m) return raw.trim();
  return `${m[1]} ${(m[2] || "GB").toUpperCase()}`;
}
const TICKET_LOCATION_LETTERS = { "Gyimes": "GY", "Szentgyörgy": "CS" };
// locationName = a felvétel (intake) helyszínének neve — ez a munkalap létrehozásakor
// örökre rögzül (intake_location_id), nem változik akkor sem, ha a javítás közben
// másik boltba kerül a telefon (location_id az él, azt mutatja a helyszín-címke).
// Formátum: szám elöl, utána a helyszín-rövidítés, végén "S" (=szerviz) — pl. 2199GYS, 2227CSS
// (CS = Csíkszentgyörgy).
export function ticketCode(ticketNo, locationName) {
  if (ticketNo == null) return null;
  const letter = TICKET_LOCATION_LETTERS[locationName] || "";
  return `${ticketNo}-${letter}S`;
}

// "key" = adatbázisban tárolt érték (ne változtasd, meglévő sorok erre hivatkoznak),
// "label" = amit a kanban/UI mutat — ez bármikor finomítható a key érintése nélkül
// "narrow" = ne váltson 2 oszlopos kártyarácsra kanbanban, még ha van is hely —
// a "Szerelés alatt"/"Tesztelés" státuszban kevés ideig van egy telefon, ritkán
// gyűlik fel bennük annyi kártya, hogy a 2 oszlop indokolt legyen
export const STATUSES = [
  { key: "Átvett", label: "Rögzítve", color: "#F59E0B", cls: "st-beveve" },
  { key: "Javítás alatt", label: "Szerelés alatt", color: "#F97316", cls: "st-javitas", narrow: true },
  { key: "Minőségellenőrzés", label: "Tesztelés", color: "#0EA5E9", cls: "st-qc", narrow: true },
  { key: "Átadásra", label: "Átvehető", color: "#22C55E", cls: "st-kesz" },
];
export const statusCls = (s) => STATUSES.find((c) => c.key === s)?.cls || "st-beveve";
export const statusLabel = (s) => STATUSES.find((c) => c.key === s)?.label || s;

// Felvásárlási ajánlatok (buyback_offers.status) — a "Kifizetve"/"Elutasítva" lezárt
// állapotok nem kanban-oszlopok, hanem külön "Lezárt ajánlatok" listában jelennek meg
// (ugyanaz a minta, mint a szerviznél az átadott munkalapok).
export const BUYBACK_STATUSES = [
  { key: "Ajánlat elkészült", color: "#F59E0B", cls: "st-beveve" },
  { key: "Elfogadva - várjuk a készüléket", color: "#F97316", cls: "st-javitas" },
  { key: "Beérkezett", color: "#0EA5E9", cls: "st-qc" },
  { key: "Bevizsgálás alatt", color: "#8B5CF6", cls: "st-alkatresz" },
  { key: "Végleges ajánlat", color: "#22C55E", cls: "st-kesz" },
];
export const buybackStatusCls = (s) => BUYBACK_STATUSES.find((c) => c.key === s)?.cls
  || (s === "Kifizetve" ? "st-kesz" : s === "Elutasítva" ? "st-sikertelen" : "st-beveve");

// sub_status options available within each main status ("null" entry = plain/no tag)
export const SUB_STATUSES = {
  "Átvett": [
    { key: null, label: "Átvett", cls: "st-beveve" },
    { key: "Alkatrészre vár", label: "Alkatrészre vár", cls: "st-alkatresz" },
    { key: "Készülékre vár", label: "Készülékre vár", cls: "st-alkatresz" },
    { key: "Alkatrészre és készülékre vár", label: "Alkatrészre és készülékre vár", cls: "st-alkatresz" },
  ],
  "Javítás alatt": [
    { key: null, label: "Javítás alatt", cls: "st-javitas" },
  ],
  "Minőségellenőrzés": [
    { key: null, label: "Tesztelés alatt", cls: "st-qc" },
  ],
  "Átadásra": [
    { key: null, label: "Kész, átvehető", cls: "st-kesz" },
    { key: "Sikertelen", label: "Sikertelen", cls: "st-sikertelen" },
    { key: "Átadva", label: "Átadva", cls: "st-kiadva" },
  ],
};
export const subStatusCls = (status, sub) => (SUB_STATUSES[status] || []).find((s) => s.key === sub)?.cls || "st-beveve";
export const subStatusLabel = (status, sub) => (SUB_STATUSES[status] || []).find((s) => s.key === sub)?.label || sub || "";

// SLA: munkalapok, amik "lezártnak" számítanak, nincs értelme határidőt figyelni rájuk
const SLA_CLOSED_SUB_STATUSES = ["Átadva", "Sikertelen"];
export function slaInfo(ticket) {
  if (!ticket?.dueDate || SLA_CLOSED_SUB_STATUSES.includes(ticket.subStatus)) return null;
  const days = Math.round((new Date(ticket.dueDate + "T00:00:00") - new Date(today() + "T00:00:00")) / 86400000);
  if (days < 0) return { level: "overdue", days, label: `${Math.abs(days)} napja lejárt` };
  if (days === 0) return { level: "warn", days, label: "Ma jár le" };
  if (days === 1) return { level: "warn", days, label: "Holnap jár le" };
  return { level: "ok", days, label: `${days} nap van hátra` };
}

export const PROBLEM_TAGS = [
  "Kijelző csere", "Akku csere", "Nem tölt", "Töltőcsatlakozó", "Gyorsan merül",
  "Beszédhangszóró", "Főhangszóró", "Mikrofon", "Hálózat hiba",
  "Hátlapi kamera", "Előlapi kamera", "Kamera lencse", "Face ID / Touch ID hiba",
  "Hátlap csere", "Készülékház", "Bekapcsoló gomb", "Hangerő gombok",
  "Beázás", "Nem kapcsol be", "Alaplapi hiba", "Bootloop", "Adatmentés",
  "Bevizsgálás", "FRP zárolás", "Egyéb",
];
export const PART_CATEGORIES = ["Kijelző", "Akkumulátor", "Hátlap"];
export const PART_ORIGINS = ["OEM", "Utángyártott"];
export const WARRANTIES = ["1 hó", "3 hó", "6 hó", "1 év", "2 év"];

// Választólista a márka mezőhöz — élő adatban feltárt elírás/szóródás ellen (pl. "Samsung"
// 7 alakban, "Apple"/"iPhone" külön márkaként). "Egyéb" választásra egy szabad szöveges
// mező bukkan fel, így ritka márka sem esik ki. Az "iPhone" szándékosan NEM külön tétel —
// az Apple-telefonok márkája marad "Apple", a modell mezőben szerepel az "iPhone" szó
// (ld. displayName()).
export const PHONE_BRANDS = [
  "Samsung", "Apple", "Xiaomi", "Redmi", "Poco", "Huawei", "Honor", "Nokia",
  "Motorola", "OnePlus", "Oppo", "Realme", "Vivo", "Google", "LG", "Asus",
  "iHunt", "Allview", "Myria", "Maxcom", "Doro", "Alcatel", "Blackview",
  "Doogee", "Oukitel", "Ulefone", "Oscal", "TCL", "ZTE", "Lenovo", "Philips",
  "Crosscall", "MobilWire", "Vodafone", "Orange", "Egyéb",
];
export const STORAGE_OPTIONS = ["32 GB", "64 GB", "128 GB", "256 GB", "512 GB", "1 TB", "Egyéb"];
export const RAM_OPTIONS = ["2 GB", "3 GB", "4 GB", "6 GB", "8 GB", "12 GB", "16 GB", "Egyéb"];
export const PHONE_COLORS = [
  "Fekete", "Fehér", "Szürke", "Ezüst", "Titán", "Kék", "Sötét kék", "Zöld",
  "Menta", "Világoszöld", "Arany", "Rózsaarany", "Rózsaszín", "Piros", "Narancs", "Lila", "Egyéb",
];
export const SOURCES = ["Konszignáció", "Számla"];
export const PAYMENTS = ["Készpénz", "Kártya", "Átutalás", "Vegyes"];
export const CATEGORIES = ["Fix", "Készlet", "Marketing", "Eszköz", "Szerviz", "Bér", "Adó", "Hitel", "Egyéb"];

// "Vegyes" fizetésnél a tétel összege készpénz+kártya részre oszlik
// (paymentCashAmount/paymentCardAmount) — ez a két helper adja vissza egy
// tranzakció készpénz ill. kártya részét, hogy a napi/időszaki
// összesítések (elszámolás, pénztárgép-egyeztetés) helyesen számoljanak.
export function cashPortion(t) {
  if (!t) return 0;
  if (t.payment === "Készpénz") return Number(t.amount) || 0;
  if (t.payment === "Vegyes") return Number(t.paymentCashAmount) || 0;
  return 0;
}
export function cardPortion(t) {
  if (!t) return 0;
  if (t.payment === "Kártya") return Number(t.amount) || 0;
  if (t.payment === "Vegyes") return Number(t.paymentCardAmount) || 0;
  return 0;
}

export const STOCK_STATUSES = [
  { key: "polcon", label: "Polcon" },
  { key: "lefoglalt", label: "Lefoglalt" },
  { key: "javitando", label: "Javítandó" },
];
export const stockStatusLabel = (s) => STOCK_STATUSES.find((x) => x.key === s)?.label || s;

// Fizikai állapot skála — egy egységes 4 lépcsős lista, ami a products.condition
// ("New"/"Refurbished") + products.grade ("A"/"B"/"C") párost egyetlen választható
// értékként jeleníti meg. A DB séma nem változott, csak a megjelenítés lett egységes.
export const CONDITION_GRADES = [
  { key: "New", label: "Új" },
  { key: "A", label: "Újszerű" },
  { key: "B", label: "Nagyon jó" },
  { key: "C", label: "Jó" },
];
export const conditionGradeKey = (condition, grade) => (condition === "New" ? "New" : (grade || "A"));
export const conditionGradeLabel = (condition, grade) => CONDITION_GRADES.find((g) => g.key === conditionGradeKey(condition, grade))?.label || "Felújított";

// Felvásárlás állapot-kérdései — a publikus /eladom flow és az admin levonási-szabály
// szerkesztő is ezt használja, hogy a question_key/answer_key kulcsok ne csúszhassanak szét.
export const BUYBACK_CONDITION_QUESTIONS = [
  {
    key: "powers_on",
    question: "Bekapcsol és rendesen működik a készülék?",
    options: [
      { key: "yes", label: "Igen, hibátlanul működik" },
      { key: "no", label: "Nem kapcsol be, vagy hibásan működik" },
    ],
  },
  {
    key: "screen_condition",
    question: "Milyen állapotban van a kijelző?",
    options: [
      { key: "good", label: "Ép, karcmentes" },
      { key: "scratched", label: "Enyhén karcos" },
      { key: "cracked", label: "Repedt vagy törött" },
    ],
  },
  {
    key: "battery_health",
    question: "Ha tudod, mennyi az akkuegészség?",
    options: [
      { key: "above_90", label: "90% felett" },
      { key: "between_80_90", label: "80–90%" },
      { key: "below_80", label: "80% alatt" },
      { key: "unknown", label: "Nem tudom" },
    ],
  },
  {
    key: "network_lock",
    question: "Hálózatfüggetlen a készülék?",
    options: [
      { key: "yes", label: "Igen, független" },
      { key: "no", label: "Nem, egy szolgáltatóhoz van kötve" },
    ],
  },
  {
    key: "accessories",
    question: "Megvannak az eredeti tartozékok (doboz, töltő)?",
    options: [
      { key: "yes", label: "Igen, megvannak" },
      { key: "no", label: "Nincsenek meg" },
    ],
  },
];

export function countWorkdays(startStr, endStr) {
  const start = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  let count = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

export const LEAVE_STATUS_CLS = { "Kérve": "badge-loc", "Jóváhagyva": "badge-income", "Elutasítva": "badge-expense", "Visszavonva": "" };

// Gyakran eladott kiegészítők — egy kattintással rögzíthető bevétel (eladási ár + beszerzési ár)
export const QUICK_SALES = [
  { label: "Devia", amount: 49, cost: 10 },
  { label: "Üvegfólia", amount: 49, cost: 7 },
  { label: "Töltőkábel", amount: 25, cost: 4 },
  { label: "Tok", amount: 49, cost: 10 },
];

export const SERVICE_WARRANTY_TERMS = `Szerviz Garancia Feltételek és a Javítás Menete

Fontos tudnivaló: A Telefonos által biztosított szervizgarancia kizárólag a javítás során kicserélt alkatrészekre és az általunk elvégzett munkára vonatkozik, nem pedig a készülék teljes egészére!

1. A garanciális ügyintézés menete (A 2 lépcsős folyamat)
Adatbiztonság: A készülék leadása előtt a vásárló köteles gondoskodni a személyes adatok mentéséről. Az adatok esetleges elvesztéséért a szervizelés során felelősséget nem vállalunk.

A megoldás 2 lépcsője:
1. lépcső (Újbóli javítás): Vállaljuk, hogy a leadott készüléket megvizsgáljuk, és a jogos szerviz garanciális hibát a beadástól számított 10 munkanapon belül megpróbáljuk ismét, díjmentesen kijavítani.
2. lépcső (Pénzvisszafizetés): Ha az újbóli javítás valamilyen okból nem lehetséges, vagy technikai akadályokba ütközik, a szervizelés díját (az alkatrész és a munkadíj árát) visszafizetjük az ügyfélnek.

2. Garanciaidők a beépített alkatrészekre és a munkadíjra
A kicserélt alkatrészek minőségétől és típusától függően az alábbi garancia időket biztosítjuk:
Eredeti akkumulátor: 12 hónap
Utángyártott akkumulátor: 6 hónap
Eredeti kijelző: 3 hónap
Utángyártott kijelző: 1 hónap
Minden egyéb beépített alkatrész és javítás: 1 hónap
Megjegyzés: Nem egyértelmű hibával leadott készülékek esetén (pl. a telefon egyáltalán nem kapcsol be, és a hiba oka az átvételkor nem egyértelmű), a sikeres javításra és a cserélt alkatrészre egységesen 1 hónap garancia érvényes.

3. A garancia NEM terjed ki az alábbi esetekre (és azonnal érvényét veszti):
Mechanikai sérülések: Leesésből, ütődésből, nyomásból, hajlításból eredő hibák, illetve törött, repedt, karcos vagy külső behatás nyomait viselő kijelzők.
Külső tényezők (Beázás): Víz, pára, nedvesség, folyadék vagy oxidáció által okozott hibák.
Illetéktelen beavatkozás: Ha a készüléket a javítás után megbontják, vagy magánszemély / más szerviz beavatkozást hajt végre rajta.
Szoftveres és tartozék hibák: Nem megfelelő töltő, kábel használata, illetve nem hivatalos szoftver, rootolás, jailbreak vagy hibás frissítés okozta problémák.
Természetes elhasználódás: A készülék és az alkatrészek normál használatból eredő kopása.
Korábban is fennálló, egyéb hibák: Ha a készüléket egy adott hibával adják le (pl. törött kijelző), a garancia kizárólag a kijelzőre vonatkozik. A szerviz nem vállal felelősséget olyan rejtett vagy korábbi hibákért, amelyek a javítás előtt is fennálltak, de nem képezték a szervizelés tárgyát.

4. Speciális szabályok (Akkumulátorok és Beázott készülékek)
Akkumulátorok: Az akkumulátor-garancia kizárólag a gyártási hibákra (pl. felpúposodás, belső rövidzárlat) érvényes. Az akkumulátor üzemidejének rövidülése, a kapacitás természetes csökkenése vagy a "Health" százalék romlása normál elhasználódásnak minősül, és nem garanciális hiba.
Beázott készülékek javítása: Folyadékkal érintkezett, oxidált készülékek esetén a javítás kizárólag a tulajdonos kérésére és saját kockázatára történik. Mivel a folyadékkár utóélete kiszámíthatatlan, beázott telefonok javítására és a beépített alkatrészekre semmilyen garanciát nem vállalunk, még akkor sem, ha a telefon a szervizből kilépve hibátlanul működik.`;

export const SALE_WARRANTY_TERMS = `Garanciális Feltételek és a Javítás Menete

1. A garanciális ügyintézés menete (A 3 lépcsős folyamat)
Adatbiztonság: A telefon behozatala előtt a kliens köteles lementeni a személyes adatait. Az adatok esetleges elvesztéséért felelősséget nem vállalunk.

1. lépcső (Javítás): Vállaljuk, hogy a jogos garanciális hibát a telefon beadásától számított 10 munkanapon belül megpróbáljuk szakszerűen megcsinálni, kiváló minőségű vagy felújított alkatrészekkel.
2. lépcső (Csere): Ha a telefont 10 munkanap alatt nem lehet megjavítani, a kliensnek egy ugyanolyan paraméterekkel rendelkező cserekészüléket adunk.
3. lépcső (Pénzvisszafizetés): Ha a csere nem megoldható (pl. nincs készleten), vagy a hiba a javítás után is visszatér, a vásárló visszakérheti a pénzét. Kisebb esztétikai vagy programhibák miatt a vételár nem kérhető vissza.

2. A garancia NEM érvényes az alábbi esetekre:
Nem rendeltetésszerű használat: Helytelen kezelés vagy nem engedélyezett programok (pl. rootolás, béta rendszerek, nem hivatalos applikációk) telepítése.
Mechanikai sérülések: Leesésből, ütődésből, repedésből vagy egyéb fizikai behatásból eredő károk a házon vagy a képernyőn.
Külső tényezők: Folyadék, pára, nedvesség, por vagy egyéb idegen anyag okozta meghibásodások (beázás, oxidáció).
Illetéktelen beavatkozás: Bármely más szerviz vagy magánszemély által végzett javítás, szétszerelés vagy módosítás.
Szoftveres hibák: A vásárlás utáni frissítések vagy szoftveres módosítások miatt fellépő hibák.
Természetes elhasználódás: A telefon normál használatából eredő kopása (pl. karcolások, képernyő beégése, gombok vagy csatlakozók kopása).
Rossz tartozékok: Nem gyári, vagy gyenge minőségű töltők, kábelek és kiegészítők használatából adódó hibák.

3. Speciális szabályok az AKKUMULÁTORRA
Normál elhasználódás (Nem garanciális): Az akku fogyóeszköz. Kapacitásának természetes csökkenése (pl. ha a napi használat során az életereje 80% alá esik) nem számít garanciális hibának.
Garanciális csere (Kizárólag gyári hiba esetén): Az akkut csak igazolt gyári vagy technikai hiba esetén cseréljük (pl. ha megdagadt/felfúvódott, belső zárlatos, vagy a telefon váratlanul kikapcsol 30-40%-os töltöttségnél).

4. Speciális szabályok a fiókokra (iCloud / Google blokkolás)
Fiók- és jelszó problémák: A garancia csak a telefon gyári és hardveres működésére érvényes. Nem vállalunk garanciát arra, ha a kliens az első beállítás vagy az iCloud / Google-fiók regisztráció során elfelejti a jelszavait, rosszul állítja be a fiókját, és emiatt a telefon blokkolja magát (Activation Lock / FRP). Ezek a felhasználói szoftverhibák nem tartoznak a garanciába, így csere vagy pénzvisszafizetés sem kérhető értük.`;

// warranty strings look like "1 hó" / "3 hó" / "6 hó" / "1 év"
export function warrantyExpiry(fromDateStr, warranty) {
  if (!fromDateStr || !warranty) return null;
  const m = warranty.match(/^(\d+)\s*(hó|év)$/);
  if (!m) return null;
  const n = Number(m[1]);
  const d = new Date(fromDateStr + "T00:00:00");
  if (m[2] === "hó") d.setMonth(d.getMonth() + n);
  else d.setFullYear(d.getFullYear() + n);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}
export function isWarrantyActive(fromDateStr, warranty) {
  const exp = warrantyExpiry(fromDateStr, warranty);
  if (!exp) return false;
  return exp >= today();
}

// Az elmúlt "görgő hét" kezdete úgy, hogy pontosan 7 nyitvatartási (nem vasárnapi)
// nap essen bele — ha vasárnap közbeesik, a kezdet eggyel korábbra tolódik, hogy
// a zárva tartás ne rontsa le a heti "kiadva" számot.
export function rollingBusinessWeekStart(days = 7) {
  let d = new Date(today() + "T00:00:00Z");
  let counted = 0;
  while (counted < days) {
    if (d.getUTCDay() !== 0) counted++;
    if (counted < days) d.setUTCDate(d.getUTCDate() - 1);
  }
  return d.toISOString().slice(0, 10);
}

export function startOfWeek(d) {
  // UTC-ban számol (nem helyi idő), hogy a toISOString()-es visszaalakítás
  // ne csússzon egy nappal pozitív időzóna-eltolásnál (pl. Románia UTC+2/+3).
  const date = new Date(d + "T00:00:00Z");
  const day = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
}
export function periodLabel(key, period) {
  if (period === "year") return key; // "2024", "2025" — nem kell bonyolítani
  if (period === "month") {
    const d = new Date(key + "-01T00:00:00");
    return d.toLocaleDateString("hu-HU", { year: "numeric", month: "long" });
  }
  if (period === "week") {
    const start = new Date(key + "T00:00:00");
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString("hu-HU", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("hu-HU", { month: "short", day: "numeric" })}`;
  }
  const todayStr = today();
  if (key === todayStr) return "Ma";
  const yesterday = new Date(todayStr + "T00:00:00Z");
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  if (key === yesterday.toISOString().slice(0, 10)) return "Tegnap";
  const d = new Date(key + "T00:00:00");
  return d.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
}

// Öregedő ("telescoping") csoportosítás: a folyamatban lévő hét napi bontásban,
// az idei hónap heti bontásban, az idei év havi bontásban, a korábbi évek évenként —
// így a lista sosem "kurva sok sor", csak a friss adat van részletezve.
export function adaptivePeriodBucket(dateStr) {
  const todayStr = today();
  const curWeekStart = startOfWeek(todayStr);
  const curMonthStart = todayStr.slice(0, 7) + "-01";
  const curYearStart = todayStr.slice(0, 4) + "-01-01";
  if (dateStr >= curWeekStart) return { key: dateStr, granularity: "day" };
  if (dateStr >= curMonthStart) return { key: startOfWeek(dateStr), granularity: "week" };
  if (dateStr >= curYearStart) return { key: dateStr.slice(0, 7), granularity: "month" };
  return { key: dateStr.slice(0, 4), granularity: "year" };
}
