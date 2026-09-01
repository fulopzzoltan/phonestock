import { useState } from "react";
import { money, displayName, ticketCode } from "../lib/utils";
import StockValueChart from "../components/StockValueChart";
import MonthlyTrendChart from "../components/MonthlyTrendChart";
import Sparkline from "../components/Sparkline";
import { PhoneCaseIcon, ServiceIcon, FinanceIcon, PartsIcon, CustomersIcon, WarningIcon } from "../components/icons";

const SectionHead = ({ icon: Icon, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>
    <Icon width={14} height={14} />{children}
  </div>
);

// Új/Felújított jelölés a tulajdonos Sheets-es rendszerét követi: lila = új, narancssárga = felújított.
const NEW_COLOR = "#7C3AED";
const USED_COLOR = "#F59E0B";

const SplitBars = ({ items }) => (
  items.length ? items.map((b) => (
    <div key={b.name} style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
        <span style={{ fontWeight: 600, color: "#374151" }}>{b.name}</span>
        <span style={{ color: "#6B7280" }}>
          <span style={{ color: NEW_COLOR }}>Új {b.newPct}%</span>
          {" · "}
          <span style={{ color: USED_COLOR }}>Felújított {b.usedPct}%</span>
          <span style={{ color: "#9CA3AF" }}> ({b.total} db)</span>
        </span>
      </div>
      <div style={{ height: 7, background: "#F1F2F6", borderRadius: 999, overflow: "hidden", display: "flex" }}>
        <div style={{ width: `${b.newPct}%`, height: "100%", background: NEW_COLOR }} />
        <div style={{ width: `${b.usedPct}%`, height: "100%", background: USED_COLOR }} />
      </div>
    </div>
  )) : <div style={{ fontSize: 12.5, color: "#9CA3AF" }}>Nincs adat</div>
);

const BreakdownBars = ({ items }) => (
  items.length ? items.map((b) => (
    <div key={b.name} style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
        <span style={{ fontWeight: 600, color: "#374151" }}>{b.name}</span>
        <span style={{ color: "#6B7280" }}>{b.pct}% <span style={{ color: "#9CA3AF" }}>({b.count} db)</span></span>
      </div>
      <div style={{ height: 7, background: "#F1F2F6", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${b.pct}%`, height: "100%", background: "var(--primary)", borderRadius: 999 }} />
      </div>
    </div>
  )) : <div style={{ fontSize: 12.5, color: "#9CA3AF" }}>Nincs adat</div>
);

export default function DashboardTab({
  effectiveLocFilter, locName, stockStats, stockHistory, svcStats, soldPhoneStats,
  monthlyTrendSummary, currentMonthLive, monthlySummaries, locations,
  txStats, partsStats, customerStats, todoItems, setDetailId,
  stockSparkline, dailyIncomeTrend,
}) {
  const todoCount = todoItems?.slaTickets.length || 0;
  const [showAllBrands, setShowAllBrands] = useState(false);
  const BRAND_TOP_N = 6;
  const shownBrands = showAllBrands ? svcStats.brandBreakdown : svcStats.brandBreakdown.slice(0, BRAND_TOP_N);
  const hiddenBrandCount = svcStats.brandBreakdown.length - BRAND_TOP_N;
  const [showAllSoldBrands, setShowAllSoldBrands] = useState(false);
  const SOLD_BRAND_TOP_N = 6;
  const shownSoldBrands = showAllSoldBrands ? soldPhoneStats.brandConditionBreakdown : soldPhoneStats.brandConditionBreakdown.slice(0, SOLD_BRAND_TOP_N);
  const hiddenSoldBrandCount = soldPhoneStats.brandConditionBreakdown.length - SOLD_BRAND_TOP_N;

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Áttekintés</div></div>
      </div>

      {todoCount > 0 && (
        <>
          <SectionHead icon={WarningIcon}>Ma figyelni kell rá</SectionHead>
          <div className="statcard" style={{ marginBottom: 26 }}>
            <div className="dp-section-title">Lejáró/lejárt munkalapok</div>
            {todoItems.slaTickets.map(({ ticket: t, sla }) => (
              <div key={t.id} className="dp-row" style={{ cursor: "pointer" }} onClick={() => setDetailId(t.id)}>
                <span className="dp-key">{ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))} — {displayName(t.brand, t.model) || t.customerName}</span>
                <span className="tag" style={{ background: sla.level === "overdue" ? "var(--danger-soft)" : "var(--warning-soft)", color: sla.level === "overdue" ? "var(--danger-ink)" : "var(--warning-ink)" }}>{sla.label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionHead icon={PhoneCaseIcon}>Telefonok</SectionHead>
      {stockStats.slowMoving > 0 && (
        <div style={{ fontSize: 12, color: "var(--warning-ink)", background: "var(--warning-soft)", borderRadius: "var(--radius-sm)", padding: "7px 12px", margin: "0 0 12px 2px", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <WarningIcon width={13} height={13} />{stockStats.slowMoving} telefon 45+ napja mozdulatlan — érdemes átnézni az árazást.
        </div>
      )}
      <div className="statrow c4">
        <div className="statcard"><div className="lbl">Raktáron</div><div className="val">{stockStats.count} db</div></div>
        <div className="statcard">
          <div className="lbl">Készlet értéke</div>
          <div className="val">{money(stockStats.value)}</div>
          {stockSparkline.length > 1 && <div style={{ marginTop: 8 }}><Sparkline data={stockSparkline} variant="line" /></div>}
        </div>
        <div className="statcard"><div className="lbl">Besz. érték</div><div className="val">{money(stockStats.cost)}</div></div>
        <div className="statcard"><div className="lbl">Várható profit</div><div className="val" style={{ color: "#22C55E" }}>{money(stockStats.profit)}</div></div>
      </div>
      <div style={{ marginBottom: 26 }}>
        <StockValueChart history={stockHistory} />
      </div>

      <div className="statcard" style={{ marginBottom: 14 }}>
        <div className="dp-section-title">Eladott telefonok — márkánként új / felújított</div>
        <SplitBars items={shownSoldBrands} />
        {hiddenSoldBrandCount > 0 && (
          <button
            type="button"
            className="toggle-link"
            style={{ background: "none", border: "none", padding: 0, fontWeight: 600, marginTop: 6 }}
            onClick={() => setShowAllSoldBrands((v) => !v)}
          >
            {showAllSoldBrands ? "Kevesebb mutatása" : `+ ${hiddenSoldBrandCount} további márka mutatása`}
          </button>
        )}
        {soldPhoneStats.total > 0 && (
          <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 4 }}>
            Összesen {soldPhoneStats.total} eladott telefon alapján
          </div>
        )}
      </div>
      <div className="statrow c2" style={{ marginBottom: 26 }}>
        <div className="statcard">
          <div className="lbl">Átlagos eladási ár — Új</div>
          <div className="val" style={{ color: NEW_COLOR }}>{soldPhoneStats.avgPriceNew != null ? money(soldPhoneStats.avgPriceNew) : "—"}</div>
          {soldPhoneStats.countNew > 0 && <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 2 }}>{soldPhoneStats.countNew} eladott telefon alapján</div>}
        </div>
        <div className="statcard">
          <div className="lbl">Átlagos eladási ár — Felújított</div>
          <div className="val" style={{ color: USED_COLOR }}>{soldPhoneStats.avgPriceUsed != null ? money(soldPhoneStats.avgPriceUsed) : "—"}</div>
          {soldPhoneStats.countUsed > 0 && <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 2 }}>{soldPhoneStats.countUsed} eladott telefon alapján</div>}
        </div>
      </div>
      <div className="statrow c2" style={{ marginBottom: 26 }}>
        <div className="statcard">
          <div className="lbl">Átlagos rés — Új</div>
          <div className="val" style={{ color: NEW_COLOR }}>{soldPhoneStats.avgMarginNew != null ? money(soldPhoneStats.avgMarginNew) : "—"}</div>
          {soldPhoneStats.countMarginNew > 0 && <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 2 }}>{soldPhoneStats.countMarginNew} eladott telefon alapján</div>}
        </div>
        <div className="statcard">
          <div className="lbl">Átlagos rés — Felújított</div>
          <div className="val" style={{ color: USED_COLOR }}>{soldPhoneStats.avgMarginUsed != null ? money(soldPhoneStats.avgMarginUsed) : "—"}</div>
          {soldPhoneStats.countMarginUsed > 0 && <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 2 }}>{soldPhoneStats.countMarginUsed} eladott telefon alapján</div>}
        </div>
      </div>

      <SectionHead icon={ServiceIcon}>Szerviz</SectionHead>
      <div className={`statrow ${svcStats.ownStock > 0 ? "c6" : "c5"}`} style={{ marginBottom: 26 }}>
        <div className="statcard"><div className="lbl">Összes</div><div className="val">{svcStats.total}</div></div>
        <div className="statcard"><div className="lbl">Aktív (ügyfél)</div><div className="val">{svcStats.active}</div></div>
        <div className="statcard"><div className="lbl">Kész (ügyfél)</div><div className="val" style={{ color: "#15803D" }}>{svcStats.kesz}</div></div>
        <div className="statcard"><div className="lbl">Sikertelen (ügyfél)</div><div className="val" style={{ color: "#9D174D" }}>{svcStats.sikertelen}</div></div>
        <div className="statcard"><div className="lbl">Kiadva</div><div className="val">{svcStats.kiadva}</div></div>
        {svcStats.ownStock > 0 && (
          <div className="statcard"><div className="lbl">Saját készlet szervizben</div><div className="val">{svcStats.ownStock}</div></div>
        )}
      </div>

      <div className="statrow c5" style={{ marginBottom: 26 }}>
        <div className="statcard">
          <div className="lbl">Sikertelenek %</div>
          <div className="val" style={{ color: "#9D174D" }}>{svcStats.sikertelenPct != null ? `${svcStats.sikertelenPct}%` : "—"}</div>
        </div>
        <div className="statcard">
          <div className="lbl">Garanciálisok %</div>
          <div className="val" style={{ color: "#6D28D9" }}>{svcStats.warrantyPct != null ? `${svcStats.warrantyPct}%` : "—"}</div>
          {svcStats.warrantyCount > 0 && (
            <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 2 }}>{svcStats.warrantyCount} munkalap</div>
          )}
        </div>
        <div className="statcard">
          <div className="lbl">Átlagos rés (kiadott)</div>
          <div className="val" style={{ color: "#22C55E" }}>{svcStats.avgMargin != null ? money(svcStats.avgMargin) : "—"}</div>
        </div>
        <div className="statcard">
          <div className="lbl">Átlagos átfutási idő</div>
          <div className="val">{svcStats.avgTAT != null ? `${svcStats.avgTAT} nap` : "—"}</div>
        </div>
        <div className="statcard">
          <div className="lbl">Fólia-ajánlat konverzió</div>
          <div className="val" style={{ color: "#22C55E" }}>{svcStats.foliaConversionPct != null ? `${svcStats.foliaConversionPct}%` : "—"}</div>
          {svcStats.foliaShown > 0 && (
            <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 2 }}>{svcStats.foliaRequestedCount} / {svcStats.foliaShown} megrendelte</div>
          )}
        </div>
      </div>
      <div className="statcard" style={{ marginBottom: 26 }}>
        <div className="dp-section-title">Leggyakoribb probléma</div>
        <BreakdownBars items={svcStats.topProblems} />
        {svcStats.problemsTotal > 0 && (
          <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 8 }}>
            {svcStats.problemsSample} / {svcStats.problemsTotal} munkalapon van rögzítve probléma-típus
          </div>
        )}
      </div>

      <div className="statcard" style={{ marginBottom: 26 }}>
        <div className="dp-section-title">Márkák megoszlása (átadott munkák)</div>
        <BreakdownBars items={shownBrands} />
        {hiddenBrandCount > 0 && (
          <button
            type="button"
            className="toggle-link"
            style={{ background: "none", border: "none", padding: 0, fontWeight: 600, marginTop: 6 }}
            onClick={() => setShowAllBrands((v) => !v)}
          >
            {showAllBrands ? "Kevesebb mutatása" : `+ ${hiddenBrandCount} további márka mutatása`}
          </button>
        )}
        {svcStats.brandTotal > 0 && (
          <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 4 }}>
            Összesen {svcStats.brandTotal} átadott munkalap alapján
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 26 }}>
        <div className="statcard">
          <div className="dp-section-title">Samsung modellek megoszlása</div>
          <BreakdownBars items={svcStats.samsungModelBreakdown} />
        </div>
        <div className="statcard">
          <div className="dp-section-title">iPhone modellek megoszlása</div>
          <BreakdownBars items={svcStats.iphoneModelBreakdown} />
        </div>
      </div>

      <SectionHead icon={FinanceIcon}>Bevételek &amp; Kiadások</SectionHead>
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
        <div className="statcard"><div className="lbl">Tranzakciók</div><div className="val">{txStats.count}</div></div>
        <div className="statcard">
          <div className="lbl">Bevétel</div>
          <div className="val" style={{ color: "#15803D" }}>{money(txStats.income)}</div>
          {dailyIncomeTrend.length > 1 && <div style={{ marginTop: 8 }}><Sparkline data={dailyIncomeTrend} variant="bars" /></div>}
        </div>
        <div className="statcard"><div className="lbl">Kiadás</div><div className="val" style={{ color: "#B91C1C" }}>{money(txStats.expense)}</div></div>
        <div className="statcard"><div className="lbl">Nettó eredmény</div><div className="val">{money(txStats.net)}</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div>
          <SectionHead icon={PartsIcon}>Alkatrészek</SectionHead>
          <div className="statrow c1">
            <div className="statcard"><div className="lbl">Raktár értéke</div><div className="val">{money(partsStats.value)}</div></div>
          </div>
        </div>
        <div>
          <SectionHead icon={CustomersIcon}>Kliensek</SectionHead>
          <div className="statrow c3">
            <div className="statcard"><div className="lbl">Ügyfelek</div><div className="val">{customerStats.count}</div></div>
            <div className="statcard"><div className="lbl">Bevétel tőlük</div><div className="val" style={{ color: "#15803D" }}>{money(customerStats.revenue)}</div></div>
          </div>
        </div>
      </div>
    </>
  );
}
