import { useState } from "react";
import { CloseIcon } from "./icons";

export default function CustomerModal({ customer, onClose, onSave, busy }) {
  const isEdit = !!customer;
  const [f, setF] = useState({
    name: customer?.name || "",
    phone: customer?.phone || "",
    email: customer?.email || "",
    cnp: customer?.cnp || "",
    address: customer?.address || "",
    notes: customer?.notes || "",
    marketingConsent: customer?.marketingConsent || false,
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.name.trim() || f.phone.trim();

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? "Ügyfél szerkesztése" : "Új ügyfél"} <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        <div className="row2">
          <div className="field"><label>Név</label><input value={f.name} onChange={set("name")} placeholder="Kovács János" /></div>
          <div className="field"><label>Telefonszám</label><input value={f.phone} onChange={set("phone")} placeholder="07xx xxx xxx" /></div>
        </div>
        <div className="row2">
          <div className="field"><label>Email</label><input value={f.email} onChange={set("email")} placeholder="Opcionális" /></div>
          <div className="field"><label>CNP</label><input value={f.cnp} onChange={set("cnp")} placeholder="Opcionális" maxLength={13} /></div>
        </div>
        <div className="field"><label>Cím</label><input value={f.address} onChange={set("address")} placeholder="Utca, házszám, város, megye, irányítószám" /></div>
        <div className="field"><label>Jegyzet</label>
          <textarea
            value={f.notes}
            onChange={(e) => setF({ ...f, notes: e.target.value })}
            placeholder="Pl. nehezen elérhető, visszatérő reklamáció, kedvezményes ügyfél..."
            style={{ width: "100%", minHeight: 64, background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 9, padding: "9px 10px", fontFamily: "inherit", fontSize: 13, resize: "vertical" }}
          />
        </div>
        <div className="field">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", fontWeight: 500, textTransform: "none", letterSpacing: 0, cursor: "pointer" }}>
            <input type="checkbox" className="chk" checked={f.marketingConsent} onChange={(e) => setF({ ...f, marketingConsent: e.target.checked })} />
            Hozzájárul, hogy akciókról/emlékeztetőkről SMS-ben értesítsük
          </label>
        </div>
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!valid || busy} onClick={() => valid && onSave(f)}>{busy ? "Mentés..." : isEdit ? "Mentés" : "Létrehozás"}</button>
        </div>
      </div>
    </div>
  );
}
