import { useState, useMemo, useRef } from "react";
import { money } from "../lib/utils";
import { FinanceIcon } from "./icons";
import { EmptyState } from "./EmptyState";

const W = 700, H = 220, PAD_L = 56, PAD_R = 16, PAD_T = 16, PAD_B = 30;

function fmtDate(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("hu-HU", { month: "short", day: "numeric" });
}
function niceMax(n) {
  if (n <= 0) return 100;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const f = n / pow;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return step * pow;
}

export default function StockValueChart({ history }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);

  const points = history; // [{date, value}] ascending

  const { path, areaPath, xy, yMax, gridVals } = useMemo(() => {
    if (points.length < 2) return { path: "", areaPath: "", xy: [], yMax: 0, gridVals: [] };
    const times = points.map((p) => new Date(p.date + "T00:00:00").getTime());
    const t0 = times[0], t1 = times[times.length - 1];
    const tRange = Math.max(1, t1 - t0);
    const vMax = Math.max(...points.map((p) => p.value));
    const yTop = niceMax(vMax * 1.15) || 100;
    const xy = points.map((p, i) => {
      const x = PAD_L + ((times[i] - t0) / tRange) * (W - PAD_L - PAD_R);
      const y = PAD_T + (1 - p.value / yTop) * (H - PAD_T - PAD_B);
      return { x, y, ...p };
    });
    const path = xy.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const baseY = H - PAD_B;
    const areaPath = `${path} L${xy[xy.length - 1].x.toFixed(1)},${baseY} L${xy[0].x.toFixed(1)},${baseY} Z`;
    const gridVals = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yTop);
    return { path, areaPath, xy, yMax: yTop, gridVals };
  }, [points]);

  if (points.length < 2) {
    return (
      <div className="tw">
        <EmptyState icon={FinanceIcon}>Még nincs elég adat a grafikonhoz — pár nap múlva itt látod a készletérték alakulását.</EmptyState>
      </div>
    );
  }

  function handleMove(e) {
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0, best = Infinity;
    xy.forEach((p, i) => {
      const d = Math.abs(p.x - px);
      if (d < best) { best = d; nearest = i; }
    });
    setHoverIdx(nearest);
  }

  const xLabelIdx = (() => {
    const n = xy.length;
    const count = Math.min(5, n);
    const idxs = new Set();
    for (let i = 0; i < count; i++) idxs.add(Math.round((i * (n - 1)) / (count - 1 || 1)));
    return idxs;
  })();

  const hp = hoverIdx != null ? xy[hoverIdx] : null;
  const last = xy[xy.length - 1];

  return (
    <div className="tw" style={{ padding: "18px 18px 8px" }}>
      <div style={{ position: "relative" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height: "auto", display: "block", cursor: "crosshair" }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {gridVals.map((v, i) => {
            const y = PAD_T + (1 - v / yMax) * (H - PAD_T - PAD_B);
            return (
              <g key={i}>
                <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#EEF0F2" strokeWidth="1" />
                <text x={PAD_L - 8} y={y + 3} textAnchor="end" fontSize="9.5" fill="#9CA3AF" fontFamily="JetBrains Mono, monospace">
                  {v >= 1000 ? `${Math.round(v / 1000)}k` : Math.round(v)}
                </text>
              </g>
            );
          })}
          {xy.map((p, i) => xLabelIdx.has(i) && (
            <text key={i} x={p.x} y={H - PAD_B + 16} textAnchor="middle" fontSize="9.5" fill="#9CA3AF" fontFamily="Inter, sans-serif">
              {fmtDate(p.date)}
            </text>
          ))}
          <path d={areaPath} fill="#22C55E" opacity="0.1" stroke="none" />
          <path d={path} fill="none" stroke="#22C55E" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={last.x} cy={last.y} r="4" fill="#22C55E" stroke="#fff" strokeWidth="2" />
          <text x={last.x} y={last.y - 12} textAnchor="end" fontSize="11" fontWeight="700" fill="#111827">
            {money(last.value)}
          </text>
          {hp && (
            <>
              <line x1={hp.x} y1={PAD_T} x2={hp.x} y2={H - PAD_B} stroke="#D1D5DB" strokeWidth="1" />
              <circle cx={hp.x} cy={hp.y} r="4" fill="#22C55E" stroke="#fff" strokeWidth="2" />
            </>
          )}
        </svg>
        {hp && (
          <div
            style={{
              position: "absolute", top: 4, pointerEvents: "none",
              left: `${Math.min(Math.max((hp.x / W) * 100, 12), 88)}%`, transform: "translateX(-50%)",
              background: "#111113", color: "#fff", borderRadius: 8, padding: "6px 10px", fontSize: 11.5,
              whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,.2)",
            }}
          >
            <div style={{ fontWeight: 700 }}>{money(hp.value)}</div>
            <div style={{ color: "#9CA3AF", fontSize: 10.5 }}>{fmtDate(hp.date)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
