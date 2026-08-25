import { useState } from "react";
import BasketBar from "../components/BasketBar";
import TransactionsPeriodList, { TransactionRowsTable, buildBasketEntries } from "../components/TransactionsPeriodList";
import { LoadingState, EmptyState } from "../components/EmptyState";
import { FinanceIcon } from "../components/icons";
import { money, today } from "../lib/utils";

export default function FinanceTab({
  effectiveLocFilter, locName, allowedLocations, defaultLocId, busy,
  loadingData, transactions, filteredTransactions, setTxModal, deleteTransaction, setReceiptTxId,
  productConditionById,
  smartQuickItems, checkoutBasket,
  todayClose, closeDay, reopenDay,
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const todayStr = today();
  const todayTx = filteredTransactions.filter((t) => t.date === todayStr).sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  const historyTx = filteredTransactions.filter((t) => t.date !== todayStr);

  const todayIncome = todayTx.filter((t) => t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const todayExpense = todayTx.filter((t) => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const todayIncomeCash = todayTx.filter((t) => t.type === "income" && t.payment === "Készpénz").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const todayIncomeCard = todayTx.filter((t) => t.type === "income" && t.payment === "Kártya").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const todayExpenseReal = todayTx.filter((t) => t.type === "expense" && t.payment).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const todayMargin = todayTx.filter((t) => t.type === "income").reduce((s, t) => s + ((Number(t.amount) || 0) - (Number(t.costPrice) || 0)), 0)
    - todayTx.filter((t) => t.type === "expense" && !t.payment).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const closeStale = todayClose && todayTx.length > (todayClose.snapshotTxCount ?? 0);

  const cashByLocation = allowedLocations.map((l) => {
    const locTx = (transactions || []).filter((t) => t.locationId === l.id && t.date === todayStr);
    const income = locTx.filter((t) => t.type === "income" && t.payment === "Készpénz").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const expense = locTx.filter((t) => t.type === "expense" && t.payment === "Készpénz").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    return { id: l.id, name: l.name, expected: income - expense };
  });

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Bevételek &amp; Kiadások</div></div>
      </div>
      <BasketBar defaultLocId={defaultLocId} busy={busy} smartQuickItems={smartQuickItems} onCheckout={checkoutBasket} />

      {cashByLocation.length > 0 && (
        <div className={`statrow c${Math.min(Math.max(cashByLocation.length, 1), 6)}`} style={{ marginTop: 16 }}>
          {cashByLocation.map((c) => (
            <div key={c.id} className="statcard accent">
              <div className="lbl">Cash {c.name}</div>
              <div className="val">{money(c.expected)}</div>
            </div>
          ))}
        </div>
      )}

      <div className="tw" style={{ padding: 16, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Ma</div>
          {todayClose && (
            <span className="badge-loc" style={{ color: closeStale ? "#B45309" : "#15803D" }}>
              {closeStale ? "⚠ Elavult zárás" : "✓ Lezárva"} {new Date(todayClose.closedAt).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}-kor
            </span>
          )}
        </div>

        <div className="statrow c4" style={{ marginBottom: 14 }}>
          <div className="statcard"><div className="lbl">Bevétel (készpénz)</div><div className="val" style={{ color: "#15803D" }}>{money(todayIncomeCash)}</div></div>
          <div className="statcard"><div className="lbl">Bevétel (kártya)</div><div className="val" style={{ color: "#15803D" }}>{money(todayIncomeCard)}</div></div>
          <div className="statcard"><div className="lbl">Kiadás (valódi)</div><div className="val" style={{ color: "#B91C1C" }}>{money(todayExpenseReal)}</div></div>
          <div className="statcard"><div className="lbl">Haszon (mai)</div><div className="val">{money(todayMargin)}</div></div>
        </div>

        {closeStale && (
          <div style={{ fontSize: 12.5, color: "#92400E", background: "#FEF3C7", borderRadius: "var(--radius-sm)", padding: "8px 12px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span>{todayTx.length - todayClose.snapshotTxCount} új tétel érkezett a zárás óta — érdemes újranézni.</span>
            <button type="button" className="btn sec sm" disabled={busy} onClick={() => closeDay(todayStr, defaultLocId)}>Zárás frissítése</button>
          </div>
        )}

        {todayTx.length === 0 ? (
          <EmptyState icon={FinanceIcon}>Ma még nincs rögzített tranzakció.</EmptyState>
        ) : (
          <TransactionRowsTable rows={todayTx} locName={locName} onEdit={setTxModal} onDelete={deleteTransaction} onOpenReceipt={setReceiptTxId} busy={busy} productConditionById={productConditionById} />
        )}

        {!todayClose && todayTx.length > 0 && (
          defaultLocId ? (
            confirmingClose ? (
              <div style={{ marginTop: 14, background: "#F9FAFB", border: "1px solid #EEF0F2", borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 13, color: "#374151", marginBottom: 10 }}>
                  Mai nap lezárása: <b style={{ color: "#15803D" }}>+{money(todayIncome)}</b> bevétel, <b style={{ color: "#B91C1C" }}>-{money(todayExpense)}</b> kiadás.
                  Ezután is szerkeszthető marad, csak jelezve lesz, hogy átnézted.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="btn sec sm" onClick={() => setConfirmingClose(false)}>Mégse</button>
                  <button
                    type="button"
                    className="btn sm"
                    disabled={busy}
                    onClick={() => { closeDay(todayStr, defaultLocId); setConfirmingClose(false); }}
                  >
                    {busy ? "Zárás..." : "Igen, lezárom"}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn" style={{ marginTop: 14 }} onClick={() => setConfirmingClose(true)}>
                Nap zárása
              </button>
            )
          ) : (
            <div style={{ marginTop: 14, fontSize: 12.5, color: "#B91C1C" }}>Válassz helyszínt a záráshoz.</div>
          )
        )}
        {todayClose && (
          <button type="button" className="btn sec sm" style={{ marginTop: 10 }} disabled={busy} onClick={() => reopenDay(todayClose.id)}>
            Visszavonás
          </button>
        )}
      </div>

      <button type="button" className="btn sec sm" style={{ marginTop: 18 }} onClick={() => setShowHistory((v) => !v)}>
        {showHistory ? "Korábbi napok elrejtése" : "Korábbi napok megtekintése"}
      </button>
      {showHistory && (
        loadingData ? <div className="tw"><LoadingState /></div> : (
          <div style={{ marginTop: 12 }}>
            <TransactionsPeriodList transactions={historyTx} locName={locName} onEdit={setTxModal} onDelete={deleteTransaction} onOpenReceipt={setReceiptTxId} busy={busy} productConditionById={productConditionById} />
          </div>
        )
      )}
    </>
  );
}
