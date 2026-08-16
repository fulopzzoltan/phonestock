import { money } from "../lib/utils";
import { CloseIcon } from "./icons";

const KIND_BADGE = {
  purchase: "badge-loc",
  sale: "badge-income",
  ticket: "badge-loc",
};

export default function DeviceHistoryPanel({ history, onClose }) {
  if (!history) return null;
  const { imei, brand, model, repeatCount, timeline } = history;
  return (
    <div className="detail-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="detail-panel">
        <div className="dp-head">
          <div>
            <div className="dp-sn">Eszköz előzmény</div>
            <div className="dp-name">{brand} {model} — <span className="mono">{imei}</span></div>
          </div>
          <button className="iconbtn" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="dp-body">
          {repeatCount > 1 && (
            <div className="statcard warn" style={{ marginBottom: 16 }}>
              <div className="lbl">Figyelem</div>
              <div className="val" style={{ fontSize: 13.5, lineHeight: 1.4 }}>
                Ez az IMEI eddig {repeatCount} alkalommal került be hozzánk termékként — érdemes átnézni, mi történik ezzel a készülékkel.
              </div>
            </div>
          )}
          <div className="dp-section">
            <div className="dp-section-title">Idővonal ({timeline.length} esemény)</div>
            {timeline.length === 0 && <div style={{ color: "#9CA3AF", fontSize: 12.5 }}>Nincs rögzített esemény.</div>}
            {timeline.map((e, i) => (
              <div key={i} className="dp-row" style={{ alignItems: "center", cursor: e.onOpen ? "pointer" : undefined }} onClick={e.onOpen}>
                <span className="dp-key">{e.date || "—"} · <span className={`st ${KIND_BADGE[e.kind]}`} style={{ marginLeft: 4 }}>{e.label}</span></span>
                <span className="dp-val">{e.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
