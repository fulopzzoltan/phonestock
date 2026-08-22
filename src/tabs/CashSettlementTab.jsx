import { useMemo, useState } from "react";
import { money, today } from "../lib/utils";
import { EmptyState } from "../components/EmptyState";
import { FinanceIcon } from "../components/icons";
import TransactionsPeriodList from "../components/TransactionsPeriodList";

function eachDateInPeriod(start, end) {
  const dates = [];
  let d = new Date(start + "T00:00:00Z");
  const endD = new Date(end + "T00:00:00Z");
  while (d <= endD) {
    dates.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}

const CARD_FEE_RATE = 0.012;

function dayAfter(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
function daysBetweenInclusive(a, b) {
  return Math.round((new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / 86400000) + 1;
}

export default function CashSettlementTab({
  busy, transactions, cashHolders, cashSettlements, saveCashSettlement, users,
  setTxModal, deleteTransaction, setReceiptTxId, dayCloses, allowedLocations, locName,
}) {
  const [customStart, setCustomStart] = useState("");
  const [holderAmounts, setHolderAmounts] = useState({});
  const [note, setNote] = useState("");

  const lastSettlement = cashSettlements[0] || null;
  const earliestTxDate = useMemo(() => transactions.reduce((min, t) => (!min || t.date < min ? t.date : min), null), [transactions]);
  const periodStart = lastSettlement ? dayAfter(lastSettlement.periodEnd) : (customStart || earliestTxDate || today());
  const periodEnd = today();
  const periodValid = periodStart <= periodEnd;

  const periodTx = useMemo(() => transactions.filter((t) => t.date >= periodStart && t.date <= periodEnd), [transactions, periodStart, periodEnd]);
  const cashIncome = periodTx.filter((t) => t.type === "income" && t.payment === "Készpénz").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const cashExpense = periodTx.filter((t) => t.type === "expense" && t.payment === "Készpénz").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const cashExpected = cashIncome - cashExpense;
  const cardIncomeGross = periodTx.filter((t) => t.type === "income" && t.payment === "Kártya").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const cardIncomeNet = cardIncomeGross - cardIncomeGross * CARD_FEE_RATE;
  const transferIncome = periodTx.filter((t) => t.type === "income" && t.payment === "Átutalás").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  // régi tranzakciókon (pl. korábban importált 2024-es adat) a payment mező üres lehet — ezt nem
  // soroljuk készpénznek (bizonytalan), de a profitból nem hagyhatjuk ki, különben alábecsülnénk.
  const unknownPaymentIncome = periodTx.filter((t) => t.type === "income" && !["Készpénz", "Kártya", "Átutalás"].includes(t.payment)).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalExpenseAll = periodTx.filter((t) => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const otherExpense = totalExpenseAll - cashExpense;
  const totalProfit = cashExpected + cardIncomeNet + transferIncome + unknownPaymentIncome - otherExpense;

  const activeHolders = cashHolders.filter((h) => h.active);
  const cashCountedTotal = activeHolders.reduce((s, h) => s + (Number(holderAmounts[h.id]) || 0), 0);
  const diff = cashCountedTotal - cashExpected;
  const isOk = Math.abs(diff) <= 1;

  function holderName(id) {
    return cashHolders.find((h) => h.id === id)?.name || "?";
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!periodValid) return;
    const cashByHolder = {};
    activeHolders.forEach((h) => { cashByHolder[h.id] = Number(holderAmounts[h.id]) || 0; });
    const summary = `Elszámolás rögzítése (${periodStart} – ${periodEnd}): profit ${money(totalProfit)} (fejenként ${money(totalProfit / 2)}). Készpénz eltérés: ${diff > 0 ? "+" : ""}${money(diff)}. Rögzíted?`;
    if (!confirm(summary)) return;
    saveCashSettlement({
      periodStart, periodEnd,
      cashIncome, cashExpense, cashCountedTotal, cashByHolder,
      cardIncome: cardIncomeNet, transferIncome, otherExpense, note,
    });
    setHolderAmounts({});
    setNote("");
    setCustomStart("");
  }

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Elszámolás</div></div>
      </div>

      {!lastSettlement && (
        <div className="field" style={{ maxWidth: 260, marginBottom: 16 }}>
          <label>Időszak kezdete (első elszámolás)</label>
          <input type="date" value={customStart || earliestTxDate || today()} onChange={(e) => setCustomStart(e.target.value)} />
        </div>
      )}
      <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>
        Időszak: <b style={{ color: "#111827" }}>{periodStart} – {periodEnd}</b>
        {periodValid && ` (${daysBetweenInclusive(periodStart, periodEnd)} nap)`}
      </div>
      {unknownPaymentIncome > 0 && (
        <div style={{ fontSize: 12, color: "var(--warning-ink)", background: "var(--warning-soft)", borderRadius: "var(--radius-sm)", padding: "7px 12px", marginBottom: 16 }}>
          {money(unknownPaymentIncome)} bevételen nincs megadva fizetési mód (régi adat) — ez a profitba beleszámít, de a készpénz-egyeztetésben nem, mert nem tudjuk biztosan, készpénz volt-e.
        </div>
      )}

      <div className="statrow c5" style={{ marginBottom: 16 }}>
        <div className="statcard accent"><div className="lbl">Készpénz (rendszer szerint)</div><div className="val">{money(cashExpected)}</div></div>
        <div className="statcard"><div className="lbl">Kártya (nettó, −1,2%)</div><div className="val">{money(cardIncomeNet)}</div></div>
        <div className="statcard"><div className="lbl">Átutalás</div><div className="val">{money(transferIncome)}</div></div>
        <div className="statcard"><div className="lbl">Egyéb kiadás</div><div className="val" style={{ color: "#B91C1C" }}>{money(otherExpense)}</div></div>
        <div className="statcard"><div className="lbl">Profit (megosztandó)</div><div className="val" style={{ color: "#22C55E" }}>{money(totalProfit)}</div></div>
      </div>

      {periodValid && daysBetweenInclusive(periodStart, periodEnd) <= 62 && allowedLocations?.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {eachDateInPeriod(periodStart, periodEnd).map((d) => {
            const closesForDay = (dayCloses || []).filter((c) => c.date === d && !c.reopenedAt);
            const allClosed = closesForDay.length >= allowedLocations.length;
            return (
              <span key={d} className="badge-loc" style={{ color: allClosed ? "#15803D" : "#B91C1C" }}>
                {d}: {closesForDay.length}/{allowedLocations.length} zárva
              </span>
            );
          })}
        </div>
      )}

      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>
        Ebben az időszakban történt ({periodTx.length} tétel)
      </div>
      <div style={{ marginBottom: 22 }}>
        <TransactionsPeriodList
          transactions={periodTx}
          locName={locName}
          onEdit={setTxModal}
          onDelete={deleteTransaction}
          onOpenReceipt={setReceiptTxId}
          busy={busy}
        />
      </div>

      <form className="tw" style={{ padding: 20 }} onSubmit={handleSubmit}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", marginBottom: 12 }}>Kinél mennyi készpénz van most</div>
        <div className="row3">
          {activeHolders.map((h) => (
            <div className="field" key={h.id}>
              <label>{h.name}</label>
              <input type="number" step="1" value={holderAmounts[h.id] ?? ""} onChange={(e) => setHolderAmounts((prev) => ({ ...prev, [h.id]: e.target.value }))} placeholder="0" />
            </div>
          ))}
        </div>
        <div className="field">
          <label>Megjegyzés (opcionális)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="pl. eltérés oka" />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <div>
            <span style={{ fontSize: 12, color: "#6B7280", marginRight: 8 }}>Összesen: {money(cashCountedTotal)} · Eltérés:</span>
            <span className="tag" style={{ fontSize: 13, background: isOk ? "var(--primary-soft)" : "var(--danger-soft)", color: isOk ? "var(--primary-ink)" : "var(--danger-ink)" }}>
              {diff > 0 ? "+" : ""}{money(diff)}
            </span>
          </div>
          <button type="submit" className="btn" disabled={busy || !periodValid}>Elszámolás rögzítése</button>
        </div>
      </form>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "22px 0 8px 2px" }}>Korábbi elszámolások</div>
      <div className="tw">
        {cashSettlements.length === 0 ? (
          <EmptyState icon={FinanceIcon}>Még nincs rögzített elszámolás.</EmptyState>
        ) : (
          <table>
            <thead><tr><th>Időszak</th><th>Rendszer szerint</th><th>Megszámolt</th><th>Eltérés</th><th>Profit</th><th>Fejenként</th><th>Kinél volt</th><th>Rögzítette</th></tr></thead>
            <tbody>
              {cashSettlements.map((s) => {
                const d = s.cashCountedTotal - s.cashExpected;
                const ok = Math.abs(d) <= 1;
                const closer = users.find((u) => u.id === s.settledBy);
                return (
                  <tr key={s.id}>
                    <td className="mono">{s.periodStart} – {s.periodEnd}</td>
                    <td className="mono">{money(s.cashExpected)}</td>
                    <td className="mono">{money(s.cashCountedTotal)}</td>
                    <td className="mono" style={{ fontWeight: 700, color: ok ? "#15803D" : "#B91C1C" }}>{d > 0 ? "+" : ""}{money(d)}</td>
                    <td className="mono" style={{ fontWeight: 700 }}>{money(s.totalProfit)}</td>
                    <td className="mono">{money(s.totalProfit / 2)}</td>
                    <td style={{ color: "#6B7280", fontSize: 12 }}>
                      {Object.entries(s.cashByHolder).map(([hid, amt]) => `${holderName(hid)}: ${money(amt)}`).join(" · ")}
                    </td>
                    <td>{closer?.fullName || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
