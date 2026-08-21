// A pdfjs-dist (és a ~1.2MB-os worker fájlja) csak akkor töltődik be, amikor ténylegesen
// PDF-et importálnak — nem terheli feleslegesen az admin-felület vagy a publikus oldalak
// első betöltését, amik sosem használják ezt a funkciót.
async function loadPdfjs() {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;
  return pdfjsLib;
}

export async function extractPdfText(file) {
  const pdfjsLib = await loadPdfjs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Sorokba csoportosítás y-koordináta alapján — a PDF szöveg-réteg nem ad kész sorokat,
    // csak pozicionált glyph-futásokat. Kis tűréssel (±2px) csoportosítunk, mert a valós
    // baseline-ok nem mindig esnek pontosan egy egész pixelre.
    const buckets = [];
    content.items.forEach((item) => {
      const y = item.transform[5];
      let bucket = buckets.find((b) => Math.abs(b.y - y) <= 2);
      if (!bucket) { bucket = { y, items: [] }; buckets.push(bucket); }
      bucket.items.push(item);
    });
    buckets.sort((a, b) => b.y - a.y);
    buckets.forEach((b) => {
      const line = b.items.sort((x, y) => x.transform[4] - y.transform[4]).map((it) => it.str).join(" ");
      fullText += line + "\n";
    });
  }
  return fullText;
}

// Román számformátum: a GSMnet pontot használ tizedesként ("11.56"), a SEP vesszőt ("111,57").
// Mindkettőt kezelnünk kell.
export function parseRoNumber(str) {
  if (!str) return 0;
  const s = str.trim();
  if (/,\d{1,2}$/.test(s)) return Number(s.replace(/\./g, "").replace(",", ".")) || 0;
  return Number(s.replace(/,/g, "")) || 0;
}

export function roundUp(n) {
  return Math.ceil(Number(n) || 0);
}

const SHIPPING_WORDS = ["transport", "livrare", "courier", "curier", "fan courier"];
const CASE_WORDS = ["husa", "tok pentru", " case ", "cover"];
// Fontos: a "Fólia" kategóriát a "Kijelző" elé kell tenni, mert egy kijelzővédő fólia
// leírása ("folie protectie display") a "display" szót is tartalmazza — ha a Kijelző
// kerülne előbb ellenőrzésre, a fólia tévesen kijelzőnek classifikálódna.
const CATEGORY_WORDS = [
  { category: "Fólia", words: ["folie", "sticla", "protectie display", "fólia"] },
  { category: "Kijelző", words: ["display", "ecran", "lcd", "kijelző", "kijelzo"] },
  { category: "Akkumulátor", words: ["baterie", "acumulator", "battery", "akkumulátor", "akku"] },
  { category: "Hátlap", words: ["capac spate", "hátlap", "back cover", "husa spate"] },
  { category: "Csatlakozó", words: ["conector", "mufa incarcare", "charging port", "csatlakozó"] },
];

// Visszaad: { kind: "part" | "expense", category, confident, reason }
// FONTOS: ha semmi nem illik rá biztosan (se szállítás, se tok, se kategória-kulcsszó),
// a biztonságos alapértelmezés "csak kiadás", NEM alkatrész — mert egy rosszul felismert
// tétel (pl. egy telefon, ami nem alkatrész) nem kerülhet be tévesen a raktárba. Ilyenkor
// a sor "confident: false" jelzést kap, a felhasználói felületen ki kell emelni, hogy nézze át.
// Telefont a rendszer NEM próbál automatikusan felismerni (ez túl bizonytalan lenne kulcsszó
// alapján) — azt a felhasználó a review-táblán választja ki kézzel, ld. 5. pont "Típus" oszlop.
export function classifyLine(description) {
  const d = (description || "").toLowerCase();
  if (SHIPPING_WORDS.some((w) => d.includes(w))) return { kind: "expense", category: null, confident: true, reason: "szállítás" };
  if (CASE_WORDS.some((w) => d.includes(w))) return { kind: "expense", category: null, confident: true, reason: "tok/tartozék" };
  const match = CATEGORY_WORDS.find((c) => c.words.some((w) => d.includes(w)));
  if (match) return { kind: "part", category: match.category, confident: true, reason: match.category };
  return { kind: "expense", category: null, confident: false, reason: "nem ismert fel egyértelműen" };
}

export function detectSupplier(text) {
  const t = text.toLowerCase();
  if (t.includes("gsmnet") || t.includes("mobiparts")) return "GSMnet";
  if (t.includes("sep mobile") || t.includes("serie factura: spm")) return "SEP";
  return null;
}

// GSMnet: egy tételsor mindent egy sorban tartalmaz — "{crt} {leírás} buc. {db} {egységár} {érték fara TVA} {TVA}".
// A leírást esetenként egy termékkód-sor követi külön sorban (pl. "351350") — ezt egyszerűen
// figyelmen kívül hagyjuk, nem tartozik egyik tételhez sem.
export function parseGsmnet(text) {
  const rows = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const rowRe = /^\d+\s+(.+?)\s+buc\.?\s+(\d+)\s+[\d.,]+\s+([\d.,]+)\s+([\d.,]+)\s*$/i;
  for (const line of lines) {
    const m = line.match(rowRe);
    if (!m) continue;
    const [, descriptionRaw, qtyRaw, faraTvaRaw, tvaRaw] = m;
    const description = descriptionRaw.replace(/[\s-]+$/, "").trim();
    const qty = Number(qtyRaw) || 1;
    const gross = parseRoNumber(faraTvaRaw) + parseRoNumber(tvaRaw);
    rows.push({ description, qty, grossTotal: gross });
  }
  return rows;
}

// SEP: "{crt}? {leírás} {db|-} {egységár|-} {érték Lei} {érték TVA}" — a Transport sornak nincs crt/db/egységár.
export function parseSep(text) {
  const rows = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const rowRe = /^(?:(\d+)\s+)?(.+?)\s+(-|\d+)\s+(-|[\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s*$/;
  for (const line of lines) {
    const m = line.match(rowRe);
    if (!m) continue;
    const [, , description, qtyRaw, , valoareLei, valoareTva] = m;
    // A számlán van egy rejtett oszlop-index sor ("0 1 2 3 4 5"), ami a mintázatra illik,
    // de nem valódi tétel — a leírása pusztán egy szám lenne, ezt kiszűrjük.
    if (/^\d+$/.test(description.trim())) continue;
    const qty = qtyRaw === "-" ? 1 : Number(qtyRaw) || 1;
    const gross = parseRoNumber(valoareLei) + parseRoNumber(valoareTva);
    rows.push({ description: description.trim(), qty, grossTotal: gross });
  }
  return rows;
}

// Egy sorból a végleges, kerekített review-sort építi.
export function buildReviewRow(raw, supplier) {
  const unitPrice = roundUp(raw.grossTotal / raw.qty);
  const cls = classifyLine(raw.description);
  return {
    name: raw.description,
    qty: raw.qty,
    unitPrice,
    lineTotal: unitPrice * raw.qty,
    kind: cls.kind, // "part" | "expense" | (kézzel átállítható "phone"-ra is a review-táblán)
    category: cls.category || "Egyéb",
    confident: cls.confident,
    supplier,
  };
}
