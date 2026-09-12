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
    newRevenue: 0, returningRevenue: 0, newMargin: 0, returningMargin: 0,
  };
}

// A "Tartalék" nem valódi bolt (felújítás alatti/köztes saját készlet helye), ezért
// az üzletek közötti összehasonlításból kimarad.
const RESERVE_LOCATION_NAME = "Tartalék";

// A tartozék-raktárnak nincs tételes nyilvántartása a rendszerben (nincs "termék" rekord
// egy kábelre/tokra) — Zoli szerinti kézi becslés (2026-09-13-i szóbeli közlés alapján,
// kb. 12-15 ezer Lej mindkét üzletben összesen) áll csak rendelkezésre helyette. Ez NEM
// mért adat, csak egy becsült plafon a tőke-hatékonyság számításhoz — ha pontosítod,
// írd át itt.
const ACCESSORY_CAPITAL_ESTIMATE = 13500;

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

export default function RevenueQualityPanel({ transactions, tickets, locations, stockStats, partsStats }) {
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
          seg.newMargin += amount - cost;
        } else {
          seg.returningCustomerIds.add(t.customerId);
          seg.returningRevenue += amount;
          seg.returningMargin += amount - cost;
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

    // Új ügyfél induló rése — ennyi haszon keletkezett MÁR AZ ELSŐ vásárláson/átadáson
    // azoknál, akiket most (a mérési ablakban) szereztünk. Ez a biztonságos "eddig
    // költhetsz egy új ügyfél megszerzésére" plafon: ha ennél kevesebbet költesz rá,
    // már az első tranzakción nullszaldós vagy, a visszatérésük már tiszta nyereség.
    const newMarginAll = segs.phone.newMargin + segs.service.newMargin;
    const avgNewMargin = newAll.size ? newMarginAll / newAll.size : 0;

    // Üzletek közötti összevetés — csak a valódi boltok (a "Tartalék" nem üzlet), csak a
    // mérési ablakban (aug 24 óta), hogy ne keveredjen bele a régi, tömbösített adat.
    const locList = (locations || []).filter((l) => l.name !== RESERVE_LOCATION_NAME);
    const byLoc = new Map(locList.map((l) => [l.id, { id: l.id, name: l.name, revenue: 0, cogs: 0, opex: 0, count: 0 }]));
    (transactions || []).forEach((t) => {
      if (t.deletedAt || !t.date || t.date < startDate) return;
      const entry = byLoc.get(t.locationId);
      if (!entry) return;
      if (t.type === "income" && !t.isPassthrough) {
        entry.revenue += Number(t.amount) || 0;
        entry.count += 1;
      } else if (t.type === "expense") {
        if (t.category === "Készlet") entry.cogs += Number(t.amount) || 0;
        else entry.opex += Number(t.amount) || 0;
      }
    });
    const locStats = locList.map((l) => {
      const e = byLoc.get(l.id);
      const totalCost = e.cogs + e.opex;
      const net = e.revenue - totalCost;
      return { ...e, totalCost, net, marginPct: e.revenue > 0 ? Math.round((net / e.revenue) * 100) : 0 };
    });

    // Tőke-hatékonyság szegmensenként — mennyi pénz van lekötve (telefon-készlet
    // beszerzési értéke, alkatrész-raktár értéke), és az adott tőke ezalatt a
    // mérési ablak alatt mekkora rést termelt, éves szintre vetítve. A Tartozéknál
    // nincs külön nyilvántartott raktár a rendszerben (ad-hoc, igény szerinti
    // beszerzés), ezért ott a lekötött tőke nem mérhető — ezt jelezzük, nem becsüljük.
    const annualize = (v) => (v / days) * 365;
    const CAPITAL_OF = { phone: stockStats?.cost ?? null, service: partsStats?.value ?? null, accessory: ACCESSORY_CAPITAL_ESTIMATE };
    const capStats = SEG_ORDER.map((k) => {
      const capital = CAPITAL_OF[k];
      const cost = segs[k].revenue - segs[k].margin;
      const annMargin = annualize(segs[k].margin);
      const annCost = annualize(cost);
      const turns = capital > 0 ? annCost / capital : null;
      const roc = capital > 0 ? annMargin / capital : null;
      return { key: k, capital, annMargin, turns, roc, isEstimate: k === "accessory" };
    });

    return { segs, totalRevenue, totalMargin, identifiedAll, newAll, avgNewMargin, accessoryMislabeled, accessoryProper, days, locStats, capStats };
  }, [transactions, tickets, locations, stockStats, partsStats]);

  const pct = (v, total) => (total > 0 ? Math.round((v / total) * 100) : 0);

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
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Átl. induló rés / új ügyfél</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#15803D" }}>{money(d.avgNewMargin)}</div>
          </div>
        </div>
        <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 8 }}>
          {d.days} nap alatt még nem valódi élettartamérték (LTV) — csak korai jelzés. Ahogy telik az idő és többször
          visszajönnek ugyanazok az ügyfelek, ez a szám kezdi megmutatni, mennyit ér egy ügyfél hosszú távon. Az "átl.
          induló rés" viszont már most használható plafon: ennyi haszon keletkezik egy új ügyfél ELSŐ vásárlásán/átadásán —
          ha ennél kevesebbet költesz a megszerzésére (hirdetés, ajánló-bónusz), már az első alkalommal nullszaldós vagy,
          minden visszatérése tiszta nyereség. Ha hosszabb távra fektetsz be egy ügyfélbe (mert számítasz rá, hogy
          visszajön), ennek 2-3-szorosáig érdemes elmenni — de ezt csak 2-3 hónap múlva, valódi visszatérési adattal
          lehet majd biztosan alátámasztani.
        </div>
      </div>

      <div className="statcard" style={{ marginBottom: 14 }}>
        <div className="dp-section-title">Gyimes vs. Szentgyörgy — {d.days} nap aug 24 óta</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${d.locStats.length || 1}, 1fr)`, gap: 10, marginBottom: 10 }}>
          {d.locStats.map((l) => (
            <div key={l.id} style={{ background: "#F9FAFB", border: "1px solid #F1F2F6", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#111827", marginBottom: 8 }}>{l.name}</div>
              <div style={{ fontSize: 10.5, color: "#9CA3AF" }}>Bevétel</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{money(l.revenue)} <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 400 }}>({l.count} tétel)</span></div>
              <div style={{ fontSize: 10.5, color: "#9CA3AF" }}>Kiadás (árubeszerzés + egyéb)</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: "#B91C1C" }}>{money(l.totalCost)}</div>
              <div style={{ fontSize: 10.5, color: "#9CA3AF" }}>Nettó</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: l.net >= 0 ? "#15803D" : "#B91C1C" }}>{money(l.net)} <span style={{ fontSize: 11, fontWeight: 700 }}>({l.marginPct}%)</span></div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10.5, color: "#9CA3AF", lineHeight: 1.6 }}>
          {d.days} nap még kevés, és a "kiadás" itt nem tartalmazza a tényleges bért/bérleti díjat sem szinte
          egyáltalán (a teljes rendszerben eddig összesen 2 db "Bér" tétel van rögzítve) — a valódi fix költség
          rárakása után mindkét helyszín nettója alacsonyabb lesz, de az arány (melyik visel arányosan nagyobb
          költséget a bevételéhez képest) irányadó már most is.
        </div>
      </div>

      <div className="statcard" style={{ marginBottom: 14 }}>
        <div className="dp-section-title">Tőke-hatékonyság szegmensenként — hol dolgozik jobban a pénzed</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 10 }}>
          {d.capStats.map((c) => (
            <div key={c.key} style={{ background: "#F9FAFB", border: "1px solid #F1F2F6", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: SEG_COLOR[c.key], marginBottom: 8 }}>{SEG_LABEL[c.key]}</div>
              {c.capital != null ? (
                <>
                  <div style={{ fontSize: 10.5, color: "#9CA3AF" }}>Lekötött tőke{c.isEstimate ? " (becslés)" : ""}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{money(c.capital)}</div>
                  <div style={{ fontSize: 10.5, color: "#9CA3AF" }}>Forgás (évesített)</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{c.turns != null ? `${c.turns.toFixed(1)}×/év` : "—"}</div>
                  <div style={{ fontSize: 10.5, color: "#9CA3AF" }}>Megtérülés a tőkén (évesített)</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#15803D" }}>{c.roc != null ? `${Math.round(c.roc * 100)}%` : "—"}</div>
                </>
              ) : (
                <div style={{ fontSize: 11.5, color: "#B45309", lineHeight: 1.5 }}>
                  Nincs külön nyilvántartott raktár rá — nem tudjuk, mennyi tőke van benne lekötve.
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10.5, color: "#9CA3AF", lineHeight: 1.6 }}>
          A telefon-tőke a jelenlegi raktáron lévő készlet beszerzési értéke, a szerviz-tőke a raktáron lévő
          alkatrészek értéke — mindkettő a mostani pillanatkép a rendszerből. A tartozék-tőkére nincs tételes
          nyilvántartás (nincs "termék" rekord egy kábelre/tokra), ott a {money(ACCESSORY_CAPITAL_ESTIMATE)}-es szám
          Zoli kézi becslése — ha pontosabb számot tudsz, ezt a fájlban lehet frissíteni. A forgás/megtérülés
          mindhárom szegmensnél a {d.days} napos mérési ablak alapján évesített becslés, tehát irányadó, nem
          garantált szám.
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
