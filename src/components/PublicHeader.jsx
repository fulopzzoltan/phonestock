import { useState } from "react";
import { t } from "../lib/i18n";
import { UserIcon, PhoneCaseIcon, ServiceIcon, ClockIcon, BuybackIcon } from "./icons";

// Alapértelmezett nyelv-váltó célok oldalanként (aktív nav szerint) — a PhoneDetail.jsx ezt felülírja
// a saját langSwitchHref propjával, mert ott a konkrét telefon id-jét is meg kell tartani.
// Azoknál az oldalaknál, amiknek nincs saját RO/HU párja (státusz, bizonylat, eladom),
// a nyelvváltó a főoldalra visz az adott nyelven — így sosem tűnik el a fejlécből.
const DEFAULT_LANG_TARGETS = {
  stock: { hu: "/", ro: "/ro/telefoane" },
  repair: { hu: "/becsles", ro: "/ro/estimare" },
};
const FALLBACK_LANG_TARGET = { hu: "/", ro: "/ro/telefoane" };

export default function PublicHeader({ children, activeNav = "stock", lang = "hu", langSwitchHref }) {
  const s = t(lang);
  const [menuOpen, setMenuOpen] = useState(false);
  const stockHref = lang === "ro" ? "/ro/telefoane" : "/";
  const repairHref = lang === "ro" ? "/ro/estimare" : "/becsles";
  const otherLang = lang === "ro" ? "hu" : "ro";
  const defaultTarget = DEFAULT_LANG_TARGETS[activeNav] || FALLBACK_LANG_TARGET;
  const resolvedLangHref = langSwitchHref || defaultTarget[otherLang];

  return (
    <header className="pub-header">
      <div className="pub-header-inner">
        <div className="pub-brand-row">
          <a className="pub-wordmark" href={stockHref} aria-label="Telefonos">
            <img src="/logo.png" alt="Telefonos" className="pub-logo-img" />
          </a>
          <div className="pub-mobile-icons">
            <a className={`pub-nav-link pub-nav-icon pub-mobile-repair-btn${activeNav === "repair" ? " active" : ""}`} href={repairHref}>
              <ServiceIcon width={16} height={16} />{s.navRepair}
            </a>
            <button
              type="button"
              className={`pub-menu-toggle${menuOpen ? " open" : ""}`}
              aria-label={menuOpen ? "Menü bezárása" : "Menü megnyitása"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span /><span /><span />
            </button>
          </div>
          <nav className={`pub-nav${menuOpen ? " open" : ""}`}>
            <a className={`pub-nav-link${activeNav === "stock" ? " active" : ""}`} href={stockHref}><PhoneCaseIcon className="pub-nav-link-icon" width={16} height={16} />{s.navStock}</a>
            <a className={`pub-nav-link${activeNav === "repair" ? " active" : ""}`} href={repairHref}><ServiceIcon className="pub-nav-link-icon" width={16} height={16} />{s.navRepair}</a>
            <a className={`pub-nav-link${activeNav === "status" ? " active" : ""}`} href="/status"><ClockIcon className="pub-nav-link-icon" width={16} height={16} />{s.navStatus}</a>
            {resolvedLangHref && (
              <div className="pub-lang-switch" role="group" aria-label="Nyelv">
                {lang === "ro" ? (
                  <a className="pub-lang-opt" href={resolvedLangHref}>HU</a>
                ) : (
                  <span className="pub-lang-opt pub-lang-active">HU</span>
                )}
                {lang === "ro" ? (
                  <span className="pub-lang-opt pub-lang-active">RO</span>
                ) : (
                  <a className="pub-lang-opt" href={resolvedLangHref}>RO</a>
                )}
              </div>
            )}
            <a className="pub-nav-link pub-nav-cta" href="/eladom"><BuybackIcon className="pub-nav-link-icon" width={16} height={16} />{s.navBuyback}</a>
            <a className={`pub-nav-link pub-nav-icon${activeNav === "login" ? " active" : ""}`} href="/fiok" aria-label={s.navLogin} title={s.navLogin}>
              <UserIcon width={16} height={16} /><span className="pub-nav-icon-label">{s.navLogin}</span>
            </a>
          </nav>
        </div>
        {children}
      </div>
    </header>
  );
}
