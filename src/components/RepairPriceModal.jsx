import { useState } from "react";
import { CloseIcon } from "./icons";
import { WARRANTIES } from "../lib/utils";

export default function RepairPriceModal({ familyLabel, problemLabel, price, onClose, onSave, busy }) {
  const [f, setF] = useState({
    priceOem: price?.priceOem ?? "",
    priceAfter: price?.priceAfter ?? "",
    warranty: price?.warranty || "",
    estMinutes: price?.estMinutes ?? "",
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.priceOem !== "";
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{familyLabel} — {problemLabel} <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        <div className="row2">
          <div className="field"><label>OEM ár (Lei)</label><input type="number" value={f.priceOem} onChange={set("priceOem")} placeholder="0" /></div>
          <div className="field"><label>Utángyártott ár (Lei)</label><input type="number" value={f.priceAfter} onChange={set("priceAfter")} placeholder="opcionális" /></div>
        </div>
        <div className="row2">
          <div className="field"><label>Garancia</label>
            <select value={f.warranty} onChange={set("warranty")}>
              <option value="">—</option>
              {WARRANTIES.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div className="field"><label>Becsült idő (perc)</label><input type="number" value={f.estMinutes} onChange={set("estMinutes")} placeholder="45" /></div>
        </div>
        <div className="field-hint" style={{ marginBottom: 10 }}>Az OEM ár kötelező ahhoz, hogy megjelenjen a publikus árbecslőn — az utángyártott ár, garancia és idő opcionális.</div>
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!valid || busy} onClick={() => valid && onSave({
            priceOem: Number(f.priceOem),
            priceAfter: f.priceAfter === "" ? null : Number(f.priceAfter),
            warranty: f.warranty || null,
            estMinutes: f.estMinutes === "" ? null : Number(f.estMinutes),
          })}>{busy ? "Mentés..." : "Mentés"}</button>
        </div>
      </div>
    </div>
  );
}
