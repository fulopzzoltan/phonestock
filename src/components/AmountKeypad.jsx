const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "ok"];

export default function AmountKeypad({ value, onChange, onDone }) {
  function press(key) {
    if (key === "back") {
      onChange(String(value).slice(0, -1));
      return;
    }
    if (key === "ok") {
      onDone?.();
      return;
    }
    const next = String(value) === "0" ? key : String(value || "") + key;
    onChange(next.replace(/^0+(?=\d)/, ""));
  }

  return (
    <div className="amount-keypad" onMouseDown={(e) => e.preventDefault()}>
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          className={`amount-keypad-key${k === "ok" ? " amount-keypad-ok" : ""}`}
          onClick={() => press(k)}
        >
          {k === "back" ? "⌫" : k === "ok" ? "OK" : k}
        </button>
      ))}
    </div>
  );
}
