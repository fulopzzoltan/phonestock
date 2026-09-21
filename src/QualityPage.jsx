import { Helmet } from "react-helmet-async";
import { QUALITY_CONTENT } from "./lib/qualityContent";
import { t } from "./lib/i18n";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import { CheckIcon, ShieldCheckIcon, WarrantyIcon, ReturnIcon, ServiceIcon, ReviewsIcon } from "./components/icons";

const SITE = "https://telefonos.ro";
const AFTER_ICONS = [WarrantyIcon, ReturnIcon, ServiceIcon, ReviewsIcon];

export default function QualityPage({ lang = "hu" }) {
  const s = t(lang);
  const c = QUALITY_CONTENT[lang] || QUALITY_CONTENT.hu;
  const langSwitchHref = lang === "ro" ? "/ellenorzott-felujitas" : "/ro/reconditionare-verificata";
  const canonical = lang === "ro" ? `${SITE}/ro/reconditionare-verificata` : `${SITE}/ellenorzott-felujitas`;

  return (
    <div className="pub-shop">
      <Helmet>
        <html lang={lang} />
        <title>{c.title}</title>
        <meta name="description" content={c.metaDesc} />
        <link rel="canonical" href={canonical} />
        <link rel="alternate" hrefLang="hu" href={`${SITE}/ellenorzott-felujitas`} />
        <link rel="alternate" hrefLang="ro" href={`${SITE}/ro/reconditionare-verificata`} />
      </Helmet>
      <PublicHeader activeNav="stock" lang={lang} langSwitchHref={langSwitchHref} />
      <main className="pub-quality-main">
        <a href={lang === "ro" ? "/ro/telefoane" : "/"} className="pub-back-link">{s.back}</a>

        <div className="pub-quality-hero">
          <div className="pub-promo-eyebrow" style={{ marginBottom: 8 }}>{c.eyebrow}</div>
          <h1 className="pub-faq-title" style={{ marginBottom: 10 }}>{c.h1}</h1>
          <p className="pub-faq-subtitle" style={{ maxWidth: 620 }}>{c.intro}</p>
        </div>

        <div className="pub-quality-badges">
          {c.badges.map((b, i) => (
            <div key={i} className="pub-quality-badge">
              <ShieldCheckIcon width={20} height={20} />
              <div className="pub-quality-badge-title">{b.title}</div>
              <div className="pub-quality-badge-sub">{b.sub}</div>
            </div>
          ))}
        </div>

        <section className="pub-quality-section">
          <h2 className="pub-quality-section-title">{c.checklistTitle}</h2>
          <p className="pub-quality-section-intro">{c.checklistIntro}</p>
          <div className="pub-quality-checklist">
            {c.checklist.map((item, i) => (
              <div key={i} className="pub-quality-check-item">
                <CheckIcon width={17} height={17} strokeWidth={2.4} />
                <div>
                  <div className="pub-quality-check-title">{item.title}</div>
                  <div className="pub-quality-check-desc">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="pub-quality-section">
          <h2 className="pub-quality-section-title">{c.gradesTitle}</h2>
          <p className="pub-quality-section-intro">{c.gradesIntro}</p>
          <div className="pub-quality-grades">
            {c.grades.map((g, i) => (
              <div key={i} className="pub-quality-grade-card">
                <div className="pub-quality-grade-label">{g.label}</div>
                <div className="pub-quality-grade-warranty">{g.warranty}</div>
                <div className="pub-quality-grade-desc">{g.desc}</div>
              </div>
            ))}
          </div>
          <div className="pub-quality-note">{c.gradesNote}</div>
        </section>

        <section className="pub-quality-section">
          <h2 className="pub-quality-section-title">{c.afterTitle}</h2>
          <div className="pub-quality-after">
            {c.after.map((item, i) => {
              const Icon = AFTER_ICONS[i] || CheckIcon;
              return (
                <div key={i} className="pub-quality-after-item">
                  <Icon width={19} height={19} />
                  <div>
                    <div className="pub-quality-check-title">{item.title}</div>
                    <div className="pub-quality-check-desc">{item.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="pub-quality-cta">
          <a href={c.ctaHref} className="pub-ask-btn">{c.ctaText} →</a>
        </div>
      </main>
      <PublicFooter lang={lang} />
    </div>
  );
}
