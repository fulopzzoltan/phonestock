import { useState, useMemo, useRef } from "react";
import { money } from "../lib/utils";
import { FinanceIcon } from "./icons";
import { EmptyState } from "./EmptyState";

// Bevétel / kiadás / profit trend egy vonaldiagramon, az utolsó 12 hónapra —
// a MonthlyTrendChart-tal (ami helyszínenkénti bevétel-oszlopokat mutat) egy
// gombnyomásra, de attól külön: itt a 3 fő pénzügyi mutató fut együtt.
const W = 760, H = 240, PAD_L = 52, PAD_R = 12, PAD_T = 16, PAD_B = 30;
const MONTH_NAMES = ["jan.", "febr.", "márc.", "ápr.", "máj.", "jún.", "júl.", "aug.", "szept.", "okt.", "nov.", "dec."];

function niceMax(n) {
  if (n <= 0) return 100;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const f = n / pow;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return step * pow;
}

const SERIES = [
  { key: "revenue", label: "Bevétel", color: "#22C55E" },
  { key: "expenses", label: "Kiadás", color: "#F87171" },
  { key: "profit", label: "Profit", color: "#111827" },
];

export default function FinanceTrendChart({ months, summaries, liveMonth, locFilter }) {
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);

  // Ha a periódus több naptári évet fog át, a hónap-cimkébe az évet is kiírjuk.
  const spansMultipleYears = useMemo(() => new Set(months.map((m) => m.year)).size > 1, [months]);
  // Csak január cimkéjéhez fűzzük hozzá az évet (évhatár-jelzés), hogy hosszú periódusnál se legyen zsúfolt a tengely.
  const labelFor = (m) => spansMultipleYears && m.month === 1 ? `${MONTH_NAMES[m.month - 1]} '${String(m.year).slice(2)}` : MONTH_NAMES[m.month - 1];

  const points = useMemo(() => {
    return months.map(({ year, month, isLive }) => {
      if (isLive) {
        return { year, month, isLive, revenue: liveMonth.revenue, expenses: liveMonth.expenses, profit: liveMonth.profit, hasData: true };
      }
      const rows = summaries.filter((s) => s.year === year && s.month === month && (locFilter === "all" || s.locationId === locFilter));
      if (rows.length === 0) return { year, month, isLive, revenue: 0, expenses: 0, profit: 0, hasData: false };
      const revenue = rows.reduce((a, r) => a + (r.revenue || 0), 0);
      const hasExpenses = rows.some((r) => r.expenses != null);
      const expenses = hasExpenses ? rows.reduce((a, r) => a + (r.expenses || 0), 0) : null;
      const profit = hasExpenses ? rows.reduce((a, r) => a + (r.profit || 0), 0) : null;
      return { year, month, isLive, revenue, expenses, profit, hasData: true };
    });
  }, [months, summaries, liveMonth, locFilter]);

  const usablePoints = points.filter((p) => p.hasData);
  if (usablePoints.length === 0) {
    return (
      <div className="tw">
        <EmptyState icon={FinanceIcon}>Még nincs havi adat a trendhez.</EmptyState>
      </div>
    );
  }

  const yMax = niceMax(Math.max(1, ...points.map((p) => p.revenue || 0)) * 1.15);
  const yMin = Math.min(0, ...points.map((p) => p.profit ?? 0)) * 1.1;
  const range = yMax - yMin;

  function xFor(i) { return PAD_L + (i + 0.5) * ((W - PAD_L - PAD_R) / months.length); }
  function yFor(v) { return PAD_T + (1 - (v - yMin) / range) * (H - PAD_T - PAD_B); }

  function pathFor(key) {
    let d = "";
    points.forEach((p, i) => {
      if (p[key] == null) return;
      const cmd = d === "" ? "M" : "L";
      d += `${cmd}${xFor(i).toFixed(1)},${yFor(p[key]).toFixed(1)} `;
    });
    return d.trim();
  }

  return (
    <div className="tw" style={{ padding: "18px 18px 8px", position: "relative" }} ref={wrapRef}>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 10, fontSize: 11, color: "#6B7280" }}>
        {SERIES.map((s) => (
          <span key={s.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 2.5, background: s.color, display: "inline-block", borderRadius: 2 }} />
            {s.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const v = yMin + f * range;
          const y = yFor(v);
          return (
            <g key={i}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#EEF0F2" strokeWidth="1" />
              <text x={PAD_L - 8} y={y + 3} textAnchor="end" fontSize="9.5" fill="#9CA3AF" fontFamily="JetBrains Mono, monospace">
                {Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : Math.round(v)}
              </text>
            </g>
          );
        })}
        {yMin < 0 && (
          <line x1={PAD_L} y1={yFor(0)} x2={W - PAD_R} y2={yFor(0)} stroke="#D1D5DB" strokeWidth="1" strokeDasharray="3,3" />
        )}
        {months.map((m, i) => (
          <text key={i} x={xFor(i)} y={H - PAD_B + 16} textAnchor="middle" fontSize="9.5" fill={m.isLive ? "#111827" : "#9CA3AF"} fontWeight={m.isLive ? "700" : "400"} fontFamily="Inter, sans-serif">
            {labelFor(m)}
          </text>
        ))}
        {SERIES.map((s) => (
          <path key={s.key} d={pathFor(s.key)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {points.map((p, i) => (
          <g key={i}>
            {SERIES.map((s) => {
              if (p[s.key] == null) return null;
              const isHovered = hover === i;
              return (
                <circle
                  key={s.key}
                  cx={xFor(i)} cy={yFor(p[s.key])} r={isHovered ? 3.5 : 2.2}
                  fill={s.color}
                />
              );
            })}
            <rect
              x={xFor(i) - (W - PAD_L - PAD_R) / months.length / 2} y={PAD_T} width={(W - PAD_L - PAD_R) / months.length} height={H - PAD_T - PAD_B}
              fill="transparent" style={{ cursor: "pointer" }}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}
      </svg>
      {hover != null && points[hover] && (
        <div
          style={{
            position: "absolute", top: 30, pointerEvents: "none",
            left: `${Math.min(Math.max((xFor(hover) / W) * 100, 14), 86)}%`, transform: "translateX(-50%)",
            background: "#111113", color: "#fff", borderRadius: 10, padding: "10px 12px", fontSize: 11.5,
            whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,.2)", zIndex: 5,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 3 }}>
            {MONTH_NAMES[points[hover].month - 1]} {points[hover].year}{points[hover].isLive ? " (folyamatban)" : ""}
          </div>
          <div>Bevétel: <b>{money(points[hover].revenue)}</b></div>
          <div>Kiadás: {points[hover].expenses != null ? money(points[hover].expenses) : "—"}</div>
          <div>Profit: {points[hover].profit != null ? money(points[hover].profit) : "—"}</div>
        </div>
      )}
    </div>
  );
}
