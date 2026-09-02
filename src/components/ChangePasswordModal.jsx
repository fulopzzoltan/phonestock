import { useState } from "react";
import { CloseIcon } from "./icons";

export default function ChangePasswordModal({ onClose, onChange, busy }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState("");

  function submit() {
    setLocalError("");
    if (password.length < 6) { setLocalError("A jelszónak legalább 6 karakter hosszúnak kell lennie."); return; }
    if (password !== confirm) { setLocalError("A két jelszó nem egyezik."); return; }
    onChange(password);
  }

  return (
    <div className="overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Jelszó módosítása <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        {localError && <div className="errbar">{localError}</div>}
        <div className="field">
          <label>Új jelszó</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          <div className="field-hint">Legalább 6 karakter</div>
        </div>
        <div className="field"><label>Új jelszó megerősítése</label><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" /></div>
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={busy} onClick={submit}>{busy ? "Mentés..." : "Jelszó módosítása"}</button>
        </div>
      </div>
    </div>
  );
}
