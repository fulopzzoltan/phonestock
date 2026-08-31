import { useMemo, useState } from "react";
import { money } from "../lib/utils";
import { EmptyState } from "../components/EmptyState";
import { FinanceIcon } from "../components/icons";
import TransactionsPeriodList from "../components/TransactionsPeriodList";

function dayAfter(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function daysBetweenInclusive(a, b) {
  return Math.round((new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / 86400000) + 1;
}

// Greedy settle-up: minimális számú átutalással kiegyenlíti az egyenlegeket (N helyszínre is működik,
// nem csak kettőre — ha csak két helyszín van, ez pontosan egy sima "A ad B-nek X-et" mondatot ad.
// Ez fizikai készpénz-mozgatás, nem elszámolási tartozás: akinél TÖBB a készpénz (pozitív egyenleg,
// "surplus"), az adja át a különbözetet annak, akinél KEVESEBB van (negatív egyenleg, "deficit").
function computeTransfers(locs) {
  const surplus = locs.filter((l) => l.balance > 0.5).map((l) => ({ ...l })).sort((a, b) => b.balance - a.balance);
  const deficit = locs.filter((l) => l.balance < -0.5).map((l) => ({ ...l, balance: -l.balance })).sort((a, b) => b.balance - a.balance);
  const transfers = [];
  let i = 0, j = 0;
  while (i < surplus.length && j < deficit.length) {
    const amt = Math.min(surplus[i].balance, deficit[j].balance);
    transfers.push({ fromId: surplus[i].id, fromName: surplus[i].name, toId: deficit[j].id, toName: deficit[j].name, amount: amt });
    surplus[i].balance -= amt;
    deficit[j].balance -= amt;
    if (surplus[i].balance < 0.5) i++;
    if (deficit[j].balance < 0.5) j++;
  }
  return transfers;
}

export default function CashSettlementTab({
  busy, transactions, cashSettlements, saveCashSettlement, users,
  setTxModal, deleteTransaction, setReceiptTxId, allowedLocations, locName,
}) {
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [countedByLoc, setCountedByLoc] = useState({});
  const [note, setNote] = useState("");
  const [showList, setShowList] = useState(false);

  const lastSettlement = cashSettlements[0] || null;
  // Alapértelmezett kezdet: az utolsó elszámolás utáni nap (vagy tegnap, ha még nem volt
  // elszámolás). Alapértelmezett vég: TEGNAP, nem a mai nap — a mai nap még nincs vége,
  // a benne lévő készpénz-mozgás még változhat, ezért ne kerüljön automatikusan bele.
  // Mindkettő szabadon módosítható a dátumválasztókkal.
  const defaultStart = lastSettlement ? dayAfter(lastSettlement.periodEnd) : yesterday();
  const periodStart = customStart || defaultStart;
  const periodEnd = customEnd || yesterday();
  const periodValid = periodStart <= periodEnd;

  const periodTx = useMemo(() => transactions.filter((t) => t.date >= periodStart && t.date <= periodEnd), [transactions, periodStart, periodEnd]);

  const perLoc = useMemo(() => allowedLocations.map((loc) => {
    const locTx = periodTx.filter((t) => t.locationId === loc.id);
    const cashIncome = locTx.filter((t) => t.type === "income" && t.payment === "Készpénz").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const cashExpense = locTx.filter((t) => t.type === "expense" && t.payment === "Készpénz").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    return { id: loc.id, name: loc.name, net: cashIncome - cashExpense };
  }), [allowedLocations, periodTx]);

  const totalNet = perLoc.reduce((s, l) => s + l.net, 0);
  const fairShare = perLoc.length > 0 ? totalNet / perLoc.length : 0;
  const withBalance = useMemo(() => perLoc.map((l) => ({ ...l, balance: l.net - fairShare })), [perLoc, fairShare]);
  const transfers = useMemo(() => computeTransfers(withBalance), [withBalance]);
  const allSettled = withBalance.length > 0 && transfers.length === 0;

  const cardIncome = periodTx.filter((t) => t.type === "income" && t.payment === "Kártya").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const transferIncome = periodTx.filter((t) => t.type === "income" && t.payment === "Átutalás").reduce((s, t) => s + (Number(t.amount) || 0), 0);

  function holderNameFor(locId) {
    return locName(locId);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!periodValid) return;
    const locationBreakdown = withBalance.map((l) => ({
      location_id: l.id,
      location_name: l.name,
      net_cash: l.net,
      counted_cash: countedByLoc[l.id] !== undefined && countedByLoc[l.id] !== "" ? Number(countedByLoc[l.id]) : null,
      fair_share: fairShare,
      balance: l.balance,
    }));
    const summaryLine = transfers.length === 0
      ? "Nincs teendő, egyenlőek."
      : transfers.map((tr) => `${tr.fromName} ad át ${tr.toName}-nak ${money(tr.amount)}-t`).join("; ");
    if (!confirm(`Elszámolás rögzítése (${periodStart} – ${periodEnd}): ${summaryLine} Rögzíted?`)) return;
    saveCashSettlement({
      periodStart, periodEnd, locationBreakdown, cardIncome, transferIncome,
      payerLocationId: transfers[0]?.fromId ?? null,
      payeeLocationId: transfers[0]?.toId ?? null,
      transferAmount: transfers[0]?.amount ?? 0,
      note,
    });
    setCountedByLoc({});
    setNote("");
    setCustomStart("");
    setCustomEnd("");
  }

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Elszámolás</div></div>
      </div>

      <div className="row2" style={{ maxWidth: 420, marginBottom: 16 }}>
        <div className="field" style={{ margin: 0 }}>
          <label>Időszak kezdete</label>
          <input type="date" value={periodStart} onChange={(e) => setCustomStart(e.target.value)} />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Időszak vége</label>
          <input type="date" value={periodEnd} onChange={(e) => setCustomEnd(e.target.value)} />
        </div>
      </div>
      <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>
        Időszak: <b style={{ color: "#111827" }}>{periodStart} – {periodEnd}</b>
        {periodValid && ` (${daysBetweenInclusive(periodStart, periodEnd)} nap)`}
      </div>

      <form className="tw" style={{ padding: 20 }} onSubmit={handleSubmit}>
        <div className="tw" style={{ marginBottom: 16, overflow: "hidden" }}>
          <table>
            <thead>
              <tr>
                <th>Helyszín</th>
                <th className="num-col">Nettó cash</th>
                <th className="num-col">Jár (fele)</th>
                <th className="num-col">Egyenleg</th>
              </tr>
            </thead>
            <tbody>
              {withBalance.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600 }}>{l.name}</td>
                  <td className="num-col mono">{money(l.net)}</td>
                  <td className="num-col mono" style={{ color: "#6B7280" }}>{money(fairShare)}</td>
                  <td className="num-col mono" style={{ fontWeight: 700, color: l.balance > 0.5 ? "#15803D" : l.balance < -0.5 ? "#B91C1C" : "#6B7280" }}>
                    {l.balance > 0 ? "+" : ""}{money(l.balance)}
                  </td>
                </tr>
              ))}
              <tr>
                <td style={{ fontWeight: 700, color: "#374151" }}>Összesen</td>
                <td className="num-col mono" style={{ fontWeight: 700 }}>{money(totalNet)}</td>
                <td className="num-col mono" style={{ color: "#6B7280" }}>{money(totalNet)}</td>
                <td className="num-col mono">0</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ textAlign: "center", padding: "14px 10px", fontSize: 16, fontWeight: 700, color: allSettled ? "#15803D" : "#111827", background: "#F9FAFB", borderRadius: "var(--radius-md)", marginBottom: 16 }}>
          {withBalance.length === 0 ? "Nincs helyszín az elszámoláshoz."
            : allSettled ? "Nincs teendő, egyenlőek."
            : transfers.map((tr, i) => (
              <div key={i}>{tr.fromName} ad át {tr.toName}-nak <span style={{ color: "var(--accent)" }}>{money(tr.amount)}</span>-t.</div>
            ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <span className="badge-income">Kártyás: {money(cardIncome)}</span>
          <span className="badge-income">Utalásos: {money(transferIncome)}</span>
        </div>

        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", marginBottom: 12 }}>Fizikai ellenőrzés (opcionális) — ténylegesen mennyi készpénz van most</div>
        <div className="row3">
          {withBalance.map((l) => {
            const counted = countedByLoc[l.id];
            const diff = counted !== undefined && counted !== "" ? Number(counted) - l.net : null;
            const ok = diff === null || Math.abs(diff) <= 1;
            return (
              <div className="field" key={l.id}>
                <label>{l.name}</label>
                <input type="number" step="1" value={counted ?? ""} onChange={(e) => setCountedByLoc((prev) => ({ ...prev, [l.id]: e.target.value }))} placeholder={String(Math.round(l.net))} />
                {diff !== null && !ok && (
                  <div style={{ fontSize: 11, color: "#B91C1C", marginTop: 3, fontWeight: 600 }}>Eltérés: {diff > 0 ? "+" : ""}{money(diff)}</div>
                )}
              </div>
            );
          })}
        </div>
        <div className="field">
          <label>Megjegyzés (opcionális)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="pl. eltérés oka" />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
          <button type="submit" className="btn" disabled={busy || !periodValid || withBalance.length === 0}>Elszámolás rögzítése</button>
        </div>
      </form>

      <div style={{ marginTop: 18 }}>
        <span className="toggle-link" onClick={() => setShowList((v) => !v)}>
          {showList ? "Időszak tételeinek elrejtése" : `Időszak tételei megtekintése (${periodTx.length})`}
        </span>
        {showList && (
          <div style={{ marginTop: 10 }}>
            <TransactionsPeriodList transactions={periodTx} locName={locName} onEdit={setTxModal} onDelete={deleteTransaction} onOpenReceipt={setReceiptTxId} busy={busy} />
          </div>
        )}
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "22px 0 8px 2px" }}>Korábbi elszámolások</div>
      <div className="tw">
        {cashSettlements.length === 0 ? (
          <EmptyState icon={FinanceIcon}>Még nincs rögzített elszámolás.</EmptyState>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Időszak</th>
                <th>Helyszínenként (nettó)</th>
                <th>Ki fizetett kinek</th>
                <th>Rögzítette</th>
              </tr>
            </thead>
            <tbody>
              {cashSettlements.map((s) => {
                const closer = users.find((u) => u.id === s.settledBy);
                return (
                  <tr key={s.id}>
                    <td className="mono">{s.periodStart} – {s.periodEnd}</td>
                    <td style={{ color: "#6B7280", fontSize: 12 }}>
                      {(s.locationBreakdown || []).map((l) => `${l.location_name}: ${money(l.net_cash)}`).join(" · ")}
                    </td>
                    <td>
                      {s.payerLocationId && s.payeeLocationId && Number(s.transferAmount) > 0 ? (
                        <span>{holderNameFor(s.payerLocationId)} → {holderNameFor(s.payeeLocationId)}: <b>{money(s.transferAmount)}</b></span>
                      ) : <span style={{ color: "#9CA3AF" }}>Egyenlő volt</span>}
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
