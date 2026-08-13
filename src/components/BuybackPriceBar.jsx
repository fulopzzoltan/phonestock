import { useState } from "react";

export default function BuybackPriceBar({ basePrice, price, applied }) {
  const [open, setOpen] = useState(false);
  const hasDeduction = applied.length > 0;

  return (
    <div className="bb-pricebar">
      <div className="bb-pricebar-inner">
        <div className="bb-pricebar-main">
          <span className="bb-pricebar-lbl">Jelenlegi ajánlat</span>
          <span className="bb-pricebar-now">{Math.round(price).toLocaleString("hu-HU")} Lei</span>
          {hasDeduction && <span className="bb-pricebar-old">{Math.round(basePrice).toLocaleString("hu-HU")} Lei</span>}
        </div>
        {hasDeduction && (
          <button type="button" className="bb-pricebar-why-btn" onClick={() => setOpen((o) => !o)}>
            Miért ennyi? {open ? "▲" : "▼"}
          </button>
        )}
      </div>
      {open && hasDeduction && (
        <ul className="bb-pricebar-why-list">
          {applied.map((a, i) => (
            <li key={i}>{a.label} <span>−{Math.round(a.before - a.after).toLocaleString("hu-HU")} Lei</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}
