import { useState } from "react";
import { QUICK_SALES } from "../lib/utils";

export default function QuickSaleButtons({ locations, defaultLocId, onAdd, busy }) {
  const [justAdded, setJustAdded] = useState(null);
  const locId = defaultLocId || locations[0]?.id || "";

  function quickAdd(item) {
    if (busy || !locId) return;
    onAdd({
      type: "income",
      description: item.label,
      amount: item.amount,
      costPrice: item.cost,
      category: "Készlet",
      payment: "Készpénz",
    }, locId);
    setJustAdded(item.label);
    setTimeout(() => setJustAdded((cur) => (cur === item.label ? null : cur)), 1200);
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: "14px 18px", marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 10 }}>⚡ Gyors eladás</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {QUICK_SALES.map((item) => (
          <button
            key={item.label}
            type="button"
            className="quick-sale-btn"
            disabled={busy}
            onClick={() => quickAdd(item)}
          >
            {justAdded === item.label ? "✓ Hozzáadva" : `${item.label} · ${item.amount} Lei`}
          </button>
        ))}
      </div>
    </div>
  );
}
