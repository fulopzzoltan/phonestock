import { money } from "../lib/utils";
import { CloseIcon, CashIcon, CardIcon } from "./icons";

// Kifizetéskor egyszerű kérdés: készpénzből vagy kártyáról ment-e ki az összeg —
// ez alapján kerül be a tétel a Bevételek & Kiadások közé.
export default function CashOrCardModal({ title, amount, onClose, onConfirm, busy }) {
  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 340 }} onClick={(e) => e.stopPropagation()}>
        <h2>{title} <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6B7280" }}>
          Kifizetett összeg: <strong>{money(amount)}</strong>
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn sec" style={{ flex: 1, flexDirection: "column", height: 72, gap: 6 }} disabled={busy} onClick={() => onConfirm("Készpénz")}>
            <CashIcon width={20} height={20} />Készpénz
          </button>
          <button className="btn sec" style={{ flex: 1, flexDirection: "column", height: 72, gap: 6 }} disabled={busy} onClick={() => onConfirm("Kártya")}>
            <CardIcon width={20} height={20} />Kártya
          </button>
        </div>
      </div>
    </div>
  );
}
