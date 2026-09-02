import { useMemo, useState } from "react";
import { ticketCode, displayName, phoneCode } from "../lib/utils";
import { CloseIcon } from "./icons";

export default function PartUsageModal({ part, tickets, stock, locName, busy, onUseForTicket, onUseForProduct, onClose }) {
  const [mode, setMode] = useState("ticket"); // "ticket" | "product"
  const [q, setQ] = useState("");
  const [selId, setSelId] = useState("");
  const [qty, setQty] = useState(1);

  const openTickets = useMemo(
    () => tickets.filter((t) => t.ticketKind === "Ügyfél" && t.subStatus !== "Átadva"),
    [tickets]
  );
  const ticketMatches = useMemo(() => {
    if (!q.trim()) return openTickets.slice(0, 8);
    const needle = q.trim().toLowerCase();
    return openTickets.filter((t) =>
      [ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId)), t.customerName, t.brand, t.model].filter(Boolean).join(" ").toLowerCase().includes(needle)
    ).slice(0, 8);
  }, [openTickets, q, locName]);

  const availableStock = useMemo(() => stock.filter((p) => p.status !== "sold"), [stock]);
  const productMatches = useMemo(() => {
    if (!q.trim()) return availableStock.slice(0, 8);
    const needle = q.trim().toLowerCase();
    return availableStock.filter((p) =>
      [displayName(p.brand, p.model), phoneCode(p.productNo)].filter(Boolean).join(" ").toLowerCase().includes(needle)
    ).slice(0, 8);
  }, [availableStock, q]);

  function pick(id) {
    setSelId(id);
  }
  function switchMode(next) {
    setMode(next);
    setSelId("");
    setQ("");
  }

  const maxQty = Number(part.quantity) || 0;
  const canConfirm = selId && qty > 0 && qty <= maxQty;

  function confirm() {
    if (!canConfirm) return;
    if (mode === "ticket") {
      onUseForTicket(selId, part, qty);
    } else {
      const product = stock.find((p) => p.id === selId);
      if (product) onUseForProduct(product, part, qty);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Alkatrész felhasználása
          <button className="iconbtn" onClick={onClose}><CloseIcon width={17} height={17} /></button>
        </h2>
        <div style={{ fontSize: 12.5, color: "#6B7280", marginBottom: 18 }}>
          {part.name}{part.brand ? ` — ${part.brand}` : ""}{part.modelFit ? `, ${part.modelFit}` : ""} · {maxQty} db raktáron
        </div>

        <div className="seg" style={{ marginBottom: 16 }}>
          <button type="button" className={mode === "ticket" ? "active" : ""} style={{ flex: 1 }} onClick={() => switchMode("ticket")}>Munkalaphoz</button>
          <button type="button" className={mode === "product" ? "active" : ""} style={{ flex: 1 }} onClick={() => switchMode("product")}>Saját telefonhoz</button>
        </div>

        <div className="field">
          <label>{mode === "ticket" ? "Munkalap keresése" : "Telefon keresése"}</label>
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setSelId(""); }}
            placeholder={mode === "ticket" ? "Vevő neve, munkalapszám..." : "Márka, modell..."}
          />
          <div className="pick-list">
            {mode === "ticket" ? (
              ticketMatches.length === 0 ? (
                <div className="pick-empty">Nincs nyitott ügyfél-munkalap ilyen keresésre.</div>
              ) : ticketMatches.map((t) => (
                <div key={t.id} className={`pick-item${selId === t.id ? " sel" : ""}`} onClick={() => pick(t.id)}>
                  <span><span className="pick-name">{ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))}</span> — {t.customerName || "—"}</span>
                  <span className="pick-sub">{[t.brand, t.model].filter(Boolean).join(" ")}</span>
                </div>
              ))
            ) : (
              productMatches.length === 0 ? (
                <div className="pick-empty">Nincs találat.</div>
              ) : productMatches.map((p) => (
                <div key={p.id} className={`pick-item${selId === p.id ? " sel" : ""}`} onClick={() => pick(p.id)}>
                  <span className="pick-name">{displayName(p.brand, p.model)}</span>
                  <span className="pick-sub">{phoneCode(p.productNo)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="field" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ margin: 0 }}>Mennyiség</label>
          <input type="number" min="1" max={maxQty} value={qty} onChange={(e) => setQty(Number(e.target.value))} style={{ width: 70 }} />
        </div>

        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!canConfirm || busy} onClick={confirm}>{busy ? "Mentés..." : "Felhasználás"}</button>
        </div>
      </div>
    </div>
  );
}
