import { useState } from "react";
import { CloseIcon } from "./icons";
import { countWorkdays, today } from "../lib/utils";

export default function LeaveRequestModal({ leaveTypes, onClose, onSubmit, busy }) {
  const [f, setF] = useState({
    startDate: today(),
    endDate: today(),
    leaveTypeId: leaveTypes[0]?.id || "",
    note: "",
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.startDate && f.endDate && f.endDate >= f.startDate;
  const days = valid ? countWorkdays(f.startDate, f.endDate) : 0;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Szabadság kérése <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        <div className="row2">
          <div className="field"><label>Kezdő nap</label><input type="date" value={f.startDate} onChange={set("startDate")} /></div>
          <div className="field"><label>Utolsó nap</label><input type="date" value={f.endDate} onChange={set("endDate")} /></div>
        </div>
        <div className="field"><label>Típus</label>
          <select value={f.leaveTypeId} onChange={set("leaveTypeId")}>
            {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="field"><label>Megjegyzés</label><textarea rows={2} value={f.note} onChange={set("note")} placeholder="Opcionális" /></div>
        {valid ? (
          <div className="field-hint" style={{ marginBottom: 8 }}>{days} munkanap (hétvége nélkül számolva)</div>
        ) : (
          <div className="field-hint" style={{ marginBottom: 8, color: "#DC2626" }}>Az utolsó nap nem lehet a kezdő nap előtt.</div>
        )}
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!valid || busy} onClick={() => valid && onSubmit({ ...f, days })}>{busy ? "Küldés..." : "Kérés beküldése"}</button>
        </div>
      </div>
    </div>
  );
}
