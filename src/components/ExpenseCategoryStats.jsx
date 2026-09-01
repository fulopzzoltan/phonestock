import { useMemo } from "react";
import { money } from "../lib/utils";

// Kiadás-statisztika kategóriánként, összesítve az utolsó N hónapra
// (alapból 12) — melyik forrás mennyit visz el a kiadásokból.
const CATS = [
  { key: "expensePhoneStock", label: "Telefon-beszerzés", color: "#22C55E" },
  { key: "expenseServiceParts", label: "Szerviz-alkatrész", color: "#0EA5E9" },
  { key: "expenseAccessoryStock", label: "Tartozék-beszerzés", color: "#F59E0B" },
  { key: "expensePayroll", label: "Bér", color: "#EC4899" },
  { key: "expenseTax", label: "Adó", color: "#EF4444" },
  { key: "expenseAccounting", label: "Könyvelés", color: "#8B5CF6" },
  { key: "expenseLoan", label: "Hitel", color: "#6366F1" },
  { key: "expenseMarketing", label: "Marketing", color: "#14B8A6" },
  { key: "expenseInvestment", label: "Befektetés", color: "#F97316" },
  { key: "expenseOther", label: "Egyéb", color: "#9CA3AF" },
];

export default function ExpenseCategoryStats({ summaries, months, locFilter }) {
  const totals = useMemo(() => {
    const monthKeys = months.map((m) => `${m.year}-${m.month}`);
    const rows = summaries.filter((s) => monthKeys.includes(`${s.year}-${s.month}`) && (locFilter === "all" || s.locationId === locFilter));
    const out = {};
    let total = 0;
    let hasAnyBreakdown = false;
    CATS.forEach((c) => { out[c.key] = 0; });
    rows.forEach((r) => {
      if (r.expensePhoneStock != null) hasAnyBreakdown = true;
      CATS.forEach((c) => { out[c.key] += r[c.key] || 0; });
      total += r.expenses || 0;
    });
    return { out, total, hasAnyBreakdown, monthCount: rows.length };
  }, [summaries, months, locFilter]);

  if (!totals.hasAnyBreakdown || totals.total <= 0) {
    return <div style={{ fontSize: 12.5, color: "#9CA3AF" }}>Ehhez még nincs kategória-bontású kiadás-adat.</div>;
  }

  const sorted = CATS.map((c) => ({ ...c, value: totals.out[c.key] })).filter((c) => c.value > 0).sort((a, b) => b.value - a.value);

  return (
    <div>
      {sorted.map((c) => {
        const pct = Math.round((c.value / totals.total) * 100);
        return (
          <div key={c.key} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
              <span style={{ fontWeight: 600, color: "#374151" }}>{c.label}</span>
              <span style={{ color: "#6B7280" }}>{money(c.value)} <span style={{ color: "#9CA3AF" }}>({pct}%)</span></span>
            </div>
            <div style={{ height: 7, background: "#F1F2F6", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: c.color, borderRadius: 999 }} />
            </div>
          </div>
        );
      })}
      <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 4 }}>
        Összesen {money(totals.total)} kiadás, {totals.monthCount} hónap alapján
      </div>
    </div>
  );
}
