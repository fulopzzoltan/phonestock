import { useState } from "react";
import BasketBar from "../components/BasketBar";
import { TransactionRowsTable } from "../components/TransactionsPeriodList";
import TransactionsCalendar from "../components/TransactionsCalendar";
import { EmptyState } from "../components/EmptyState";
import { FinanceIcon } from "../components/icons";
import { money, today, cashPortion, cardPortion } from "../lib/utils";

function dayStats(tx) {
  const incomeCash = tx.filter((t) => t.type === "income").reduce((s, t) => s + cashPortion(t), 0);
  const incomeCard = tx.filter((t) => t.type === "income").reduce((s, t) => s + cardPortion(t), 0);
  const expenseReal = tx.filter((t) => t.type === "expense" && t.payment).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const margin = tx.filter((t) => t.type === "income").reduce((s, t) => s + ((Number(t.amount) || 0) - (Number(t.costPrice) || 0)), 0)
    - tx.filter((t) => t.type === "expense" && !t.payment).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const income = tx.filter((t) => t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const expense = tx.filter((t) => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  return { incomeCash, incomeCard, expenseReal, margin, income, expense };
}

function LocationStats({ loc, locTx, showHeading }) {
  const stats = dayStats(locTx);
  return (
    <div className="tw" style={{ padding: 16, marginTop: 16 }}>
      {showHeading && <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{loc.name}</div>}
      <div className="statrow c4" style={{ marginBottom: 0 }}>
        <div className="statcard"><div className="lbl">Bevétel (készpénz)</div><div className="val" style={{ color: "#15803D" }}>{money(stats.incomeCash)}</div></div>
        <div className="statcard"><div className="lbl">Bevétel (kártya)</div><div className="val" style={{ color: "#15803D" }}>{money(stats.incomeCard)}</div></div>
        <div className="statcard"><div className="lbl">Kiadás</div><div className="val" style={{ color: "#B91C1C" }}>{money(stats.expenseReal)}</div></div>
        <div className="statcard"><div className="lbl">Árrés</div><div className="val">{money(stats.margin)}</div></div>
      </div>
    </div>
  );
}

// A nap nyitva/zárva állapotát a fejlécben lévő folyékony kapcsoló vezérli — itt csak azt
// jelezzük, ha a zárás óta új tétel érkezett (elavult zárás), mert az a zárás UTÁNI
// tranzakciólistához kötődik, nem magához a nyit/zár váltáshoz.
function CloseStaleBanner({ loc, locTx, todayStr, busy, todayClose, closeDay }) {
  const closeStale = todayClose && locTx.length > (todayClose.snapshotTxCount ?? 0);
  if (!closeStale) return null;
  return (
    <div className="dcc-stale" style={{ marginBottom: 12 }}>
      <span>{locTx.length - todayClose.snapshotTxCount} új tétel érkezett a zárás óta ({loc.name}) — érdemes újranézni.</span>
      <button type="button" className="btn sec sm" disabled={busy} onClick={() => closeDay(todayStr, loc.id)}>Zárás frissítése</button>
    </div>
  );
}

function LocationRecordBox({
  loc, locTx, todayStr, locName, busy, setTxModal, deleteTransaction, setReceiptTxId, productConditionById,
  todayClose, closeDay, showHeading, showBasket, defaultLocId, smartQuickItems, checkoutBasket,
}) {
  return (
    <div className="tw tw-compact" style={{ padding: 16, marginTop: 16 }}>
      {showHeading && <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Ma — {loc.name}</div>}

      <CloseStaleBanner loc={loc} locTx={locTx} todayStr={todayStr} busy={busy} todayClose={todayClose} closeDay={closeDay} />

      {showBasket && (
        <div style={{ borderBottom: "1px solid #F3F4F6", paddingBottom: 14, marginBottom: 14 }}>
          <BasketBar defaultLocId={defaultLocId} busy={busy} smartQuickItems={smartQuickItems} onCheckout={checkoutBasket} />
        </div>
      )}

      {locTx.length === 0 ? (
        <EmptyState icon={FinanceIcon}>Ma még nincs rögzített tranzakció.</EmptyState>
      ) : (
        <TransactionRowsTable rows={locTx} locName={locName} onEdit={setTxModal} onDelete={deleteTransaction} onOpenReceipt={setReceiptTxId} busy={busy} productConditionById={productConditionById} showLocation={false} />
      )}
    </div>
  );
}

export default function FinanceTab({
  effectiveLocFilter, locName, allowedLocations, defaultLocId, busy,
  loadingData, transactions, filteredTransactions, setTxModal, deleteTransaction, setReceiptTxId,
  productConditionById,
  smartQuickItems, checkoutBasket,
  dayCloses, closeDay,
  isAdmin,
}) {
  const [showHistory, setShowHistory] = useState(false);
  const todayStr = today();
  const isAll = effectiveLocFilter === "all";
  const locsToShow = isAll ? allowedLocations : allowedLocations.filter((l) => l.id === effectiveLocFilter);

  function todayCloseFor(locId) {
    return dayCloses.find((d) => d.date === todayStr && d.locationId === locId && !d.reopenedAt);
  }

  const cashByLocation = allowedLocations.map((l) => {
    const locTx = transactions.filter((t) => t.locationId === l.id && t.date === todayStr);
    const income = locTx.filter((t) => t.type === "income").reduce((s, t) => s + cashPortion(t), 0);
    const expense = locTx.filter((t) => t.type === "expense").reduce((s, t) => s + cashPortion(t), 0);
    return { id: l.id, name: l.name, expected: income - expense };
  });

  const basketLocId = locsToShow.some((l) => l.id === defaultLocId) ? defaultLocId : locsToShow[0]?.id;

  const locTxByLoc = Object.fromEntries(locsToShow.map((loc) => [
    loc.id,
    transactions.filter((t) => t.locationId === loc.id && t.date === todayStr).sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "")),
  ]));

  return (
    <>
      {cashByLocation.length > 0 && (
        <div className={`statrow c${Math.min(Math.max(cashByLocation.length, 1), 6)}`} style={{ marginTop: 16, marginBottom: 22 }}>
          {cashByLocation.map((c) => (
            <div key={c.id} className="statcard accent">
              <div className="lbl">{c.name}</div>
              <div className="val">{money(c.expected)}</div>
            </div>
          ))}
        </div>
      )}

      {locsToShow.map((loc) => (
        <LocationStats key={loc.id} loc={loc} locTx={locTxByLoc[loc.id]} showHeading={isAll} />
      ))}

      {locsToShow.map((loc) => (
        <LocationRecordBox
          key={loc.id}
          loc={loc}
          locTx={locTxByLoc[loc.id]}
          todayStr={todayStr}
          locName={locName}
          busy={busy}
          setTxModal={setTxModal}
          deleteTransaction={deleteTransaction}
          setReceiptTxId={setReceiptTxId}
          productConditionById={productConditionById}
          todayClose={todayCloseFor(loc.id)}
          closeDay={closeDay}
          showHeading={isAll}
          showBasket={loc.id === basketLocId}
          defaultLocId={basketLocId}
          smartQuickItems={smartQuickItems}
          checkoutBasket={checkoutBasket}
        />
      ))}

      <button type="button" className="btn sec sm" style={{ marginTop: 18 }} onClick={() => setShowHistory((v) => !v)}>
        {showHistory ? "Korábbi napok elrejtése" : "Korábbi napok megtekintése"}
      </button>
      {showHistory && !loadingData && (
        <div style={{ marginTop: 12 }}>
          <TransactionsCalendar
            transactions={filteredTransactions}
            dayCloses={dayCloses}
            allowedLocations={allowedLocations}
            effectiveLocFilter={effectiveLocFilter}
            isAdmin={isAdmin}
            locName={locName}
            onEdit={setTxModal}
            onDelete={deleteTransaction}
            onOpenReceipt={setReceiptTxId}
            busy={busy}
            productConditionById={productConditionById}
          />
        </div>
      )}
    </>
  );
}
