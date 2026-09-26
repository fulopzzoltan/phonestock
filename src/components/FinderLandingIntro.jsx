import { useMemo } from "react";
import { PinIcon, ScanIcon, RefurbIcon } from "./icons";
import FaqAccordion from "./FaqAccordion";

const STEPS = [
  { title: "Válaszolj 4 rövid kérdésre.", desc: "Állapot, keret, tárhely, márka — kevesebb mint 1 perc." },
  { title: "Azonnal látod a találatokat.", desc: "Valós, raktáron lévő telefonokat mutatunk, nem elméleti listát." },
  { title: "Nézd meg, vagy kérdezz rá.", desc: "Nincs hozzá kötelezettség — bármikor újrakezdheted." },
];

const FAQ_ITEMS = [
  { q: "Fizetnem kell a segítő használatáért?", a: "Nem, teljesen ingyenes és nincs hozzá regisztráció sem — csak válaszolsz 4 kérdésre, és megmutatjuk a hozzád illő, készleten lévő telefonokat." },
  { q: "Mi van, ha egyik találat sem tetszik?", a: "Bármikor újrakezdheted más válaszokkal, vagy gyere be hozzánk Gyimesbe vagy Szentgyörgyre — élőben is megmutatjuk, mi illik hozzád." },
  { q: "Csak felújított telefonokat mutat?", a: "Nem — az első kérdésnél kiválasztod, hogy új vagy felújított készüléket keresel, és csak az annak megfelelő találatokat mutatjuk." },
];

// A segítő oldal nyitó "landing" szekciója — ugyanaz a vizuális nyelv, mint a Buyback/Repair
// landingnél, a márka-tabok / ár-táblázat helyén egy büdzsé-gyorsválasztóval, valós
// készletszámokkal (a már betöltött phones state-ből számolva, nem statikus adat).
export default function FinderLandingIntro({ phones, onCta }) {
  const tiers = useMemo(() => {
    const counts = { under1000: 0, mid: 0, over2000: 0 };
    phones.forEach((p) => {
      const price = Number(p.sale_price) || 0;
      if (price < 1000) counts.under1000++;
      else if (price <= 2000) counts.mid++;
      else counts.over2000++;
    });
    return [
      { key: "under1000", label: "1000 Lej alatt", count: counts.under1000 },
      { key: "mid", label: "1000–2000 Lej", count: counts.mid },
      { key: "over2000", label: "2000 Lej felett", count: counts.over2000 },
    ];
  }, [phones]);

  return (
    <div className="bb-landing">
      <div className="bb-landing-hero">
        <div className="pub-promo-eyebrow" style={{ marginBottom: 18 }}>Telefonos · Segítő</div>
        <h1 className="bb-landing-title">Nem tudod, melyik telefon illik hozzád?</h1>
        <p className="bb-landing-sub">4 gyors kérdés, és megmutatjuk a hozzád illő telefonokat a készletünkből.</p>
      </div>

      <div className="bb-landing-values">
        <div className="bb-landing-values-title" style={{ textAlign: "center" }}>Kezdj egy büdzsével.</div>
        <p className="bb-landing-values-sub" style={{ textAlign: "center" }}>Bármikor módosíthatod — ez csak egy gyors kiindulópont.</p>
        <div className="bb-landing-payout-grid" style={{ marginTop: 28 }}>
          {tiers.map((tr) => (
            <div className="bb-landing-payout-card" key={tr.key} style={{ background: "#fff", textAlign: "center", alignItems: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: "var(--pub-accent-ink)" }}>{tr.count}</div>
              <b>{tr.label}</b>
              <p>telefon készleten</p>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
          <button type="button" className="btn" onClick={onCta}>Kezdjük<span style={{ fontSize: 18 }}>→</span></button>
        </div>
      </div>

      <div className="bb-landing-steps">
        <div className="bb-landing-steps-title">Így működik.</div>
        <p className="bb-landing-values-sub" style={{ textAlign: "center" }}>Kevesebb mint 1 perc, nincs hozzá kötelezettség.</p>
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
          <RefurbIcon width={24} height={24} />
          <b>Új és felújított is</b>
          <p>Te választod ki, milyen állapotú készüléket keresel.</p>
        </div>
        <div className="bb-landing-trust-item">
          <ScanIcon width={24} height={24} />
          <b>Valós, raktáron lévő telefonok</b>
          <p>Amit mutatunk, azt ma is meg tudod venni — nem elméleti lista.</p>
        </div>
        <div className="bb-landing-trust-item">
          <PinIcon width={24} height={24} />
          <b>2 fizikai üzletünkben</b>
          <p>Nézd meg élőben is a találatokat Gyimesben vagy Szentgyörgyön.</p>
        </div>
      </div>

      <div className="bb-faq">
        <div className="bb-landing-steps-title" style={{ textAlign: "center", marginBottom: 24 }}>Gyakori kérdések</div>
        <FaqAccordion items={FAQ_ITEMS} />
      </div>

      <div className="bb-landing-final-cta">
        <div>
          <div className="bb-landing-final-cta-title">Kevesebb mint 1 perc, nincs kötelezettség.</div>
          <div className="bb-landing-final-cta-row">
            <span>✓ Valós készlet</span>
            <span>✓ Nincs regisztráció</span>
            <span>✓ 2 fizikai üzletünkben</span>
          </div>
        </div>
        <button type="button" className="btn" onClick={onCta}>Kezdjük →</button>
      </div>
    </div>
  );
}
