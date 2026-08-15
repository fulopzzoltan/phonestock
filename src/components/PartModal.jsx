import { useState } from "react";
import { CloseIcon } from "./icons";
import { PART_CATEGORIES, PART_ORIGINS } from "../lib/utils";

export default function PartModal({ part, prefill, onClose, onSave, busy }) {
  const isEdit = !!part;
  const [f, setF] = useState({
    name: part?.name || "",
    category: part?.category || PART_CATEGORIES[0],
    brand: part?.brand || "",
    modelFit: part?.modelFit || "",
    quantity: part?.quantity ?? "",
    costPrice: part?.costPrice ?? prefill?.costPrice ?? "",
    source: part?.source || prefill?.source || "",
    origin: part?.origin || "",
    supplierSku: part?.supplierSku || "",
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.name.trim() && f.quantity !== "";
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? "Alkatrész szerkesztése" : "Új alkatrész"} <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        <div className="field"><label>Kategória</label>
          <select value={f.category} onChange={set("category")}>
            {PART_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="Egyéb">Egyéb</option>
          </select>
        </div>
        <div className="field"><label>Megnevezés</label><input value={f.name} onChange={set("name")} placeholder="Kijelző, akku..." /></div>
        <div className="row2">
          <div className="field"><label>Márka</label><input value={f.brand} onChange={set("brand")} placeholder="Apple" /></div>
          <div className="field"><label>Mire illik</label><input value={f.modelFit} onChange={set("modelFit")} placeholder="iPhone 12, 13" /></div>
        </div>
        <div className="row3">
          <div className="field"><label>Mennyiség</label><input type="number" value={f.quantity} onChange={set("quantity")} placeholder="0" /></div>
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
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!valid || busy} onClick={() => valid && onSave(f)}>{busy ? "Mentés..." : isEdit ? "Mentés" : "Hozzáadás"}</button>
        </div>
      </div>
    </div>
  );
}
