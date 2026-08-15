import BasketBar from "../components/BasketBar";
import TransactionsPeriodList from "../components/TransactionsPeriodList";
import { LoadingState } from "../components/EmptyState";

export default function FinanceTab({
  effectiveLocFilter, locName, allowedLocations, defaultLocId, busy,
  loadingData, filteredTransactions, setTxModal, deleteTransaction, setReceiptTxId,
  smartQuickItems, checkoutBasket,
}) {
  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Bevételek &amp; Kiadások</div><div className="page-sub">{effectiveLocFilter === "all" ? "Mindkét helyszín összesítve" : locName(effectiveLocFilter)}</div></div>
      </div>
      <BasketBar locations={allowedLocations} defaultLocId={defaultLocId} busy={busy} smartQuickItems={smartQuickItems} onCheckout={checkoutBasket} />
      {loadingData ? <div className="tw"><LoadingState /></div> : (
        <TransactionsPeriodList transactions={filteredTransactions} locName={locName} onEdit={setTxModal} onDelete={deleteTransaction} onOpenReceipt={setReceiptTxId} busy={busy} />
      )}
    </>
  );
}
