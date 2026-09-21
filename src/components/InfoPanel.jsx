import { useEffect } from "react";
import { CloseIcon } from "./icons";

// Újrafelhasználható infó-panel: asztalin jobbról becsúszó panel (Back Market mintája),
// mobilon alulról felcsúszó "bottom sheet" (showme.hu mintája) — mindkettő ugyanaz a
// komponens, a váltást a CSS média-query intézi (.pub-infopanel), nincs JS-ági elágazás.
// Célja, hogy a bizalmi sorok (garancia, állapot, fólia stb.) ne vigyék el az oldalról a
// látogatót egy másik oldalra, hanem helyben, kontextusban mutassák meg a részleteket.
export default function InfoPanel({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="pub-infopanel-backdrop" onClick={onClose} />
      <div className="pub-infopanel" role="dialog" aria-modal="true" aria-label={title}>
        <div className="pub-infopanel-handle" />
        <div className="pub-infopanel-head">
          <span>{title}</span>
          <button type="button" className="pub-infopanel-close" onClick={onClose} aria-label="Bezárás">
            <CloseIcon width={14} height={14} />
          </button>
        </div>
        <div className="pub-infopanel-body">{children}</div>
      </div>
    </>
  );
}
