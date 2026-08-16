# TASKS — Alkatrész-rendelés felvétele PDF számlából

## 0. Amit kaptál teszteléshez

Két valódi számlát mentettem a repóba teszt-fixture-ként (a felhasználó töltötte fel példaként), hogy a PDF-feldolgozó kódot ezekkel lehessen tesztelni/debugolni, ne találgatva:

- `dev-fixtures/rendeles-pdf-pelda/gsmnet-pelda.pdf` — GSMnet/MobiParts számla (`Factura MOB 2599605`)
- `dev-fixtures/rendeles-pdf-pelda/sep-pelda.pdf` — SEP Mobile számla (`Factura SPM 6033-0209`)

Ezeket kézzel is kiolvastam, az elvárt végeredmény a 6. pontban van — ezzel ellenőrizhető, hogy a parser jól működik-e, mielőtt élesben használnánk.

**Fontos üzleti szabály, amit a tulajdonos adott meg:** az árakból mindig lefelé/felfelé nem "bani" (fillér) marad — **mindig felfelé kerekítünk egész Lei-re**, minden tételnél (alkatrész egységár és a nem-alkatrész sorok is). Emiatt a rögzített összeg pár Lei-vel eltérhet a számla tényleges végösszegétől — ez szándékos, nem hiba. A review-táblán legyen egy rövid megjegyzés erről, hogy ne tűnjön hibának később.

---

## 1. Új dependency: `pdfjs-dist`

```
npm install pdfjs-dist
```
Ez teszi lehetővé a PDF szöveges tartalmának kliens-oldali kiolvasását böngészőben (az app tisztán Vite+React SPA, nincs saját backend — ld. `CLAUDE.md` — szóval ennek a böngészőben kell futnia, nem szerver oldalon).

---

## 2. PDF-szöveg kiolvasása — `src/lib/pdfOrderParser.js` (új fájl)

```js
import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;
// FONTOS: a worker fájl pontos neve pdfjs-dist verziójától függ (lehet .mjs vagy .js) —
// telepítés után ellenőrizd a node_modules/pdfjs-dist/build/ tartalmát, és ha eltér, igazítsd a fenti sort.

export async function extractPdfText(file) {
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
```

---

## 3. Sor-osztályozás (alkatrész vagy csak kiadás) — ugyanebbe a fájlba

```js
const SHIPPING_WORDS = ["transport", "livrare", "courier", "curier", "fan courier"];
const CASE_WORDS = ["husa", "tok pentru", " case ", "cover"];
const CATEGORY_WORDS = [
  { category: "Kijelző", words: ["display", "ecran", "lcd", "kijelző", "kijelzo"] },
  { category: "Akkumulátor", words: ["baterie", "acumulator", "battery", "akkumulátor", "akku"] },
  { category: "Hátlap", words: ["capac spate", "hátlap", "back cover", "husa spate"] },
  { category: "Csatlakozó", words: ["conector", "mufa incarcare", "charging port", "csatlakozó"] },
  { category: "Fólia", words: ["folie", "sticla", "protectie display", "fólia"] },
];

// Visszaad: { isPart, category, confident, reason }
// FONTOS: ha semmi nem illik rá biztosan (se szállítás, se tok, se kategória-kulcsszó),
// a biztonságos alapértelmezés "csak kiadás", NEM alkatrész — mert egy rosszul felismert
// tétel (pl. egy telefon, ami nem alkatrész) nem kerülhet be tévesen a raktárba. Ilyenkor
// a sor "confident: false" jelzést kap, a felhasználói felületen ki kell emelni, hogy nézze át.
export function classifyLine(description) {
  const d = (description || "").toLowerCase();
  if (SHIPPING_WORDS.some((w) => d.includes(w))) return { isPart: false, category: null, confident: true, reason: "szállítás" };
  if (CASE_WORDS.some((w) => d.includes(w))) return { isPart: false, category: null, confident: true, reason: "tok/tartozék" };
  const match = CATEGORY_WORDS.find((c) => c.words.some((w) => d.includes(w)));
  if (match) return { isPart: true, category: match.category, confident: true, reason: match.category };
  return { isPart: false, category: null, confident: false, reason: "nem ismert fel egyértelműen" };
}
```

---

## 4. Szállító-specifikus sor-kinyerés — ugyanebbe a fájlba

Ez a rész a leginkább próba-hibával finomítandó a valódi PDF-eken (0. pont) — a lenti reguláris kifejezések a két minta pontos szövegére vannak illesztve, de a pdf.js sortördelése kismértékben eltérhet. **Teszteld a `dev-fixtures/rendeles-pdf-pelda/` mindkét fájlján, és hasonlítsd össze a 6. pont elvárt eredményével, mielőtt továbblépsz.**

```js
export function detectSupplier(text) {
  const t = text.toLowerCase();
  if (t.includes("gsmnet") || t.includes("mobiparts")) return "GSMnet";
  if (t.includes("sep mobile") || t.includes("serie factura: spm")) return "SEP";
  return null;
}

// GSMnet: számozott sorok, a leírás (esetenként több sorban) után egy "buc. {db} {egységár} {összeg fara TVA} {TVA}" adatsor jön.
export function parseGsmnet(text) {
  const rows = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let current = null;
  const dataLineRe = /^buc\.?\s+(\d+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s*$/i;
  const startLineRe = /^(\d+)\s+(.+)$/;
  for (const line of lines) {
    const dataMatch = line.match(dataLineRe);
    if (dataMatch && current) {
      const qty = Number(dataMatch[1]) || 1;
      const faraTva = parseRoNumber(dataMatch[3]);
      const tva = parseRoNumber(dataMatch[4]);
      const gross = faraTva + tva;
      rows.push({ description: current.trim(), qty, grossTotal: gross });
      current = null;
      continue;
    }
    const startMatch = line.match(startLineRe);
    if (startMatch && !current) {
      current = startMatch[2];
    } else if (current && !line.match(/^(Garantie|EAN:)/i)) {
      // több-soros leírás folytatása (kihagyva a Garancia/EAN metaadat-sorokat)
    }
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
    isPart: cls.isPart,
    category: cls.category || "Egyéb",
    confident: cls.confident,
    supplier,
  };
}
```

---

## 5. Új modal: `src/components/PdfOrderImportModal.jsx`

```jsx
import { useState } from "react";
import { CloseIcon } from "./icons";
import { PART_CATEGORIES, PAYMENTS, money } from "../lib/utils";
import LocationField from "./LocationField";
import { extractPdfText, detectSupplier, parseGsmnet, parseSep, buildReviewRow } from "../lib/pdfOrderParser";

export default function PdfOrderImportModal({ locations, defaultLocId, busy, onClose, onImport }) {
  const [rows, setRows] = useState(null); // null amíg nincs feltöltve fájl
  const [supplier, setSupplier] = useState("");
  const [parseError, setParseError] = useState("");
  const [payment, setPayment] = useState("Készpénz");
  const [locId, setLocId] = useState(defaultLocId || locations[0]?.id || "");

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setParseError("");
    try {
      const text = await extractPdfText(file);
      const sup = detectSupplier(text);
      setSupplier(sup || "");
      const rawRows = sup === "GSMnet" ? parseGsmnet(text) : sup === "SEP" ? parseSep(text) : [];
      if (rawRows.length === 0) {
        setParseError(sup ? "Nem sikerült sorokat kiolvasni a számláról — vedd fel kézzel a tételeket." : "Ismeretlen számla-formátum — vedd fel kézzel a tételeket.");
      }
      setRows(rawRows.map((r) => buildReviewRow(r, sup || "")));
    } catch (err) {
      setParseError("Nem sikerült beolvasni a PDF-et: " + err.message);
      setRows([]);
    }
  }

  function updateRow(i, patch) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeRow(i) {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
  }
  function addManualRow() {
    setRows((rs) => [...(rs || []), { name: "", qty: 1, unitPrice: 0, lineTotal: 0, isPart: true, category: "Egyéb", confident: true, supplier }]);
  }

  const total = (rows || []).reduce((s, r) => s + (Number(r.lineTotal) || 0), 0);
  const valid = rows && rows.length > 0 && rows.every((r) => r.name.trim() && r.qty > 0 && r.unitPrice >= 0);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 780 }} onClick={(e) => e.stopPropagation()}>
        <h2>Rendelés felvétele PDF számlából <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>

        {rows === null && (
          <div className="field">
            <label>Számla PDF</label>
            <input type="file" accept="application/pdf" onChange={handleFile} />
          </div>
        )}

        {parseError && <div className="errbar">{parseError}</div>}

        {rows !== null && (
          <>
            <div style={{ fontSize: 11.5, color: "#9CA3AF", marginBottom: 10 }}>
              Minden ár egész Lei-re felfelé kerekítve — az összeg emiatt pár Lei-vel eltérhet a számla végösszegétől, ez szándékos.
            </div>
            <div className="tw" style={{ marginBottom: 10 }}>
              <table>
                <thead><tr><th>Megnevezés</th><th>Db</th><th>Egységár</th><th>Típus</th><th>Kategória</th><th>Sor össz.</th><th></th></tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={!r.confident ? { background: "var(--warning-soft)" } : undefined}>
                      <td>
                        <input value={r.name} onChange={(e) => updateRow(i, { name: e.target.value })} style={{ width: "100%" }} />
                        {!r.confident && <div style={{ fontSize: 10, color: "var(--warning-ink)", fontWeight: 600, marginTop: 2 }}>Nem ismerte fel egyértelműen — ellenőrizd!</div>}
                      </td>
                      <td><input type="number" min="1" value={r.qty} onChange={(e) => { const qty = Number(e.target.value) || 1; updateRow(i, { qty, lineTotal: qty * r.unitPrice }); }} style={{ width: 50 }} /></td>
                      <td><input type="number" min="0" value={r.unitPrice} onChange={(e) => { const unitPrice = Number(e.target.value) || 0; updateRow(i, { unitPrice, lineTotal: r.qty * unitPrice }); }} style={{ width: 70 }} /></td>
                      <td>
                        <select value={r.isPart ? "part" : "expense"} onChange={(e) => updateRow(i, { isPart: e.target.value === "part" })}>
                          <option value="part">Alkatrész</option>
                          <option value="expense">Csak kiadás</option>
                        </select>
                      </td>
                      <td>
                        {r.isPart ? (
                          <select value={r.category} onChange={(e) => updateRow(i, { category: e.target.value })}>
                            {PART_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            <option value="Egyéb">Egyéb</option>
                          </select>
                        ) : "—"}
                      </td>
                      <td className="mono" style={{ fontWeight: 700 }}>{money(r.lineTotal)}</td>
                      <td><button type="button" className="iconbtn" onClick={() => removeRow(i)}><CloseIcon width={14} height={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="btn sec sm" onClick={addManualRow} style={{ marginBottom: 14 }}>+ Sor hozzáadása</button>

            <div className="row3">
              <div className="field"><label>Forrás</label><input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="SEP, GSMNet..." /></div>
              <LocationField locations={locations} value={locId} onChange={setLocId} />
              <div className="field"><label>Fizetés</label>
                <div className="seg">{PAYMENTS.map((p) => <button key={p} type="button" className={payment === p ? "active" : ""} onClick={() => setPayment(p)}>{p}</button>)}</div>
              </div>
            </div>

            <div style={{ textAlign: "right", fontWeight: 700, fontSize: 14, color: "#B91C1C", margin: "10px 0" }}>Összesen: -{money(total)}</div>
          </>
        )}

        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          {rows !== null && (
            <button className="btn" disabled={!valid || busy} onClick={() => onImport(rows, supplier, payment, locId)}>{busy ? "Rögzítés..." : "Rögzítés"}</button>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 6. Belépési pont és rögzítő logika

**a) `src/tabs/PartsTab.jsx`** — a topbar "+ Új alkatrész" gombja mellé (40–43. sor):
```jsx
<button className="btn sec" disabled={busy} onClick={() => setPdfImportModal(true)}>+ Rendelés PDF-ből</button>
```
Új prop: `setPdfImportModal`.

**b) `src/App.jsx`** — új state, handler és render:
```js
const [pdfImportModal, setPdfImportModal] = useState(false);

async function importPdfOrder(rows, supplier, payment, locId) {
  const basketId = rows.length > 1 ? crypto.randomUUID() : null;
  for (const row of rows) {
    if (row.isPart) {
      await addPart({ name: row.name, category: row.category, quantity: row.qty, costPrice: row.unitPrice, source: supplier, brand: "", modelFit: "", origin: "", supplierSku: "" });
    }
    await addTransaction({ type: "expense", category: "Készlet", description: row.name, amount: row.lineTotal, costPrice: 0, payment, basketId }, locId);
  }
  setPdfImportModal(false);
}
```
(Az `addPart` és `addTransaction` már léteznek — 443. és 713. sor körül —, mindkettő saját `withBusy`-t és state-frissítést csinál, ezért egyszerű ciklusban meghívhatók, ugyanúgy, ahogy a meglévő `checkoutBasket` is teszi a 743–755. sorok között.)

Render (a `PartModal` renderelése mellé):
```jsx
{pdfImportModal && (
  <PdfOrderImportModal
    locations={allowedLocations}
    defaultLocId={defaultLocId}
    busy={busy}
    onClose={() => setPdfImportModal(false)}
    onImport={importPdfOrder}
  />
)}
```
Import: `import PdfOrderImportModal from "./components/PdfOrderImportModal";`

Az így létrejövő tranzakciók automatikusan egy "Blokk"-ként jelennek meg a Bevételek & Kiadások fülön (`TransactionsPeriodList.jsx` már kezeli a `basketId`-t — ehhez nem kell semmit módosítani, ez már megvan).

---

## 7. Elvárt eredmény a két teszt-fájlon (0. pont) — ezzel ellenőrizd a parsert

**`gsmnet-pelda.pdf`** (mindhárom sor "tok" vagy "szállítás", tehát **egyik sem** kerül fel alkatrésznek — ez helyes, nem hiba):
| Megnevezés | Db | Egységár | Típus | Sor össz. |
|---|---|---|---|---|
| Husa pentru Xiaomi Poco C65... | 1 | 14 | Csak kiadás (tok) | -14 |
| Husa pentru Oppo A6 Pro... | 1 | 24 | Csak kiadás (tok) | -24 |
| 14.99 Lei - Fan Courier - Livrare la Adresa | 1 | 15 | Csak kiadás (szállítás) | -15 |

Összesen: -53 Lei (a valós számlaösszeg 52.97 — a kerekítés miatti eltérés rendben van).

**`sep-pelda.pdf`**:
| Megnevezés | Db | Egységár | Típus | Sor össz. |
|---|---|---|---|---|
| PHILIPS E171 | 2 | 135 | Csak kiadás — **nem ismeri fel egyértelműen** (ez valójában egy telefon, nem alkatrész — helyesen kell, hogy sárgán kiemelje "ellenőrizd" jelzéssel) | -270 |
| Folie protectie display sticla Privacy | 4 | 14 | Alkatrész — Fólia | -56 |
| Transport | 1 | 20 | Csak kiadás (szállítás) | -20 |

Összesen: -346 Lei (valós: 345.60). A "Folie..." sor mentése után egy új alkatrész jön létre 4 db készlettel, 14 Lei/db beérkezési árral, "SEP" forrással.

Ha a parser ezekhez közeli eredményt ad (a leírás-szöveg pontos tördelése eltérhet, de a db/ár/típus stimmeljen), jónak tekinthető.

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes, a pdfjs worker helyesen betöltődik (nincs konzol-hiba PDF feltöltéskor)
- Mindkét teszt-PDF-en a 7. pontban leírtakhoz közeli eredmény jön ki
- A "PHILIPS E171" sor (vagy bármi, amit a rendszer nem ismer fel biztosan) sárgán kiemelve, "ellenőrizd" felirattal jelenik meg, és alapból **nem** alkatrészként van beállítva
- "tok"/"husa" szavas sorok alapból "Csak kiadás"-ként vannak jelölve, nem kerülnek fel alkatrésznek
- Rögzítés után: az alkatrészek felkerülnek az Alkatrészek fülre a megfelelő mennyiséggel és kerekített árral; a Bevételek & Kiadások fülön egy "Blokk"-ként jelenik meg az egész rendelés, minden tétel negatív összeggel, alul az összesített végösszeggel
- Kézzel is fel lehet venni/törölni sort a beolvasás előtt vagy után, ismeretlen számla-formátumnál is használható a funkció (üres táblával indul)
- Nincs `git push`, csak lokális commit — a `dev-fixtures/` mappa is kerüljön be a commitba, hogy tesztelni lehessen vele
