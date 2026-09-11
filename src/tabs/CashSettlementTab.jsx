import { useMemo, useState } from "react";
import { money, cashPortion, cardPortion } from "../lib/utils";
import { FinanceIcon, EditIcon } from "../components/icons";
import HistorySection from "../components/HistorySection";
import ConfirmDelete from "../components/ConfirmDelete";

function EditSettlementRow({ settlement, busy, onSave, onCancel }) {
  const [periodStart, setPeriodStart] = useState(settlement.periodStart);
  const [periodEnd, setPeriodEnd] = useState(settlement.periodEnd);
  const [note, setNote] = useState(settlement.note || "");
  const valid = periodStart <= periodEnd;
  return (
    <tr>
      <td colSpan={5}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", padding: "8px 0" }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Kezdete</label>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Vége</label>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
          <div className="field" style={{ margin: 0, flex: 1, minWidth: 160 }}>
            <label>Megjegyzés</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcionális" />
          </div>
          <button type="button" className="btn sm" disabled={!valid || busy} onClick={() => onSave({ periodStart, periodEnd, note })}>Mentés</button>
          <button type="button" className="btn sec sm" onClick={onCancel}>Mégse</button>
        </div>
        {!valid && <div style={{ fontSize: 12, color: "#B91C1C", paddingBottom: 8 }}>A kezdő dátum nem lehet később, mint a záró dátum.</div>}
      </td>
    </tr>
  );
}

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
function dayLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("hu-HU", { month: "short", day: "numeric", weekday: "short", timeZone: "UTC" });
}
function shortDayLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const weekday = d.toLocaleDateString("hu-HU", { weekday: "short", timeZone: "UTC" });
  return `${weekday}. ${d.getUTCDate()}`;
}
function numOnly(n) {
  return Math.round(Number(n) || 0).toLocaleString("hu-HU");
}
function dayTotal(day) {
  const withTx = day.locs.filter((l) => l.hasTx);
  if (withTx.length === 0) return { total: 0, hasAny: false };
  return { total: withTx.reduce((s, l) => s + l.net, 0), hasAny: true };
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

const LOC_PALETTE = ["#1DB954", "#2563EB", "#7C3AED", "#F59E0B"];

function amtColor(net, hasTx) {
  if (!hasTx) return "#C4C9D2";
  if (net > 0.5) return "#15803D";
  if (net < -0.5) return "#B91C1C";
  return "#9CA3AF";
}

// A) Napi tábla — sűrű, pontos számokra optimalizált nézet: egy sor egy napra,
// minden helyszín saját oszlopban. A legjobb, ha sok el nem számolt nap van egyszerre.
function DailyNumbersTable({ days }) {
  const locations = days[0]?.locs || [];
  return (
    <div className="tw">
      <table>
        <thead>
          <tr>
            <th>Nap</th>
            {locations.map((l) => <th key={l.id} className="num-col">{l.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <td className="mono" style={!d.hasTx ? { color: "#C4C9D2" } : undefined}>{dayLabel(d.date)}</td>
              {d.locs.map((l) => (
                <td key={l.id} className="num-col mono" style={{ fontWeight: 600, color: amtColor(l.net, l.hasTx) }}>
                  {l.hasTx ? `${l.net > 0 ? "+" : ""}${money(l.net)}` : "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// B) Napi kártyák — egy fehér, keretes kártya naponta (az app saját kártya-nyelve, nem
// kitalált forma), tetején a nappal, alatta helyszínenként a készpénz +/- egyenlege,
// alján egy rögzített, zöld/piros hátterű sávban a napi összesítő — a szín önmagában is
// jelzi, milyen volt a nap. A helyszín-nevek csak egyszer, a sor elején szerepelnek.
function DailyCards({ days }) {
  const locations = days[0]?.locs || [];
  return (
    <div style={{ display: "flex", gap: 14, paddingTop: 4, paddingBottom: 8 }}>
      <div className="cs-daycard-legend">
        <div className="cs-daycard-legend-spacer" />
        <div className="cs-daycard-legend-rows">
          {locations.map((l, i) => (
            <div key={l.id} className="cs-daycard-legend-row">
              <span className="cs-settle-dot" style={{ background: LOC_PALETTE[i % LOC_PALETTE.length] }} />
              {l.name}
            </div>
          ))}
        </div>
        <div className="cs-daycard-legend-total">ÖSSZESEN</div>
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto" }}>
        {days.map((d) => {
          const { total, hasAny } = dayTotal(d);
          const footerCls = !hasAny ? "neutral" : total > 0.5 ? "positive" : total < -0.5 ? "negative" : "neutral";
          return (
            <div key={d.date} className="cs-daycard" style={!d.hasTx ? { opacity: 0.55 } : undefined}>
              <div className="cs-daycard-date">{shortDayLabel(d.date)}</div>
              <div className="cs-daycard-rows">
                {d.locs.map((l) => (
                  <div key={l.id} className="cs-daycard-row" style={{ color: amtColor(l.net, l.hasTx) }}>
                    {l.hasTx ? `${l.net > 0 ? "+" : ""}${numOnly(l.net)}` : "—"}
                  </div>
                ))}
              </div>
              <div className={`cs-daycard-footer ${footerCls}`}>
                {hasAny ? `${total > 0 ? "+" : ""}${numOnly(total)}` : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CashSettlementTab({
  busy, transactions, cashSettlements, saveCashSettlement, editCashSettlement, deleteCashSettlement, users,
  allowedLocations, locName,
}) {
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [countedByLoc, setCountedByLoc] = useState({});
  const [note, setNote] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [dailyView, setDailyView] = useState("cards");

  const lastSettlement = cashSettlements[0] || null;
  // Alapértelmezett kezdet: az utolsó elszámolás utáni nap (vagy tegnap, ha még nem volt
  // elszámolás). Alapértelmezett vég: TEGNAP, nem a mai nap — a mai nap még nincs vége,
  // a benne lévő készpénz-mozgás még változhat, ezért ne kerüljön automatikusan bele.
  // Mindkettő szabadon módosítható a dátumválasztókkal.
  const defaultStart = lastSettlement ? dayAfter(lastSettlement.periodEnd) : yesterday();
  // Ha a legutóbbi elszámolás már tegnapig (vagy tovább) zárt, a "tegnap" alapértelmezett
  // vég korábbra esne, mint a most induló időszak kezdete — ez érvénytelen tartományt adna
  // rögtön egy sikeres rögzítés után. Ilyenkor a vég is a kezdő napra esik (a mai napra),
  // ami helyes: nincs más teljes, még el nem számolt nap, csak a mai.
  const defaultEnd = defaultStart > yesterday() ? defaultStart : yesterday();
  const periodStart = customStart || defaultStart;
  const periodEnd = customEnd || defaultEnd;
  const periodValid = periodStart <= periodEnd;

  const periodTx = useMemo(() => transactions.filter((t) => t.date >= periodStart && t.date <= periodEnd), [transactions, periodStart, periodEnd]);

  const perLoc = useMemo(() => allowedLocations.map((loc) => {
    const locTx = periodTx.filter((t) => t.locationId === loc.id);
    const cashIncome = locTx.filter((t) => t.type === "income").reduce((s, t) => s + cashPortion(t), 0);
    const cashExpense = locTx.filter((t) => t.type === "expense").reduce((s, t) => s + cashPortion(t), 0);
    return { id: loc.id, name: loc.name, net: cashIncome - cashExpense };
  }), [allowedLocations, periodTx]);

  const totalNet = perLoc.reduce((s, l) => s + l.net, 0);
  const fairShare = perLoc.length > 0 ? totalNet / perLoc.length : 0;
  const withBalance = useMemo(() => perLoc.map((l) => ({ ...l, balance: l.net - fairShare })), [perLoc, fairShare]);
  const transfers = useMemo(() => computeTransfers(withBalance), [withBalance]);
  const allSettled = withBalance.length > 0 && transfers.length === 0;

  const dailyPerLoc = useMemo(() => {
    if (!periodValid) return [];
    const days = [];
    for (let d = periodStart; d <= periodEnd; d = dayAfter(d)) {
      const dayTx = periodTx.filter((t) => t.date === d);
      const locs = allowedLocations.map((loc) => {
        const locTx = dayTx.filter((t) => t.locationId === loc.id);
        const cashIncome = locTx.filter((t) => t.type === "income").reduce((s, t) => s + cashPortion(t), 0);
        const cashExpense = locTx.filter((t) => t.type === "expense").reduce((s, t) => s + cashPortion(t), 0);
        return { id: loc.id, name: loc.name, net: cashIncome - cashExpense, hasTx: locTx.length > 0 };
      });
      days.push({ date: d, locs, hasTx: dayTx.length > 0 });
    }
    return days;
  }, [periodValid, periodStart, periodEnd, periodTx, allowedLocations]);

  const cardIncome = periodTx.filter((t) => t.type === "income").reduce((s, t) => s + cardPortion(t), 0);
  const transferIncome = periodTx.filter((t) => t.type === "income" && t.payment === "Átutalás").reduce((s, t) => s + (Number(t.amount) || 0), 0);

  function holderNameFor(locId) {
    return locName(locId);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!periodValid || busy) return;
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
    if (!confirm(`Árulás rögzítése (${periodStart} – ${periodEnd}): ${summaryLine} Rögzíted?`)) return;
    // Megvárjuk a mentést, mielőtt bármit visszaállítanánk — enélkül a mezők a mentés
    // BEFEJEZŐDÉSE ELŐTT nullázódtak, ami korábban megtévesztő, érvénytelen dátum-
    // tartományt (és ezzel látszólagos hibát) eredményezett egy amúgy sikeres mentés után.
    await saveCashSettlement({
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
    setJustSaved(true);
  }

  return (
    <>
      {justSaved && (
        <div style={{ fontSize: 13, color: "#15803D", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "var(--radius-md)", padding: "10px 14px", marginBottom: 16 }}>
          Az árulás rögzítve. Az alábbi új időszak a következő rögzítéshez készült elő — csak akkor nyomd meg újra a "Rögzítés" gombot, ha ehhez is van rögzítenivaló.
        </div>
      )}
      <form className="pult-section" style={{ marginBottom: 16 }} onSubmit={handleSubmit}>
        <div className="pult-section-head cs-daily-head">
          {withBalance.length > 0 && (
            <div className="cs-settle-hint" title={allSettled ? "Nincs teendő, egyenlőek." : transfers.map((tr) => `${tr.fromName} → ${tr.toName}: ${money(tr.amount)}`).join("; ")}>
              {allSettled ? (
                <span className="cs-settle-ok">Egyenleg rendben</span>
              ) : transfers.map((tr, i) => {
                const fromIdx = withBalance.findIndex((l) => l.id === tr.fromId);
                const toIdx = withBalance.findIndex((l) => l.id === tr.toId);
                return (
                  <span key={i} className="cs-settle-flow">
                    <span className="cs-settle-dot" style={{ background: LOC_PALETTE[fromIdx % LOC_PALETTE.length] }} />
                    <span className="cs-settle-arrow">→</span>
                    <span className="cs-settle-dot" style={{ background: LOC_PALETTE[toIdx % LOC_PALETTE.length] }} />
                    <b className="cs-settle-amt">{money(tr.amount)}</b>
                  </span>
                );
              })}
            </div>
          )}
          <div className="cs-daterange" style={{ marginLeft: "auto" }}>
            <input type="date" value={periodStart} onChange={(e) => { setCustomStart(e.target.value); setJustSaved(false); }} />
            <span className="sep">–</span>
            <input type="date" value={periodEnd} onChange={(e) => { setCustomEnd(e.target.value); setJustSaved(false); }} />
          </div>
          {periodValid && <span className="cnt-text" style={{ fontWeight: 500, fontSize: 12.5, color: "#9CA3AF" }}>{daysBetweenInclusive(periodStart, periodEnd)} nap</span>}
          <div className="seg">
            <button type="button" className={dailyView === "table" ? "active" : ""} onClick={() => setDailyView("table")}>Tábla</button>
            <button type="button" className={dailyView === "cards" ? "active" : ""} onClick={() => setDailyView("cards")}>Kártyák</button>
          </div>
        </div>
        {periodValid ? (
          <>
            {dailyView === "table" && <DailyNumbersTable days={dailyPerLoc} />}
            {dailyView === "cards" && <DailyCards days={dailyPerLoc} />}
          </>
        ) : (
          <div style={{ fontSize: 13, color: "#B91C1C", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-md)", padding: "10px 14px" }}>
            A kezdő dátum ({periodStart}) nem lehet később, mint a záró dátum ({periodEnd}) — emiatt a rögzítés gomb ki van kapcsolva.
          </div>
        )}

        <div style={{ borderTop: "1px solid #EEF0F2", margin: "20px 0 16px" }} />

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
          <div className="field">
            <label>Megjegyzés</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="pl. eltérés oka" />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <span className="badge-income">Kártyás: {money(cardIncome)}</span>
            <span className="badge-income">Utalásos: {money(transferIncome)}</span>
          </div>
          <button type="submit" className="btn" disabled={busy || !periodValid || withBalance.length === 0}>Árulás rögzítése</button>
        </div>
      </form>

      <HistorySection
        icon={FinanceIcon}
        label="Korábbi árulások"
        items={cashSettlements}
        filterFn={(s, q) => [s.periodStart, s.periodEnd, ...(s.locationBreakdown || []).map((l) => l.location_name)].filter(Boolean).join(" ").toLowerCase().includes(q)}
      >
        {(rows) => (
          <table>
            <thead>
              <tr>
                <th>Időszak</th>
                <th>Helyszínenként (nettó)</th>
                <th>Ki fizetett kinek</th>
                <th>Rögzítette</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const closer = users.find((u) => u.id === s.settledBy);
                if (editingId === s.id) {
                  return (
                    <EditSettlementRow
                      key={s.id}
                      settlement={s}
                      busy={busy}
                      onCancel={() => setEditingId(null)}
                      onSave={async (data) => { await editCashSettlement(s.id, data); setEditingId(null); }}
                    />
                  );
                }
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
                    <td className="stk-actions" style={{ whiteSpace: "nowrap" }}>
                      <button type="button" className="iconbtn" disabled={busy} onClick={() => setEditingId(s.id)}><EditIcon /></button>
                      <ConfirmDelete disabled={busy} onConfirm={() => deleteCashSettlement(s.id)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </HistorySection>
    </>
  );
}
