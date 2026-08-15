import QuickSaleButtons from "../components/QuickSaleButtons";
import TransactionQuickAdd from "../components/TransactionQuickAdd";
import TransactionsPeriodList from "../components/TransactionsPeriodList";
import { LoadingState } from "../components/EmptyState";

export default function FinanceTab({
  effectiveLocFilter, locName, allowedLocations, defaultLocId, addTransaction, busy,
  loadingData, filteredTransactions, setTxModal, deleteTransaction, setReceiptTxId, setStockModal, setPartModal,
}) {
  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Bevételek &amp; Kiadások</div><div className="page-sub">{effectiveLocFilter === "all" ? "Mindkét helyszín összesítve" : locName(effectiveLocFilter)}</div></div>
      </div>
      <QuickSaleButtons locations={allowedLocations} defaultLocId={defaultLocId} onAdd={addTransaction} busy={busy} />
      <TransactionQuickAdd locations={allowedLocations} defaultLocId={defaultLocId} onAdd={addTransaction} busy={busy} openStockModal={setStockModal} openPartModal={setPartModal} />
      {loadingData ? <div className="tw"><LoadingState /></div> : (
        <TransactionsPeriodList transactions={filteredTransactions} locName={locName} onEdit={setTxModal} onDelete={deleteTransaction} onOpenReceipt={setReceiptTxId} busy={busy} />
      )}
    </>
  );
}
