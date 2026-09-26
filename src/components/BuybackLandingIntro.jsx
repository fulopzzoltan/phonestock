import { useMemo, useState } from "react";
import { PinIcon, WarrantyIcon, TransferIcon, ClockIcon, CardIcon, ConsignmentIcon } from "./icons";
import FaqAccordion from "./FaqAccordion";

const STEPS = [
  { title: "Válaszd ki a modellt és az állapotát.", desc: "2 perc alatt megvan a becsült érték — nem kell hozzá regisztráció, csak pár kattintás." },
  { title: "Fogadd el, és válaszd ki, hogyan kéred.", desc: "3 rugalmas kifizetési mód közül választhatsz — attól függően, mi számít neked." },
  { title: "Küldd el postán, vagy hozd be.", desc: "Elfogadás után a pénz azonnal a tiéd — postánál az átvétel napján utaljuk." },
];

const PAYOUT_WAYS = [
  {
    icon: ClockIcon,
    title: "Gyors kifizetés",
    desc: "Hozd be üzleteinkbe, és a pénz azonnal a tiéd — postai beküldésnél az átvétel napján utaljuk.",
  },
  {
    icon: CardIcon,
    title: "Levásárolható kredit",
    badge: "+10%",
    desc: "Számítsd be a régi készülékedet egy újéba — a kredit-egyenleg azonnal jóváíródik, és nálunk bármikor elkölthető.",
  },
  {
    icon: ConsignmentIcon,
    title: "Bizományosi értékesítés",
    badge: "+15%",
    desc: "Nem sürgős? Bízd ránk az eladást — amint megtaláljuk az új gazdát, a legmagasabb árat kapod érte.",
  },
];

const FAQ_ITEMS = [
  { q: "Milyen állapotú telefont vásároltok fel?", a: "Törött kijelzőjű vagy vízkárosodott készüléket is beveszünk — az állapot csak az árat befolyásolja, nem a lehetőséget." },
  { q: "Mikor kapom meg a pénzt?", a: "Elfogadás után azonnal, helyben készpénzben vagy kredit-egyenlegen — postai beküldésnél az átvétel napján utaljuk." },
  { q: "Mi történik az adataimmal?", a: "Ha nálunk veszel új telefont, az adataidat ingyen átmásoljuk a régiről az újra, a régi készüléket pedig biztonságosan töröljük." },
  { q: "Csak boltban tudom eladni?", a: "Nem — a modellt és állapotot online is megadhatod, majd behozod vagy postán elküldöd, a pénz elfogadás után azonnal a tiéd." },
];

// Az eladás oldal nyitó "landing" szekciója — az Apple Trade In oldal szerkezetét követi
// (ár-horgony táblázat márka-tabokkal, szöveges lépéslista, GYIK), a PageIntroHero-tól
// eltérően nem újrafelhasznált kártya-minta, csak ezen az oldalon él.
export default function BuybackLandingIntro({ brands, models, onCta }) {
  const [activeBrand, setActiveBrand] = useState(brands.includes("Apple") ? "Apple" : brands[0]);

  const brandModels = useMemo(() => {
    const best = {};
    models.filter((m) => m.brand === activeBrand).forEach((m) => {
      const price = Number(m.base_price);
      if (!best[m.model] || price > best[m.model]) best[m.model] = price;
    });
    return Object.entries(best).map(([model, price]) => ({ model, price })).sort((a, b) => b.price - a.price).slice(0, 5);
  }, [models, activeBrand]);

  const topPrice = brandModels[0]?.price || 0;

  return (
    <div className="bb-landing">
      <div className="bb-landing-hero">
        <div className="pub-promo-eyebrow" style={{ marginBottom: 18 }}>Telefonos · Eladás</div>
        <h1 className="bb-landing-title">Add el a régi készüléked —<br />pont úgy, ahogy neked kényelmes.</h1>
        <p className="bb-landing-sub">Intézd online 2 perc alatt, vagy gyere be hozzánk — válassz a 3 rugalmas eladási lehetőség közül, és hozd ki a legtöbbet a régi telefonodból.</p>

        {brands.length > 1 && (
          <div className="bb-landing-tabs">
            {brands.map((b) => (
              <button key={b} type="button" className={`bb-landing-tab${b === activeBrand ? " active" : ""}`} onClick={() => setActiveBrand(b)}>{b}</button>
            ))}
          </div>
        )}
      </div>

      {brandModels.length > 0 && (
        <div className="bb-landing-values">
          <div className="bb-landing-values-title">
            Akár <span>{Math.round(topPrice).toLocaleString("hu-HU")} Lei-t</span> kapsz egy {activeBrand} telefonért.
          </div>
          <p className="bb-landing-values-sub">A pontos ár a modelltől és az állapottól függ.</p>

          <div className="bb-landing-values-grid">
            <div className="bb-landing-values-table">
              {brandModels.map((m) => (
                <div className="bb-landing-val-row" key={m.model}>
                  <span>{m.model}</span>
                  <b>Akár {Math.round(m.price).toLocaleString("hu-HU")} Lei</b>
                </div>
              ))}
              <button type="button" className="btn" style={{ justifyContent: "center", marginTop: 18 }} onClick={onCta}>Kérek azonnali ajánlatot</button>
            </div>
            <div className="bb-landing-values-side">
              <div className="bb-landing-values-photo">
                <img className="bb-landing-values-img" src="/Gemini_Generated_Image_iso2nyiso2nyiso2.jpeg" alt="Felvásárolt iPhone-ok" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bb-landing-payout">
        <div style={{ textAlign: "center" }}>
          <div className="bb-landing-steps-title">Te döntsd el, hogyan kéred az árát.</div>
          <p className="bb-landing-values-sub" style={{ textAlign: "center" }}>Sebesség, extra érték vagy a legmagasabb ár — válaszd a neked legjobbat.</p>
        </div>
        <div className="bb-landing-payout-grid">
          {PAYOUT_WAYS.map((w) => (
            <div className="bb-landing-payout-card" key={w.title}>
              <div className="bb-landing-payout-top">
                <div className="bb-landing-payout-ic"><w.icon width={20} height={20} /></div>
                {w.badge && <span className="bb-landing-badge">{w.badge}</span>}
              </div>
              <b>{w.title}</b>
              <p>{w.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bb-landing-steps">
        <div className="bb-landing-steps-title">Hogyan add el?</div>
        <p className="bb-landing-values-sub" style={{ textAlign: "center" }}>A becsléstől a leadásig minden lépésnél segítünk.</p>
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
          <PinIcon width={24} height={24} />
          <b>2 fizikai üzletünkben</b>
          <p>Helyben megnézzük a készüléked, és azonnal fizetünk.</p>
        </div>
        <div className="bb-landing-trust-item">
          <WarrantyIcon width={24} height={24} />
          <b>Törött telefont is beveszünk</b>
          <p>Repedt kijelző vagy vízkár sem kizáró ok, csak árbefolyásoló.</p>
        </div>
        <div className="bb-landing-trust-item">
          <TransferIcon width={24} height={24} />
          <b>Ingyenes adatátmásolás</b>
          <p>Ha nálunk veszel újat, mindent átmásolunk a régiről — te nem bajlódsz vele.</p>
        </div>
      </div>

      <div className="bb-faq">
        <div className="bb-landing-steps-title" style={{ textAlign: "center", marginBottom: 24 }}>Gyakori kérdések</div>
        <FaqAccordion items={FAQ_ITEMS} />
      </div>

      <div className="bb-landing-final-cta">
        <div>
          <div className="bb-landing-final-cta-title">2 perces folyamat, nincs regisztráció.</div>
          <div className="bb-landing-final-cta-row">
            <span>✓ Törött telefont is beveszünk</span>
            <span>✓ 2 fizikai üzletünkben</span>
            <span>✓ Biztonságos adatkezelés</span>
          </div>
        </div>
        <button type="button" className="btn" onClick={onCta}>Kérek azonnali ajánlatot →</button>
      </div>
    </div>
  );
}
