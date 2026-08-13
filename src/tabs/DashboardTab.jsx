import { money } from "../lib/utils";
import StockValueChart from "../components/StockValueChart";
import MonthlyTrendChart from "../components/MonthlyTrendChart";

export default function DashboardTab({
  effectiveLocFilter, locName, stockStats, stockHistory, svcStats,
  monthlyTrendSummary, currentMonthLive, monthlySummaries, locations,
  txStats, partsStats, customerStats,
}) {
  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Áttekintés</div><div className="page-sub">{effectiveLocFilter === "all" ? "Mindkét helyszín" : locName(effectiveLocFilter)}</div></div>
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>📱 Telefonok</div>
      <div className="statrow c4">
        <div className="statcard accent"><div className="lbl">Raktáron</div><div className="val">{stockStats.count} db</div></div>
        <div className="statcard"><div className="lbl">Készlet értéke</div><div className="val">{money(stockStats.value)}</div></div>
        <div className="statcard"><div className="lbl">Besz. érték</div><div className="val">{money(stockStats.cost)}</div></div>
        <div className="statcard"><div className="lbl">Várható profit</div><div className="val" style={{ color: "#22C55E" }}>{money(stockStats.profit)}</div></div>
      </div>
      <div style={{ marginBottom: 26 }}>
        <StockValueChart history={stockHistory} />
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>🔧 Szerviz</div>
      <div className={`statrow ${svcStats.ownStock > 0 ? "c6" : "c5"}`} style={{ marginBottom: 26 }}>
        <div className="statcard accent"><div className="lbl">Összes</div><div className="val">{svcStats.total}</div></div>
        <div className="statcard"><div className="lbl">Aktív (ügyfél)</div><div className="val">{svcStats.active}</div></div>
        <div className="statcard"><div className="lbl">Kész (ügyfél)</div><div className="val" style={{ color: "#15803D" }}>{svcStats.kesz}</div></div>
        <div className="statcard"><div className="lbl">Sikertelen (ügyfél)</div><div className="val" style={{ color: "#9D174D" }}>{svcStats.sikertelen}</div></div>
        <div className="statcard"><div className="lbl">Kiadva</div><div className="val">{svcStats.kiadva}</div></div>
        {svcStats.ownStock > 0 && (
          <div className="statcard"><div className="lbl">Saját készlet szervizben</div><div className="val">{svcStats.ownStock}</div></div>
        )}
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>💰 Bevételek &amp; Kiadások</div>
      {monthlyTrendSummary && (
        <div style={{ fontSize: 13, color: "#374151", margin: "0 0 10px 2px", lineHeight: 1.6 }}>
          Ez a hónap eddig: <b>{money(currentMonthLive.revenue)}</b> — {monthlyTrendSummary.dayOfMonth} nap alatt. Múlt hónap ilyenkor ({monthlyTrendSummary.dayOfMonth}. napon): {money(monthlyTrendSummary.projected)} volt →{" "}
          <b style={{ color: monthlyTrendSummary.pct >= 0 ? "#15803D" : "#B91C1C" }}>{monthlyTrendSummary.pct >= 0 ? "+" : ""}{monthlyTrendSummary.pct}%</b>
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <MonthlyTrendChart summaries={monthlySummaries} liveMonth={currentMonthLive} locations={locations} locFilter={effectiveLocFilter} locName={locName} />
      </div>
      <div className="statrow c4" style={{ marginBottom: 26 }}>
        <div className="statcard accent"><div className="lbl">Tranzakciók</div><div className="val">{txStats.count}</div></div>
        <div className="statcard"><div className="lbl">Bevétel</div><div className="val" style={{ color: "#15803D" }}>{money(txStats.income)}</div></div>
        <div className="statcard"><div className="lbl">Kiadás</div><div className="val" style={{ color: "#B91C1C" }}>{money(txStats.expense)}</div></div>
        <div className="statcard"><div className="lbl">Nettó eredmény</div><div className="val">{money(txStats.net)}</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>🔩 Alkatrészek</div>
          <div className="statrow c1">
            <div className="statcard accent"><div className="lbl">Raktár értéke</div><div className="val">{money(partsStats.value)}</div></div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>👤 Kliensek</div>
          <div className="statrow c3">
            <div className="statcard accent"><div className="lbl">Ügyfelek</div><div className="val">{customerStats.count}</div></div>
            <div className="statcard"><div className="lbl">Bevétel tőlük</div><div className="val" style={{ color: "#15803D" }}>{money(customerStats.revenue)}</div></div>
          </div>
        </div>
      </div>
    </>
  );
}
