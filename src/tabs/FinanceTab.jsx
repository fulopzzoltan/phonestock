import { useState } from "react";
import { useBasketBar, BasketTopBar, BasketBody } from "../components/BasketBar";
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

// A KPI-kártyák (egyenleg + bevétel/kiadás/árrés) egy bal oldali, függőleges sávban
// gyűlnek össze helyszínenként — nem a tartalom fölött, vízszintes sorban, hanem mellette,
// hogy a tényleges rögzítés/lista mindig a fő figyelem maradjon.
function KpiColumn({ loc, locTx, expected, showHeading }) {
  const stats = dayStats(locTx);
  return (
    <div style={{ marginBottom: 18 }}>
      {showHeading && <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>{loc.name}</div>}
      <div className="statcard accent" style={{ marginBottom: 8 }}>
        <div className="lbl">{loc.name}</div>
        <div className="val">{money(expected)}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="statcard"><div className="lbl">Készpénz</div><div className="val" style={{ color: "#15803D" }}>{money(stats.incomeCash)}</div></div>
        <div className="statcard"><div className="lbl">Kártya</div><div className="val" style={{ color: "#15803D" }}>{money(stats.incomeCard)}</div></div>
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
  todayClose, closeDay, showHeading, showBasket, defaultLocId, smartQuickItems, checkoutBasket, onImportPdf,
}) {
  const bb = useBasketBar({ defaultLocId, onCheckout: checkoutBasket });
  return (
    <>
      {showBasket && (
        <div style={{ marginBottom: 14 }}>
          <BasketTopBar bb={bb} defaultLocId={defaultLocId} busy={busy} smartQuickItems={smartQuickItems} onImportPdf={onImportPdf} />
        </div>
      )}

      {showBasket && (
        <div className="tw tw-compact" style={{ padding: 16, marginBottom: 16, minHeight: 92 }}>
          <BasketBody bb={bb} defaultLocId={defaultLocId} busy={busy} />
        </div>
      )}

      <div className="tw tw-compact" style={{ padding: 16, marginTop: 16 }}>
        {showHeading && <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Ma — {loc.name}</div>}

        <CloseStaleBanner loc={loc} locTx={locTx} todayStr={todayStr} busy={busy} todayClose={todayClose} closeDay={closeDay} />

        {locTx.length === 0 ? (
          <EmptyState icon={FinanceIcon}>Ma még nincs rögzített tranzakció.</EmptyState>
        ) : (
          <TransactionRowsTable rows={locTx} locName={locName} onEdit={setTxModal} onDelete={deleteTransaction} onOpenReceipt={setReceiptTxId} busy={busy} productConditionById={productConditionById} showLocation={false} />
        )}
      </div>
    </>
  );
}

export default function FinanceTab({
  effectiveLocFilter, locName, allowedLocations, defaultLocId, busy,
  loadingData, transactions, filteredTransactions, setTxModal, deleteTransaction, setReceiptTxId,
  productConditionById,
  smartQuickItems, checkoutBasket,
  dayCloses, closeDay,
  isAdmin, onImportPdf,
}) {
  const [showHistory, setShowHistory] = useState(false);
  const todayStr = today();
  const isAll = effectiveLocFilter === "all";
  const locsToShow = isAll ? allowedLocations : allowedLocations.filter((l) => l.id === effectiveLocFilter);

  function todayCloseFor(locId) {
    return dayCloses.find((d) => d.date === todayStr && d.locationId === locId && !d.reopenedAt);
  }

  const expectedByLoc = Object.fromEntries(allowedLocations.map((l) => {
    const locTx = transactions.filter((t) => t.locationId === l.id && t.date === todayStr);
    const income = locTx.filter((t) => t.type === "income").reduce((s, t) => s + cashPortion(t), 0);
    const expense = locTx.filter((t) => t.type === "expense").reduce((s, t) => s + cashPortion(t), 0);
    return [l.id, income - expense];
  }));

  const basketLocId = locsToShow.some((l) => l.id === defaultLocId) ? defaultLocId : locsToShow[0]?.id;

  const locTxByLoc = Object.fromEntries(locsToShow.map((loc) => [
    loc.id,
    transactions.filter((t) => t.locationId === loc.id && t.date === todayStr).sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "")),
  ]));

  return (
    <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
      <div style={{ width: 168, flexShrink: 0 }}>
        {locsToShow.map((loc) => (
          <KpiColumn key={loc.id} loc={loc} locTx={locTxByLoc[loc.id]} expected={expectedByLoc[loc.id]} showHeading={isAll} />
        ))}
        <button type="button" className="btn sec sm" style={{ width: "100%" }} onClick={() => setShowHistory((v) => !v)}>
          Korábbi napok
        </button>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
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
            onImportPdf={onImportPdf}
          />
        ))}

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
      </div>
    </div>
  );
}
