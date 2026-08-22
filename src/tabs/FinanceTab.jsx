import { useState } from "react";
import BasketBar from "../components/BasketBar";
import TransactionsPeriodList, { TransactionRowsTable, buildBasketEntries } from "../components/TransactionsPeriodList";
import { LoadingState, EmptyState } from "../components/EmptyState";
import { FinanceIcon } from "../components/icons";
import { money, today } from "../lib/utils";

export default function FinanceTab({
  effectiveLocFilter, locName, allowedLocations, defaultLocId, busy,
  loadingData, filteredTransactions, setTxModal, deleteTransaction, setReceiptTxId,
  smartQuickItems, checkoutBasket,
  todayClose, closeDay, reopenDay,
}) {
  const [showHistory, setShowHistory] = useState(false);
  const todayStr = today();
  const todayTx = filteredTransactions.filter((t) => t.date === todayStr);
  const historyTx = filteredTransactions.filter((t) => t.date !== todayStr);

  const todayIncome = todayTx.filter((t) => t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const todayExpense = todayTx.filter((t) => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Bevételek &amp; Kiadások</div></div>
      </div>
      <BasketBar locations={allowedLocations} defaultLocId={defaultLocId} busy={busy} smartQuickItems={smartQuickItems} onCheckout={checkoutBasket} />

      <div className="tw" style={{ padding: 16, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Ma</div>
          {todayClose ? (
            <span className="badge-loc" style={{ color: "#15803D" }}>
              ✓ Lezárva {new Date(todayClose.closedAt).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}-kor
            </span>
          ) : (
            <span style={{ fontSize: 12, color: "#6B7280" }}>+{money(todayIncome)} / -{money(todayExpense)}</span>
          )}
        </div>

        {todayTx.length === 0 ? (
          <EmptyState icon={FinanceIcon}>Ma még nincs rögzített tranzakció.</EmptyState>
        ) : (
          <TransactionRowsTable rows={todayTx} locName={locName} onEdit={setTxModal} onDelete={deleteTransaction} onOpenReceipt={setReceiptTxId} busy={busy} />
        )}

        {!todayClose && todayTx.length > 0 && (
          defaultLocId ? (
            <button
              type="button"
              className="btn"
              style={{ marginTop: 14 }}
              onClick={() => {
                if (window.confirm(`Mai nap lezárása: +${money(todayIncome)} bevétel, -${money(todayExpense)} kiadás. Ezután is szerkeszthető marad, csak jelezve lesz, hogy átnézted. Mehet?`)) closeDay(todayStr, defaultLocId);
              }}
            >
              Nap zárása
            </button>
          ) : (
            <div style={{ marginTop: 14, fontSize: 12.5, color: "#B91C1C" }}>Válassz helyszínt a záráshoz.</div>
          )
        )}
        {todayClose && (
          <span className="toggle-link" style={{ marginTop: 10, display: "inline-block" }} onClick={() => reopenDay(todayClose.id)}>
            Visszavonás
          </span>
        )}
      </div>

      <span className="toggle-link" style={{ marginTop: 18, display: "inline-block" }} onClick={() => setShowHistory((v) => !v)}>
        {showHistory ? "Korábbi napok elrejtése" : "Korábbi napok megtekintése"}
      </span>
      {showHistory && (
        loadingData ? <div className="tw"><LoadingState /></div> : (
          <div style={{ marginTop: 12 }}>
            <TransactionsPeriodList transactions={historyTx} locName={locName} onEdit={setTxModal} onDelete={deleteTransaction} onOpenReceipt={setReceiptTxId} busy={busy} />
          </div>
        )
      )}
    </>
  );
}
