import { useEffect, useState } from "react";
import { money, today } from "../lib/utils";
import { EmptyState } from "../components/EmptyState";
import { FinanceIcon } from "../components/icons";

export default function ShiftCloseTab({
  busy, isAdmin, myLocationId, allowedLocations, locName, transactions, shiftCloses, saveShiftClose, users,
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
  const cardIncome = todaysTx.filter((t) => t.type === "income" && t.payment === "Kártya").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const transferIncome = todaysTx.filter((t) => t.type === "income" && t.payment === "Átutalás").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalExpense = todaysTx.filter((t) => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);

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
      cardIncome, transferIncome, totalExpense, note,
    });
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

      <div className="statrow c4" style={{ marginBottom: 16 }}>
        <div className="statcard"><div className="lbl">Készpénz (rendszer)</div><div className="val">{money(cashExpected)}</div></div>
        <div className="statcard"><div className="lbl">Kártya</div><div className="val">{money(cardIncome)}</div></div>
        <div className="statcard"><div className="lbl">Átutalás</div><div className="val">{money(transferIncome)}</div></div>
        <div className="statcard"><div className="lbl">Kiadás összesen</div><div className="val" style={{ color: "#B91C1C" }}>{money(totalExpense)}</div></div>
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

      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "22px 0 8px 2px" }}>Korábbi zárások</div>
      <div className="tw">
        {shiftCloses.length === 0 ? (
          <EmptyState icon={FinanceIcon}>Még nincs rögzített zárás.</EmptyState>
        ) : (
          <table>
            <thead><tr><th>Dátum</th><th>Helyszín</th><th>Készpénz (rendszer)</th><th>Megszámolt</th><th>Eltérés</th><th>Zárta</th></tr></thead>
            <tbody>
              {shiftCloses.map((s) => {
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
