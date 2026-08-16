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
    setRows((rs) => [...(rs || []), { name: "", qty: 1, unitPrice: 0, lineTotal: 0, kind: "part", category: "Egyéb", confident: true, supplier }]);
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
                        <select value={r.kind} onChange={(e) => updateRow(i, { kind: e.target.value })}>
                          <option value="part">Alkatrész</option>
                          <option value="phone">Telefon</option>
                          <option value="expense">Csak kiadás</option>
                        </select>
                      </td>
                      <td>
                        {r.kind === "part" ? (
                          <select value={r.category} onChange={(e) => updateRow(i, { category: e.target.value })}>
                            {PART_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            <option value="Egyéb">Egyéb</option>
                          </select>
                        ) : r.kind === "phone" ? (
                          <span style={{ fontSize: 11, color: "#9CA3AF" }}>Rögzítéskor kérjük a részleteket</span>
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
