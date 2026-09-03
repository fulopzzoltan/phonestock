import { useState } from "react";
import { ChevronDownIcon } from "./icons";

// A garanciaszöveg jogilag szükséges, de senki nem olvassa el elsőre magától —
// alapból csukva mutatjuk, csak a címét, hogy ne az oldal felét foglalja el.
export default function WarrantyTermsToggle({ title, text }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <button type="button" className="history-toggle" onClick={() => setOpen((v) => !v)}>
        <span style={{ flex: 1, textAlign: "left" }}>{title}</span>
        <ChevronDownIcon style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s", flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ background: "#F9FAFB", border: "1px solid #EEF0F2", borderRadius: 12, padding: 14, fontSize: 11, color: "#6B7280", lineHeight: 1.6, whiteSpace: "pre-line", marginTop: 8 }}>
          {text}
        </div>
      )}
    </div>
  );
}
