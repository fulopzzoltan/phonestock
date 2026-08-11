import { useState } from "react";
import { TrashIcon } from "./icons";

export default function ConfirmDelete({ onConfirm, disabled, variant = "icon" }) {
  const [confirming, setConfirming] = useState(false);
  const stop = (e) => e.stopPropagation();

  if (confirming) {
    return (
      <span className="confirm-inline" onClick={stop}>
        <span className="confirm-q">Biztos?</span>
        <button type="button" className="confirm-btn yes" disabled={disabled} onClick={() => { setConfirming(false); onConfirm(); }}>Igen</button>
        <button type="button" className="confirm-btn no" onClick={() => setConfirming(false)}>Nem</button>
      </span>
    );
  }

  if (variant === "full") {
    return (
      <button type="button" className="btn sm danger" disabled={disabled} onClick={(e) => { stop(e); setConfirming(true); }}>Törlés</button>
    );
  }
  return (
    <button type="button" className="iconbtn" disabled={disabled} onClick={(e) => { stop(e); setConfirming(true); }}><TrashIcon /></button>
  );
}
