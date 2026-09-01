import { useState, useMemo } from "react";
import { money, displayName, ticketCode } from "../lib/utils";
import StockValueChart from "../components/StockValueChart";
import MonthlyTrendChart from "../components/MonthlyTrendChart";
import FinanceTrendChart from "../components/FinanceTrendChart";
import CategorySplitChart from "../components/CategorySplitChart";
import ExpenseCategoryStats from "../components/ExpenseCategoryStats";
import Sparkline from "../components/Sparkline";
import { WarningIcon, FinanceIcon, LockIcon } from "../components/icons";

// Egységes, kicsit vastagabb szekció-cím az egész Áttekintés oldalon.
const SectionHead = ({ icon: Icon, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 800, color: "#111827", margin: "0 0 10px 2px" }}>
    <Icon width={15} height={15} />{children}
  </div>
);

// Több kis kártya helyett egy szélesebb, belül tagolt "csík" — ez adja az
// összeszedettebb, egységesebb megjelenést (pl. a 4 külön Telefonok-kártya
// helyett egy kártyán belül 4 mező).
const KpiStrip = ({ items }) => (
  <div className="statcard" style={{ padding: 0, marginBottom: 14 }}>
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((it, i) => (
        <div key={it.label} style={{ padding: "16px 18px", borderRight: i < items.length - 1 ? "1px solid #F1F2F6" : "none" }}>
          <div className="lbl">{it.label}</div>
          <div className="val" style={{ color: it.color || "#111827" }}>{it.value}</div>
          {it.sub && <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 2 }}>{it.sub}</div>}
        </div>
      ))}
    </div>
  </div>
);

// A lila/narancs (a tulajdonos Sheets-es jelölése) itt ütött a lap többi színével
// (Tartozék, Szerviz stb.) — helyette a meglévő zöld/szürke tónust használjuk.
const NEW_COLOR = "var(--primary)";
const USED_COLOR = "#6B7280";

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

const TABS = [
  { key: "all", label: "Mind" },
  { key: "finance", label: "Bevétel & Kiadás" },
  { key: "phones", label: "Telefonok" },
  { key: "service", label: "Szerviz" },
];

const FINANCE_UNLOCK_KEY = "phonestock_finance_unlocked";

export default function DashboardTab({
  effectiveLocFilter, locName, stockStats, stockHistory, svcStats, soldPhoneStats,
  monthlyTrendSummary, currentMonthLive, monthlySummaries, locations,
  transactions, todoItems, setDetailId,
  stockSparkline, dailyIncomeTrend,
  canSeeFinance, userEmail, signIn,
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

  const [filter, setFilter] = useState("all");
  const showFinance = canSeeFinance && (filter === "all" || filter === "finance");
  const showPhones = filter === "all" || filter === "phones";
  const showService = filter === "all" || filter === "service";
  const visibleTabs = canSeeFinance ? TABS : TABS.filter((t) => t.key !== "finance");

  // A Bevétel & Kiadás tartalom külön jelszó-megerősítést kér a munkamenetben — akkor is,
  // ha a felhasználó egyébként jogosult rá (canSeeFinance) — hogy egy nyitva hagyott gépnél
  // ne látszódjon rögtön. A feloldás a saját fiók jelszavával, munkamenetenként egyszer.
  const [financeUnlocked, setFinanceUnlocked] = useState(() => {
    try { return sessionStorage.getItem(FINANCE_UNLOCK_KEY) === "1"; } catch { return false; }
  });
  const [lockPw, setLockPw] = useState("");
  const [lockBusy, setLockBusy] = useState(false);
  const [lockError, setLockError] = useState("");

  async function unlockFinance(e) {
    e.preventDefault();
    setLockError("");
    if (!lockPw) { setLockError("Add meg a jelszavad."); return; }
    setLockBusy(true);
    try {
      await signIn(userEmail, lockPw);
      setFinanceUnlocked(true);
      try { sessionStorage.setItem(FINANCE_UNLOCK_KEY, "1"); } catch { /* noop */ }
      setLockPw("");
    } catch {
      setLockError("Hibás jelszó.");
    } finally {
      setLockBusy(false);
    }
  }

  // Periódus-választó a fenti két trend-grafikonhoz (Bevétel/helyszín oszlopok + Bevétel-Kiadás-Profit vonal) —
  // "Utolsó 12 hónap" a mostani (görgő) alapértelmezett, de kiválasztható egy konkrét év vagy a teljes eddigi adat is.
  const monthIdx = (y, m) => y * 12 + (m - 1);
  const idxToYM = (idx) => ({ year: Math.floor(idx / 12), month: (idx % 12) + 1 });
  const availableYears = useMemo(() => {
    const ys = new Set(monthlySummaries.map((s) => s.year));
    ys.add(currentMonthLive.year);
    return Array.from(ys).sort();
  }, [monthlySummaries, currentMonthLive.year]);
  const [trendPeriod, setTrendPeriod] = useState("12m");
  const trendMonths = useMemo(() => {
    const liveIdx = monthIdx(currentMonthLive.year, currentMonthLive.month);
    let startIdx, endIdx = liveIdx;
    if (trendPeriod === "all") {
      const dataIdxs = monthlySummaries.map((s) => monthIdx(s.year, s.month));
      startIdx = dataIdxs.length ? Math.min(...dataIdxs) : liveIdx - 11;
    } else if (trendPeriod === "12m") {
      startIdx = liveIdx - 11;
    } else {
      startIdx = monthIdx(trendPeriod, 1);
      endIdx = Math.min(monthIdx(trendPeriod, 12), liveIdx);
    }
    const out = [];
    for (let idx = startIdx; idx <= endIdx; idx++) {
      const { year, month } = idxToYM(idx);
      out.push({ year, month, isLive: idx === liveIdx });
    }
    return out;
  }, [trendPeriod, currentMonthLive, monthlySummaries]);

  // A fenti sötét összesítő a KIVÁLASZTOTT periódus valós tranzakcióit összegzi
  // (nem minden idők forgalmát) — ugyanaz a dátumtartomány, mint a trend-grafikonoké.
  const heroStats = useMemo(() => {
    if (trendMonths.length === 0) return { income: 0, expense: 0, net: 0, count: 0 };
    const first = trendMonths[0];
    const last = trendMonths[trendMonths.length - 1];
    const startDate = `${first.year}-${String(first.month).padStart(2, "0")}-01`;
    const lastDay = new Date(last.year, last.month, 0).getDate();
    const endDate = `${last.year}-${String(last.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const rows = transactions.filter((t) => t.date >= startDate && t.date <= endDate);
    const income = rows.filter((t) => t.type === "income" && !t.isPassthrough).reduce((a, t) => a + (Number(t.amount) || 0), 0);
    const expense = rows.filter((t) => t.type === "expense").reduce((a, t) => a + (Number(t.amount) || 0), 0);
    return { income, expense, net: income - expense, count: rows.length };
  }, [trendMonths, transactions]);

  const svcCountItems = [
    { label: "Összes", value: svcStats.total },
    { label: "Aktív (ügyfél)", value: svcStats.active },
    { label: "Kész (ügyfél)", value: svcStats.kesz, color: "#15803D" },
    { label: "Sikertelen (ügyfél)", value: svcStats.sikertelen, color: "#9D174D" },
    { label: "Kiadva", value: svcStats.kiadva },
  ];
  if (svcStats.ownStock > 0) svcCountItems.push({ label: "Saját készlet szervizben", value: svcStats.ownStock });

  return (
    <>
      {/* A cím fent, a helyszín-választó melletti sorban jelenik meg (App.jsx pageHeader) —
          itt csak a Mind / Bevétel & Kiadás / Telefonok / Szerviz szűrő, bal oldalt, saját sorban,
          ugyanazzal a "status-seg" pill-stílussal, mint pl. a Szerviz fülön a státusz-választó. */}
      <div className="status-seg" style={{ marginBottom: 22, display: "inline-flex" }}>
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={filter === t.key ? "active" : ""}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {todoCount > 0 && (
        <>
          <SectionHead icon={WarningIcon}>Ma figyelni kell rá</SectionHead>
          <div className="statcard" style={{ marginBottom: 22 }}>
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

      {showFinance && !financeUnlocked && (
        <div className="statcard" style={{ marginBottom: 22, textAlign: "center", padding: "36px 24px" }}>
          <LockIcon width={22} height={22} style={{ color: "#9CA3AF", marginBottom: 10 }} />
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>Bevétel & Kiadás zárolva</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>Érzékeny adat — add meg újra a jelszavad a megtekintéshez.</div>
          <form onSubmit={unlockFinance} style={{ maxWidth: 260, margin: "0 auto" }}>
            {lockError && <div className="errbar" style={{ marginBottom: 10 }}>{lockError}</div>}
            <input
              type="password" autoComplete="current-password" placeholder="Jelszó" value={lockPw}
              onChange={(e) => setLockPw(e.target.value)}
              style={{ width: "100%", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 11, padding: "10px 12px", fontFamily: "inherit", fontSize: 13, marginBottom: 10, color: "#111827" }}
            />
            <button className="btn" type="submit" disabled={lockBusy} style={{ width: "100%", justifyContent: "center" }}>
              {lockBusy ? "Ellenőrzés..." : "Feloldás"}
            </button>
          </form>
        </div>
      )}

      {showFinance && financeUnlocked && (
      <div style={{ marginBottom: 22 }}>
      {/* Bevételek & Kiadások — mindig legelöl, kiemelt sávban, ha látszik. */}
      <div style={{ background: "#0A0A0C", borderRadius: 20, padding: "26px 28px", marginBottom: 18, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#98A1B0", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Nettó eredmény</div>
            <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-.6px", lineHeight: 1 }}>{money(heroStats.net)}</div>
          </div>
          {dailyIncomeTrend.length > 1 && (
            <div style={{ width: 200, flexShrink: 0 }}>
              <Sparkline data={dailyIncomeTrend} variant="line" color="#1DB954" height={40} />
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 36, marginTop: 22, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#5B6472", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>Bevétel</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#4ADE80" }}>{money(heroStats.income)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#5B6472", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>Kiadás</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#F87171" }}>{money(heroStats.expense)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#5B6472", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>Tranzakciók</div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{heroStats.count}</div>
          </div>
        </div>
      </div>

      {monthlyTrendSummary && (
        <div style={{ fontSize: 13, color: "#374151", margin: "0 0 10px 2px", lineHeight: 1.6 }}>
          Ez a hónap eddig: <b>{money(currentMonthLive.revenue)}</b> — {monthlyTrendSummary.dayOfMonth} nap alatt. Múlt hónap ilyenkor ({monthlyTrendSummary.dayOfMonth}. napon): {money(monthlyTrendSummary.projected)} volt →{" "}
          <b style={{ color: monthlyTrendSummary.pct >= 0 ? "#15803D" : "#B91C1C" }}>{monthlyTrendSummary.pct >= 0 ? "+" : ""}{monthlyTrendSummary.pct}%</b>
        </div>
      )}

      <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setTrendPeriod("12m")}
          style={{
            border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700,
            padding: "5px 11px", borderRadius: 999,
            background: trendPeriod === "12m" ? "var(--primary-soft)" : "#fff",
            color: trendPeriod === "12m" ? "var(--primary-ink)" : "#6B7280",
            border: trendPeriod === "12m" ? "1px solid transparent" : "1px solid #EEF0F2",
          }}
        >
          Utolsó 12 hónap
        </button>
        {availableYears.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => setTrendPeriod(y)}
            style={{
              border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700,
              padding: "5px 11px", borderRadius: 999,
              background: trendPeriod === y ? "var(--primary-soft)" : "#fff",
              color: trendPeriod === y ? "var(--primary-ink)" : "#6B7280",
              border: trendPeriod === y ? "1px solid transparent" : "1px solid #EEF0F2",
            }}
          >
            {y}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setTrendPeriod("all")}
          style={{
            border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700,
            padding: "5px 11px", borderRadius: 999,
            background: trendPeriod === "all" ? "var(--primary-soft)" : "#fff",
            color: trendPeriod === "all" ? "var(--primary-ink)" : "#6B7280",
            border: trendPeriod === "all" ? "1px solid transparent" : "1px solid #EEF0F2",
          }}
        >
          Mind
        </button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <MonthlyTrendChart months={trendMonths} summaries={monthlySummaries} liveMonth={currentMonthLive} locations={locations} locFilter={effectiveLocFilter} locName={locName} />
      </div>

      <div style={{ marginBottom: 22 }}>
        <SectionHead icon={FinanceIcon}>Bevétel, kiadás, profit — trend</SectionHead>
        <FinanceTrendChart months={trendMonths} summaries={monthlySummaries} liveMonth={currentMonthLive} locFilter={effectiveLocFilter} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }}>
        <div className="statcard">
          <div className="dp-section-title">Bevétel-megoszlás — telefon / szerviz / tartozék</div>
          <CategorySplitChart months={trendMonths} summaries={monthlySummaries} locFilter={effectiveLocFilter} mode="revenue" />
        </div>
        <div className="statcard">
          <div className="dp-section-title">Rés-megoszlás — miből jön a haszon (becslés)</div>
          <CategorySplitChart months={trendMonths} summaries={monthlySummaries} locFilter={effectiveLocFilter} mode="margin" />
        </div>
      </div>

      <div style={{ marginBottom: 22 }}>
        <div className="statcard">
          <div className="dp-section-title">Kiadás-statisztika</div>
          <ExpenseCategoryStats months={trendMonths} summaries={monthlySummaries} locFilter={effectiveLocFilter} />
        </div>
      </div>
      </div>
      )}

      {showPhones && (
        <div style={{ marginBottom: 22 }}>
          <KpiStrip items={[
            { label: "Raktáron", value: `${stockStats.count} db` },
            { label: "Készlet értéke", value: money(stockStats.value) },
            { label: "Besz. érték", value: money(stockStats.cost) },
            { label: "Várható profit", value: money(stockStats.profit), color: "#22C55E" },
          ]} />
          <div style={{ marginBottom: 14 }}>
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

          <KpiStrip items={[
            { label: "Átl. eladási ár — Új", value: soldPhoneStats.avgPriceNew != null ? money(soldPhoneStats.avgPriceNew) : "—", color: NEW_COLOR },
            { label: "Átl. eladási ár — Felújított", value: soldPhoneStats.avgPriceUsed != null ? money(soldPhoneStats.avgPriceUsed) : "—", color: USED_COLOR },
            { label: "Átl. rés — Új", value: soldPhoneStats.avgMarginNew != null ? money(soldPhoneStats.avgMarginNew) : "—", color: NEW_COLOR },
            { label: "Átl. rés — Felújított", value: soldPhoneStats.avgMarginUsed != null ? money(soldPhoneStats.avgMarginUsed) : "—", color: USED_COLOR },
          ]} />
          <KpiStrip items={[
            { label: "iPhone ár (Felújított)", value: soldPhoneStats.avgPriceUsedIPhone != null ? money(soldPhoneStats.avgPriceUsedIPhone) : "—", color: USED_COLOR },
            { label: "iPhone rés (Felújított)", value: soldPhoneStats.avgMarginUsedIPhone != null ? money(soldPhoneStats.avgMarginUsedIPhone) : "—", color: USED_COLOR },
            { label: "Samsung ár (Felújított)", value: soldPhoneStats.avgPriceUsedSamsung != null ? money(soldPhoneStats.avgPriceUsedSamsung) : "—", color: USED_COLOR },
            { label: "Samsung rés (Felújított)", value: soldPhoneStats.avgMarginUsedSamsung != null ? money(soldPhoneStats.avgMarginUsedSamsung) : "—", color: USED_COLOR },
          ]} />
        </div>
      )}

      {showService && (
        <div style={{ marginBottom: 22 }}>
          <KpiStrip items={svcCountItems} />
          <KpiStrip items={[
            { label: "Sikertelenek %", value: svcStats.sikertelenPct != null ? `${svcStats.sikertelenPct}%` : "—", color: "#9D174D" },
            { label: "Garanciálisok %", value: svcStats.warrantyPct != null ? `${svcStats.warrantyPct}%` : "—", color: "#6D28D9", sub: svcStats.warrantyCount > 0 ? `${svcStats.warrantyCount} munkalap` : null },
            { label: "Átlagos rés (kiadott)", value: svcStats.avgMargin != null ? money(svcStats.avgMargin) : "—", color: "#22C55E" },
            { label: "Átlagos átfutási idő", value: svcStats.avgTAT != null ? `${svcStats.avgTAT} nap` : "—" },
            { label: "Fólia-ajánlat konverzió", value: svcStats.foliaConversionPct != null ? `${svcStats.foliaConversionPct}%` : "—", color: "#22C55E", sub: svcStats.foliaShown > 0 ? `${svcStats.foliaRequestedCount} / ${svcStats.foliaShown} megrendelte` : null },
          ]} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div className="statcard">
              <div className="dp-section-title">Leggyakoribb probléma</div>
              <BreakdownBars items={svcStats.topProblems} />
              {svcStats.problemsTotal > 0 && (
                <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 8 }}>
                  {svcStats.problemsSample} / {svcStats.problemsTotal} munkalapon van rögzítve probléma-típus
                </div>
              )}
            </div>

            <div className="statcard">
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
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="statcard">
              <div className="dp-section-title">Samsung modellek megoszlása</div>
              <BreakdownBars items={svcStats.samsungModelBreakdown} />
            </div>
            <div className="statcard">
              <div className="dp-section-title">iPhone modellek megoszlása</div>
              <BreakdownBars items={svcStats.iphoneModelBreakdown} />
            </div>
          </div>
        </div>
      )}

    </>
  );
}
