import { useState } from "react";
import LocationField from "./LocationField";
import { CloseIcon } from "./icons";
import { WARRANTIES } from "../lib/utils";

export default function StockModal({ product, locations, onClose, onSave, busy, defaultLocId }) {
  const isEdit = !!product;
  const [f, setF] = useState({
    brand: product?.brand || "",
    model: product?.model || "",
    condition: product?.condition || "New",
    grade: product?.grade || "A",
    storage: product?.storage || "",
    color: product?.color || "",
    imei: product?.imei || "",
    costPrice: product?.costPrice ?? "",
    salePrice: product?.salePrice ?? "",
    warranty: product?.warranty || "",
  });
  const [locId, setLocId] = useState(product?.locationId || defaultLocId || locations[0]?.id || "");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.brand.trim() && f.model.trim() && f.salePrice !== "" && locId;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? "Termék szerkesztése" : "Új termék"} <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        <LocationField locations={locations} value={locId} onChange={setLocId} />
        <div className="row2">
          <div className="field"><label>Márka</label><input value={f.brand} onChange={set("brand")} placeholder="Samsung" /></div>
          <div className="field"><label>Modell</label><input value={f.model} onChange={set("model")} placeholder="Galaxy S23" /></div>
        </div>
        <div className="row2">
          <div className="field"><label>Állapot</label>
            <select value={f.condition} onChange={set("condition")}>
              <option value="New">Új</option>
              <option value="Refurbished">Felújított</option>
            </select>
          </div>
          {f.condition === "Refurbished" && (
            <div className="field"><label>Minőség</label>
              <select value={f.grade} onChange={set("grade")}>
                <option value="A">A — kiváló</option>
                <option value="B">B — jó</option>
                <option value="C">C</option>
              </select>
            </div>
          )}
        </div>
        <div className="row2">
          <div className="field"><label>Tárhely</label><input value={f.storage} onChange={set("storage")} placeholder="128GB" /></div>
          <div className="field"><label>Szín</label><input value={f.color} onChange={set("color")} placeholder="Fekete" /></div>
        </div>
        <div className="field"><label>IMEI</label><input value={f.imei} onChange={set("imei")} placeholder="35xxxxxxxxxxxxx" /></div>
        <div className="row2">
          <div className="field"><label>Besz. ár (Lei)</label><input type="number" value={f.costPrice} onChange={set("costPrice")} placeholder="0" /></div>
          <div className="field"><label>Eladási ár (Lei)</label><input type="number" value={f.salePrice} onChange={set("salePrice")} placeholder="0" /></div>
        </div>
        <div className="field"><label>Garancia</label>
          <select value={f.warranty} onChange={set("warranty")}>
            <option value="">Nincs</option>
            {WARRANTIES.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!valid || busy} onClick={() => valid && onSave(f, locId)}>{busy ? "Mentés..." : isEdit ? "Mentés" : "Hozzáadás"}</button>
        </div>
      </div>
    </div>
  );
}
