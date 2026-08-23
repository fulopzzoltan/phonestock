import { money, statusCls, subStatusLabel } from "../lib/utils";
import { CloseIcon, EditIcon } from "./icons";
import Row from "./DetailRow";
import CallLink from "./CallLink";
import ConfirmDelete from "./ConfirmDelete";

const LEDGER_LABELS = {
  purchase_earn: "Pont — vásárlás",
  service_earn: "Pont — szerviz",
  referral_bonus: "Pont — ajánlás",
  redeem: "Beváltás",
  manual_adjust: "Kézi korrekció",
  reversal: "Visszavonás",
};

export default function CustomerDetailPanel({ customer, locName, ledger, rewards, onRedeem, redeemBusy, onClose, onEdit }) {
  const events = [
    ...customer.purchases.map((p) => ({ kind: "purchase", date: p.date, record: p })),
    ...customer.tickets.map((t) => ({ kind: "ticket", date: t.dateIn, record: t })),
  ].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const balance = customer.loyaltyPointsBalance || 0;
  const ledgerRows = (ledger || []).filter((l) => l.customerId === customer.id).slice(0, 10);
  const redeemable = (rewards || []).filter((r) => r.active && r.pointCost <= balance).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="detail-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="detail-panel">
        <div className="dp-head">
          <div>
            <div className="dp-sn" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              Ügyfél
              {customer.isNew ? <span className="badge-loc">Új</span> : <span className="badge-income">Visszatérő</span>}
              {customer.marketingConsent && <span className="gar-pill">Feliratkozott</span>}
            </div>
            <div className="dp-name">{customer.name || "Névtelen"}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="iconbtn" onClick={() => onEdit(customer)}><EditIcon /></button>
            <button className="iconbtn" onClick={onClose}><CloseIcon /></button>
          </div>
        </div>
        <div className="dp-body">
          <div className="dp-section">
            <Row k="Telefonszám" v={customer.phone ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {customer.phone}
                <CallLink phone={customer.phone} />
              </span>
            ) : null} />
            <Row k="Email" v={customer.email} />
            <Row k="CNP" v={customer.cnp ? <span className="mono">{customer.cnp}</span> : null} />
            <Row k="Cím" v={customer.address} />
            <Row k="Jegyzet" v={customer.notes} />
            <Row k="Vásárlások" v={`${customer.purchases.length} db — ${money(customer.purchaseTotal)}`} />
            <Row k="Szerviz munkalapok" v={`${customer.tickets.length} db — ${money(customer.ticketTotal)}`} />
            <Row k="Utolsó aktivitás" v={customer.lastActivity} />
            <Row k="Pontegyenleg" v={<span style={{ fontWeight: 700, color: "var(--primary-ink)" }}>{balance} pont</span>} />
            {customer.referralCode && <Row k="Ajánlói kód" v={<span className="mono">{customer.referralCode}</span>} />}
          </div>
          {redeemable.length > 0 && (
            <div className="dp-section">
              <div className="dp-section-title">Pontbeváltás</div>
              {redeemable.map((r) => (
                <div key={r.id} className="dp-row" style={{ alignItems: "center" }}>
                  <span className="dp-key">{r.label} <span style={{ color: "#9CA3AF" }}>({r.pointCost} pont)</span></span>
                  <ConfirmDelete
                    variant="full"
                    label="Beváltás"
                    confirmLabel="Beváltod?"
                    disabled={redeemBusy}
                    onConfirm={() => onRedeem(r)}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="dp-section">
            <div className="dp-section-title">Előzmények</div>
            {events.length === 0 && <div style={{ color: "#9CA3AF", fontSize: 12.5 }}>Nincs rögzített esemény.</div>}
            {events.map((e, i) => (
              <div key={i} className="dp-row" style={{ alignItems: "center" }}>
                {e.kind === "purchase" ? (
                  <>
                    <span className="dp-key">{e.date} · <span className="badge-income" style={{ marginLeft: 4 }}>Vásárlás</span></span>
                    <span className="dp-val">{e.record.description} — {money(e.record.amount)}</span>
                  </>
                ) : (
                  <>
                    <span className="dp-key">{e.date} · <span className={`st ${statusCls(e.record.status)}`} style={{ marginLeft: 4 }}>#{e.record.ticketNo}{e.record.subStatus ? ` · ${subStatusLabel(e.record.status, e.record.subStatus)}` : ""}</span></span>
                    <span className="dp-val">{[e.record.brand, e.record.model].filter(Boolean).join(" ")} — {money(e.record.price)}</span>
                  </>
                )}
              </div>
            ))}
          </div>
          {ledgerRows.length > 0 && (
            <div className="dp-section">
              <div className="dp-section-title">Pontelőzmények</div>
              {ledgerRows.map((l) => (
                <div key={l.id} className="dp-row" style={{ alignItems: "center" }}>
                  <span className="dp-key">{(l.createdAt || "").slice(0, 10)} · {LEDGER_LABELS[l.kind] || l.kind}</span>
                  <span className="dp-val" style={{ color: l.points >= 0 ? "#15803D" : "#B91C1C", fontWeight: 700 }}>{l.points >= 0 ? "+" : ""}{l.points}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
