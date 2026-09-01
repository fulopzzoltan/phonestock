import { useMemo } from "react";
import { money } from "../lib/utils";

// Bevétel- vagy rés-szintű (mode="revenue" | "margin") megoszlás telefon/szerviz/
// tartozék/egyéb között, havi bontásban, az utolsó 12 hónapra. A rés-szintű bontás
// BECSLÉS: revenue_x - a hozzá tartozó beszerzési kiadás (pl. telefon rés ≈
// telefon-bevétel - telefon-beszerzési kiadás UGYANABBAN a hónapban) — ez nem
// veszi figyelembe, hogy egy adott hónapban eladott telefon beszerzése lehet
// egy korábbi hónap kiadása volt, úgyhogy havi szinten pontatlan lehet, de
// negyedéves/éves átlagban jó közelítés.
const CATS = [
  { key: "phone", label: "Telefon", color: "#22C55E" },
  { key: "service", label: "Szerviz", color: "#0EA5E9" },
  { key: "accessory", label: "Tartozék", color: "#F59E0B" },
  { key: "other", label: "Egyéb", color: "#C4B5FD" },
];
const MONTH_NAMES = ["jan.", "febr.", "márc.", "ápr.", "máj.", "jún.", "júl.", "aug.", "szept.", "okt.", "nov.", "dec."];

export default function CategorySplitChart({ summaries, liveMonth, locFilter, mode }) {
  const months = useMemo(() => {
    const out = [];
    for (let i = 11; i >= 0; i--) {
      let y = liveMonth.year, m = liveMonth.month - i;
      while (m <= 0) { m += 12; y -= 1; }
      out.push({ year: y, month: m, isLive: i === 0 });
    }
    return out;
  }, [liveMonth]);

  const rows = useMemo(() => {
    return months.map(({ year, month, isLive }) => {
      if (isLive) return { year, month, isLive, hasData: false };
      const matching = summaries.filter((s) => s.year === year && s.month === month && (locFilter === "all" || s.locationId === locFilter));
      if (matching.length === 0) return { year, month, isLive, hasData: false };

      const sum = (f) => matching.reduce((a, r) => a + (f(r) || 0), 0);
      const revenue = sum((r) => r.revenue);
      const revPhone = sum((r) => r.revenuePhone);
      const revService = sum((r) => r.revenueService);
      const revAccessory = sum((r) => r.revenueAccessory);
      const revOther = sum((r) => r.revenueOther);
      const hasRevBreakdown = matching.every((r) => r.revenuePhone != null) && (revPhone + revService + revAccessory + revOther) > 0;
      if (!hasRevBreakdown) return { year, month, isLive, hasData: false };

      if (mode === "revenue") {
        const total = revPhone + revService + revAccessory + revOther;
        return {
          year, month, isLive, hasData: true, total,
          phone: revPhone, service: revService, accessory: revAccessory, other: revOther,
        };
      }

      // mode === "margin"
      const margin = sum((r) => r.margin);
      const expPhoneStock = sum((r) => r.expensePhoneStock);
      const expServiceParts = sum((r) => r.expenseServiceParts);
      const expAccessoryStock = sum((r) => r.expenseAccessoryStock);
      const hasExpBreakdown = matching.every((r) => r.expensePhoneStock != null);
      if (!hasExpBreakdown) return { year, month, isLive, hasData: false };

      const marginPhone = revPhone - expPhoneStock;
      const marginService = revService - expServiceParts;
      const marginAccessory = revAccessory - expAccessoryStock;
      const marginOther = margin - marginPhone - marginService - marginAccessory;
      return {
        year, month, isLive, hasData: true, total: margin,
        phone: marginPhone, service: marginService, accessory: marginAccessory, other: marginOther,
      };
    });
  }, [months, summaries, locFilter, mode]);

  const usable = rows.filter((r) => r.hasData);
  if (usable.length === 0) {
    return <div style={{ fontSize: 12.5, color: "#9CA3AF" }}>Ehhez még nincs kategória-bontású adat.</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 14, marginBottom: 12, fontSize: 11, color: "#6B7280", flexWrap: "wrap" }}>
        {CATS.map((c) => (
          <span key={c.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color, display: "inline-block" }} />
            {c.label}
          </span>
        ))}
      </div>
      {rows.map((r, i) => {
        if (!r.hasData) {
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
              <div style={{ width: 34, fontSize: 10.5, color: "#9CA3AF", fontWeight: r.isLive ? 700 : 400 }}>{MONTH_NAMES[r.month - 1]}</div>
              <div style={{ flex: 1, height: 16, background: "repeating-linear-gradient(45deg,#F3F4F6,#F3F4F6 5px,#F9FAFB 5px,#F9FAFB 10px)", borderRadius: 4, fontSize: 9.5, color: "#C1C7D0", display: "flex", alignItems: "center", paddingLeft: 6 }}>
                nincs bontás
              </div>
            </div>
          );
        }
        const total = Math.max(1, r.phone + r.service + r.accessory + r.other, r.total || 0);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }} title={`${MONTH_NAMES[r.month - 1]} ${r.year} — Telefon: ${money(r.phone)} · Szerviz: ${money(r.service)} · Tartozék: ${money(r.accessory)} · Egyéb: ${money(r.other)}`}>
            <div style={{ width: 34, fontSize: 10.5, color: r.isLive ? "#111827" : "#6B7280", fontWeight: r.isLive ? 700 : 400 }}>{MONTH_NAMES[r.month - 1]}</div>
            <div style={{ flex: 1, height: 16, borderRadius: 4, overflow: "hidden", display: "flex", background: "#F1F2F6" }}>
              {CATS.map((c) => {
                const v = Math.max(0, r[c.key]);
                const pct = (v / total) * 100;
                if (pct <= 0) return null;
                return <div key={c.key} style={{ width: `${pct}%`, background: c.color }} />;
              })}
            </div>
            <div style={{ width: 66, fontSize: 10.5, color: "#6B7280", textAlign: "right" }}>{money(r.total)}</div>
          </div>
        );
      })}
    </div>
  );
}
