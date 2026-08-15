import { useEffect, useState } from "react";
import { money, today } from "../lib/utils";
import { EmptyState } from "../components/EmptyState";
import { FinanceIcon } from "../components/icons";

const CARD_FEE_RATE = 0.012;

export default function ShiftCloseTab({
  busy, isAdmin, myLocationId, allowedLocations, locName, transactions, shiftCloses, saveShiftClose, users,
  partnerSettlements, settlePartner,
}) {
  const [selectedLocId, setSelectedLocId] = useState(isAdmin ? (allowedLocations[0]?.id || "") : myLocationId);
  const [cashCounted, setCashCounted] = useState("");
  const [note, setNote] = useState("");

  const closeDate = today();
  const locId = isAdmin ? selectedLocId : myLocationId;

  const existingClose = shiftCloses.find((s) => s.locationId === locId && s.closeDate === closeDate);

  useEffect(() => {
    setCashCounted(existingClose ? String(existingClose.cashCounted) : "");
    setNote(existingClose ? existingClose.note : "");
  }, [locId, existingClose?.id]);

  const todaysTx = transactions.filter((t) => t.locationId === locId && t.date === closeDate);
  const cashIncome = todaysTx.filter((t) => t.type === "income" && t.payment === "Készpénz").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const cashExpenseAmt = todaysTx.filter((t) => t.type === "expense" && t.payment === "Készpénz").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const cashExpected = cashIncome - cashExpenseAmt;
  const cardIncomeGross = todaysTx.filter((t) => t.type === "income" && t.payment === "Kártya").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const cardFee = cardIncomeGross * CARD_FEE_RATE;
  const cardIncomeNet = cardIncomeGross - cardFee;
  const transferIncome = todaysTx.filter((t) => t.type === "income" && t.payment === "Átutalás").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalExpense = todaysTx.filter((t) => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const todaysProfit = (cashIncome + cardIncomeNet + transferIncome) - totalExpense;

  const countedNum = Number(cashCounted) || 0;
  const diff = countedNum - cashExpected;
  const isOk = Math.abs(diff) <= 1;

  function handleSubmit(e) {
    e.preventDefault();
    if (!locId) return;
    if (existingClose && !confirm(`Erre a napra (${closeDate}) már van rögzített zárás ezen a helyszínen. Felülírod?`)) return;
    saveShiftClose({
      locationId: locId, closeDate,
      cashExpected, cashCounted: countedNum,
      cardIncome: cardIncomeNet, transferIncome, totalExpense, note,
    });
  }

  // csak az utolsó Endre-elszámolás óta készült zárások — a régebbi nyers adat a Bevételek & Kiadásoknál megvan
  const lastSettlement = partnerSettlements[0] || null;
  const visibleCloses = lastSettlement
    ? shiftCloses.filter((s) => s.closeDate > lastSettlement.settledThroughDate)
    : shiftCloses;
  const unsettledTotal = visibleCloses.reduce((s, c) => s + c.cashExpected, 0);

  function handleSettle() {
    if (visibleCloses.length === 0) return;
    if (!confirm(`Elszámoltátok Endrével ${money(unsettledTotal)}-t (fejenként ${money(unsettledTotal / 2)})? Ez lezárja a jelenlegi időszakot.`)) return;
    settlePartner(closeDate, unsettledTotal);
  }

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Napi zárás</div><div className="page-sub">Rendszer-számolt vs. ténylegesen megszámolt készpénz</div></div>
      </div>

      {isAdmin && (
        <div className="seg" style={{ marginBottom: 16 }}>
          {allowedLocations.map((l) => (
            <button key={l.id} type="button" className={selectedLocId === l.id ? "active" : ""} onClick={() => setSelectedLocId(l.id)}>{l.name}</button>
          ))}
        </div>
      )}

      <div className="statrow c5" style={{ marginBottom: 16 }}>
        <div className="statcard accent"><div className="lbl">Hazavihető (készpénz)</div><div className="val">{money(cashExpected)}</div></div>
        <div className="statcard"><div className="lbl">Kártya (nettó, −1,2%)</div><div className="val">{money(cardIncomeNet)}</div></div>
        <div className="statcard"><div className="lbl">Átutalás</div><div className="val">{money(transferIncome)}</div></div>
        <div className="statcard"><div className="lbl">Kiadás összesen</div><div className="val" style={{ color: "#B91C1C" }}>{money(totalExpense)}</div></div>
        <div className="statcard"><div className="lbl">Mai profit</div><div className="val" style={{ color: "#22C55E" }}>{money(todaysProfit)}</div></div>
      </div>

      <form className="tw" style={{ padding: 20 }} onSubmit={handleSubmit}>
        <div className="row2">
          <div className="field">
            <label>Készpénz a fiókban most</label>
            <input type="number" step="1" value={cashCounted} onChange={(e) => setCashCounted(e.target.value)} placeholder="0" required disabled={!locId} />
          </div>
          <div className="field">
            <label>Megjegyzés (opcionális)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="pl. eltérés oka" disabled={!locId} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <div>
            <span style={{ fontSize: 12, color: "#6B7280", marginRight: 8 }}>Eltérés:</span>
            <span className="tag" style={{ fontSize: 13, background: isOk ? "var(--primary-soft)" : "var(--danger-soft)", color: isOk ? "var(--primary-ink)" : "var(--danger-ink)" }}>
              {diff > 0 ? "+" : ""}{money(diff)}
            </span>
          </div>
          <button type="submit" className="btn" disabled={busy || !locId}>{existingClose ? "Zárás módosítása" : "Zárás rögzítése"}</button>
        </div>
      </form>

      {isAdmin && (
        <>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "22px 0 8px 2px" }}>Elszámolás Endrével</div>
          <div className="statcard" style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div className="lbl">Elszámolatlan hazavihető összeg{lastSettlement ? ` (${lastSettlement.settledThroughDate} óta)` : ""}</div>
                <div className="val">{money(unsettledTotal)}</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>fejenként {money(unsettledTotal / 2)} · {visibleCloses.length} lezárt nap</div>
              </div>
              <button type="button" className="btn sec" disabled={busy || visibleCloses.length === 0} onClick={handleSettle}>Elszámolva Endrével</button>
            </div>
          </div>

          {partnerSettlements.length > 0 && (
            <div className="tw" style={{ marginBottom: 22 }}>
              <table>
                <thead><tr><th>Elszámolva eddig</th><th>Összeg</th><th>Fejenként</th><th>Ki zárta</th><th>Mikor</th></tr></thead>
                <tbody>
                  {partnerSettlements.map((s) => (
                    <tr key={s.id}>
                      <td className="mono">{s.settledThroughDate}</td>
                      <td className="mono" style={{ fontWeight: 700 }}>{money(s.totalAmount)}</td>
                      <td className="mono">{money(s.totalAmount / 2)}</td>
                      <td>{users.find((u) => u.id === s.settledBy)?.fullName || "—"}</td>
                      <td className="mono" style={{ color: "#6B7280" }}>{(s.settledAt || "").slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>Korábbi zárások</div>
      <div className="tw">
        {visibleCloses.length === 0 ? (
          <EmptyState icon={FinanceIcon}>Még nincs rögzített zárás.</EmptyState>
        ) : (
          <table>
            <thead><tr><th>Dátum</th><th>Helyszín</th><th>Készpénz (rendszer)</th><th>Megszámolt</th><th>Eltérés</th><th>Zárta</th></tr></thead>
            <tbody>
              {visibleCloses.map((s) => {
                const d = s.cashCounted - s.cashExpected;
                const ok = Math.abs(d) <= 1;
                const closer = users.find((u) => u.id === s.closedBy);
                return (
                  <tr key={s.id}>
                    <td className="mono">{s.closeDate}</td>
                    <td><span className="badge-loc">{locName(s.locationId)}</span></td>
                    <td className="mono">{money(s.cashExpected)}</td>
                    <td className="mono">{money(s.cashCounted)}</td>
                    <td className="mono" style={{ fontWeight: 700, color: ok ? "#15803D" : "#B91C1C" }}>{d > 0 ? "+" : ""}{money(d)}</td>
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
