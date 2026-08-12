import { useState } from "react";
import { money, warrantyExpiry, isWarrantyActive, SITE_URL } from "../lib/utils";
import { CloseIcon } from "./icons";
import Row from "./DetailRow";
import CallLink from "./CallLink";

export default function SaleReceiptPanel({ tx, locName, onClose, onPrint }) {
  const [copied, setCopied] = useState(false);
  const expiry = warrantyExpiry(tx.date, tx.warranty);
  const active = isWarrantyActive(tx.date, tx.warranty);
  const receiptLink = `${SITE_URL}/receipt/${tx.publicToken}`;

  function copyLink() {
    navigator.clipboard.writeText(receiptLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="detail-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="detail-panel">
        <div className="dp-head">
          <div>
            <div className="dp-sn">Bizonylat #{tx.receiptNo}</div>
            <div className="dp-name">{tx.description}</div>
          </div>
          <button className="iconbtn" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="dp-body">
          <div className="dp-section">
            <Row k="Ügyfél" v={tx.customerName} />
            <Row k="Telefonszám" v={tx.customerPhone ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {tx.customerPhone}
                <CallLink phone={tx.customerPhone} />
              </span>
            ) : null} />
            <Row k="Helyszín" v={locName(tx.locationId)} />
            <Row k="Vásárlás dátuma" v={tx.date} />
            <Row k="Ár" v={money(tx.amount)} />
            <Row k="Garancia" v={tx.warranty ? (
              <span className={`st ${active ? "st-kesz" : "st-kiadva"}`}>{active ? `Érvényes (${expiry}-ig)` : `Lejárt (${expiry})`}</span>
            ) : <span className="st st-sikertelen">Nincs</span>} />
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Ügyfél nyomon követés</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8, lineHeight: 1.5 }}>
              Ezzel az egyedi linkkel a vevő bejelentkezés nélkül megnézheti a vásárlás és a garancia adatait.
            </div>
            <button type="button" className="btn sec sm" onClick={copyLink}>{copied ? "Másolva!" : "Link másolása"}</button>
          </div>
        </div>
        <div className="dp-actions">
          <button className="btn sec sm" onClick={() => onPrint(tx)}>Nyomtatás</button>
        </div>
      </div>
    </div>
  );
}
