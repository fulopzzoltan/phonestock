import { money } from "../lib/utils";
import { CloseIcon } from "./icons";
import Row from "./DetailRow";
import ConfirmDelete from "./ConfirmDelete";

export default function PartDetailPanel({ part, onClose, onEdit, onDelete, busy }) {
  return (
    <div className="detail-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="detail-panel">
        <div className="dp-head">
          <div>
            <div className="dp-sn">{part.partNo}</div>
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
            <Row k="Készlet" v={`${part.quantity} db`} />
            <Row k="Forrás" v={part.source} />
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Pénzügyek</div>
            <Row k="Beérkezési ár" v={money(part.costPrice)} />
            <Row k="Raktár értéke" v={money((Number(part.costPrice) || 0) * (Number(part.quantity) || 0))} />
          </div>
        </div>
        <div className="dp-actions">
          <button className="btn sec sm" disabled={busy} onClick={() => onEdit(part)}>Szerkesztés</button>
          <ConfirmDelete variant="full" disabled={busy} onConfirm={() => onDelete(part.id)} />
        </div>
      </div>
    </div>
  );
}
