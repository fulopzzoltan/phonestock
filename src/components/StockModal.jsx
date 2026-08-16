import { useState } from "react";
import LocationField from "./LocationField";
import { CloseIcon } from "./icons";
import { WARRANTIES, SOURCES, STOCK_STATUSES, CONDITION_GRADES, conditionGradeKey } from "../lib/utils";

export default function StockModal({ product, prefill, locations, onClose, onSave, busy, defaultLocId }) {
  const isEdit = !!product;
  const [f, setF] = useState({
    brand: product?.brand || "",
    model: product?.model || "",
    condition: product?.condition || "New",
    grade: product?.grade || "A",
    storage: product?.storage || "",
    color: product?.color || "",
    imei: product?.imei || "",
    costPrice: product?.costPrice ?? prefill?.costPrice ?? "",
    salePrice: product?.salePrice ?? "",
    warranty: product?.warranty || "",
    source: product?.source || "",
    batteryHealth: product?.batteryHealth ?? "",
    newPrice: product?.newPrice ?? "",
    stockStatus: product?.stockStatus || "polcon",
  });
  const [locId, setLocId] = useState(product?.locationId || prefill?.locationId || defaultLocId || locations[0]?.id || "");
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
        <div className="field"><label>Állapot</label>
          <select
            value={conditionGradeKey(f.condition, f.grade)}
            onChange={(e) => {
              const key = e.target.value;
              setF(key === "New" ? { ...f, condition: "New", grade: "" } : { ...f, condition: "Refurbished", grade: key });
            }}
          >
            {CONDITION_GRADES.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
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
        <div className="field">
          <label>Becsült új kori ár (Lei) <span style={{ color: "#9CA3AF", fontWeight: 400 }}>— opcionális, a vitrinen áthúzva jelenik meg</span></label>
          <input type="number" value={f.newPrice} onChange={set("newPrice")} placeholder="pl. 2500" />
        </div>
        <div className="row2">
          <div className="field"><label>Garancia</label>
            <select value={f.warranty} onChange={set("warranty")}>
              <option value="">Nincs</option>
              {WARRANTIES.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div className="field"><label>Forrás</label>
            <select value={f.source} onChange={set("source")}>
              <option value="">—</option>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {f.condition === "Refurbished" && (
          <div className="field"><label>Akkuállapot (%)</label><input type="number" min="0" max="100" value={f.batteryHealth} onChange={set("batteryHealth")} placeholder="100" /></div>
        )}
        <div className="field">
          <label>Raktár állapot <span style={{ color: "#9CA3AF", fontWeight: 400 }}>— csak "Polcon" látszik a nyilvános webshopban</span></label>
          <select value={f.stockStatus} onChange={set("stockStatus")}>
            {STOCK_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
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
