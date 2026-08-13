import { useState } from "react";
import { CloseIcon } from "./icons";

export default function InviteEmployeeModal({ locations, onClose, onInvite, busy, error }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [locationId, setLocationId] = useState("");
  const valid = email.trim();

  function submit() {
    if (!valid) return;
    onInvite({ email: email.trim(), fullName: fullName.trim(), locationId: locationId || null });
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Új kolléga meghívása <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        {error && <div className="errbar">{error}</div>}
        <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kolléga@pelda.hu" /></div>
        <div className="field"><label>Név</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Kovács János" /></div>
        <div className="field"><label>Helyszín</label>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">— Utólag is beállítható —</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="field-hint" style={{ marginBottom: 6 }}>A kolléga emailben kap egy linket, amivel beállítja a jelszavát és beléphet.</div>
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!valid || busy} onClick={submit}>{busy ? "Küldés..." : "Meghívó küldése"}</button>
        </div>
      </div>
    </div>
  );
}
