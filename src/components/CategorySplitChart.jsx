import { useMemo } from "react";
import { money } from "../lib/utils";

// Bevétel- vagy rés-szintű (mode="revenue" | "margin") megoszlás 3 forrás között,
// havi bontásban: Telefon (azonosíthatóan telefon), Tartozék (azonosíthatóan sem
// nem telefon, sem nem szerviz), Szerviz (minden egyéb — a maradék/gyűjtő kategória,
// a korábbi "Egyéb" is ide olvad bele). A rés-szintű bontás BECSLÉS: revenue_x - a
// hozzá tartozó beszerzési kiadás (pl. telefon rés ≈ telefon-bevétel -
// telefon-beszerzési kiadás UGYANABBAN a hónapban) — ez nem veszi figyelembe, hogy
// egy adott hónapban eladott telefon beszerzése lehet egy korábbi hónap kiadása
// volt, úgyhogy havi szinten pontatlan lehet, de negyedéves/éves átlagban jó közelítés.
const CATS = [
  { key: "phone", label: "Telefon", color: "#22C55E" },
  { key: "service", label: "Szerviz", color: "#0EA5E9" },
  { key: "accessory", label: "Tartozék", color: "#F59E0B" },
];
const MONTH_NAMES = ["jan.", "febr.", "márc.", "ápr.", "máj.", "jún.", "júl.", "aug.", "szept.", "okt.", "nov.", "dec."];

export default function CategorySplitChart({ months, summaries, locFilter, mode }) {
  const rows = useMemo(() => {
    return months.map(({ year, month, isLive }) => {
      if (isLive) return { year, month, isLive, hasData: false };
      const matching = summaries.filter((s) => s.year === year && s.month === month && (locFilter === "all" || s.locationId === locFilter));
      if (matching.length === 0) return { year, month, isLive, hasData: false };

      const sum = (f) => matching.reduce((a, r) => a + (f(r) || 0), 0);
      const revenue = sum((r) => r.revenue);
      const revPhone = sum((r) => r.revenuePhone);
      const revService = sum((r) => r.revenueService);
      const revAccessory = sum((r) => r.revenueAccessory);
      const revOther = sum((r) => r.revenueOther);
      const hasRevBreakdown = matching.every((r) => r.revenuePhone != null) && (revPhone + revService + revAccessory + revOther) > 0;
      if (!hasRevBreakdown) return { year, month, isLive, hasData: false };

      if (mode === "revenue") {
        const total = revPhone + revService + revAccessory + revOther;
        return {
          year, month, isLive, hasData: true, total,
          phone: revPhone, service: revService + revOther, accessory: revAccessory,
        };
      }

      // mode === "margin"
      const margin = sum((r) => r.margin);

      // Ahol a forrás-CSV tételszinten is tartalmazta a Rés-t (nem csak napi
      // összesítőben), ott ez a VALÓDI kategória-bontás, nem becslés.
      const hasRealMargin = matching.every((r) => r.marginPhone != null);
      if (hasRealMargin) {
        const marginPhone = sum((r) => r.marginPhone);
        const marginServiceReal = sum((r) => r.marginService);
        const marginAccessory = sum((r) => r.marginAccessory);
        const marginOther = sum((r) => r.marginOther);
        return {
          year, month, isLive, hasData: true, total: margin, isEstimate: false,
          phone: marginPhone, service: marginServiceReal + marginOther, accessory: marginAccessory,
        };
      }

      // Egyébként BECSLÉS: revenue_x mínusz a hozzá tartozó beszerzési kiadás.
      const expPhoneStock = sum((r) => r.expensePhoneStock);
      const expAccessoryStock = sum((r) => r.expenseAccessoryStock);
      const hasExpBreakdown = matching.every((r) => r.expensePhoneStock != null);
      if (!hasExpBreakdown) return { year, month, isLive, hasData: false };

      const marginPhone = revPhone - expPhoneStock;
      const marginAccessory = revAccessory - expAccessoryStock;
      // Szerviz = minden más — a maradék rés a telefon és a tartozék levonása után.
      const marginService = margin - marginPhone - marginAccessory;
      return {
        year, month, isLive, hasData: true, total: margin, isEstimate: true,
        phone: marginPhone, service: marginService, accessory: marginAccessory,
      };
    });
  }, [months, summaries, locFilter, mode]);

  const usable = rows.filter((r) => r.hasData);
  if (usable.length === 0) {
    return <div style={{ fontSize: 12.5, color: "#9CA3AF" }}>Ehhez még nincs kategória-bontású adat.</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 14, marginBottom: 12, fontSize: 11, color: "#6B7280", flexWrap: "wrap" }}>
        {CATS.map((c) => (
          <span key={c.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color, display: "inline-block" }} />
            {c.label}
          </span>
        ))}
      </div>
      {rows.map((r, i) => {
        if (!r.hasData) {
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
              <div style={{ width: 34, fontSize: 10.5, color: "#9CA3AF", fontWeight: r.isLive ? 700 : 400 }}>{MONTH_NAMES[r.month - 1]}</div>
              <div style={{ flex: 1, height: 16, background: "repeating-linear-gradient(45deg,#F3F4F6,#F3F4F6 5px,#F9FAFB 5px,#F9FAFB 10px)", borderRadius: 4, fontSize: 9.5, color: "#C1C7D0", display: "flex", alignItems: "center", paddingLeft: 6 }}>
                nincs bontás
              </div>
            </div>
          );
        }
        const total = Math.max(1, r.phone + r.service + r.accessory, r.total || 0);
        const estimateNote = mode === "margin" && r.isEstimate ? " (becslés — nincs tétel-szintű rés-adat ehhez a hónaphoz)" : "";
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }} title={`${MONTH_NAMES[r.month - 1]} ${r.year} — Telefon: ${money(r.phone)} · Szerviz: ${money(r.service)} · Tartozék: ${money(r.accessory)}${estimateNote}`}>
            <div style={{ width: 34, fontSize: 10.5, color: r.isLive ? "#111827" : "#6B7280", fontWeight: r.isLive ? 700 : 400 }}>{MONTH_NAMES[r.month - 1]}</div>
            <div style={{ flex: 1, height: 16, borderRadius: 4, overflow: "hidden", display: "flex", background: "#F1F2F6" }}>
              {CATS.map((c) => {
                const v = Math.max(0, r[c.key]);
                const pct = (v / total) * 100;
                if (pct <= 0) return null;
                return <div key={c.key} style={{ width: `${pct}%`, background: c.color }} />;
              })}
            </div>
            <div style={{ width: 66, fontSize: 10.5, color: "#6B7280", textAlign: "right" }}>{money(r.total)}</div>
          </div>
        );
      })}
    </div>
  );
}
