import { useState } from "react";
import { money, displayName, BUYBACK_STATUSES, buybackStatusCls, BUYBACK_CONDITION_QUESTIONS } from "../lib/utils";
import { CloseIcon } from "./icons";
import Row from "./DetailRow";
import CallLink from "./CallLink";

const PAYOUT_TYPE_LABELS = {
  keszpenz: "Készpénz (azonnal)",
  kredit: "Kredit-egyenleg (+10%, csak nálunk elkölthető)",
  bizomany: "Bizomány (+15%, üzletben egyeztetett feltételekkel)",
};

export default function BuybackOfferDetailPanel({ offer, locName, onClose, onSetStatus, onPayout, onReject, onConvert, busy }) {
  const [finalPrice, setFinalPrice] = useState(offer.finalPrice ?? offer.estimatedPrice ?? "");
  const closed = offer.status === "Kifizetve" || offer.status === "Elutasítva";

  return (
    <div className="detail-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="detail-panel">
        <div className="dp-head">
          <div>
            <div className="dp-sn">Ajánlat #{offer.offerNo}</div>
            <div className="dp-name">{displayName(offer.brand, offer.model)}</div>
          </div>
          <button className="iconbtn" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="dp-body">
          <div className="dp-section">
            <div className="dp-section-title">Státusz</div>
            {closed ? (
              <span className={`st ${buybackStatusCls(offer.status)}`} style={{ fontSize: 13, padding: "6px 14px" }}>{offer.status}</span>
            ) : (
              <div className="dp-status-row">
                {BUYBACK_STATUSES.map((c) => (
                  <button key={c.key} className={`dp-st-btn${offer.status === c.key ? " active" : ""}`} disabled={busy}
                    onClick={() => onSetStatus(offer.id, c.key)}>{c.key}</button>
                ))}
              </div>
            )}
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Ügyfél</div>
            <Row k="Név" v={offer.customerName} />
            <Row k="Telefonszám" v={offer.customerPhone ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>{offer.customerPhone}<CallLink phone={offer.customerPhone} /></span>
            ) : null} />
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Eszköz</div>
            <Row k="Márka" v={offer.brand} />
            <Row k="Modell" v={offer.model} />
            <Row k="Tárhely" v={offer.storage} />
            <Row k="Szín" v={offer.color} />
            <Row k="IMEI" v={offer.imei ? <span className="mono">{offer.imei}</span> : null} />
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Állapot-válaszok</div>
            {Object.keys(offer.answers || {}).length === 0 ? <Row k="—" v="Nincs megadva" /> : (
              BUYBACK_CONDITION_QUESTIONS.map((q) => {
                const answerKey = offer.answers?.[q.key];
                if (!answerKey) return null;
                const opt = q.options.find((o) => o.key === answerKey);
                return <Row key={q.key} k={q.question} v={opt?.label || answerKey} />;
              })
            )}
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Átvétel</div>
            <Row k="Mód" v={offer.deliveryMethod} />
            {offer.deliveryMethod === "Személyes átadás" && <Row k="Helyszín" v={locName(offer.locationId)} />}
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Ár</div>
            <Row k="Kért kifizetés" v={PAYOUT_TYPE_LABELS[offer.payoutType] || offer.payoutType} />
            <Row k="Becsült ár" v={money(offer.estimatedPrice)} />
            {closed ? (
              <Row k="Végleges ár" v={money(offer.finalPrice)} />
            ) : (
              <div className="field">
                <label>Végleges ár (Lei) — bevizsgálás után módosítható</label>
                <input type="number" value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} />
              </div>
            )}
          </div>
        </div>
        {!closed && (
          <div className="dp-actions">
            <button className="btn sec sm" disabled={busy} onClick={() => onConvert(offer)}>Termékké alakítás</button>
            <button className="btn sec sm" disabled={busy} onClick={() => onReject(offer.id)} style={{ color: "#DC2626" }}>Elutasítva</button>
            <button className="btn sm" disabled={busy || finalPrice === ""} onClick={() => onPayout(offer.id, finalPrice)}>Kifizetve</button>
          </div>
        )}
        {closed && offer.status === "Kifizetve" && (
          <div className="dp-actions">
            <button className="btn sec sm" disabled={busy} onClick={() => onConvert(offer)}>Termékké alakítás</button>
          </div>
        )}
      </div>
    </div>
  );
}
