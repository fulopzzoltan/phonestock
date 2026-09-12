import { useMemo } from "react";
import { money, ANALYTICS_START_DATE } from "../lib/utils";

// A "Mérőszámok" fül — Zoli kifejezett kérésére: ne KPI-menü legyen, hanem 3 dolog,
// aminek mindegyikéhez konkrét döntés/teendő tartozik:
//   1) Bevétel- és rés-megoszlás Telefon / Szerviz / Tartozék között — melyik hozza
//      a pénzt és melyiken van haszon, hogy tudjuk hova érdemes energiát/marketinget tenni.
//   2) Ügyfél-azonosítás aránya Telefon- és Szerviz-eladásnál — ha ez nem 100%, a
//      lenti új/visszatérő szám nem megbízható, tehát ez maga is egy figyelendő szám.
//   3) Új vs. visszatérő ügyfél + az általuk hozott bevétel — ez dönti el, hogy
//      megtartásra vagy új ügyfél szerzésre érdemes-e most energiát tenni.
// Csak a "Tartozékok" kategória bevezetése/2026-08-24 óta van tételes, automatikus
// bontás — ld. ANALYTICS_START_DATE a utils.js-ben. Előtte a Készlet-bevétel jó része
// tömbösített/kalapozott manuális tétel volt, azon ez a bontás nem értelmezhető.

const SEG_COLOR = { phone: "#22C55E", service: "#0EA5E9", accessory: "#F59E0B" };
const SEG_LABEL = { phone: "Telefon", service: "Szerviz", accessory: "Tartozék" };
const SEG_ORDER = ["phone", "service", "accessory"];

function emptySeg() {
  return {
    count: 0, revenue: 0, margin: 0, withCustomer: 0,
    customerIds: new Set(), newCustomerIds: new Set(), returningCustomerIds: new Set(),
    newRevenue: 0, returningRevenue: 0,
  };
}

// Telefon = Készlet-kategóriájú tétel, amelyik konkrét raktári termékhez van kötve
// (tehát a rendes "Eladás" gombon ment át). Szerviz = Szerviz-kategória. Minden más
// bevétel (Tartozékok kategória, VAGY termékhez nem kötött Készlet-tétel — pl. valaki
// kábelt/tokot Készlet alá vitt fel a Tartozékok helyett —, VAGY Egyéb) Tartozék.
function classifySegment(t) {
  if (t.category === "Szerviz") return "service";
  if (t.category === "Tartozékok") return "accessory";
  if (t.category === "Készlet") return t.productId ? "phone" : "accessory";
  return "accessory";
}

export default function RevenueQualityPanel({ transactions, tickets }) {
  const d = useMemo(() => {
    const startDate = ANALYTICS_START_DATE;
    const income = (transactions || []).filter((t) => t.type === "income" && !t.deletedAt && t.date >= startDate);

    // Első előfordulás ügyfelenként — az ÖSSZES tranzakció és munkalap alapján (nem
    // csak a mérési ablakban), hogy meg tudjuk mondani: ehhez az ügyfélhez most
    // írtunk-e először értéket, vagy volt már korábbi nyoma a rendszerben.
    const firstSeen = new Map();
    const note = (id, date) => {
      if (!id || !date) return;
      const prev = firstSeen.get(id);
      if (!prev || date < prev) firstSeen.set(id, date);
    };
    (transactions || []).forEach((t) => note(t.customerId, t.date));
    (tickets || []).forEach((tk) => note(tk.customerId, tk.dateIn));

    const segs = { phone: emptySeg(), service: emptySeg(), accessory: emptySeg() };
    for (const t of income) {
      const seg = segs[classifySegment(t)];
      const amount = Number(t.amount) || 0;
      const cost = Number(t.costPrice) || 0;
      seg.count += 1;
      seg.revenue += amount;
      seg.margin += amount - cost;
      if (t.customerId) {
        seg.withCustomer += 1;
        seg.customerIds.add(t.customerId);
        const fs = firstSeen.get(t.customerId);
        if (fs != null && fs >= startDate) {
          seg.newCustomerIds.add(t.customerId);
          seg.newRevenue += amount;
        } else {
          seg.returningCustomerIds.add(t.customerId);
          seg.returningRevenue += amount;
        }
      }
    }

    const totalRevenue = SEG_ORDER.reduce((s, k) => s + segs[k].revenue, 0);
    const totalMargin = SEG_ORDER.reduce((s, k) => s + segs[k].margin, 0);
    const identifiedAll = new Set([...segs.phone.customerIds, ...segs.service.customerIds]);
    const newAll = new Set([...segs.phone.newCustomerIds, ...segs.service.newCustomerIds]);

    const accessoryMislabeled = income.filter((t) => t.category === "Készlet" && !t.productId).length;
    const accessoryProper = income.filter((t) => t.category === "Tartozékok").length;

    const days = Math.max(1, Math.round((Date.now() - new Date(startDate + "T00:00:00").getTime()) / 86400000));

    return { segs, totalRevenue, totalMargin, identifiedAll, newAll, accessoryMislabeled, accessoryProper, days };
  }, [transactions, tickets]);

  const pct = (v, total) => (total > 0 ? Math.round((v / total) * 1000) / 10 : 0);

  return (
    <div>
      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        Mérve <b>{ANALYTICS_START_DATE.split("-").reverse().join(".")}.</b> óta ({d.days} nap) — ekkortól kerül minden eladás/átadás
        tételesen, automatikusan a Bevételekbe. A korábbi adat tömbösített/becsült, azon ez a bontás nem megbízható —
        érdemes ezt a fület újra megnézni 2-3 hónap adatával, amikor már trendet is lehet belőle olvasni.
      </div>

      <div className="statcard" style={{ marginBottom: 14 }}>
        <div className="dp-section-title">Bevétel-megoszlás — miből jön a pénz, és mennyi marad belőle</div>
        <div style={{ display: "flex", gap: 14, marginBottom: 12, fontSize: 11, color: "#6B7280", flexWrap: "wrap" }}>
          {SEG_ORDER.map((k) => (
            <span key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: SEG_COLOR[k], display: "inline-block" }} />
              {SEG_LABEL[k]}
            </span>
          ))}
        </div>
        <div style={{ height: 18, borderRadius: 5, overflow: "hidden", display: "flex", background: "#F1F2F6", marginBottom: 14 }}>
          {SEG_ORDER.map((k) => {
            const p = pct(d.segs[k].revenue, d.totalRevenue);
            if (p <= 0) return null;
            return <div key={k} style={{ width: `${p}%`, background: SEG_COLOR[k] }} title={`${SEG_LABEL[k]}: ${money(d.segs[k].revenue)} (${p}%)`} />;
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {SEG_ORDER.map((k) => {
            const s = d.segs[k];
            const revPct = pct(s.revenue, d.totalRevenue);
            const marginPct = pct(s.margin, s.revenue);
            return (
              <div key={k} style={{ background: "#F9FAFB", border: "1px solid #F1F2F6", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: SEG_COLOR[k], marginBottom: 6 }}>{SEG_LABEL[k]}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>{money(s.revenue)}</div>
                <div style={{ fontSize: 10.5, color: "#9CA3AF", marginBottom: 8 }}>a bevétel {revPct}%-a · {s.count} tétel</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#15803D" }}>{money(s.margin)} rés</div>
                <div style={{ fontSize: 10.5, color: "#9CA3AF" }}>{marginPct}% árréshányad</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="statcard" style={{ marginBottom: 14 }}>
        <div className="dp-section-title">Ügyfél-azonosítás — Telefon és Szerviz eladásnál</div>
        <div style={{ fontSize: 11.5, color: "#9CA3AF", marginBottom: 10 }}>
          A lenti új/visszatérő bontás csak azon a hányadon megbízható, ahol tényleg tudjuk, ki vásárolt — ha ez nem 100%,
          az a jel, hogy a pultnál ki kell kérni az ügyfél nevét/telefonszámát a rendes eladási/átadási folyamatban.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {["phone", "service"].map((k) => {
            const s = d.segs[k];
            const idPct = pct(s.withCustomer, s.count);
            return (
              <div key={k}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: "#374151" }}>{SEG_LABEL[k]}</span>
                  <span style={{ color: idPct >= 90 ? "#15803D" : idPct >= 60 ? "#B45309" : "#B91C1C", fontWeight: 700 }}>
                    {idPct}% <span style={{ color: "#9CA3AF", fontWeight: 400 }}>({s.withCustomer}/{s.count})</span>
                  </span>
                </div>
                <div style={{ height: 7, background: "#F1F2F6", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${idPct}%`, height: "100%", background: idPct >= 90 ? "#22C55E" : idPct >= 60 ? "#F59E0B" : "#EF4444", borderRadius: 999 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="statcard" style={{ marginBottom: 14 }}>
        <div className="dp-section-title">Új vs. visszatérő ügyfél — és mennyit hoztak</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          {["phone", "service"].map((k) => {
            const s = d.segs[k];
            const total = s.newCustomerIds.size + s.returningCustomerIds.size;
            const newPct = pct(s.newCustomerIds.size, total);
            const retPct = 100 - newPct;
            return (
              <div key={k}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: "#374151" }}>{SEG_LABEL[k]}</span>
                  <span style={{ color: "#6B7280" }}>
                    <span style={{ color: "var(--primary)" }}>Új {newPct}%</span>{" · "}
                    <span style={{ color: "#6B7280" }}>Visszatérő {retPct}%</span>
                    <span style={{ color: "#9CA3AF" }}> ({total} ügyfél)</span>
                  </span>
                </div>
                <div style={{ height: 7, background: "#F1F2F6", borderRadius: 999, overflow: "hidden", display: "flex", marginBottom: 8 }}>
                  <div style={{ width: `${newPct}%`, height: "100%", background: "var(--primary)" }} />
                  <div style={{ width: `${retPct}%`, height: "100%", background: "#6B7280" }} />
                </div>
                <div style={{ fontSize: 10.5, color: "#9CA3AF" }}>
                  Új ügyfelektől {money(s.newRevenue)} · Visszatérőktől {money(s.returningRevenue)}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 24, paddingTop: 10, borderTop: "1px solid #F1F2F6", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Azonosított ügyfél összesen</div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{d.identifiedAll.size} fő</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Ebből most először hoztunk értéket</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--primary)" }}>{d.newAll.size} fő</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Átl. bevétel / azonosított ügyfél</div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>
              {money(d.identifiedAll.size ? (d.segs.phone.revenue + d.segs.service.revenue) / d.identifiedAll.size : 0)}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 8 }}>
          {d.days} nap alatt még nem valódi élettartamérték (LTV) — csak korai jelzés. Ahogy telik az idő és többször
          visszajönnek ugyanazok az ügyfelek, ez a szám kezdi megmutatni, mennyit ér egy ügyfél hosszú távon.
        </div>
      </div>

      {(d.accessoryMislabeled > 0 || d.accessoryProper === 0) && (
        <div className="statcard" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#92400E", marginBottom: 4 }}>Adatminőség: Tartozékok kategória nincs használva</div>
          <div style={{ fontSize: 12, color: "#78350F", lineHeight: 1.6 }}>
            A rendszerben már régóta ott van a <b>"Tartozékok"</b> bevétel-kategória, de {d.days} nap alatt egyszer sem lett
            kiválasztva — helyette {d.accessoryMislabeled} tartozék-jellegű tétel (kábel, tok, fólia stb., {money(d.segs.accessory.revenue)} összesen)
            "Készlet" kategóriával lett rögzítve, és csak abból derül ki, hogy nincs hozzá termék. Ha ehelyett a pultnál
            bevétel rögzítésekor a <b>Tartozékok</b> kategóriát választjátok, a fenti bontás nem becslésen/kiszűrésen
            fog alapulni, hanem pontos lesz — és a Telefon-szegmens számai (fent) sem lesznek felhígítva apró tételekkel.
          </div>
        </div>
      )}
    </div>
  );
}
