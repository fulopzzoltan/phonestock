import { useState } from "react";
import { money, partCode, ticketCode } from "../lib/utils";
import { CloseIcon } from "./icons";
import Row from "./DetailRow";
import ConfirmDelete from "./ConfirmDelete";

const STATUS_BADGE = {
  "raktáron": "badge-income",
  "felhasznalva": "gar-pill",
  "hibás": "badge-expense",
  "visszaküldve": "badge-refurb",
};
const STATUS_OPTIONS = ["raktáron", "hibás", "visszaküldve"];

function UnitStatusEditor({ unit, busy, onSave, onCancel }) {
  const [status, setStatus] = useState(unit.status === "felhasznalva" ? "hibás" : unit.status);
  const [note, setNote] = useState(unit.rmaNote || "");
  return (
    <div style={{ marginTop: 6, padding: 10, background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 10 }}>
      <div className="row2" style={{ marginBottom: 6 }}>
        <div className="field" style={{ margin: 0 }}>
          <label>Státusz</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="field" style={{ margin: 0, marginBottom: 8 }}>
        <label>Megjegyzés <span style={{ color: "#9CA3AF", fontWeight: 400 }}>— opcionális, pl. RMA részletek</span></label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="2026.09.02, visszaküldve GSMnet-nek, csereszám: ..." />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn sm" disabled={busy} onClick={() => onSave(status, note)}>Mentés</button>
        <button className="btn sec sm" onClick={onCancel}>Mégse</button>
      </div>
    </div>
  );
}

export default function PartDetailPanel({ part, allUnits = [], onClose, onEdit, onDelete, onDeleteUnit, busy, partUsage = [], onOpenTicket, onUpdateStatus, locName }) {
  const [editingUnitId, setEditingUnitId] = useState(null);
  const otherUnits = allUnits.filter((u) => u.status !== "raktáron");

  return (
    <div className="detail-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="detail-panel">
        <div className="dp-head">
          <div>
            <div className="dp-sn">{partCode(part.partNo)}</div>
            <div className="dp-name">{part.name}</div>
          </div>
          <button className="iconbtn" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="dp-body">
          <div className="dp-section">
            <div className="dp-section-title">Alkatrész adatok</div>
            <Row k="Kategória" v={part.category} />
            <Row k="Márka" v={part.brand} />
            <Row k="Mire illik" v={part.modelFit} />
            <Row k="Raktáron" v={`${part.quantity} db`} />
            <Row k="Forrás" v={part.source} />
            <Row k="Eredet" v={part.origin} />
            <Row k="Beszállítói cikkszám" v={part.supplierSku ? <span className="mono">{part.supplierSku}</span> : null} />
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Pénzügyek</div>
            <Row k="Átlagos beérkezési ár" v={money(part.costPrice)} />
            <Row k="Raktár értéke" v={money((Number(part.costPrice) || 0) * (Number(part.quantity) || 0))} />
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Egyedi tételek raktáron</div>
            {part.units.map((u) => (
              <div key={u.id}>
                <div className="dp-row">
                  <span className="dp-key">{partCode(u.partNo)}</span>
                  <span className="dp-val" style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                    {money(u.costPrice)}
                    <button type="button" className="btn sec sm" disabled={busy} onClick={() => setEditingUnitId(editingUnitId === u.id ? null : u.id)}>
                      {editingUnitId === u.id ? "Bezár" : "Hibásnak jelölöm"}
                    </button>
                    <ConfirmDelete disabled={busy} onConfirm={() => onDeleteUnit(u.id)} />
                  </span>
                </div>
                {editingUnitId === u.id && (
                  <UnitStatusEditor
                    unit={u}
                    busy={busy}
                    onCancel={() => setEditingUnitId(null)}
                    onSave={(status, note) => { onUpdateStatus(u.id, status, note); setEditingUnitId(null); }}
                  />
                )}
              </div>
            ))}
          </div>
          {otherUnits.length > 0 && (
            <div className="dp-section">
              <div className="dp-section-title">Felhasznált / hibás / visszaküldött darabok</div>
              {otherUnits.map((u) => (
                <div key={u.id}>
                  <div className="dp-row">
                    <span className="dp-key">
                      {partCode(u.partNo)} <span className={STATUS_BADGE[u.status] || "gar-pill"} style={{ marginLeft: 6 }}>{u.status}</span>
                    </span>
                    <span className="dp-val" style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                      {u.rmaNote && <span style={{ color: "#9CA3AF", fontSize: 11.5 }}>{u.rmaNote}</span>}
                      <button type="button" className="btn sec sm" disabled={busy} onClick={() => setEditingUnitId(editingUnitId === u.id ? null : u.id)}>
                        {editingUnitId === u.id ? "Bezár" : "Státusz"}
                      </button>
                    </span>
                  </div>
                  {editingUnitId === u.id && (
                    <UnitStatusEditor
                      unit={u}
                      busy={busy}
                      onCancel={() => setEditingUnitId(null)}
                      onSave={(status, note) => { onUpdateStatus(u.id, status, note); setEditingUnitId(null); }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="dp-section">
            <div className="dp-section-title">Felhasználási előzmény</div>
            {partUsage.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "#9CA3AF" }}>Ez az alkatrész-típus még nem lett felhasználva munkalapon.</div>
            ) : partUsage.map((sp) => (
              <div key={sp.id} className="dp-row" style={{ cursor: "pointer" }} onClick={() => onOpenTicket(sp.ticket.id)}>
                <span className="dp-key">{ticketCode(sp.ticket.ticketNo, locName(sp.ticket.intakeLocationId || sp.ticket.locationId))} — {[sp.ticket.brand, sp.ticket.model].filter(Boolean).join(" ")}</span>
                <span className="dp-val">{sp.quantity} db · {sp.ticket.dateIn}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="dp-actions">
          <button className="btn sec sm" disabled={busy} onClick={() => onEdit(part)}>Szerkesztés</button>
          <ConfirmDelete variant="full" disabled={busy} onConfirm={() => onDelete(part)} />
        </div>
      </div>
    </div>
  );
}
