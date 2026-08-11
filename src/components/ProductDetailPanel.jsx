import { money } from "../lib/utils";
import { CloseIcon } from "./icons";
import Row from "./DetailRow";
import ConfirmDelete from "./ConfirmDelete";

export default function ProductDetailPanel({ product, locName, onClose, onSell, onEdit, onDelete, busy }) {
  const profit = (Number(product.salePrice) || 0) - (Number(product.costPrice) || 0);
  return (
    <div className="detail-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="detail-panel">
        <div className="dp-head">
          <div>
            <div className="dp-sn">{product.condition === "New" ? "Új" : `Felújított${product.grade ? " " + product.grade : ""}`}</div>
            <div className="dp-name">{product.brand} {product.model}</div>
          </div>
          <button className="iconbtn" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="dp-body">
          <div className="dp-section">
            <div className="dp-section-title">Termék adatok</div>
            <Row k="Márka" v={product.brand} />
            <Row k="Modell" v={product.model} />
            <Row k="Állapot" v={product.condition === "New" ? "Új" : `Felújított${product.grade ? " (" + product.grade + ")" : ""}`} />
            <Row k="Tárhely" v={product.storage} />
            <Row k="Szín" v={product.color} />
            <Row k="IMEI" v={product.imei ? <span className="mono">{product.imei}</span> : null} />
            <Row k="Helyszín" v={locName(product.locationId)} />
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Pénzügyek</div>
            <Row k="Beszerzési ár" v={money(product.costPrice)} />
            <Row k="Eladási ár" v={money(product.salePrice)} />
            <Row k="Várható profit" v={<span style={{ color: "#22C55E", fontWeight: 700 }}>{money(profit)}</span>} />
          </div>
        </div>
        <div className="dp-actions">
          <button className="btn sm" disabled={busy} onClick={() => onSell(product)}>Eladva</button>
          <button className="btn sec sm" disabled={busy} onClick={() => onEdit(product)}>Szerkesztés</button>
          <ConfirmDelete variant="full" disabled={busy} onConfirm={() => onDelete(product.id)} />
        </div>
      </div>
    </div>
  );
}
