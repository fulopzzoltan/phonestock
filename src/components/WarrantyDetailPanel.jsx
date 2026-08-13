import { useState } from "react";
import { WARRANTIES, today } from "../lib/utils";
import { CloseIcon } from "./icons";
import Row from "./DetailRow";
import CallLink from "./CallLink";
import ConfirmDelete from "./ConfirmDelete";

export default function WarrantyDetailPanel({ w, locName, onClose, onPrint, onEditLinked, onEditManual, onDeleteLinked, onDeleteManual, busy }) {
  const [editing, setEditing] = useState(false);
  const [warranty, setWarranty] = useState(w.warranty);
  const [fromDate, setFromDate] = useState(w.from);
  const daysLeft = w.expiry ? Math.ceil((new Date(w.expiry) - new Date(today())) / 86400000) : null;

  return (
    <div className="detail-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="detail-panel">
        <div className="dp-head">
          <div>
            <div className="dp-sn">{w.kind === "sale" ? "Telefon garancia" : "Szerviz garancia"}{w.source === "manual" ? " · kézi" : ""}</div>
            <div className="dp-name">{w.customerName} — {w.label}</div>
          </div>
          <button className="iconbtn" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="dp-body">
          <div className="dp-section">
            <div className="dp-section-title">Ügyfél</div>
            <Row k="Név" v={w.customerName || "—"} />
            <Row k="Telefonszám" v={w.customerPhone ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>{w.customerPhone}<CallLink phone={w.customerPhone} /></span>
            ) : "—"} />
            <Row k="Helyszín" v={locName(w.locationId)} />
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Garancia</div>
            {!editing ? (
              <>
                <Row k="Termék / Eszköz" v={w.label} />
                <Row k="Garanciaidő" v={<span className="gar-pill">{w.warranty}</span>} />
                <Row k="Kezdete" v={w.from} />
                <Row k="Lejárat" v={<span style={{ fontWeight: 700, color: daysLeft != null && daysLeft <= 14 ? "#DC2626" : "#111827" }}>
                  {w.expiry} {daysLeft != null && <span style={{ fontWeight: 500, color: "#9CA3AF" }}>({daysLeft} nap)</span>}
                </span>} />
                {w.note && <Row k="Jegyzet" v={w.note} />}
              </>
            ) : (
              <div className="row2" style={{ alignItems: "flex-end" }}>
                <div className="field" style={{ margin: 0 }}>
                  <label>Garanciaidő</label>
                  <select value={warranty} onChange={(e) => setWarranty(e.target.value)}>
                    {WARRANTIES.map((wr) => <option key={wr} value={wr}>{wr}</option>)}
                  </select>
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>Kezdete</label>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="dp-actions">
          <button className="btn sec sm" onClick={() => onPrint(w)}>Nyomtatás</button>
          {editing ? (
            <>
              <button className="btn sm" disabled={busy} onClick={() => { onEditLinked(w.kind, w.refId, warranty, fromDate); setEditing(false); }}>Mentés</button>
              <button className="btn sec sm" onClick={() => setEditing(false)}>Mégse</button>
            </>
          ) : w.source === "manual" ? (
            <button className="btn sec sm" disabled={busy} onClick={() => onEditManual(w)}>Szerkesztés</button>
          ) : (
            <button className="btn sec sm" disabled={busy} onClick={() => setEditing(true)}>Szerkesztés</button>
          )}
          {w.source === "manual" ? (
            <ConfirmDelete variant="full" disabled={busy} onConfirm={() => onDeleteManual(w.refId)} />
          ) : (
            <ConfirmDelete
              variant="full"
              label="Garancia törlése"
              confirmLabel="Csak a garancia törlődik. Biztos?"
              disabled={busy}
              onConfirm={() => onDeleteLinked(w.kind, w.refId)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
