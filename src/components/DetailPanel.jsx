import { useState } from "react";
import { money, STATUSES, SUB_STATUSES } from "../lib/utils";
import { CloseIcon, TrashIcon } from "./icons";
import Row from "./DetailRow";
import CallLink from "./CallLink";

export default function DetailPanel({ ticket, locName, parts, onClose, onStatusChange, onEdit, onDelete, busy, onAddPart, onRemovePart, onPrint }) {
  const [copied, setCopied] = useState(false);
  const [showAddPart, setShowAddPart] = useState(false);
  const [selPartId, setSelPartId] = useState("");
  const [qty, setQty] = useState(1);
  const usedParts = ticket.usedParts || [];
  const availableParts = (parts || []).filter((p) => Number(p.quantity) > 0);
  const selPart = availableParts.find((p) => p.id === selPartId);
  const probs = (ticket.issue || "").split(",").map((p) => p.trim()).filter(Boolean);
  const profit = (Number(ticket.price) || 0) - (Number(ticket.matCost) || 0);
  const statusLink = `${window.location.origin}/status/${ticket.publicToken}`;

  function copyStatusLink() {
    navigator.clipboard.writeText(statusLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="detail-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="detail-panel">
        <div className="dp-head">
          <div>
            <div className="dp-sn">#{ticket.ticketNo}</div>
            <div className="dp-name">{ticket.customerName} — {[ticket.brand, ticket.model].filter(Boolean).join(" ")}</div>
          </div>
          <button className="iconbtn" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="dp-body">
          <div className="dp-section">
            <div className="dp-section-title">Státusz módosítás</div>
            <div className="dp-status-row">
              {STATUSES.map((c) => (
                <button key={c.key} className={`dp-st-btn${ticket.status === c.key ? " active" : ""}`} disabled={busy}
                  onClick={() => onStatusChange(ticket.id, c.key, SUB_STATUSES[c.key]?.[0]?.key ?? null)}>{c.key}</button>
              ))}
            </div>
            {(SUB_STATUSES[ticket.status] || []).length > 1 && (
              <div className="dp-status-row" style={{ marginTop: 8 }}>
                {SUB_STATUSES[ticket.status].map((s) => (
                  <button key={s.label} className={`dp-st-btn${(ticket.subStatus || null) === s.key ? " active" : ""}`} disabled={busy}
                    onClick={() => onStatusChange(ticket.id, ticket.status, s.key)}>{s.label}</button>
                ))}
              </div>
            )}
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Kliens adatok</div>
            <Row k="Kliens" v={ticket.customerName} />
            <Row k="Telefonszám" v={ticket.customerPhone ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {ticket.customerPhone}
                <CallLink phone={ticket.customerPhone} />
              </span>
            ) : null} />
            <Row k="Helyszín" v={locName(ticket.locationId)} />
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Ügyfél nyomon követés</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8, lineHeight: 1.5 }}>
              Ezzel az egyedi linkkel a vevő bejelentkezés és adatmegadás nélkül, azonnal látja a javítás állapotát.
            </div>
            <button type="button" className="btn sec sm" onClick={copyStatusLink}>{copied ? "Másolva!" : "Nyomon követő link másolása"}</button>
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Eszköz & Javítás</div>
            <Row k="Márka" v={ticket.brand} />
            <Row k="Modell" v={ticket.model} />
            <Row k="Probléma" v={probs.length ? probs.map((p, i) => <span key={i} className="prob-pill">{p}</span>) : null} />
            <Row k="Garancia" v={ticket.warranty ? <span className="gar-pill">{ticket.warranty}</span> : null} />
            <Row k="Fólia" v={ticket.folia ? <span style={{ color: "#22C55E", fontWeight: 700 }}>✓ Igen</span> : "Nem"} />
            <Row k="Átadás dátuma" v={ticket.handoverDate} />
            <Row k="Beérkezés" v={ticket.dateIn} />
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Felhasznált alkatrészek</div>
            {usedParts.length > 0 && usedParts.map((sp) => (
              <div key={sp.id} className="dp-row">
                <span className="dp-key">{sp.partName} ×{sp.quantity}</span>
                <span className="dp-val" style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                  {money((sp.costPrice || 0) * sp.quantity)}
                  <button className="iconbtn" disabled={busy} onClick={() => onRemovePart(ticket.id, sp)}><TrashIcon /></button>
                </span>
              </div>
            ))}
            {showAddPart ? (
              <div className="row2" style={{ marginTop: 8, alignItems: "flex-end" }}>
                <div className="field" style={{ margin: 0 }}>
                  <select value={selPartId} onChange={(e) => setSelPartId(e.target.value)}>
                    <option value="">— Alkatrész —</option>
                    {availableParts.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.quantity} db)</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input type="number" min="1" max={selPart?.quantity || 1} value={qty} onChange={(e) => setQty(Number(e.target.value))}
                    style={{ width: 56, background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 9, padding: "9px 8px", fontFamily: "inherit", fontSize: 13 }} />
                  <button className="btn sm" disabled={!selPart || busy} onClick={() => { if (selPart) { onAddPart(ticket.id, selPart, qty); setShowAddPart(false); setSelPartId(""); setQty(1); } }}>OK</button>
                  <button className="iconbtn" onClick={() => setShowAddPart(false)}><CloseIcon width={14} height={14} /></button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn sec sm" style={{ marginTop: usedParts.length ? 8 : 0 }} onClick={() => setShowAddPart(true)}>+ Alkatrész hozzáadása</button>
            )}
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Pénzügyek</div>
            <Row k="Árajánlat" v={money(ticket.price)} />
            <Row k="Anyagköltség" v={money(ticket.matCost)} />
            <Row k="Profit" v={<span style={{ color: "#22C55E", fontWeight: 700 }}>{money(profit)}</span>} />
          </div>
        </div>
        <div className="dp-actions">
          <button className="btn sec sm" onClick={() => onPrint(ticket)}>Nyomtatás</button>
          <button className="btn sec sm" disabled={busy} onClick={() => onEdit(ticket)}>Szerkesztés</button>
          <button className="btn sm danger" disabled={busy} onClick={() => onDelete(ticket.id)}>Törlés</button>
        </div>
      </div>
    </div>
  );
}
