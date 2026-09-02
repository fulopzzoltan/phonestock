import { useState } from "react";
import { CloseIcon } from "./icons";

// Előleg felvétele egy meglévő munkalapra — az összeg bekerül az Árulásba, és
// átadáskor a munkalap árából automatikusan levonódik, hogy ne duplázódjon.
export default function TicketDepositModal({ ticket, onClose, onConfirm, busy }) {
  const [amount, setAmount] = useState("");
  const [payment, setPayment] = useState("Készpénz");
  const valid = Number(amount) > 0;

  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
        <h2>Előleg felvétele <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        <div className="field"><label>Összeg (Lej)</label><input type="number" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></div>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <button type="button" className={`btn sec${payment === "Készpénz" ? " active" : ""}`} style={payment === "Készpénz" ? { borderColor: "var(--primary)", color: "var(--primary-ink)" } : undefined} onClick={() => setPayment("Készpénz")}>Készpénz</button>
          <button type="button" className={`btn sec${payment === "Kártya" ? " active" : ""}`} style={payment === "Kártya" ? { borderColor: "var(--primary)", color: "var(--primary-ink)" } : undefined} onClick={() => setPayment("Kártya")}>Kártya</button>
        </div>
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!valid || busy} onClick={() => valid && onConfirm(Number(amount), payment)}>Rögzítés</button>
        </div>
      </div>
    </div>
  );
}
