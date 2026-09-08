import { money } from "../lib/utils";
import { CloseIcon, CashIcon, CardIcon, TransferIcon } from "./icons";

// Kifizetéskor egyszerű kérdés: készpénzből, kártyáról vagy másképp (pl. utalással,
// külön elrendezve) ment-e ki az összeg — ez alapján kerül be a tétel a Bevételek &
// Kiadások közé, és az "Átutalás" (vagy bármi, ami nem Készpénz) nem terheli a
// helyszín fizikai készpénz-egyenlegét az Elszámolás fülön, csak a kiadás-könyvelést.
export default function CashOrCardModal({ title, amount, onClose, onConfirm, busy }) {
  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 340 }} onClick={(e) => e.stopPropagation()}>
        <h2>{title} <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6B7280" }}>
          Kifizetett összeg: <strong>{money(amount)}</strong>
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn sec" style={{ flex: 1, flexDirection: "column", height: 72, gap: 6, fontSize: 12.5 }} disabled={busy} onClick={() => onConfirm("Készpénz")}>
            <CashIcon width={20} height={20} />Készpénz
          </button>
          <button className="btn sec" style={{ flex: 1, flexDirection: "column", height: 72, gap: 6, fontSize: 12.5 }} disabled={busy} onClick={() => onConfirm("Kártya")}>
            <CardIcon width={20} height={20} />Kártya
          </button>
          <button className="btn sec" style={{ flex: 1, flexDirection: "column", height: 72, gap: 6, fontSize: 12.5 }} disabled={busy} onClick={() => onConfirm("Átutalás")} title="Nem a helyszín készpénzéből ment ki — pl. utalással vagy külön elrendezve">
            <TransferIcon width={20} height={20} />Átutalás
          </button>
        </div>
      </div>
    </div>
  );
}
