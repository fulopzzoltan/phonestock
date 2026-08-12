import { useState } from "react";
import { CloseIcon } from "./icons";
import { PAYMENTS } from "../lib/utils";
import CustomerAutocomplete from "./CustomerAutocomplete";

export default function SellModal({ item, locName, customers = [], onClose, onSave, busy }) {
  const [f, setF] = useState({ price: item.salePrice || "", customerName: "", customerPhone: "", customerId: null, payment: "Készpénz", marketingConsent: false });
  const [phoneTouched, setPhoneTouched] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value, ...(k === "customerName" ? { customerId: null } : {}) });
  const valid = f.customerPhone.trim().length > 0;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Eladás rögzítése <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        <div className="field"><label>Helyszín</label><input disabled value={locName(item.locationId)} /></div>
        <div className="field"><label>Termék</label><input disabled value={`${item.brand} ${item.model}`} /></div>
        <div className="field"><label>Garancia</label><input disabled value={item.warranty || "Nincs"} /></div>
        <div className="row2">
          <div className="field"><label>Vevő neve</label>
            <CustomerAutocomplete
              customers={customers}
              name={f.customerName}
              onChangeName={(name) => setF({ ...f, customerName: name, customerId: null })}
              onSelect={(c) => setF({ ...f, customerName: c.name, customerPhone: c.phone || f.customerPhone, customerId: c.id })}
            />
          </div>
          <div className="field">
            <label>Telefonszám *</label>
            <input
              value={f.customerPhone}
              onChange={set("customerPhone")}
              onBlur={() => setPhoneTouched(true)}
              placeholder="07xx xxx xxx"
              style={phoneTouched && !valid ? { borderColor: "#FCA5A5" } : undefined}
            />
          </div>
        </div>
        <div className="row2">
          <div className="field"><label>Eladási ár (Lei)</label><input type="number" value={f.price} onChange={set("price")} /></div>
          <div className="field"><label>Fizetés</label>
            <select value={f.payment} onChange={set("payment")}>
              {PAYMENTS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", fontWeight: 500, textTransform: "none", letterSpacing: 0, cursor: "pointer" }}>
            <input type="checkbox" className="chk" checked={f.marketingConsent} onChange={(e) => setF({ ...f, marketingConsent: e.target.checked })} />
            Hozzájárul, hogy akciókról/emlékeztetőkről SMS-ben értesítsük
          </label>
        </div>
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button
            className="btn"
            disabled={busy || !valid}
            onClick={() => onSave({
              type: "income",
              category: "Készlet",
              description: `${item.brand} ${item.model}`,
              amount: f.price,
              costPrice: item.costPrice,
              warranty: item.warranty || null,
              productId: item.id,
              customerName: f.customerName,
              customerPhone: f.customerPhone,
              customerId: f.customerId,
              payment: f.payment,
              marketingConsent: f.marketingConsent,
            }, item.locationId)}
          >
            {busy ? "Mentés..." : "Rögzítés"}
          </button>
        </div>
      </div>
    </div>
  );
}
