import { useMemo, useState } from "react";
import { PinIcon, WarrantyIcon, ClockIcon } from "./icons";
import { PRICED_PROBLEMS, REPAIR_FAMILIES } from "../lib/repairCatalog";
import FaqAccordion from "./FaqAccordion";

// Ugyanabban a sorrendben, mint a REPAIR_FAMILIES — legújabbtól a legrégebbiig —, hogy az
// ár-horgony táblázat mindig a legnépszerűbb, ténylegesen árazott modelleket mutassa.
const ANCHOR_FAMILIES = ["iphone-15", "iphone-14", "iphone-13", "iphone-12", "iphone-11"];

const STEPS = [
  { title: "Válaszd ki a telefonod és a hibát.", desc: "2 perc, nem kell hozzá regisztráció." },
  { title: "Azonnal látod az árat.", desc: "Sok javításnál élő raktárkészlet-jelzéssel." },
  { title: "Foglald le a helyed.", desc: "Hozd be a boltba — sok javítás akár aznap kész." },
];

const FAQ_ITEMS = [
  { q: "Mi van, ha a hibám nincs a listás árak között?", a: "A nagy szórású hibáknál (pl. alaplapi hiba, beázás) egyedi árajánlatot adunk, mivel ezeknél egyetlen fix ár nem lenne pontos." },
  { q: "OEM vagy utángyártott alkatrészt használtok?", a: "Ahol van rá adatunk, választhatsz eredeti (OEM) és utángyártott alkatrész között — az ár ennek megfelelően változik." },
  { q: "Mennyi idő alatt kész a javítás?", a: "Sok javítás akár aznap kész — az élő raktárkészlet-jelzés mutatja, ha az alkatrész már nálunk van." },
  { q: "Mi történik, ha nem tudjátok megjavítani?", a: "Ha a bevizsgálás után nem éri meg a javítás, elmondjuk őszintén, és felajánljuk a beszámítás lehetőségét egy másik készülékre." },
];

// A szerviz oldal nyitó "landing" szekciója — ugyanaz a vizuális nyelv, mint a
// BuybackLandingIntro-nál (Apple Trade In szerkezete), a márka-tabok helyén a két
// legnépszerűbb, fix árazott javítással (Kijelző csere / Akku csere).
export default function RepairLandingIntro({ prices, onCta }) {
  const [activeProblem, setActiveProblem] = useState(PRICED_PROBLEMS[0]);

  const rows = useMemo(() => {
    return ANCHOR_FAMILIES
      .map((fam) => {
        const row = prices.find((p) => p.family_key === fam && p.problem_tag === activeProblem);
        return row ? { name: REPAIR_FAMILIES[fam], price: Number(row.price_oem) } : null;
      })
      .filter(Boolean);
  }, [prices, activeProblem]);

  const minPrice = rows.length ? Math.min(...rows.map((r) => r.price)) : null;

  return (
    <div className="bb-landing">
      <div className="bb-landing-hero">
        <div className="pub-promo-eyebrow" style={{ marginBottom: 18 }}>Telefonos · Szerviz</div>
        <h1 className="bb-landing-title">Gyors árbecslő a leggyakoribb javításokra</h1>
        <p className="bb-landing-sub">Add meg a telefonod típusát, és azonnal látod a javítás árát — élő raktárkészlet-jelzéssel.</p>

        <div className="bb-landing-tabs">
          {PRICED_PROBLEMS.slice(0, 2).map((tag) => (
            <button key={tag} type="button" className={`bb-landing-tab${tag === activeProblem ? " active" : ""}`} onClick={() => setActiveProblem(tag)}>{tag}</button>
          ))}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="bb-landing-values">
          <div className="bb-landing-values-title">
            {activeProblem} már <span>{Math.round(minPrice).toLocaleString("hu-HU")} Lei-től</span>.
          </div>
          <p className="bb-landing-values-sub">A végső ár a modelltől és az alkatrész típusától függ.</p>

          <div className="bb-landing-values-grid">
            <div className="bb-landing-values-table">
              {rows.map((r) => (
                <div className="bb-landing-val-row" key={r.name}>
                  <span>{r.name}</span>
                  <b>{Math.round(r.price).toLocaleString("hu-HU")} Lei-től</b>
                </div>
              ))}
              <button type="button" className="btn" style={{ justifyContent: "center", marginTop: 18 }} onClick={onCta}>Kezdjük</button>
            </div>
            <div className="bb-landing-values-side">
              <div className="bb-landing-values-photo" style={{ padding: 24, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--pub-accent-soft)", color: "var(--pub-accent-ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <WarrantyIcon width={20} height={20} />
                </div>
                <b style={{ fontSize: 15, fontWeight: 800, color: "var(--pub-ink)" }}>Garancia minden elvégzett javításra</b>
                <p style={{ margin: 0, fontSize: 12.5, color: "var(--pub-ink-soft)", lineHeight: 1.5 }}>Nem csak az alkatrészre — a munkára is teljes garanciát vállalunk.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bb-landing-steps">
        <div className="bb-landing-steps-title">Hogyan intézzük?</div>
        <p className="bb-landing-values-sub" style={{ textAlign: "center" }}>2 perc, nem kell hozzá regisztráció.</p>
        <div className="bb-landing-step-list">
          {STEPS.map((s, i) => (
            <div className="bb-landing-step-row" key={i}>
              <div className="bb-landing-step-num">{i + 1}. lépés</div>
              <div>
                <b>{s.title}</b>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bb-landing-trust">
        <div className="bb-landing-trust-item">
          <ClockIcon width={24} height={24} />
          <b>Sok javítás akár aznap kész</b>
          <p>Élő raktárkészlet-jelzéssel mutatjuk, mikorra készül el.</p>
        </div>
        <div className="bb-landing-trust-item">
          <WarrantyIcon width={24} height={24} />
          <b>Garancia minden elvégzett javításra</b>
          <p>Az alkatrészre és a munkára is teljes garanciát adunk.</p>
        </div>
        <div className="bb-landing-trust-item">
          <PinIcon width={24} height={24} />
          <b>2 fizikai üzletünkben</b>
          <p>Hozd be Gyimesbe vagy Szentgyörgyre, szemtől szemben egyeztetünk.</p>
        </div>
      </div>

      <div className="bb-faq">
        <div className="bb-landing-steps-title" style={{ textAlign: "center", marginBottom: 24 }}>Gyakori kérdések</div>
        <FaqAccordion items={FAQ_ITEMS} />
      </div>

      <div className="bb-landing-final-cta">
        <div>
          <div className="bb-landing-final-cta-title">2 perces árbecslés, nincs regisztráció.</div>
          <div className="bb-landing-final-cta-row">
            <span>✓ Garancia minden javításra</span>
            <span>✓ Sok javítás akár aznap kész</span>
            <span>✓ 2 fizikai üzletünkben</span>
          </div>
        </div>
        <button type="button" className="btn" onClick={onCta}>Kezdjük →</button>
      </div>
    </div>
  );
}
