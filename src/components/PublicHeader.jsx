import { useState } from "react";
import { t } from "../lib/i18n";

// Alapértelmezett nyelv-váltó célok oldalanként (aktív nav szerint) — a PhoneDetail.jsx ezt felülírja
// a saját langSwitchHref propjával, mert ott a konkrét telefon id-jét is meg kell tartani.
const DEFAULT_LANG_TARGETS = {
  stock: { hu: "/", ro: "/ro/telefoane" },
  repair: { hu: "/becsles", ro: "/ro/estimare" },
};

export default function PublicHeader({ children, activeNav = "stock", lang = "hu", langSwitchHref }) {
  const s = t(lang);
  const [menuOpen, setMenuOpen] = useState(false);
  const stockHref = lang === "ro" ? "/ro/telefoane" : "/";
  const repairHref = lang === "ro" ? "/ro/estimare" : "/becsles";
  const otherLang = lang === "ro" ? "hu" : "ro";
  const defaultTarget = DEFAULT_LANG_TARGETS[activeNav];
  const resolvedLangHref = langSwitchHref || (defaultTarget ? defaultTarget[otherLang] : null);

  return (
    <header className="pub-header">
      <div className="pub-header-inner">
        <div className="pub-brand-row">
          <a className="pub-wordmark" href={stockHref} aria-label="Telefonos">
            <img src="/logo.png" alt="Telefonos" className="pub-logo-img" />
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
          <nav className={`pub-nav${menuOpen ? " open" : ""}`}>
            <a className={`pub-nav-link${activeNav === "stock" ? " active" : ""}`} href={stockHref}>{s.navStock}</a>
            <a className={`pub-nav-link${activeNav === "buyback" ? " active" : ""}`} href="/eladom">{s.navBuyback}</a>
            <a className={`pub-nav-link${activeNav === "repair" ? " active" : ""}`} href={repairHref}>{s.navRepair}</a>
            <a className={`pub-nav-link${activeNav === "status" ? " active" : ""}`} href="/status">{s.navStatus}</a>
            {resolvedLangHref && (
              <a className="pub-nav-link pub-lang-switch" href={resolvedLangHref}>{lang === "ro" ? "HU" : "RO"}</a>
            )}
            <a className={`pub-nav-link pub-nav-login${activeNav === "login" ? " active" : ""}`} href="/admin">{s.navLogin}</a>
          </nav>
        </div>
        {children}
      </div>
    </header>
  );
}
