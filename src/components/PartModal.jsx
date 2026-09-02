import { useState } from "react";
import { CloseIcon } from "./icons";
import { PART_CATEGORIES, PART_ORIGINS } from "../lib/utils";
import LocationField from "./LocationField";
import BrandField from "./BrandField";

export default function PartModal({ part, prefill, locations = [], defaultLocId, onClose, onSave, busy }) {
  const isEdit = !!part;
  const [f, setF] = useState({
    name: part?.name || "",
    category: part?.category || PART_CATEGORIES[0],
    brand: part?.brand || "",
    modelFit: part?.modelFit || "",
    quantity: "",
    costPrice: part?.costPrice ?? prefill?.costPrice ?? "",
    source: part?.source || prefill?.source || "",
    origin: part?.origin || "",
    supplierSku: part?.supplierSku || "",
    partNo: "",
  });
  const [locId, setLocId] = useState(defaultLocId || "");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const qtyNum = Number(f.quantity) || 0;
  const valid = isEdit ? f.name.trim() : f.name.trim() && f.quantity !== "" && qtyNum >= 1;
  return (
    <div className="overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? "Alkatrész-csoport szerkesztése" : "Új alkatrész"} <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        <div className="field"><label>Kategória</label>
          <select value={f.category} onChange={set("category")}>
            {PART_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="Egyéb">Egyéb</option>
          </select>
        </div>
        <div className="field"><label>Megnevezés</label><input value={f.name} onChange={set("name")} placeholder="Kijelző, akku..." /></div>
        <div className="row2">
          <BrandField value={f.brand} onChange={(v) => setF({ ...f, brand: v })} />
          <div className="field"><label>Mire illik</label><input value={f.modelFit} onChange={set("modelFit")} placeholder="iPhone 12, 13" /></div>
        </div>
        <div className="row3">
          {isEdit ? (
            <div className="field"><label>Raktáron</label><input disabled value={`${part.quantity} db`} /></div>
          ) : (
            <div className="field"><label>Mennyiség</label><input type="number" value={f.quantity} onChange={set("quantity")} placeholder="0" /></div>
          )}
          <div className="field"><label>Beérkezési ár (Lei)</label><input type="number" value={f.costPrice} onChange={set("costPrice")} placeholder="0" /></div>
          <div className="field"><label>Forrás</label><input value={f.source} onChange={set("source")} placeholder="SEP, GSMNet..." /></div>
        </div>
        <div className="row2">
          <div className="field"><label>Eredet</label>
            <select value={f.origin} onChange={set("origin")}>
              <option value="">—</option>
              {PART_ORIGINS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="field"><label>Beszállítói cikkszám</label><input value={f.supplierSku} onChange={set("supplierSku")} placeholder="Opcionális" /></div>
        </div>
        {!isEdit && (
          <>
            {qtyNum > 1 && (
              <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 10 }}>
                {qtyNum} db egyedi tétel jön létre, mindegyik saját sorszámmal — a beszerzés egy összesített Kiadásként kerül könyvelésre.
              </div>
            )}
            {qtyNum === 1 && (
              <div className="field">
                <label>Sorszám (kód) <span style={{ color: "#9CA3AF", fontWeight: 400 }}>— opcionális, üresen hagyva automatikusan a következő szabad szám kerül rá</span></label>
                <input type="number" value={f.partNo} onChange={set("partNo")} placeholder="automatikus" />
              </div>
            )}
            <LocationField locations={locations} value={locId} onChange={setLocId} label="Helyszín (a Kiadás könyveléséhez)" />
          </>
        )}
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!valid || busy} onClick={() => valid && onSave(f, locId)}>{busy ? "Mentés..." : isEdit ? "Mentés" : "Hozzáadás"}</button>
        </div>
      </div>
    </div>
  );
}
