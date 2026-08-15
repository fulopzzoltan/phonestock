export default function Sparkline({ data, variant = "line", color = "var(--primary)", height = 28 }) {
  if (!data || data.length < 2) return null;
  const W = 100, H = height;
  const max = Math.max(...data, 0);
  const min = Math.min(...data, 0);
  const range = Math.max(1, max - min);

  if (variant === "bars") {
    const bw = W / data.length;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
        {data.map((v, i) => {
          const h = Math.max(2, ((v - min) / range) * (H - 2));
          const isLast = i === data.length - 1;
          return (
            <rect key={i} x={i * bw + bw * 0.2} y={H - h} width={bw * 0.6} height={h} rx={1.5}
              fill={isLast ? color : "var(--border-strong)"} opacity={isLast ? 1 : 0.6} />
          );
        })}
      </svg>
    );
  }

  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((v - min) / range) * (H - 4) - 2,
  }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${W},${H} L0,${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      <path d={areaPath} fill={color} opacity="0.12" stroke="none" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2.2" fill={color} />
    </svg>
  );
}
