import { useState } from "react";
import LocationField from "./LocationField";
import { CloseIcon } from "./icons";
import { CATEGORIES, PAYMENTS, today } from "../lib/utils";

export default function TransactionModal({ tx, locations, defaultLocId, onClose, onSave, busy }) {
  const [f, setF] = useState({
    type: tx.type,
    description: tx.description || "",
    amount: tx.amount ?? "",
    category: tx.category || "Egyéb",
    payment: tx.payment || "Készpénz",
    customerName: tx.customerName || "",
    customerPhone: tx.customerPhone || "",
    costPrice: tx.costPrice ?? "",
    date: tx.date || today(),
  });
  const [locId, setLocId] = useState(tx.locationId || defaultLocId || (locations.length === 1 ? locations[0]?.id : ""));
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.description.trim() && f.amount !== "" && locId;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Tranzakció szerkesztése <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        <div className="row2">
          <div className="field"><label>Típus</label>
            <select value={f.type} onChange={set("type")}>
              <option value="income">Bevétel</option>
              <option value="expense">Kiadás</option>
            </select>
          </div>
          <div className="field"><label>Kategória</label>
            <select value={f.category} onChange={set("category")}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c === "Eszköz" ? "Eszköz (befektetés)" : c}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Leírás</label><input value={f.description} onChange={set("description")} /></div>
        <div className="row3">
          <div className="field"><label>Összeg (Lei)</label><input type="number" value={f.amount} onChange={set("amount")} /></div>
          <div className="field"><label>Fizetés</label>
            <select value={f.payment} onChange={set("payment")}>
              {PAYMENTS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="field"><label>Dátum</label><input type="date" value={f.date} onChange={set("date")} /></div>
        </div>
        {f.type === "income" && (
          <div className="field"><label>Beszerzési ár (Lei)</label><input type="number" value={f.costPrice} onChange={set("costPrice")} placeholder="0" /></div>
        )}
        <div className="row2">
          <div className="field"><label>Vevő neve</label><input value={f.customerName} onChange={set("customerName")} placeholder="Opcionális" /></div>
          <div className="field"><label>Telefonszám</label><input value={f.customerPhone} onChange={set("customerPhone")} placeholder="Opcionális" /></div>
        </div>
        <LocationField locations={locations} value={locId} onChange={setLocId} />
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!valid || busy} onClick={() => valid && onSave({ ...f, productId: tx.productId, costPrice: f.type === "income" ? (f.costPrice || 0) : 0 }, locId)}>{busy ? "Mentés..." : "Mentés"}</button>
        </div>
      </div>
    </div>
  );
}
