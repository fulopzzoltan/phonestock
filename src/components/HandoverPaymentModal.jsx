import { useState } from "react";
import { CloseIcon } from "./icons";
import { money } from "../lib/utils";

// Munkalap átadásakor, ha van fizetendő összeg, itt kérdezzük meg a fizetés
// módját — "Vegyes" esetén a TransactionModal-ból ismert készpénz/kártya
// bontással, hogy a bevétel helyesen könyvelődjön.
export default function HandoverPaymentModal({ ticket, onClose, onConfirm, busy }) {
  const [payment, setPayment] = useState("Készpénz");
  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const amount = Number(ticket.price) || 0;
  const splitSum = (Number(cash) || 0) + (Number(card) || 0);
  const splitValid = payment !== "Vegyes" || (cash !== "" && card !== "" && splitSum === amount);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
        <h2>Munkalap átadása <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#6B7280" }}>
          Fizetendő összeg: <strong>{money(amount)}</strong>
        </p>
        <div className="field">
          <label>Fizetés módja</label>
          <select value={payment} onChange={(e) => setPayment(e.target.value)}>
            <option>Készpénz</option>
            <option>Kártya</option>
            <option>Átutalás</option>
            <option>Vegyes</option>
          </select>
        </div>
        {payment === "Vegyes" && (
          <div className="row2">
            <div className="field">
              <label>ebből készpénz (Lei)</label>
              <input type="number" value={cash} onChange={(e) => setCash(e.target.value)} style={!splitValid ? { borderColor: "#FCA5A5" } : undefined} />
            </div>
            <div className="field">
              <label>ebből kártya (Lei)</label>
              <input type="number" value={card} onChange={(e) => setCard(e.target.value)} style={!splitValid ? { borderColor: "#FCA5A5" } : undefined} />
            </div>
          </div>
        )}
        {payment === "Vegyes" && !splitValid && (
          <div className="login-note" style={{ margin: "-6px 0 12px", color: "#B91C1C" }}>
            A készpénz + kártya résznek ki kell adnia az összeget ({splitSum} / {amount} Lei).
          </div>
        )}
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={busy || !splitValid} onClick={() => onConfirm(payment, cash, card)}>{busy ? "Átadás..." : "Átadás"}</button>
        </div>
      </div>
    </div>
  );
}
