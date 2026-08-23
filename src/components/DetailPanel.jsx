import { useState } from "react";
import { money, STATUSES, SUB_STATUSES, slaInfo, SITE_URL, statusLabel, ticketCode, partCode } from "../lib/utils";
import { supabase } from "../lib/supabaseClient";
import { CloseIcon } from "./icons";
import Row from "./DetailRow";
import CallLink from "./CallLink";
import ConfirmDelete from "./ConfirmDelete";
import TicketPhotos from "./TicketPhotos";
import PhonePartsPicker from "./PhonePartsPicker";

function signatureUrl(path) {
  return supabase.storage.from("signatures").getPublicUrl(path).data.publicUrl;
}

export default function DetailPanel({ ticket, locName, parts, stock, users = [], customers = [], rewards = [], onClose, onStatusChange, onCompleteQc, onEdit, onDelete, busy, onAddPart, onRemovePart, onPrint, onShowHistory }) {
  const [copied, setCopied] = useState(false);
  const [showAddPart, setShowAddPart] = useState(false);
  const [selPartId, setSelPartId] = useState("");
  const [qty, setQty] = useState(1);
  const [qcUserId, setQcUserId] = useState("");
  const [partFilter, setPartFilter] = useState("");
  const userName = (id) => users.find((u) => u.id === id)?.fullName || users.find((u) => u.id === id)?.email || "—";
  const usedParts = ticket.usedParts || [];
  const availableParts = (parts || []).filter((p) => Number(p.quantity) > 0);
  const selPart = availableParts.find((p) => p.id === selPartId);
  const partFilterQ = partFilter.trim().toLowerCase();
  const shownParts = partFilterQ
    ? availableParts.filter((p) => (p.name || "").toLowerCase().includes(partFilterQ) || (partCode(p.partNo) || "").toLowerCase().includes(partFilterQ))
    : availableParts;
  const probs = (ticket.issue || "").split(",").map((p) => p.trim()).filter(Boolean);
  const profit = (Number(ticket.price) || 0) - (Number(ticket.matCost) || 0);
  const statusLink = `${SITE_URL}/status/${ticket.publicToken}`;
  const sla = slaInfo(ticket);
  const intakeSignature = (ticket.signatures || []).find((s) => s.stage === "service_intake");
  const handoverSignature = (ticket.signatures || []).find((s) => s.stage === "service_handover");
  const handoverSignAllowed = ticket.status === "Átadásra" && ticket.subStatus !== "Sikertelen";
  const ticketCustomer = ticket.customerId ? customers.find((c) => c.id === ticket.customerId) : null;
  const redeemableForCustomer = ticketCustomer
    ? rewards.filter((r) => r.active && r.pointCost <= (ticketCustomer.loyaltyPointsBalance || 0)).sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

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
            <div className="dp-sn">{ticketCode(ticket.ticketNo, locName(ticket.intakeLocationId || ticket.locationId))}</div>
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
                  onClick={() => onStatusChange(ticket.id, c.key, SUB_STATUSES[c.key]?.[0]?.key ?? null)}>{statusLabel(c.key)}</button>
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
            {ticketCustomer && (ticketCustomer.loyaltyPointsBalance || 0) > 0 && (
              <div style={{ fontSize: 12, color: "var(--primary-ink)", background: "var(--primary-soft)", borderRadius: 9, padding: "8px 12px", marginTop: 4 }}>
                Ennek az ügyfélnek {ticketCustomer.loyaltyPointsBalance} pontja van
                {redeemableForCustomer.length > 0 ? <> — beváltható: {redeemableForCustomer.map((r) => r.label).join(", ")} (a Kliens-lapon)</> : "."}
              </div>
            )}
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Ügyfél nyomon követés</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8, lineHeight: 1.5 }}>
              Ezzel az egyedi linkkel a vevő bejelentkezés és adatmegadás nélkül, azonnal látja a javítás állapotát.
            </div>
            <button type="button" className="btn sec sm" onClick={copyStatusLink}>{copied ? "Másolva!" : "Nyomon követő link másolása"}</button>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {intakeSignature ? (
                <a className="btn sec sm" href={signatureUrl(intakeSignature.imagePath)} target="_blank" rel="noreferrer" style={{ color: "#22C55E" }}>
                  ✓ Átvétel aláírva {intakeSignature.signedAt?.slice(0, 10)}
                </a>
              ) : (
                <button type="button" className="btn sec sm" onClick={() => window.open(`${statusLink}?sign=service_intake`, "_blank")}>Átvételi aláíratás</button>
              )}
              {handoverSignature ? (
                <a className="btn sec sm" href={signatureUrl(handoverSignature.imagePath)} target="_blank" rel="noreferrer" style={{ color: "#22C55E" }}>
                  ✓ Átadás aláírva {handoverSignature.signedAt?.slice(0, 10)}
                </a>
              ) : (
                <button type="button" className="btn sec sm" disabled={!handoverSignAllowed} onClick={() => window.open(`${statusLink}?sign=service_handover`, "_blank")}>Átadási aláíratás</button>
              )}
            </div>
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Eszköz & Javítás</div>
            <Row k="Márka" v={ticket.brand} />
            <Row k="Modell" v={ticket.model} />
            <Row k="IMEI" v={ticket.imei ? <span className="mono">{ticket.imei}</span> : null} />
            {ticket.imei && (
              <button type="button" className="btn sec sm" style={{ marginTop: 4, marginBottom: 4 }} onClick={() => onShowHistory(ticket.imei)}>Eszköz előzmény megtekintése</button>
            )}
            <Row k="Probléma" v={probs.length ? probs.map((p, i) => <span key={i} className="prob-pill">{p}</span>) : null} />
            <Row k="Garancia" v={ticket.warranty ? <span className="gar-pill">{ticket.warranty}</span> : null} />
            <Row k="Fólia" v={ticket.folia ? (
              <span style={{ color: "#22C55E", fontWeight: 700 }}>
                ✓ Igen{ticket.foliaUpsellRequested ? ` (ügyfél kérte online, +${money(ticket.foliaUpsellPrice)})` : ""}
              </span>
            ) : "Nem"} />
            <Row k="Beérkezés" v={ticket.dateIn} />
            <Row k="Átadás dátuma" v={ticket.handoverDate} />
            <Row k="Határidő (SLA)" v={ticket.dueDate ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {ticket.dueDate}
                {sla && (sla.level === "warn" || sla.level === "overdue") && (
                  <span className={`sla-badge sla-${sla.level}`}>{sla.label}</span>
                )}
              </span>
            ) : null} />
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Minőség &amp; nyomon követhetőség</div>
            <Row k="Technikus" v={ticket.assignedTo ? userName(ticket.assignedTo) : null} />
            <Row k="Ügyfél beleegyezése" v={ticket.consentAt ? <span style={{ color: "#22C55E", fontWeight: 700 }}>✓ Elfogadva ({ticket.consentAt.slice(0, 10)})</span> : <span style={{ color: "#DC2626" }}>Nincs rögzítve</span>} />
            <Row k="Minőségellenőrzés" v={ticket.qcAt ? <span style={{ color: "#22C55E", fontWeight: 700 }}>✓ {userName(ticket.qcBy)} ({ticket.qcAt.slice(0, 10)})</span> : null} />
            {ticket.status === "Minőségellenőrzés" && (
              <div className="row2" style={{ marginTop: 8, alignItems: "flex-end" }}>
                <div className="field" style={{ margin: 0 }}>
                  <label>Tesztelte</label>
                  <select value={qcUserId} onChange={(e) => setQcUserId(e.target.value)}>
                    <option value="">— válassz —</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.fullName || u.email}</option>)}
                  </select>
                </div>
                <button className="btn sm" disabled={busy} onClick={() => onCompleteQc(ticket.id, qcUserId || null)}>QC lezárva → Átvehető</button>
              </div>
            )}
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Felhasznált alkatrészek</div>
            {ticket.ticketKind === "Saját készlet - előkészítés" ? (
              <PhonePartsPicker
                usedParts={usedParts}
                availableParts={availableParts}
                allParts={parts || []}
                onAdd={(part, qty) => onAddPart(ticket.id, part, qty)}
                onRemove={(sp) => onRemovePart(ticket.id, sp)}
                busy={busy}
              />
            ) : (
              <>
                {usedParts.length > 0 && usedParts.map((sp) => (
                  <div key={sp.id} className="dp-row">
                    <span className="dp-key">{sp.partName} ×{sp.quantity}</span>
                    <span className="dp-val" style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                      {money((sp.costPrice || 0) * sp.quantity)}
                      <ConfirmDelete disabled={busy} onConfirm={() => onRemovePart(ticket.id, sp)} />
                    </span>
                  </div>
                ))}
                {showAddPart ? (
                  <div style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      placeholder="Keresés név vagy kód szerint (pl. A123)..."
                      value={partFilter}
                      onChange={(e) => setPartFilter(e.target.value)}
                      style={{ marginBottom: 6, width: "100%", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 9, padding: "8px 10px", fontFamily: "inherit", fontSize: 12.5 }}
                    />
                    <div className="row2" style={{ alignItems: "flex-end" }}>
                      <div className="field" style={{ margin: 0 }}>
                        <select value={selPartId} onChange={(e) => setSelPartId(e.target.value)}>
                          <option value="">— Alkatrész ({shownParts.length}) —</option>
                          {shownParts.map((p) => <option key={p.id} value={p.id}>{partCode(p.partNo)} — {p.name} ({p.quantity} db)</option>)}
                        </select>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input type="number" min="1" max={selPart?.quantity || 1} value={qty} onChange={(e) => setQty(Number(e.target.value))}
                          style={{ width: 56, background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 9, padding: "9px 8px", fontFamily: "inherit", fontSize: 13 }} />
                        <button className="btn sm" disabled={!selPart || busy} onClick={() => { if (selPart) { onAddPart(ticket.id, selPart, qty); setShowAddPart(false); setSelPartId(""); setQty(1); setPartFilter(""); } }}>OK</button>
                        <button className="iconbtn" onClick={() => { setShowAddPart(false); setPartFilter(""); }}><CloseIcon width={14} height={14} /></button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="btn sec sm" style={{ marginTop: usedParts.length ? 8 : 0 }} onClick={() => setShowAddPart(true)}>+ Alkatrész hozzáadása</button>
                )}
              </>
            )}
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Pénzügyek</div>
            <Row k="Árajánlat" v={money(ticket.price)} />
            <Row k="Anyagköltség" v={money(ticket.matCost)} />
            <Row k="Profit" v={<span style={{ color: "#22C55E", fontWeight: 700 }}>{money(profit)}</span>} />
            {ticket.ticketKind === "Saját készlet - előkészítés" && ticket.productId && (
              <Row k="Telefon beszerzési ára most" v={<span style={{ fontWeight: 700 }}>{money(stock?.find((p) => p.id === ticket.productId)?.costPrice)}</span>} />
            )}
          </div>
          <TicketPhotos ticketId={ticket.id} />
        </div>
        <div className="dp-actions">
          <button className="btn sec sm" onClick={() => onPrint(ticket)}>Nyomtatás</button>
          <button className="btn sec sm" disabled={busy} onClick={() => onEdit(ticket)}>Szerkesztés</button>
          <ConfirmDelete variant="full" disabled={busy} onConfirm={() => onDelete(ticket.id)} />
        </div>
      </div>
    </div>
  );
}
