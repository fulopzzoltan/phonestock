import { useState } from "react";

// Gooey kapcsoló a "Nap zárása" akcióhoz — két, azonos színű, SVG goo-szűrővel
// összeolvasztott kör: nyugalomban egy pöttynek látszik, váltáskor a "csepp" kicsit
// lemaradva követi a "gombot", ami a folyékony, megnyúló hatást adja. Bekapcsolt
// (lezárt nap) állapotban pirosra vált.
let seq = 0;

export default function LiquidToggle({ on, onChange, disabled, title }) {
  const [filterId] = useState(() => `liq-goo-${seq++}`);
  return (
    <button
      type="button"
      className={`liquid-toggle${on ? " on" : ""}`}
      disabled={disabled}
      title={title}
      aria-pressed={on}
      onClick={() => onChange(!on)}
    >
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id={filterId}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" />
        </filter>
      </svg>
      <span className="lt-track" />
      <span className="lt-blobs" style={{ filter: `url(#${filterId})` }}>
        <span className="lt-thumb" />
        <span className="lt-drop" />
      </span>
    </button>
  );
}
