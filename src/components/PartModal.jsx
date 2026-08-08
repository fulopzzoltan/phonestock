import { useState } from "react";
import { CloseIcon } from "./icons";

export default function PartModal({ part, onClose, onSave, busy }) {
  const isEdit = !!part;
  const [f, setF] = useState({
    name: part?.name || "",
    brand: part?.brand || "",
    modelFit: part?.modelFit || "",
    quantity: part?.quantity ?? "",
    costPrice: part?.costPrice ?? "",
    salePrice: part?.salePrice ?? "",
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.name.trim() && f.quantity !== "" && f.salePrice !== "";
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? "Alkatrész szerkesztése" : "Új alkatrész"} <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        <div className="field"><label>Megnevezés</label><input value={f.name} onChange={set("name")} placeholder="Kijelző, akku..." /></div>
        <div className="row2">
          <div className="field"><label>Márka</label><input value={f.brand} onChange={set("brand")} placeholder="Apple" /></div>
          <div className="field"><label>Mire illik</label><input value={f.modelFit} onChange={set("modelFit")} placeholder="iPhone 12, 13" /></div>
        </div>
        <div className="row3">
          <div className="field"><label>Mennyiség</label><input type="number" value={f.quantity} onChange={set("quantity")} placeholder="0" /></div>
          <div className="field"><label>Besz. ár (Lei)</label><input type="number" value={f.costPrice} onChange={set("costPrice")} placeholder="0" /></div>
          <div className="field"><label>Elad. ár (Lei)</label><input type="number" value={f.salePrice} onChange={set("salePrice")} placeholder="0" /></div>
        </div>
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!valid || busy} onClick={() => valid && onSave(f)}>{busy ? "Mentés..." : isEdit ? "Mentés" : "Hozzáadás"}</button>
        </div>
      </div>
    </div>
  );
}
