import { useState, useMemo, useRef } from "react";
import { money } from "../lib/utils";

const W = 760, H = 260, PAD_L = 52, PAD_R = 12, PAD_T = 16, PAD_B = 40;
const MONTH_NAMES = ["jan.", "febr.", "márc.", "ápr.", "máj.", "jún.", "júl.", "aug.", "szept.", "okt.", "nov.", "dec."];

function niceMax(n) {
  if (n <= 0) return 100;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const f = n / pow;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return step * pow;
}

const LOC_COLORS = ["#22C55E", "#0EA5E9", "#F97316"];

export default function MonthlyTrendChart({ summaries, liveMonth, locations, locFilter, locName }) {
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);

  const activeLocations = useMemo(() => {
    const list = locFilter === "all" ? locations.filter((l) => l.name !== "Tartalék") : locations.filter((l) => l.id === locFilter);
    return list.map((l, i) => ({ ...l, color: LOC_COLORS[i % LOC_COLORS.length] }));
  }, [locations, locFilter]);

  const months = useMemo(() => {
    const out = [];
    for (let i = 11; i >= 0; i--) {
      let y = liveMonth.year, m = liveMonth.month - i;
      while (m <= 0) { m += 12; y -= 1; }
      out.push({ year: y, month: m, isLive: i === 0 });
    }
    return out;
  }, [liveMonth]);

  const groups = useMemo(() => {
    return months.map(({ year, month, isLive }) => {
      const bars = activeLocations.map((loc) => {
        if (isLive) {
          // a folyó hónapra nincs helyszínenkénti bontásunk a liveMonth aggregátumból — csak "all"
          // esetén 1 db összesített csíkozott oszlopot mutatunk, különben az adott helyszín élő adatát.
          if (locFilter !== "all" && loc.id !== locFilter) return null;
          return { loc, isLive: true, data: liveMonth };
        }
        const row = summaries.find((s) => s.year === year && s.month === month && s.locationId === loc.id);
        if (!row) return null;
        return { loc, isLive: false, data: row };
      }).filter(Boolean);
      // "all" + élő hónap: egyetlen összesített csík, ne location-önként duplikálva
      const finalBars = isLive && locFilter === "all" ? [{ loc: null, isLive: true, data: liveMonth }] : bars;
      return { year, month, isLive, label: `${MONTH_NAMES[month - 1]}`, bars: finalBars };
    });
  }, [months, activeLocations, summaries, liveMonth, locFilter]);

  const yMax = useMemo(() => {
    let max = 0;
    groups.forEach((g) => g.bars.forEach((b) => { if (b.data.revenue > max) max = b.data.revenue; }));
    return niceMax(max * 1.15);
  }, [groups]);

  const nonEmptyGroups = groups.filter((g) => g.bars.length > 0);
  if (nonEmptyGroups.length === 0) {
    return (
      <div className="tw" style={{ padding: "36px 20px" }}>
        <div className="empty">Még nincs havi adat a trendhez.</div>
      </div>
    );
  }

  const groupW = (W - PAD_L - PAD_R) / months.length;
  const maxBarsPerGroup = Math.max(1, ...groups.map((g) => g.bars.length));
  const barGap = 3;
  const barW = Math.max(6, (groupW - 10 - barGap * (maxBarsPerGroup - 1)) / maxBarsPerGroup);

  function yFor(v) {
    return PAD_T + (1 - Math.min(v, yMax) / yMax) * (H - PAD_T - PAD_B);
  }

  return (
    <div className="tw" style={{ padding: "18px 18px 8px", position: "relative" }} ref={wrapRef}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const v = f * yMax;
          const y = yFor(v);
          return (
            <g key={i}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#EEF0F2" strokeWidth="1" />
              <text x={PAD_L - 8} y={y + 3} textAnchor="end" fontSize="9.5" fill="#9CA3AF" fontFamily="JetBrains Mono, monospace">
                {v >= 1000 ? `${Math.round(v / 1000)}k` : Math.round(v)}
              </text>
            </g>
          );
        })}
        {groups.map((g, gi) => {
          const gx = PAD_L + gi * groupW;
          const totalBarsW = g.bars.length * barW + (g.bars.length - 1) * barGap;
          const startX = gx + (groupW - totalBarsW) / 2;
          return (
            <g key={gi}>
              <text x={gx + groupW / 2} y={H - PAD_B + 16} textAnchor="middle" fontSize="9.5" fill={g.isLive ? "#111827" : "#9CA3AF"} fontWeight={g.isLive ? "700" : "400"} fontFamily="Inter, sans-serif">
                {g.label}
              </text>
              {g.isLive && (
                <text x={gx + groupW / 2} y={H - PAD_B + 27} textAnchor="middle" fontSize="8" fill="#9CA3AF" fontFamily="Inter, sans-serif">
                  folyamatban
                </text>
              )}
              {g.bars.map((b, bi) => {
                const x = startX + bi * (barW + barGap);
                const y = yFor(b.data.revenue);
                const h = H - PAD_B - y;
                const color = b.isLive && locFilter === "all" ? "#9CA3AF" : (b.loc?.color || "#22C55E");
                const isHovered = hover && hover.gi === gi && hover.bi === bi;
                return (
                  <rect
                    key={bi}
                    x={x} y={y} width={barW} height={Math.max(1, h)}
                    fill={color}
                    opacity={b.isLive ? 0.45 : (isHovered ? 1 : 0.85)}
                    stroke={isHovered ? "#111827" : "none"}
                    strokeWidth={isHovered ? 1.5 : 0}
                    rx={2}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHover({ gi, bi, group: g, bar: b, x: x + barW / 2 })}
                    onMouseLeave={() => setHover(null)}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
      {activeLocations.length > 1 && (
        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginBottom: 6, fontSize: 11, color: "#6B7280" }}>
          {activeLocations.map((l) => (
            <span key={l.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color, display: "inline-block" }} />
              {l.name}
            </span>
          ))}
        </div>
      )}
      {hover && (
        <div
          style={{
            position: "absolute", top: 8, pointerEvents: "none",
            left: `${Math.min(Math.max((hover.x / W) * 100, 14), 86)}%`, transform: "translateX(-50%)",
            background: "#111113", color: "#fff", borderRadius: 10, padding: "10px 12px", fontSize: 11.5,
            whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,.2)", zIndex: 5,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 3 }}>
            {MONTH_NAMES[hover.group.month - 1]} {hover.group.year}{hover.bar.loc ? ` · ${hover.bar.loc.name}` : ""}{hover.bar.isLive ? " (folyamatban)" : ""}
          </div>
          <div>Bevétel: <b>{money(hover.bar.data.revenue)}</b></div>
          <div>Árrés: {money(hover.bar.data.margin)} {hover.bar.data.revenue ? `(${Math.round((hover.bar.data.margin / hover.bar.data.revenue) * 100)}%)` : ""}</div>
          <div>Kiadás: {hover.bar.data.expenses != null ? money(hover.bar.data.expenses) : "—"}</div>
          <div>Profit: {hover.bar.data.profit != null ? money(hover.bar.data.profit) : "—"}</div>
          {(hover.bar.data.phonesButton != null || hover.bar.data.phonesRefurbished != null || hover.bar.data.phonesNew != null) && (
            <div style={{ color: "#9CA3AF", marginTop: 3 }}>
              Telefon: {hover.bar.data.phonesNew ?? 0} új · {hover.bar.data.phonesRefurbished ?? 0} felúj. · {hover.bar.data.phonesButton ?? 0} gombos
            </div>
          )}
        </div>
      )}
    </div>
  );
}
