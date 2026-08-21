export const money = (n) => Math.round(Number(n) || 0).toLocaleString("hu-HU") + " Lei";
// mindig az éles domaint tegyük ügyfélnek küldött linkekbe (SMS, garanciajegy-link),
// sose window.location.origin-t — az localhost lenne, ha valaki fejlesztés közben
// (npm run dev) hoz létre/módosít egy valós tételt, az ügyfél meg nem tudná megnyitni
export const SITE_URL = "https://phonestock-manager.netlify.app";
// ékezetek eltávolítása — SMS-eknél 1 szegmensben (160 karakter) marad az üzenet,
// ékezetekkel a GSM-7 kódolás elesik és 70 karakterenként darabolódik (2x drágább)
export const stripAccents = (str) => (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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

// Rövid, kimondható azonosítók — kategóriánként egy betű, kötőjel nélkül.
// T = Telefon, S(+helyszín) = Szerviz munkalap (pl. SCS235), A = Alkatrész.
// A bizonylatszámhoz (receipt_no) szándékosan nem nyúlunk — az pénzügyi/könyvelési sorszám.
export function phoneCode(productNo) {
  return productNo == null ? null : `T${productNo}`;
}
export function partCode(partNo) {
  return partNo == null ? null : `A${partNo}`;
}
export function normalizeImei(imei) {
  return (imei || "").replace(/\D/g, "");
}
const TICKET_LOCATION_LETTERS = { "Gyimes": "GY", "Szentgyörgy": "CS" };
// locationName = a felvétel (intake) helyszínének neve — ez a munkalap létrehozásakor
// örökre rögzül (intake_location_id), nem változik akkor sem, ha a javítás közben
// másik boltba kerül a telefon (location_id az él, azt mutatja a helyszín-címke).
export function ticketCode(ticketNo, locationName) {
  if (ticketNo == null) return null;
  const letter = TICKET_LOCATION_LETTERS[locationName] || "";
  return `S${letter}${ticketNo}`;
}

// "key" = adatbázisban tárolt érték (ne változtasd, meglévő sorok erre hivatkoznak),
// "label" = amit a kanban/UI mutat — ez bármikor finomítható a key érintése nélkül
export const STATUSES = [
  { key: "Átvett", label: "Átvéve", color: "#F59E0B", cls: "st-beveve" },
  { key: "Javítás alatt", label: "Szerelés alatt", color: "#F97316", cls: "st-javitas" },
  { key: "Minőségellenőrzés", label: "Tesztelés", color: "#0EA5E9", cls: "st-qc" },
  { key: "Átadásra", label: "Átvehető", color: "#22C55E", cls: "st-kesz" },
];
export const statusCls = (s) => STATUSES.find((c) => c.key === s)?.cls || "st-beveve";
export const statusLabel = (s) => STATUSES.find((c) => c.key === s)?.label || s;

// sub_status options available within each main status ("null" entry = plain/no tag)
export const SUB_STATUSES = {
  "Átvett": [
    { key: null, label: "Egyszerű átvétel", cls: "st-beveve" },
    { key: "Garanciális", label: "Garanciális", cls: "st-garancialis" },
    { key: "Alkatrészre vár", label: "Alkatrészre vár", cls: "st-alkatresz" },
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

export const PROBLEM_TAGS = ["LCD", "FRP", "Csatlakozó", "Akku", "Kamera", "Szoftver", "Egyéb"];
export const PART_CATEGORIES = ["Kijelző", "Akkumulátor", "Hátlap", "Csatlakozó", "Fólia"];
export const PART_ORIGINS = ["OEM", "Utángyártott"];
export const WARRANTIES = ["1 hó", "3 hó", "6 hó", "1 év", "2 év"];
export const SOURCES = ["Konszignáció", "Számla"];
export const PAYMENTS = ["Készpénz", "Kártya", "Átutalás"];
export const CATEGORIES = ["Fix", "Készlet", "Marketing", "Eszköz", "Szerviz", "Egyéb"];

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
  { label: "Devia fólia", amount: 49, cost: 10 },
  { label: "MagicBox üvegfólia", amount: 49, cost: 7 },
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
