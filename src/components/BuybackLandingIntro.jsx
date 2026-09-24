import { useMemo, useState } from "react";
import { PinIcon, WarrantyIcon, TransferIcon } from "./icons";
import { ReviewsBadge } from "./PublicReviews";

const STEPS = [
  { title: "Válaszd ki a modellt és az állapotát.", desc: "2 perc alatt megvan a becsült érték — nem kell hozzá regisztráció, csak pár kattintás." },
  { title: "Fogadd el, és válaszd ki, hogyan kéred.", desc: "Készpénz azonnal, kredit-egyenleg +10%, vagy bizomány +15% — te döntesz." },
  { title: "Küldd el postán, vagy hozd be.", desc: "Elfogadás után a pénz azonnal a tiéd — postánál az átvétel napján utaljuk." },
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
export default function BuybackLandingIntro({ brands, models, onCta, onSeeAll }) {
  const [activeBrand, setActiveBrand] = useState(brands.includes("Apple") ? "Apple" : brands[0]);
  const [openFaq, setOpenFaq] = useState(0);

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
        <h1 className="bb-landing-title">Add be. Cserélj.<br />Nyerj.</h1>
        <p className="bb-landing-sub">Azonnal látod, mennyit ér a régi telefonod — a pénzt vagy kedvezményt még aznap felhasználhatod egy újra, boltban vagy postán keresztül.</p>
        <ReviewsBadge style={{ justifyContent: "center", marginTop: 14 }} />

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
            Akár <span>{Math.round(topPrice).toLocaleString("hu-HU")} Lej-t</span> kapsz egy {activeBrand} telefonért.
          </div>
          <p className="bb-landing-values-sub">A pontos ár a modelltől és az állapottól függ.</p>

          <div className="bb-landing-values-grid">
            <div className="bb-landing-values-table">
              {brandModels.map((m) => (
                <div className="bb-landing-val-row" key={m.model}>
                  <span>{m.model}</span>
                  <b>Akár {Math.round(m.price).toLocaleString("hu-HU")} Lej</b>
                </div>
              ))}
              <button type="button" className="bb-landing-values-link" onClick={() => onSeeAll(activeBrand)}>Összes modell és ár megtekintése →</button>
            </div>
            <div className="bb-landing-values-side">
              <button type="button" className="btn" style={{ justifyContent: "center" }} onClick={onCta}>Kérd az ajánlatod</button>
              <a href="/status" className="bb-landing-status-box">
                <span>Már elküldted a telefonod?</span>
                <b>Nézd meg az állapotát →</b>
              </a>
            </div>
          </div>
        </div>
      )}

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
        <div className="bb-faq-list">
          {FAQ_ITEMS.map((f, i) => (
            <div className="bb-faq-row" key={f.q}>
              <button type="button" className="bb-faq-q" aria-expanded={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
                {f.q}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ transform: openFaq === i ? "rotate(180deg)" : "none" }}><path d="M6 9l6 6 6-6" /></svg>
              </button>
              {openFaq === i && <p className="bb-faq-a">{f.a}</p>}
            </div>
          ))}
        </div>
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
        <button type="button" className="btn" onClick={onCta}>Kezdjük →</button>
      </div>
    </div>
  );
}
