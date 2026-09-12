import { useState } from "react";
import { useBasketBar, BasketTopBar, BasketBody } from "../components/BasketBar";
import { TransactionRowsTable } from "../components/TransactionsPeriodList";
import { useTransactionsCalendar, CalendarPicker, CalendarDetail } from "../components/TransactionsCalendar";
import { EmptyState } from "../components/EmptyState";
import { FinanceIcon, MoreIcon } from "../components/icons";
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
      <div className="fin-kpi-top">
        <div className="statcard accent" style={{ marginBottom: 8, position: "relative", overflow: "hidden" }}>
          {loc.name === "Gyimes" && (
            <svg viewBox="0 0 200 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden="true">
              <defs>
                <radialGradient id="gyimes-glow" cx="72%" cy="18%" r="55%">
                  <stop offset="0%" stopColor="#F7B267" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#F7B267" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect x="0" y="0" width="200" height="100" fill="url(#gyimes-glow)" />
              <polygon points="0,100 22,52 45,72 70,30 95,64 122,38 150,66 175,44 200,60 200,100" fill="#8794AD" opacity="0.4" />
              <polygon points="0,100 30,70 60,45 85,80 115,52 140,86 200,50 200,100" fill="#5B6784" opacity="0.55" />
              <polygon points="12,68 25,48 38,68" fill="#fff" opacity="0.5" />
              <polygon points="80,62 92,42 104,62" fill="#fff" opacity="0.4" />
              <polygon points="0,100 35,78 65,92 95,58 125,84 155,66 200,88 200,100" fill="#2E3548" opacity="0.75" />
            </svg>
          )}
          {loc.name === "Gyimes" && (
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(10,12,18,.55) 100%)" }} aria-hidden="true" />
          )}
          <div className="lbl" style={{ position: "relative", textShadow: loc.name === "Gyimes" ? "0 1px 4px rgba(0,0,0,.6)" : undefined }}>{loc.name}</div>
          <div className="val" style={{ position: "relative", textShadow: loc.name === "Gyimes" ? "0 1px 5px rgba(0,0,0,.65)" : undefined }}>{money(expected)}</div>
        </div>
        <div className="statcard fin-kpi-margin"><div className="lbl">Árrés</div><div className="val">{money(stats.margin)}</div></div>
      </div>
      <div className="fin-kpi-grid" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="statcard"><div className="lbl">Készpénz</div><div className="val" style={{ color: "#15803D" }}>{money(stats.incomeCash)}</div></div>
        <div className="statcard"><div className="lbl">Kártya</div><div className="val" style={{ color: "#15803D" }}>{money(stats.incomeCard)}</div></div>
        <div className="statcard"><div className="lbl">Kiadás</div><div className="val" style={{ color: "#B91C1C" }}>{money(stats.expenseReal)}</div></div>
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
  todayClose, closeDay, showHeading, showBasket, defaultLocId, smartQuickItems, checkoutBasket, onImportPdf, historyToggle,
}) {
  const bb = useBasketBar({ defaultLocId, onCheckout: checkoutBasket });
  return (
    <>
      {showBasket && (
        <div className="tw tw-compact" style={{ padding: 16, marginBottom: 16, minHeight: 92, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ marginBottom: 12 }}>
            <BasketTopBar bb={bb} defaultLocId={defaultLocId} busy={busy} smartQuickItems={smartQuickItems} onImportPdf={onImportPdf} historyToggle={historyToggle} />
          </div>
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
  dayCloses, closeDay, reopenDay,
  isAdmin, onImportPdf,
}) {
  const [showHistory, setShowHistory] = useState(false);
  const cal = useTransactionsCalendar({ transactions: filteredTransactions, dayCloses, allowedLocations, effectiveLocFilter, isAdmin });
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

  const historyToggleMobile = (
    <button type="button" className={`history-toolbar-btn fin-history-toggle-mobile${showHistory ? " active" : ""}`} onClick={() => setShowHistory((v) => !v)}>
      <MoreIcon className="history-toolbar-btn-dots" width={16} height={16} />
      <span className="history-toolbar-btn-text">Korábbi napok</span>
    </button>
  );

  return (
    <div className="fin-layout" style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
      <div className="fin-kpi-col" style={{ width: 168, flexShrink: 0 }}>
        {locsToShow.map((loc) => (
          <KpiColumn key={loc.id} loc={loc} locTx={locTxByLoc[loc.id]} expected={expectedByLoc[loc.id]} showHeading={isAll} />
        ))}
        <button type="button" className={`history-toolbar-btn fin-history-toggle${showHistory ? " active" : ""}`} style={{ width: "100%" }} onClick={() => setShowHistory((v) => !v)}>
          <MoreIcon className="history-toolbar-btn-dots" width={16} height={16} />
          <span className="history-toolbar-btn-text">Korábbi napok</span>
        </button>

        {showHistory && !loadingData && (
          <div style={{ marginTop: 12 }}>
            <CalendarPicker cal={cal} isAdmin={isAdmin} />
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {showHistory && cal.selectedDay ? (
          <CalendarDetail
            cal={cal}
            locName={locName}
            onEdit={setTxModal}
            onDelete={deleteTransaction}
            onOpenReceipt={setReceiptTxId}
            busy={busy}
            productConditionById={productConditionById}
            isAdmin={isAdmin}
            dayCloses={dayCloses}
            closeDay={closeDay}
            reopenDay={reopenDay}
            defaultLocId={basketLocId}
            smartQuickItems={smartQuickItems}
            checkoutBasket={checkoutBasket}
          />
        ) : (
          locsToShow.map((loc) => (
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
              historyToggle={loc.id === basketLocId ? historyToggleMobile : null}
            />
          ))
        )}
      </div>
    </div>
  );
}
