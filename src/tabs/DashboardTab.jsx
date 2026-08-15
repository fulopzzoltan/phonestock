import { money, displayName, ticketCode } from "../lib/utils";
import StockValueChart from "../components/StockValueChart";
import MonthlyTrendChart from "../components/MonthlyTrendChart";
import { PhoneCaseIcon, ServiceIcon, FinanceIcon, PartsIcon, CustomersIcon, WarningIcon } from "../components/icons";

const SectionHead = ({ icon: Icon, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>
    <Icon width={14} height={14} />{children}
  </div>
);

export default function DashboardTab({
  effectiveLocFilter, locName, stockStats, stockHistory, svcStats,
  monthlyTrendSummary, currentMonthLive, monthlySummaries, locations,
  txStats, partsStats, customerStats, todoItems, setDetailId, setWarrantyDetailKey, setTab,
}) {
  const todoCount = (todoItems?.slaTickets.length || 0) + (todoItems?.soonWarranties.length || 0);

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Áttekintés</div><div className="page-sub">{effectiveLocFilter === "all" ? "Mindkét helyszín" : locName(effectiveLocFilter)}</div></div>
      </div>

      {todoCount > 0 && (
        <>
          <SectionHead icon={WarningIcon}>Ma figyelni kell rá</SectionHead>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 26 }}>
            {todoItems.slaTickets.length > 0 && (
              <div className="statcard">
                <div className="dp-section-title">Lejáró/lejárt munkalapok</div>
                {todoItems.slaTickets.map(({ ticket: t, sla }) => (
                  <div key={t.id} className="dp-row" style={{ cursor: "pointer" }} onClick={() => setDetailId(t.id)}>
                    <span className="dp-key">{ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))} — {displayName(t.brand, t.model) || t.customerName}</span>
                    <span className="tag" style={{ background: sla.level === "overdue" ? "var(--danger-soft)" : "var(--warning-soft)", color: sla.level === "overdue" ? "var(--danger-ink)" : "var(--warning-ink)" }}>{sla.label}</span>
                  </div>
                ))}
              </div>
            )}
            {todoItems.soonWarranties.length > 0 && (
              <div className="statcard">
                <div className="dp-section-title">Hamarosan lejáró garanciák</div>
                {todoItems.soonWarranties.map((w) => (
                  <div key={w.key} className="dp-row" style={{ cursor: "pointer" }} onClick={() => { setTab("warranty"); setWarrantyDetailKey(w.key); }}>
                    <span className="dp-key">{w.customerName || "—"} — {w.label || "—"}</span>
                    <span className="tag" style={{ background: "var(--warning-soft)", color: "var(--warning-ink)" }}>{w.expiry}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <SectionHead icon={PhoneCaseIcon}>Telefonok</SectionHead>
      <div className="statrow c4">
        <div className="statcard accent"><div className="lbl">Raktáron</div><div className="val">{stockStats.count} db</div></div>
        <div className="statcard"><div className="lbl">Készlet értéke</div><div className="val">{money(stockStats.value)}</div></div>
        <div className="statcard"><div className="lbl">Besz. érték</div><div className="val">{money(stockStats.cost)}</div></div>
        <div className="statcard"><div className="lbl">Várható profit</div><div className="val" style={{ color: "#22C55E" }}>{money(stockStats.profit)}</div></div>
      </div>
      <div style={{ marginBottom: 26 }}>
        <StockValueChart history={stockHistory} />
      </div>

      <SectionHead icon={ServiceIcon}>Szerviz</SectionHead>
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

      <div className="statrow c3" style={{ marginBottom: 10 }}>
        <div className="statcard">
          <div className="lbl">Sikertelenek %</div>
          <div className="val" style={{ color: "#9D174D" }}>{svcStats.sikertelenPct != null ? `${svcStats.sikertelenPct}%` : "—"}</div>
        </div>
        <div className="statcard">
          <div className="lbl">Átlagos rés (kiadott)</div>
          <div className="val" style={{ color: "#22C55E" }}>{svcStats.avgMargin != null ? money(svcStats.avgMargin) : "—"}</div>
        </div>
        <div className="statcard">
          <div className="lbl">Átlagos átfutási idő</div>
          <div className="val">{svcStats.avgTAT != null ? `${svcStats.avgTAT} nap` : "—"}</div>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: "#9CA3AF", margin: "0 0 20px 2px", lineHeight: 1.5 }}>
        Garanciálisok % egyelőre nem mérhető megbízhatóan: a "Garanciális" jelölés státuszváltáskor törlődik, nem marad meg a munkalapon végig. Szólj, ha ezt szeretnéd, hogy tényleg kövesse a rendszer — ehhez egy külön, tartós mezőt kellene bevezetni.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 26 }}>
        <div className="statcard">
          <div className="dp-section-title">Leggyakoribb modell</div>
          {svcStats.topModels.length ? svcStats.topModels.map((m) => (
            <div key={m.name} className="dp-row"><span className="dp-key">{m.name}</span><span className="dp-val">{m.count} db</span></div>
          )) : <div style={{ fontSize: 12.5, color: "#9CA3AF" }}>Nincs adat</div>}
        </div>
        <div className="statcard">
          <div className="dp-section-title">Leggyakoribb probléma</div>
          {svcStats.topProblems.length ? svcStats.topProblems.map((p) => (
            <div key={p.name} className="dp-row"><span className="dp-key">{p.name}</span><span className="dp-val">{p.count} db</span></div>
          )) : <div style={{ fontSize: 12.5, color: "#9CA3AF" }}>Nincs adat</div>}
          {svcStats.problemsTotal > 0 && (
            <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 8 }}>
              {svcStats.problemsSample} / {svcStats.problemsTotal} munkalapon van rögzítve probléma-típus
            </div>
          )}
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
        <div className="statcard accent"><div className="lbl">Tranzakciók</div><div className="val">{txStats.count}</div></div>
        <div className="statcard"><div className="lbl">Bevétel</div><div className="val" style={{ color: "#15803D" }}>{money(txStats.income)}</div></div>
        <div className="statcard"><div className="lbl">Kiadás</div><div className="val" style={{ color: "#B91C1C" }}>{money(txStats.expense)}</div></div>
        <div className="statcard"><div className="lbl">Nettó eredmény</div><div className="val">{money(txStats.net)}</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div>
          <SectionHead icon={PartsIcon}>Alkatrészek</SectionHead>
          <div className="statrow c1">
            <div className="statcard accent"><div className="lbl">Raktár értéke</div><div className="val">{money(partsStats.value)}</div></div>
          </div>
        </div>
        <div>
          <SectionHead icon={CustomersIcon}>Kliensek</SectionHead>
          <div className="statrow c3">
            <div className="statcard accent"><div className="lbl">Ügyfelek</div><div className="val">{customerStats.count}</div></div>
            <div className="statcard"><div className="lbl">Bevétel tőlük</div><div className="val" style={{ color: "#15803D" }}>{money(customerStats.revenue)}</div></div>
          </div>
        </div>
      </div>
    </>
  );
}
