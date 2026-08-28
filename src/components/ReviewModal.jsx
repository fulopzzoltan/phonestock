import { useState } from "react";
import { CloseIcon, StarIcon } from "./icons";
import { today } from "../lib/utils";

const SOURCES = [
  { key: "kezi", label: "Kézzel felvitt" },
  { key: "google", label: "Google" },
  { key: "facebook", label: "Facebook" },
  { key: "importalt", label: "Importált (régi oldal)" },
];

function StarPicker({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: n <= value ? "#F59E0B" : "#E5E7EB" }}
        >
          <StarIcon width={22} height={22} fill="currentColor" stroke="none" />
        </button>
      ))}
    </div>
  );
}

export default function ReviewModal({ review, locations, onClose, onSave, busy }) {
  const [f, setF] = useState({
    authorName: review?.authorName || "",
    rating: review?.rating || 5,
    body: review?.body || "",
    reviewDate: review?.reviewDate || today(),
    source: review?.source || "kezi",
    locationId: review?.locationId || "",
    isPublished: review?.isPublished !== false,
    replyText: review?.replyText || "",
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.authorName.trim() && f.body.trim();

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{review ? "Vélemény szerkesztése" : "Új vélemény"} <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>

        <div className="row2">
          <div className="field"><label>Vevő neve</label><input value={f.authorName} onChange={set("authorName")} placeholder="pl. Kovács János" /></div>
          <div className="field"><label>Dátum</label><input type="date" value={f.reviewDate} onChange={set("reviewDate")} /></div>
        </div>

        <div className="field">
          <label>Értékelés</label>
          <StarPicker value={f.rating} onChange={(n) => setF({ ...f, rating: n })} />
        </div>

        <div className="field"><label>Szöveg</label>
          <textarea rows={4} value={f.body} onChange={set("body")} placeholder="A vélemény szövege..." />
        </div>

        <div className="row2">
          <div className="field"><label>Forrás</label>
            <select value={f.source} onChange={set("source")}>
              {SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div className="field"><label>Melyik boltról szól (opcionális)</label>
            <select value={f.locationId} onChange={set("locationId")}>
              <option value="">— nincs megjelölve —</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>

        <div className="field"><label>Válaszotok a véleményre (opcionális, publikusan is látszik)</label>
          <textarea rows={2} value={f.replyText} onChange={set("replyText")} placeholder="pl. Köszönjük a bizalmat!" />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", marginTop: 6 }}>
          <input type="checkbox" checked={f.isPublished} onChange={(e) => setF({ ...f, isPublished: e.target.checked })} />
          Publikus (megjelenik a webshopon)
        </label>

        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!valid || busy} onClick={() => valid && onSave(f)}>{busy ? "Mentés..." : "Mentés"}</button>
        </div>
      </div>
    </div>
  );
}
