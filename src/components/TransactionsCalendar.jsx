import { useMemo, useState } from "react";
import { TransactionRowsTable } from "./TransactionsPeriodList";
import { money, today } from "../lib/utils";
import { EmptyState } from "./EmptyState";
import { FinanceIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";

const WEEKDAYS = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];
const MONTH_NAMES = ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"];
const RECENT_WINDOW_DAYS = 30;

function pad(n) { return String(n).padStart(2, "0"); }
function dstr(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function addMonths(y, m, delta) {
  const total = y * 12 + m + delta;
  return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 };
}
function monthLabel(y, m) { return `${y}. ${MONTH_NAMES[m]}`; }

function dayStats(rows) {
  const incomeCash = rows.filter((t) => t.type === "income" && t.payment === "Készpénz").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const incomeCard = rows.filter((t) => t.type === "income" && t.payment === "Kártya").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const expense = rows.filter((t) => t.type === "expense" && t.payment).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const margin = rows.filter((t) => t.type === "income").reduce((s, t) => s + ((Number(t.amount) || 0) - (Number(t.costPrice) || 0)), 0)
    - rows.filter((t) => t.type === "expense" && !t.payment).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  return { incomeCash, incomeCard, expense, margin };
}

function MonthGrid({
  viewY, viewM, onGoMonth, todayStr, oldestAllowedDate, isAdmin,
  txByDay, closedDaysSet, selectedDay, onSelectDay,
}) {
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const firstWeekday = (new Date(viewY, viewM, 1).getDay() + 6) % 7; // Monday=0
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevDisabled = !isAdmin && (() => {
    const { y, m } = addMonths(viewY, viewM, -1);
    const lastDay = new Date(y, m + 1, 0).getDate();
    return dstr(y, m, lastDay) < oldestAllowedDate;
  })();
  const now = new Date();
  const nextDisabled = viewY === now.getFullYear() && viewM === now.getMonth();

  return (
    <div style={{ maxWidth: 260, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button type="button" className="iconbtn" disabled={prevDisabled} onClick={() => onGoMonth(-1)} style={prevDisabled ? { opacity: 0.3, cursor: "default" } : undefined}>
          <ChevronLeftIcon width={14} height={14} />
        </button>
        <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: "capitalize" }}>{monthLabel(viewY, viewM)}</div>
        <button type="button" className="iconbtn" disabled={nextDisabled} onClick={() => onGoMonth(1)} style={nextDisabled ? { opacity: 0.3, cursor: "default" } : undefined}>
          <ChevronRightIcon width={14} height={14} />
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 2 }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ textAlign: "center", fontSize: 9.5, fontWeight: 700, color: "#9CA3AF", padding: "2px 0" }}>{w}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const dateStr = dstr(viewY, viewM, d);
          const hasData = txByDay.has(dateStr);
          const isClosed = closedDaysSet.has(dateStr);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDay;
          const isFuture = dateStr > todayStr;
          const isTooOld = !isAdmin && dateStr < oldestAllowedDate;
          const disabled = isFuture || isTooOld;
          let bg = "transparent", border = "1px solid transparent", color = "#374151";
          if (isClosed) { bg = "#DCFCE7"; color = "#15803D"; }
          if (hasData && !isClosed) { border = "1px solid #D1D5DB"; }
          if (isToday && !isSelected) { border = "1.5px solid var(--accent)"; }
          if (isSelected) { bg = "var(--accent)"; color = "#fff"; border = "1.5px solid var(--accent)"; }
          if (disabled) { color = "#D1D5DB"; bg = "transparent"; border = "1px solid transparent"; }
          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDay(dateStr)}
              title={isTooOld ? "Csak admin láthatja a 30 napnál régebbi napokat" : undefined}
              style={{
                aspectRatio: "1", borderRadius: "50%", fontSize: 11, fontFamily: "inherit", fontWeight: isToday || isSelected ? 700 : 500,
                background: bg, color, border, cursor: disabled ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function TransactionsCalendar({
  transactions, dayCloses, allowedLocations, effectiveLocFilter, isAdmin, locName,
  onEdit, onDelete, onOpenReceipt, busy, productConditionById,
}) {
  const todayStr = today();
  const now = new Date();
  const [viewY, setViewY] = useState(now.getFullYear());
  const [viewM, setViewM] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showArchive, setShowArchive] = useState(false);

  const oldestAllowedDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - RECENT_WINDOW_DAYS);
    return dstr(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const isAll = effectiveLocFilter === "all";
  const relevantLocs = isAll ? allowedLocations : allowedLocations.filter((l) => l.id === effectiveLocFilter);

  const txByDay = useMemo(() => {
    const m = new Map();
    for (const t of transactions) {
      if (!m.has(t.date)) m.set(t.date, []);
      m.get(t.date).push(t);
    }
    return m;
  }, [transactions]);

  const closedDaysSet = useMemo(() => {
    const byDate = new Map();
    for (const dc of dayCloses) {
      if (dc.reopenedAt) continue;
      if (!relevantLocs.some((l) => l.id === dc.locationId)) continue;
      if (!byDate.has(dc.date)) byDate.set(dc.date, new Set());
      byDate.get(dc.date).add(dc.locationId);
    }
    const closed = new Set();
    for (const [date, locs] of byDate) {
      if (relevantLocs.length > 0 && locs.size >= relevantLocs.length) closed.add(date);
    }
    return closed;
  }, [dayCloses, relevantLocs]);

  function goMonth(delta) {
    const { y, m } = addMonths(viewY, viewM, delta);
    setViewY(y); setViewM(m);
    setSelectedDay(null);
  }

  function selectDay(dateStr) {
    setSelectedDay((prev) => (prev === dateStr ? null : dateStr));
  }

  const selectedRows = selectedDay ? (txByDay.get(selectedDay) || []).sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "")) : [];
  const selectedStats = selectedDay ? dayStats(selectedRows) : null;

  const archiveMonths = useMemo(() => {
    if (!isAdmin) return [];
    const byMonth = {};
    for (const t of transactions) {
      if (t.date >= oldestAllowedDate) continue;
      const key = t.date.slice(0, 7);
      (byMonth[key] ||= []).push(t);
    }
    return Object.keys(byMonth).sort((a, b) => b.localeCompare(a)).map((key) => {
      const [y, m] = key.split("-").map(Number);
      return { key, y, m: m - 1, ...dayStats(byMonth[key]) };
    });
  }, [transactions, isAdmin, oldestAllowedDate]);

  return (
    <div>
      <div className="tw" style={{ padding: 16 }}>
        <MonthGrid
          viewY={viewY} viewM={viewM} onGoMonth={goMonth} todayStr={todayStr} oldestAllowedDate={oldestAllowedDate} isAdmin={isAdmin}
          txByDay={txByDay} closedDaysSet={closedDaysSet} selectedDay={selectedDay} onSelectDay={selectDay}
        />
      </div>

      {selectedDay && (
        <div className="tw tw-compact" style={{ padding: 16, marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{selectedDay}</div>
            {closedDaysSet.has(selectedDay) && <span className="badge-loc" style={{ color: "#15803D" }}>✓ Lezárva</span>}
          </div>
          {selectedStats && (
            <div className="statrow c4" style={{ marginBottom: 14 }}>
              <div className="statcard"><div className="lbl">Bevétel (készpénz)</div><div className="val" style={{ color: "#15803D" }}>{money(selectedStats.incomeCash)}</div></div>
              <div className="statcard"><div className="lbl">Bevétel (kártya)</div><div className="val" style={{ color: "#15803D" }}>{money(selectedStats.incomeCard)}</div></div>
              <div className="statcard"><div className="lbl">Kiadás</div><div className="val" style={{ color: "#B91C1C" }}>{money(selectedStats.expense)}</div></div>
              <div className="statcard"><div className="lbl">Árrés</div><div className="val">{money(selectedStats.margin)}</div></div>
            </div>
          )}
          {selectedRows.length === 0 ? (
            <EmptyState icon={FinanceIcon}>Nincs rögzített tranzakció ezen a napon.</EmptyState>
          ) : (
            <TransactionRowsTable rows={selectedRows} locName={locName} onEdit={onEdit} onDelete={onDelete} onOpenReceipt={onOpenReceipt} busy={busy} productConditionById={productConditionById} showLocation={isAll} />
          )}
        </div>
      )}

      {isAdmin && archiveMonths.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <span className="toggle-link" onClick={() => setShowArchive((v) => !v)}>
            {showArchive ? "Korábbi hónapok elrejtése" : `Korábbi hónapok megtekintése (${archiveMonths.length})`}
          </span>
          {showArchive && (
            <div className="tw" style={{ marginTop: 10 }}>
              <table>
                <thead><tr><th>Hónap</th><th className="num-col">Bevétel (kp)</th><th className="num-col">Bevétel (kártya)</th><th className="num-col">Kiadás</th><th className="num-col">Árrés</th><th></th></tr></thead>
                <tbody>
                  {archiveMonths.map((mo) => (
                    <tr key={mo.key}>
                      <td style={{ fontWeight: 500, color: "#111827", textTransform: "capitalize" }}>{monthLabel(mo.y, mo.m)}</td>
                      <td className="num-col" style={{ color: "#15803D" }}>{money(mo.incomeCash)}</td>
                      <td className="num-col" style={{ color: "#15803D" }}>{money(mo.incomeCard)}</td>
                      <td className="num-col" style={{ color: "#B91C1C" }}>{money(mo.expense)}</td>
                      <td className="num-col">{money(mo.margin)}</td>
                      <td>
                        <button type="button" className="toggle-link" style={{ margin: 0 }} onClick={() => { setViewY(mo.y); setViewM(mo.m); setSelectedDay(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                          Napi bontás
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
