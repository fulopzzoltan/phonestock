import { useState } from "react";
import LocationField from "./LocationField";
import { CloseIcon } from "./icons";
import { PROBLEM_TAGS } from "../lib/utils";

export default function OwnStockServiceModal({ product, kind, locations, users = [], onClose, onSave, busy }) {
  const [tags, setTags] = useState([]);
  const [extra, setExtra] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [locId, setLocId] = useState(product.locationId || locations[0]?.id || "");
  const toggleTag = (tag) => setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
  const hasIssue = tags.length > 0 || extra.trim();

  function submit() {
    if (!hasIssue) return;
    const issue = [tags.join(","), extra.trim()].filter(Boolean).join(",");
    onSave({
      ticketKind: kind,
      productId: product.id,
      brand: product.brand,
      model: product.model,
      imei: product.imei || "",
      customerName: "Saját készlet",
      customerPhone: "",
      customerId: null,
      price: 0,
      matCost: 0,
      warranty: "",
      handoverDate: "",
      dueDate: "",
      folia: false,
      status: "Átvett",
      subStatus: null,
      assignedTo: assignedTo || null,
      consentAt: null,
      issue,
    }, locId);
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <h2>
          {kind === "Saját készlet - garanciális" ? "Garanciális javítás felvétele" : "Szerviz előkészítés indítása"}
          <button className="iconbtn" onClick={onClose}><CloseIcon /></button>
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid #E5E7EB", borderRadius: 8, marginBottom: 14, fontSize: 13.5, fontWeight: 600 }}>
          {product.brand} {product.model}{product.imei ? ` — IMEI ${product.imei}` : ""}
        </div>
        <LocationField locations={locations} value={locId} onChange={setLocId} />
        <div className="field" style={{ marginTop: 10 }}>
          <label>Mit kell csinálni? {!hasIssue && <span style={{ color: "#DC2626", fontWeight: 400, textTransform: "none" }}>— válassz egy tag-et vagy írj leírást</span>}</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {PROBLEM_TAGS.map((tag) => (
              <button key={tag} type="button" className={`prob-tag${tags.includes(tag) ? " active" : ""}`} onClick={() => toggleTag(tag)}>{tag}</button>
            ))}
          </div>
          <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Egyedi leírás (opcionális)" />
        </div>
        <div className="field">
          <label>Technikus</label>
          <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">— nincs hozzárendelve —</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.fullName || u.email}</option>)}
          </select>
        </div>
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!hasIssue || busy} onClick={submit}>{busy ? "Mentés..." : "Indítás"}</button>
        </div>
      </div>
    </div>
  );
}
