import { money, phoneCode, conditionGradeLabel } from "../lib/utils";
import { CloseIcon } from "./icons";
import Row from "./DetailRow";
import ConfirmDelete from "./ConfirmDelete";
import ProductPhotos from "./ProductPhotos";
import PhonePartsPicker from "./PhonePartsPicker";

export default function ProductDetailPanel({
  product, saleTx, locName, onClose, onSell, onEdit, onDelete, busy,
  users = [], activeServiceTicket, parts = [], onAddPart, onRemovePart, onStartService, onOpenTicket, onReturnToStock, onShowHistory, onPayoutConsignor, onPrintConsignment,
}) {
  const profit = (Number(product.salePrice) || 0) - (Number(product.costPrice) || 0);
  const isSold = product.status === "sold";
  const acq = product.acquisition;
  const isConsignment = acq?.acquisitionType === "consignment";
  return (
    <div className="detail-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="detail-panel">
        <div className="dp-head">
          <div>
            <div className="dp-sn">{conditionGradeLabel(product.condition, product.grade)}{isConsignment && <span className="badge-loc" style={{ marginLeft: 8 }}>Bizomány</span>}</div>
            <div className="dp-name">{product.brand} {product.model}</div>
          </div>
          <button className="iconbtn" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="dp-body">
          {acq && (
            <div className="dp-section">
              <div className="dp-section-title">Beszerzés</div>
              <Row k="Típus" v={isConsignment ? "Bizomány" : "Saját vásárlás"} />
              <Row k="Eladó" v={acq.sellerName} />
              <Row k="Telefonszám" v={acq.sellerPhone || "—"} />
              <Row k="Dokumentum" v={isConsignment ? acq.consignmentDocNo : acq.purchaseDocNo} />
              {isConsignment && (
                <>
                  <Row k="Kifizetendő" v={money(acq.consignorPayoutAmount)} />
                  <Row k="Kifizetés" v={acq.payoutStatus === "kifizetve" ? <span style={{ color: "#22C55E", fontWeight: 700 }}>✓ Kifizetve ({acq.payoutDate})</span> : <span className="st st-alkatresz">Fizetésre vár</span>} />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    {acq.payoutStatus !== "kifizetve" && (
                      <button type="button" className="btn sec sm" disabled={busy} onClick={() => onPayoutConsignor(product.id)}>Bizományos kifizetése</button>
                    )}
                    <button type="button" className="btn sec sm" onClick={onPrintConsignment}>Dokumentumok nyomtatása</button>
                  </div>
                </>
              )}
            </div>
          )}
          <ProductPhotos productId={product.id} />
          <div className="dp-section">
            <div className="dp-section-title">Termék adatok</div>
            <Row k="Kód" v={<span className="mono" style={{ fontWeight: 700 }}>{phoneCode(product.productNo)}</span>} />
            <Row k="Márka" v={product.brand} />
            <Row k="Modell" v={product.model} />
            <Row k="Állapot" v={conditionGradeLabel(product.condition, product.grade)} />
            <Row k="Tárhely" v={product.storage} />
            <Row k="Szín" v={product.color} />
            <Row k="IMEI" v={product.imei ? <span className="mono">{product.imei}</span> : null} />
            <Row k="Helyszín" v={locName(product.locationId)} />
            <Row k="Garancia" v={product.warranty ? <span className="gar-pill">{product.warranty}</span> : null} />
            <Row k="Forrás" v={product.source} />
            {product.condition === "Refurbished" && <Row k="Akkuállapot" v={product.batteryHealth != null ? `${product.batteryHealth}%` : null} />}
            {product.imei && (
              <button type="button" className="btn sec sm" style={{ marginTop: 8 }} onClick={() => onShowHistory(product.imei)}>Eszköz előzmény megtekintése</button>
            )}
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Előkészítés / szerviz</div>
            {activeServiceTicket ? (
              <>
                <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 10 }}>
                  {activeServiceTicket.ticketKind === "Saját készlet - garanciális" ? "Garanciális javítás folyamatban" : "Előkészítés folyamatban"}
                  {activeServiceTicket.assignedTo && ` — ${users.find((u) => u.id === activeServiceTicket.assignedTo)?.fullName || ""}`}
                </div>
                <PhonePartsPicker
                  usedParts={activeServiceTicket.usedParts || []}
                  availableParts={parts.filter((p) => Number(p.quantity) > 0)}
                  allParts={parts}
                  onAdd={(part, qty) => onAddPart(activeServiceTicket.id, part, qty)}
                  onRemove={(sp) => onRemovePart(activeServiceTicket.id, sp)}
                  busy={busy}
                />
                <button type="button" className="btn sec sm" style={{ marginTop: 10 }} onClick={() => onOpenTicket(activeServiceTicket.id)}>Munkalap megnyitása (státusz, probléma)</button>
              </>
            ) : (
              <button type="button" className="btn sec sm" disabled={busy} onClick={() => onStartService(product)}>
                {isSold ? "Garanciális javítás felvétele" : "Szerviz előkészítés indítása"}
              </button>
            )}
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Pénzügyek</div>
            <Row k="Beszerzési ár" v={money(product.costPrice)} />
            <Row k="Eladási ár" v={money(product.salePrice)} />
            <Row k={isSold ? "Profit" : "Várható profit"} v={<span style={{ color: "#22C55E", fontWeight: 700 }}>{money(profit)}</span>} />
          </div>
          {isSold && (
            <div className="dp-section">
              <div className="dp-section-title">Eladás adatai</div>
              <Row k="Eladva" v={saleTx?.date || "—"} />
              <Row k="Vevő" v={saleTx?.customerName || "—"} />
              <Row k="Telefonszám" v={saleTx?.customerPhone || "—"} />
              <button
                type="button"
                className="btn sec sm"
                style={{ marginTop: 10 }}
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Biztosan visszaveszed ezt a telefont? Visszakerül a raktárba (Polcon állapotba), és megszűnik rajta a garancia. A bevételi tranzakció változatlan marad — ha vissza kell fizetni az árat, azt külön rögzítsd kiadásként.")) {
                    onReturnToStock(product.id, saleTx?.id);
                  }
                }}
              >
                Visszavétel (visszakerül a raktárba)
              </button>
            </div>
          )}
        </div>
        <div className="dp-actions">
          {!isSold && <button className="btn sm" disabled={busy} onClick={() => onSell(product)}>Eladva</button>}
          <button className="btn sec sm" disabled={busy} onClick={() => onEdit(product)}>Szerkesztés</button>
          <ConfirmDelete variant="full" disabled={busy} onConfirm={() => onDelete(product.id)} />
        </div>
      </div>
    </div>
  );
}
