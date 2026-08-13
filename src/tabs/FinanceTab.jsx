import QuickSaleButtons from "../components/QuickSaleButtons";
import TransactionQuickAdd from "../components/TransactionQuickAdd";
import TransactionsPeriodList from "../components/TransactionsPeriodList";

export default function FinanceTab({
  effectiveLocFilter, locName, period, setPeriod, allowedLocations, defaultLocId, addTransaction, busy,
  loadingData, filteredTransactions, setTxModal, deleteTransaction, setReceiptTxId,
}) {
  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Bevételek &amp; Kiadások</div><div className="page-sub">{effectiveLocFilter === "all" ? "Mindkét helyszín összesítve" : locName(effectiveLocFilter)}</div></div>
        <div className="seg">
          <button type="button" className={period === "day" ? "active" : ""} onClick={() => setPeriod("day")}>Napi</button>
          <button type="button" className={period === "week" ? "active" : ""} onClick={() => setPeriod("week")}>Heti</button>
          <button type="button" className={period === "month" ? "active" : ""} onClick={() => setPeriod("month")}>Havi</button>
        </div>
      </div>
      <QuickSaleButtons locations={allowedLocations} defaultLocId={defaultLocId} onAdd={addTransaction} busy={busy} />
      <TransactionQuickAdd locations={allowedLocations} defaultLocId={defaultLocId} onAdd={addTransaction} busy={busy} />
      {loadingData ? <div className="tw"><div className="empty">Betöltés...</div></div> : (
        <TransactionsPeriodList transactions={filteredTransactions} period={period} locName={locName} onEdit={setTxModal} onDelete={deleteTransaction} onOpenReceipt={setReceiptTxId} busy={busy} />
      )}
    </>
  );
}
