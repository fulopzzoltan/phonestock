import { useState } from "react";
import LocationField from "./LocationField";
import { CloseIcon } from "./icons";
import { PROBLEM_TAGS, WARRANTIES, STATUSES } from "../lib/utils";

function parseIssue(issue) {
  const parts = (issue || "").split(",").map((p) => p.trim()).filter(Boolean);
  const tags = parts.filter((p) => PROBLEM_TAGS.includes(p));
  const extra = parts.filter((p) => !PROBLEM_TAGS.includes(p)).join(", ");
  return { tags, extra };
}

export default function TicketFormModal({ ticket, locations, defaultLocId, onClose, onSave, busy }) {
  const isEdit = !!ticket;
  const parsed = parseIssue(ticket?.issue);
  const [f, setF] = useState({
    customerName: ticket?.customerName || "",
    customerPhone: ticket?.customerPhone || "",
    brand: ticket?.brand || "",
    model: ticket?.model || "",
    price: ticket?.price ?? "",
    matCost: ticket?.matCost ?? "",
    warranty: ticket?.warranty || "",
    handoverDate: ticket?.handoverDate || "",
    folia: ticket?.folia || false,
    status: ticket?.status || "Bevéve",
    extra: parsed.extra,
  });
  const [tags, setTags] = useState(parsed.tags);
  const [locId, setLocId] = useState(ticket?.locationId || defaultLocId || locations[0]?.id || "");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggleTag = (tag) => setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
  const valid = f.customerName.trim() && f.brand.trim() && locId;

  function submit() {
    if (!valid) return;
    const issue = [tags.join(","), f.extra.trim()].filter(Boolean).join(",");
    onSave({ ...f, issue }, locId);
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? "Munkalap szerkesztése" : "Új szerviz munkalap"} <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        <div className="row2">
          <LocationField locations={locations} value={locId} onChange={setLocId} />
          <div className="field"><label>Státusz</label>
            <select value={f.status} onChange={set("status")}>
              {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.key}</option>)}
            </select>
          </div>
        </div>
        <div className="row2">
          <div className="field"><label>Kliens neve</label><input value={f.customerName} onChange={set("customerName")} placeholder="Kovács János" /></div>
          <div className="field"><label>Telefonszám</label><input value={f.customerPhone} onChange={set("customerPhone")} placeholder="07xx xxx xxx" /></div>
        </div>
        <div className="row2">
          <div className="field"><label>Márka</label><input value={f.brand} onChange={set("brand")} placeholder="Samsung, Apple..." /></div>
          <div className="field"><label>Modell</label><input value={f.model} onChange={set("model")} placeholder="S22, iPhone 12..." /></div>
        </div>
        <div className="field"><label>Probléma</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {PROBLEM_TAGS.map((tag) => (
              <button key={tag} type="button" className={`prob-tag${tags.includes(tag) ? " active" : ""}`} onClick={() => toggleTag(tag)}>{tag}</button>
            ))}
          </div>
          <input value={f.extra} onChange={set("extra")} placeholder="Egyedi leírás (opcionális)" />
        </div>
        <div className="row3">
          <div className="field"><label>Árajánlat (Lei)</label><input type="number" value={f.price} onChange={set("price")} placeholder="0" /></div>
          <div className="field"><label>Anyagköltség (Lei)</label><input type="number" value={f.matCost} onChange={set("matCost")} placeholder="0" /></div>
          <div className="field"><label>Garancia</label>
            <select value={f.warranty} onChange={set("warranty")}>
              <option value="">—</option>
              {WARRANTIES.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </div>
        <div className="row2">
          <div className="field"><label>Átadás dátuma</label><input type="date" value={f.handoverDate} onChange={set("handoverDate")} /></div>
          <div className="field" style={{ display: "flex", alignItems: "flex-end", paddingBottom: 3 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", fontWeight: 500, textTransform: "none", letterSpacing: 0, cursor: "pointer" }}>
              <input type="checkbox" className="chk" checked={f.folia} onChange={(e) => setF({ ...f, folia: e.target.checked })} /> Fólia felhelyezve
            </label>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!valid || busy} onClick={submit}>{busy ? "Mentés..." : isEdit ? "Mentés" : "Létrehozás"}</button>
        </div>
      </div>
    </div>
  );
}
