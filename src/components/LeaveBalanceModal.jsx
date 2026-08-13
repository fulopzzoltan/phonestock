import { useState } from "react";
import { CloseIcon } from "./icons";

export default function LeaveBalanceModal({ user, year, initial, onClose, onSave, busy }) {
  const [days, setDays] = useState(initial);
  const valid = days !== "" && Number(days) >= 0;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Szabadság-keret — {user.fullName} <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        <div className="field"><label>{year}. évi jár (nap)</label>
          <input type="number" value={days} onChange={(e) => setDays(e.target.value)} placeholder="20" />
        </div>
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!valid || busy} onClick={() => valid && onSave(Number(days))}>{busy ? "Mentés..." : "Mentés"}</button>
        </div>
      </div>
    </div>
  );
}
