import { useState } from "react";
import { CloseIcon } from "./icons";
import { PAYMENTS } from "../lib/utils";

export default function SellModal({ item, locName, onClose, onSave, busy }) {
  const [f, setF] = useState({ price: item.salePrice || "", customerName: "", customerPhone: "", payment: "Készpénz" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Eladás rögzítése <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        <div className="field"><label>Helyszín</label><input disabled value={locName(item.locationId)} /></div>
        <div className="field"><label>Termék</label><input disabled value={`${item.brand} ${item.model}`} /></div>
        <div className="row2">
          <div className="field"><label>Vevő neve</label><input value={f.customerName} onChange={set("customerName")} placeholder="Kovács János" /></div>
          <div className="field"><label>Telefonszám</label><input value={f.customerPhone} onChange={set("customerPhone")} placeholder="07xx xxx xxx" /></div>
        </div>
        <div className="row2">
          <div className="field"><label>Eladási ár (Lei)</label><input type="number" value={f.price} onChange={set("price")} /></div>
          <div className="field"><label>Fizetés</label>
            <select value={f.payment} onChange={set("payment")}>
              {PAYMENTS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button
            className="btn"
            disabled={busy}
            onClick={() => onSave({
              type: "income",
              category: "Készlet",
              description: `${item.brand} ${item.model}`,
              amount: f.price,
              costPrice: item.costPrice,
              productId: item.id,
              customerName: f.customerName,
              customerPhone: f.customerPhone,
              payment: f.payment,
            }, item.locationId)}
          >
            {busy ? "Mentés..." : "Rögzítés"}
          </button>
        </div>
      </div>
    </div>
  );
}
