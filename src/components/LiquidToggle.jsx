// iOS-stílusú kapcsoló a "Nap zárása" akcióhoz — lenyomva (touch/mousedown) a fehér gomb
// szélesebb, a sínből kilógó ovállá nyúlik (Apple iOS 17+ switch "press" animáció, ld. a
// Sketch "Toggles / Dark / On / 3 - Pressed" mintát), elengedéskor visszaugrik körré és
// átcsúszik a másik oldalra. Bekapcsolt (lezárt nap) állapotban pirosra vált.
export default function LiquidToggle({ on, onChange, disabled, title }) {
  return (
    <button
      type="button"
      className={`liquid-toggle${on ? " on" : ""}`}
      disabled={disabled}
      title={title}
      aria-pressed={on}
      onClick={() => onChange(!on)}
    >
      <span className="lt-track" />
      <span className="lt-thumb" />
    </button>
  );
}
