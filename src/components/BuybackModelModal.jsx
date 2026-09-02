import { useState } from "react";
import { CloseIcon } from "./icons";
import BrandField from "./BrandField";

export default function BuybackModelModal({ model, onClose, onSave, busy }) {
  const isEdit = !!model;
  const [f, setF] = useState({
    brand: model?.brand || "",
    model: model?.model || "",
    storage: model?.storage || "",
    basePrice: model?.basePrice ?? "",
    active: model?.active !== false,
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.brand.trim() && f.model.trim() && f.basePrice !== "";
  return (
    <div className="overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? "Modell szerkesztése" : "Új felvásárlási modell"} <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        <div className="row2">
          <BrandField value={f.brand} onChange={(v) => setF({ ...f, brand: v })} />
          <div className="field"><label>Modell</label><input value={f.model} onChange={set("model")} placeholder="iPhone 12" /></div>
        </div>
        <div className="row2">
          <div className="field"><label>Tárhely</label><input value={f.storage} onChange={set("storage")} placeholder="64GB (opcionális)" /></div>
          <div className="field"><label>Alapár (Lei)</label><input type="number" value={f.basePrice} onChange={set("basePrice")} placeholder="0" /></div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "#374151", margin: "2px 0 4px" }}>
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
          Aktív (megjelenik a nyilvános /eladom oldalon)
        </label>
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!valid || busy} onClick={() => valid && onSave({ ...f, basePrice: Number(f.basePrice) || 0 })}>{busy ? "Mentés..." : isEdit ? "Mentés" : "Hozzáadás"}</button>
        </div>
      </div>
    </div>
  );
}
