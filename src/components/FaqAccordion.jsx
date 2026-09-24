import { useState } from "react";

// Közös GYIK-accordion a landing-stílusú oldalak (Eladás, Szerviz, Segítő) számára —
// valódi, kattintható állapot (nem csak vizuálisan "nyitva" tűnő statikus szöveg).
export default function FaqAccordion({ items }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="bb-faq-list">
      {items.map((f, i) => (
        <div className="bb-faq-row" key={f.q}>
          <button type="button" className="bb-faq-q" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
            {f.q}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ transform: open === i ? "rotate(180deg)" : "none" }}><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {open === i && <p className="bb-faq-a">{f.a}</p>}
        </div>
      ))}
    </div>
  );
}
