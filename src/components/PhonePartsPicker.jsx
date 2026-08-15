import { useState } from "react";
import { money } from "../lib/utils";
import { CloseIcon } from "./icons";

const PINS = [
  { category: "Kijelző", label: "Kijelző", x: 100, y: 95 },
  { category: "Akkumulátor", label: "Akku", x: 100, y: 190 },
  { category: "Hátlap", label: "Hátlap", x: 100, y: 285 },
  { category: "Csatlakozó", label: "Csatlakozó", x: 100, y: 350 },
];

export default function PhonePartsPicker({ usedParts = [], availableParts = [], allParts = [], onAdd, onRemove, busy }) {
  const [openPin, setOpenPin] = useState(null);
  const [selPartId, setSelPartId] = useState("");
  const [qty, setQty] = useState(1);

  const usedByCategory = (category) => {
    return usedParts.filter((sp) => {
      const p = allParts.find((x) => x.id === sp.partId);
      return p ? p.category === category : sp.partName === category;
    });
  };

  const total = usedParts.reduce((s, sp) => s + (Number(sp.costPrice) || 0) * (Number(sp.quantity) || 0), 0);

  function openPicker(category) {
    setOpenPin(category);
    setSelPartId("");
    setQty(1);
  }

  function handleAdd(category) {
    const part = availableParts.find((p) => p.id === selPartId);
    if (!part) return;
    onAdd(part, qty);
    setOpenPin(null);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <svg viewBox="0 0 200 380" style={{ width: 110, flexShrink: 0 }}>
          <rect x="30" y="10" width="140" height="360" rx="24" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="2" />
          <rect x="45" y="30" width="110" height="300" rx="8" fill="#F1F2F6" />
          {PINS.map((pin) => {
            const active = usedByCategory(pin.category).length > 0;
            return (
              <circle
                key={pin.category}
                cx={pin.x} cy={pin.y} r="9"
                fill={active ? "var(--primary)" : "#fff"}
                stroke={active ? "var(--primary-dark)" : "#D1D5DB"}
                strokeWidth="2"
                style={{ cursor: "pointer" }}
                onClick={() => openPicker(pin.category)}
              />
            );
          })}
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          {PINS.map((pin) => {
            const items = usedByCategory(pin.category);
            return (
              <div key={pin.category} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => openPicker(pin.category)}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: items.length ? "var(--primary)" : "#D1D5DB", flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>{pin.label}</span>
                  {items.length > 0 && (
                    <span style={{ fontSize: 12, color: "#9CA3AF" }}>
                      — {items.map((sp) => money((Number(sp.costPrice) || 0) * (Number(sp.quantity) || 0))).join(" + ")}
                    </span>
                  )}
                </div>
                {items.map((sp) => (
                  <div key={sp.id} className="dp-row" style={{ paddingLeft: 14 }}>
                    <span className="dp-key">{sp.partName} ({sp.quantity} db)</span>
                    <span className="dp-val" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {money((sp.costPrice || 0) * sp.quantity)}
                      <button type="button" className="iconbtn" disabled={busy} onClick={() => onRemove(sp)}><CloseIcon width={12} height={12} /></button>
                    </span>
                  </div>
                ))}
                {openPin === pin.category && (
                  <div className="row2" style={{ marginTop: 6, alignItems: "flex-end", paddingLeft: 14 }}>
                    <div className="field" style={{ margin: 0 }}>
                      <select value={selPartId} onChange={(e) => setSelPartId(e.target.value)}>
                        <option value="">— Alkatrész —</option>
                        {(availableParts.filter((p) => p.category === pin.category).length ? availableParts.filter((p) => p.category === pin.category) : availableParts)
                          .map((p) => <option key={p.id} value={p.id}>{p.name} ({p.quantity} db)</option>)}
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input type="number" min="1" value={qty} onChange={(e) => setQty(Number(e.target.value))}
                        style={{ width: 56, background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 9, padding: "9px 8px", fontFamily: "inherit", fontSize: 13 }} />
                      <button type="button" className="btn sm" disabled={!selPartId || busy} onClick={() => handleAdd(pin.category)}>Hozzáadás</button>
                      <button type="button" className="iconbtn" onClick={() => setOpenPin(null)}><CloseIcon width={14} height={14} /></button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: "#374151" }}>
        Alkatrészek összesen: {money(total)}
      </div>
    </div>
  );
}
