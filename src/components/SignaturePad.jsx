import { useRef, useState, useEffect } from "react";

export default function SignaturePad({ onSave, busy }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
  }, []);

  function pos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e) {
    e.preventDefault();
    drawing.current = true;
    const { x, y } = pos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const { x, y } = pos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasDrawn) setHasDrawn(true);
  }

  function end() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  function save() {
    onSave(canvasRef.current.toDataURL("image/png"));
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: 180, background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 12, touchAction: "none", cursor: "crosshair" }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button type="button" className="btn sec sm" onClick={clear} disabled={busy}>Törlés</button>
        <button type="button" className="btn sm" style={{ flex: 1, justifyContent: "center" }} onClick={save} disabled={busy || !hasDrawn}>
          {busy ? "Mentés..." : "Aláírás mentése"}
        </button>
      </div>
    </div>
  );
}
