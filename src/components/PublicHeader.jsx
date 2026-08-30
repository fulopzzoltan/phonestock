import { useState, useEffect } from "react";
import { t } from "../lib/i18n";
import { UserIcon, PhoneCaseIcon, ServiceIcon, ClockIcon, BuybackIcon, CartIcon, SearchIcon } from "./icons";
import { useCart } from "../lib/cart";
import { markLangChosen } from "../lib/langPref";

// Menü fölötti rotáló ajánlat-sáv — ez az első szöveg, amit minden látogató elolvas,
// még a hero előtt, ezért csak valós, ellenőrizhető állításokat tartalmaz.
const ANNOUNCEMENTS = [
  {
    hu: "Beszámítjuk a régi telefonod — kredit-egyenleggel akár 10%-kal többet érsz",
    ro: "Preluăm telefonul vechi — cu credit primești până la 10% în plus",
    href: { hu: "/eladom", ro: "/eladom" },
    cta: { hu: "Beszámítás", ro: "Vezi oferta" },
  },
  {
    hu: "Minden használt telefonunkra garanciát vállalunk",
    ro: "Oferim garanție la toate telefoanele folosite",
  },
  {
    hu: "2 üzletünkben, Gyimesben és Szentgyörgyön azonnal átveheted",
    ro: "Ridici imediat din oricare din cele 2 magazinele noastre",
  },
];

// Alapértelmezett nyelv-váltó célok oldalanként (aktív nav szerint) — a PhoneDetail.jsx ezt felülírja
// a saját langSwitchHref propjával, mert ott a konkrét telefon id-jét is meg kell tartani.
// Azoknál az oldalaknál, amiknek nincs saját RO/HU párja (státusz, bizonylat, eladom),
// a nyelvváltó a főoldalra visz az adott nyelven — így sosem tűnik el a fejlécből.
const DEFAULT_LANG_TARGETS = {
  stock: { hu: "/", ro: "/ro/telefoane" },
  repair: { hu: "/becsles", ro: "/ro/estimare" },
  finder: { hu: "/segito", ro: "/ro/asistent" },
};
const FALLBACK_LANG_TARGET = { hu: "/", ro: "/ro/telefoane" };

export default function PublicHeader({ children, activeNav = "stock", lang = "hu", langSwitchHref }) {
  const s = t(lang);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const cartCount = useCart().length;
  const [announceIdx, setAnnounceIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setAnnounceIdx((i) => (i + 1) % ANNOUNCEMENTS.length), 5000);
    return () => clearInterval(id);
  }, []);
  const stockHref = lang === "ro" ? "/ro/telefoane" : "/";
  const repairHref = lang === "ro" ? "/ro/estimare" : "/becsles";
  const otherLang = lang === "ro" ? "hu" : "ro";
  const defaultTarget = DEFAULT_LANG_TARGETS[activeNav] || FALLBACK_LANG_TARGET;
  const resolvedLangHref = langSwitchHref || defaultTarget[otherLang];

  const langSwitch = resolvedLangHref && (
    <div className="pub-lang-switch" role="group" aria-label="Nyelv">
      {lang === "ro" ? (
        <a className="pub-lang-opt" href={resolvedLangHref} onClick={() => markLangChosen("hu")}>HU</a>
      ) : (
        <span className="pub-lang-opt pub-lang-active">HU</span>
      )}
      {lang === "ro" ? (
        <span className="pub-lang-opt pub-lang-active">RO</span>
      ) : (
        <a className="pub-lang-opt" href={resolvedLangHref} onClick={() => markLangChosen("ro")}>RO</a>
      )}
    </div>
  );

  return (
    <>
      <div className="pub-announce-bar">
        <div className="pub-announce-inner">
          {ANNOUNCEMENTS.map((a, i) => (
            <span key={i} className={`pub-announce-msg${i === announceIdx ? " active" : ""}`}>
              {lang === "ro" ? a.ro : a.hu}
              {a.href && (
                <a className="pub-announce-cta" href={lang === "ro" ? a.href.ro : a.href.hu}>
                  {lang === "ro" ? a.cta.ro : a.cta.hu} →
                </a>
              )}
            </span>
          ))}
        </div>
      </div>
      <header className="pub-header">
      <div className="pub-header-inner">
        <div className="pub-brand-row">
          <div className="pub-mobile-left">
            <button
              type="button"
              className={`pub-menu-toggle${menuOpen ? " open" : ""}`}
              aria-label={menuOpen ? "Menü bezárása" : "Menü megnyitása"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span /><span /><span />
            </button>
            {children ? (
              <button
                type="button"
                className={`pub-mobile-icon${mobileSearchOpen ? " active" : ""}`}
                aria-label={s.navSearch}
                title={s.navSearch}
                aria-expanded={mobileSearchOpen}
                onClick={() => setMobileSearchOpen((v) => !v)}
              >
                <SearchIcon width={18} height={18} stroke="currentColor" />
              </button>
            ) : (
              <a className="pub-mobile-icon" href={stockHref} aria-label={s.navSearch} title={s.navSearch}>
                <SearchIcon width={18} height={18} stroke="currentColor" />
              </a>
            )}
          </div>
          <a className="pub-wordmark" href={stockHref} aria-label="Telefonos">
            <img src="/logo.png" alt="Telefonos" className="pub-logo-img" />
          </a>
          <div className="pub-mobile-icons">
            <a className={`pub-mobile-icon${activeNav === "login" ? " active" : ""}`} href="/fiok" aria-label={s.navLogin} title={s.navLogin}>
              <UserIcon width={18} height={18} />
            </a>
            <a className={`pub-mobile-icon${activeNav === "cart" ? " active" : ""}`} href="/kosar" aria-label="Kosár" title="Kosár">
              <CartIcon width={19} height={19} />
              {cartCount > 0 && <span className="pub-cart-badge">{cartCount}</span>}
            </a>
          </div>
          <nav className={`pub-nav${menuOpen ? " open" : ""}`}>
            <div className="pub-nav-group">
              <a className={`pub-nav-link${activeNav === "stock" ? " active" : ""}`} href={stockHref}><PhoneCaseIcon className="pub-nav-link-icon" width={16} height={16} />{s.navStock}</a>
            </div>
            <a className="pub-nav-link pub-nav-cta" href="/eladom"><BuybackIcon className="pub-nav-link-icon" width={16} height={16} />{s.navBuyback}</a>
            <div className="pub-nav-group">
              <a className={`pub-nav-link${activeNav === "repair" ? " active" : ""}`} href={repairHref}><ServiceIcon className="pub-nav-link-icon" width={16} height={16} />{s.navRepair}</a>
              <a className={`pub-nav-link${activeNav === "status" ? " active" : ""}`} href="/status"><ClockIcon className="pub-nav-link-icon" width={16} height={16} />{s.navStatus}</a>
            </div>
            <div className="pub-nav-group">
              <a className={`pub-nav-link pub-nav-icon${activeNav === "cart" ? " active" : ""}`} href="/kosar" aria-label="Kosár" title="Kosár">
                <CartIcon width={16} height={16} /><span className="pub-nav-icon-label">Kosár{cartCount > 0 ? ` (${cartCount})` : ""}</span>
                {cartCount > 0 && <span className="pub-cart-badge">{cartCount}</span>}
              </a>
              <a className={`pub-nav-link pub-nav-icon${activeNav === "login" ? " active" : ""}`} href="/fiok" aria-label={s.navLogin} title={s.navLogin}>
                <UserIcon width={16} height={16} /><span className="pub-nav-icon-label">{s.navLogin}</span>
              </a>
            </div>
            {resolvedLangHref && (
              <div className="pub-lang-switch pub-lang-switch-mobile" role="group" aria-label="Nyelv">
                {lang === "ro" ? (
                  <a className="pub-lang-opt" href={resolvedLangHref} onClick={() => markLangChosen("hu")}>HU</a>
                ) : (
                  <span className="pub-lang-opt pub-lang-active">HU</span>
                )}
                {lang === "ro" ? (
                  <span className="pub-lang-opt pub-lang-active">RO</span>
                ) : (
                  <a className="pub-lang-opt" href={resolvedLangHref} onClick={() => markLangChosen("ro")}>RO</a>
                )}
              </div>
            )}
          </nav>
        </div>

        <div className={`pub-header-children${mobileSearchOpen ? " open" : ""}`}>{children}</div>

        <div className="pub-account-links">
          {langSwitch}
          <a className={`pub-account-link${activeNav === "login" ? " active" : ""}`} href="/fiok"><UserIcon width={15} height={15} />{s.navLogin}</a>
        </div>

        <div className="pub-header-row2">
          <nav className="pub-row2-nav">
            <a className={`pub-nav-link${activeNav === "stock" ? " active" : ""}`} href={stockHref}><PhoneCaseIcon className="pub-nav-link-icon" width={16} height={16} />{s.navStock}</a>
            <a className={`pub-nav-link${activeNav === "buyback" ? " active" : ""}`} href="/eladom">{s.navBuyback}</a>
            <a className={`pub-nav-link${activeNav === "repair" ? " active" : ""}`} href={repairHref}>{s.navRepair}</a>
            <a className={`pub-nav-link${activeNav === "status" ? " active" : ""}`} href="/status">{s.navStatus}</a>
          </nav>
          <div className="pub-row2-right">
            <a className={`pub-account-link${activeNav === "cart" ? " active" : ""}`} href="/kosar"><CartIcon width={15} height={15} />Kosár{cartCount > 0 ? ` (${cartCount})` : ""}</a>
          </div>
        </div>
      </div>
    </header>
    </>
  );
}
