const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0", "ok"];

// Nagy, tapintható számgombrács összeg-bevitelhez (POS-jellegű gyors bevitel) —
// a value mindig egész szám stringje, nincs tizedesvessző (Lei-ben nem kell).
export default function AmountKeypad({ value, onChange, onDone }) {
  function press(k) {
    if (k === "del") { onChange((value || "").slice(0, -1)); return; }
    if (k === "ok") { onDone?.(); return; }
    if ((value || "").length >= 7) return;
    onChange((value || "") + k);
  }
  return (
    <div className="keypad">
      {KEYS.map((k) => (
        <button
          key={k} type="button"
          className={`keypad-btn${k === "ok" ? " keypad-ok" : ""}`}
          onClick={() => press(k)}
        >
          {k === "del" ? "⌫" : k === "ok" ? "OK" : k}
        </button>
      ))}
    </div>
  );
}
