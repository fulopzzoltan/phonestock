import { t } from "../lib/i18n";

// Alapértelmezett nyelv-váltó célok oldalanként (aktív nav szerint) — a PhoneDetail.jsx ezt felülírja
// a saját langSwitchHref propjával, mert ott a konkrét telefon id-jét is meg kell tartani.
const DEFAULT_LANG_TARGETS = {
  stock: { hu: "/", ro: "/ro/telefoane" },
  repair: { hu: "/becsles", ro: "/ro/estimare" },
};

export default function PublicHeader({ children, activeNav = "stock", lang = "hu", langSwitchHref }) {
  const s = t(lang);
  const stockHref = lang === "ro" ? "/ro/telefoane" : "/";
  const repairHref = lang === "ro" ? "/ro/estimare" : "/becsles";
  const otherLang = lang === "ro" ? "hu" : "ro";
  const defaultTarget = DEFAULT_LANG_TARGETS[activeNav];
  const resolvedLangHref = langSwitchHref || (defaultTarget ? defaultTarget[otherLang] : null);

  return (
    <header className="pub-header">
      <div className="pub-header-inner">
        <div className="pub-brand-row">
          <div className="pub-wordmark">
            <div className="pub-mark">
              <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: "none", stroke: "#fff", strokeWidth: 2 }}>
                <rect x="6" y="2" width="12" height="20" rx="2.5" /><line x1="10" y1="18.5" x2="14" y2="18.5" />
              </svg>
            </div>
            <div className="pub-name">TELEF<em>O</em>NOS</div>
          </div>
          <nav className="pub-nav">
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
