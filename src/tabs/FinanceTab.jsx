import { useState } from "react";
import BasketBar from "../components/BasketBar";
import TransactionsPeriodList, { TransactionRowsTable } from "../components/TransactionsPeriodList";
import { LoadingState, EmptyState } from "../components/EmptyState";
import { FinanceIcon } from "../components/icons";
import { money, today } from "../lib/utils";

function dayStats(tx) {
  const incomeCash = tx.filter((t) => t.type === "income" && t.payment === "Készpénz").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const incomeCard = tx.filter((t) => t.type === "income" && t.payment === "Kártya").reduce((s, t) => s + (Number(t.amount) || 0), 0);
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
        <div className="statcard"><div className="lbl">Kiadás (valódi)</div><div className="val" style={{ color: "#B91C1C" }}>{money(stats.expenseReal)}</div></div>
        <div className="statcard"><div className="lbl">Haszon (mai)</div><div className="val">{money(stats.margin)}</div></div>
      </div>
    </div>
  );
}

function LocationRecordBox({
  loc, locTx, todayStr, locName, busy, setTxModal, deleteTransaction, setReceiptTxId, productConditionById,
  todayClose, closeDay, reopenDay, showHeading, showBasket, defaultLocId, smartQuickItems, checkoutBasket,
}) {
  const [confirmingClose, setConfirmingClose] = useState(false);
  const stats = dayStats(locTx);
  const closeStale = todayClose && locTx.length > (todayClose.snapshotTxCount ?? 0);

  const closeControls = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {todayClose && (
        <span className="badge-loc" style={{ color: closeStale ? "#B45309" : "#15803D" }}>
          {closeStale ? "⚠ Elavult zárás" : "✓ Lezárva"} {new Date(todayClose.closedAt).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}-kor
        </span>
      )}
      {todayClose ? (
        <button type="button" className="btn sec sm" disabled={busy} onClick={() => reopenDay(todayClose.id)}>Visszavonás</button>
      ) : locTx.length > 0 && !confirmingClose ? (
        <button type="button" className="btn sm" onClick={() => setConfirmingClose(true)}>Nap zárása</button>
      ) : null}
    </div>
  );

  return (
    <div className="tw tw-compact" style={{ padding: 16, marginTop: 16 }}>
      {showBasket ? (
        showHeading && <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Ma — {loc.name}</div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
          {showHeading && <div style={{ fontSize: 14, fontWeight: 700 }}>Ma — {loc.name}</div>}
          <div style={{ marginLeft: "auto" }}>{closeControls}</div>
        </div>
      )}

      {closeStale && (
        <div style={{ fontSize: 12.5, color: "#92400E", background: "#FEF3C7", borderRadius: "var(--radius-sm)", padding: "8px 12px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <span>{locTx.length - todayClose.snapshotTxCount} új tétel érkezett a zárás óta — érdemes újranézni.</span>
          <button type="button" className="btn sec sm" disabled={busy} onClick={() => closeDay(todayStr, loc.id)}>Zárás frissítése</button>
        </div>
      )}

      {!todayClose && confirmingClose && (
        <div style={{ marginBottom: 12, background: "#F9FAFB", border: "1px solid #EEF0F2", borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 13, color: "#374151", marginBottom: 10 }}>
            Mai nap lezárása ({loc.name}): <b style={{ color: "#15803D" }}>+{money(stats.income)}</b> bevétel, <b style={{ color: "#B91C1C" }}>-{money(stats.expense)}</b> kiadás.
            Ezután is szerkeszthető marad, csak jelezve lesz, hogy átnézted.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn sec sm" onClick={() => setConfirmingClose(false)}>Mégse</button>
            <button
              type="button"
              className="btn sm"
              disabled={busy}
              onClick={() => { closeDay(todayStr, loc.id); setConfirmingClose(false); }}
            >
              {busy ? "Zárás..." : "Igen, lezárom"}
            </button>
          </div>
        </div>
      )}

      {showBasket && (
        <div style={{ borderBottom: "1px solid #F3F4F6", paddingBottom: 14, marginBottom: 14 }}>
          <BasketBar defaultLocId={defaultLocId} busy={busy} smartQuickItems={smartQuickItems} onCheckout={checkoutBasket} headerExtra={closeControls} />
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
  dayCloses, closeDay, reopenDay,
}) {
  const [showHistory, setShowHistory] = useState(false);
  const todayStr = today();
  const isAll = effectiveLocFilter === "all";
  const locsToShow = isAll ? allowedLocations : allowedLocations.filter((l) => l.id === effectiveLocFilter);
  const historyTx = filteredTransactions.filter((t) => t.date !== todayStr);

  function todayCloseFor(locId) {
    return dayCloses.find((d) => d.date === todayStr && d.locationId === locId && !d.reopenedAt);
  }

  const cashByLocation = allowedLocations.map((l) => {
    const locTx = transactions.filter((t) => t.locationId === l.id && t.date === todayStr);
    const income = locTx.filter((t) => t.type === "income" && t.payment === "Készpénz").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const expense = locTx.filter((t) => t.type === "expense" && t.payment === "Készpénz").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    return { id: l.id, name: l.name, expected: income - expense };
  });

  const basketLocId = locsToShow.some((l) => l.id === defaultLocId) ? defaultLocId : locsToShow[0]?.id;

  const locTxByLoc = Object.fromEntries(locsToShow.map((loc) => [
    loc.id,
    transactions.filter((t) => t.locationId === loc.id && t.date === todayStr).sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "")),
  ]));

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Bevételek &amp; Kiadások</div></div>
      </div>

      {cashByLocation.length > 0 && (
        <div className={`statrow c${Math.min(Math.max(cashByLocation.length, 1), 6)}`} style={{ marginTop: 16, marginBottom: 22 }}>
          {cashByLocation.map((c) => (
            <div key={c.id} className="statcard accent">
              <div className="lbl">Cash {c.name}</div>
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
          reopenDay={reopenDay}
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
      {showHistory && (
        loadingData ? <div className="tw"><LoadingState /></div> : (
          <div style={{ marginTop: 12 }}>
            <TransactionsPeriodList transactions={historyTx} locName={locName} onEdit={setTxModal} onDelete={deleteTransaction} onOpenReceipt={setReceiptTxId} busy={busy} productConditionById={productConditionById} showLocation={isAll} />
          </div>
        )
      )}
    </>
  );
}
