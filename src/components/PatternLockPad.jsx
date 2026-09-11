import { useMemo, useRef, useState } from "react";

// Android/Samsung 3x3 mintazár — a rácspontokat 1-9-cel számozzuk (bal felső=1, jobb alsó=9),
// mert így hivatkoznak rá a legtöbben ("bal felsőtől jobb alsóig átlósan" stb.), és a tárolt
// érték is ez a sorrend kötőjellel elválasztva, pl. "1-2-3-6-9" — ugyanabba a sima szöveges
// `unlockCode` mezőbe kerül, mint a PIN/jelszó, csak ebben a formátumban.
const SIZE = 220;
const PAD = 30;
const STEP = (SIZE - PAD * 2) / 2;
const POINTS = Array.from({ length: 9 }, (_, i) => {
  const row = Math.floor(i / 3), col = i % 3;
  return { n: i + 1, x: PAD + col * STEP, y: PAD + row * STEP };
});

function parseValue(value) {
  if (!value) return [];
  const nums = value.split("-").map((s) => parseInt(s, 10));
  if (nums.some((n) => Number.isNaN(n) || n < 1 || n > 9)) return [];
  return nums;
}

export default function PatternLockPad({ value, onChange, readOnly }) {
  const [drawing, setDrawing] = useState(null); // menet közbeni rajzolás — a mentett value-tól függetlenül
  const [cursor, setCursor] = useState(null); // az ujj/egér jelenlegi pozíciója (a szabadon lógó vonalszakaszhoz)
  const svgRef = useRef(null);
  const savedSeq = useMemo(() => parseValue(value), [value]);
  const seq = drawing || savedSeq;

  function posFromEvent(e) {
    const rect = svgRef.current.getBoundingClientRect();
    const scale = SIZE / rect.width;
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale };
  }
  function nodeAt(pos) {
    return POINTS.find((p) => Math.hypot(p.x - pos.x, p.y - pos.y) < 22);
  }
  function start(e) {
    if (readOnly) return;
    const pos = posFromEvent(e);
    const n = nodeAt(pos);
    if (!n) return;
    e.preventDefault();
    svgRef.current.setPointerCapture(e.pointerId);
    setDrawing([n.n]);
    setCursor(pos);
  }
  function move(e) {
    if (!drawing) return;
    const pos = posFromEvent(e);
    setCursor(pos);
    const n = nodeAt(pos);
    if (n && !drawing.includes(n.n)) setDrawing([...drawing, n.n]);
  }
  function end() {
    if (!drawing) return;
    if (drawing.length >= 2) onChange(drawing.join("-"));
    setDrawing(null);
    setCursor(null);
  }
  function clear() {
    onChange("");
    setDrawing(null);
  }

  const linePoints = seq.map((n) => POINTS[n - 1]);

  return (
    <div className="pattern-pad">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={`pattern-pad-svg${readOnly ? " readonly" : ""}`}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={() => drawing && end()}
      >
        {linePoints.length > 1 && (
          <polyline
            points={linePoints.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
          />
        )}
        {drawing && cursor && linePoints.length > 0 && (
          <line
            x1={linePoints[linePoints.length - 1].x} y1={linePoints[linePoints.length - 1].y}
            x2={cursor.x} y2={cursor.y}
            stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" opacity="0.5"
          />
        )}
        {POINTS.map((p) => {
          const active = seq.includes(p.n);
          return (
            <g key={p.n}>
              <circle cx={p.x} cy={p.y} r="16" fill={active ? "var(--accent)" : "#F3F4F6"} stroke={active ? "var(--accent-dark)" : "#D1D5DB"} strokeWidth="2" />
              {active && <circle cx={p.x} cy={p.y} r="5" fill="#fff" />}
            </g>
          );
        })}
      </svg>
      <div className="pattern-pad-actions">
        <span className="pattern-pad-hint">
          {readOnly ? (seq.length ? "Mentett minta" : "Nincs megadva") : seq.length ? `${seq.length} pont összekötve` : "Rajzold le a mintát"}
        </span>
        {!readOnly && seq.length > 0 && (
          <button type="button" className="btn sec sm" onClick={clear}>Törlés / újrarajzolás</button>
        )}
      </div>
    </div>
  );
}
