import { useState, useEffect, useRef } from "react";
import { t } from "../lib/i18n";
import { UserIcon, PhoneCaseIcon, ServiceIcon, ClockIcon, BuybackIcon, CartIcon, SearchIcon, HeartIcon, CloseIcon, ChevronRightIcon, PinIcon } from "./icons";
import { useCart } from "../lib/cart";
import { useWishlist } from "../lib/wishlist";
import { markLangChosen } from "../lib/langPref";

// Menü fölötti rotáló ajánlat-sáv — ez az első szöveg, amit minden látogató elolvas,
// még a hero előtt, ezért csak valós, ellenőrizhető állításokat tartalmaz.
const ANNOUNCEMENTS = [
  {
    hu: "Akár +10% kredit, ha beszámítod a régi telefonod",
    ro: "Până la +10% credit dacă predai telefonul vechi",
    href: { hu: "/eladom", ro: "/eladom" },
    cta: { hu: "Beszámítás", ro: "Vezi oferta" },
    id: "beszamitas",
  },
  {
    hu: "Minden használt telefonunkra garanciát adunk",
    ro: "Oferim garanție la toate telefoanele folosite",
    href: { hu: "/", ro: "/ro/telefoane" },
    cta: { hu: "Kínálat", ro: "Vezi telefoanele" },
    id: "garancia",
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

export default function PublicHeader({ children, activeNav = "stock", lang = "hu", langSwitchHref, minimal = false }) {
  const s = t(lang);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const cartCount = useCart().length;
  const wishlistCount = useWishlist().length;
  const [announceIdx, setAnnounceIdx] = useState(0);
  const [announcePaused, setAnnouncePaused] = useState(false);
  useEffect(() => {
    if (minimal || announcePaused) return;
    const id = setInterval(() => setAnnounceIdx((i) => (i + 1) % ANNOUNCEMENTS.length), 5000);
    return () => clearInterval(id);
  }, [minimal, announcePaused]);

  // Görgetés-irány szerint bújtatjuk el/mutatjuk vissza az announcement sávot — lefelé
  // görgetve eltűnik (csak a nav marad fent, sticky), felfelé görgetve azonnal visszajön,
  // nem kell egészen a lap tetejéig visszamenni érte (Gymshark-mintára).
  const [hideAnnounce, setHideAnnounce] = useState(false);
  useEffect(() => {
    if (minimal) return;
    let lastY = window.scrollY;
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y <= 4) setHideAnnounce(false);
        else if (y > lastY + 2) setHideAnnounce(true);
        else if (y < lastY - 2) setHideAnnounce(false);
        lastY = y;
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [minimal]);

  // A mobil rendezés/szűrő sáv (StockShowcase) a sticky topbar aktuális (announce-sávval
  // vagy anélküli) magasságához igazodva tud csak alá simulni — ezt egy CSS változón át
  // adjuk át neki, hogy ne kelljen a két komponens állapotát összekötni.
  const announceRef = useRef(null);
  const headerRef = useRef(null);
  useEffect(() => {
    if (minimal) return;
    const announceEl = announceRef.current;
    const headerEl = headerRef.current;
    function update() {
      const headerH = headerEl ? headerEl.offsetHeight : 0;
      const announceH = announceEl ? announceEl.offsetHeight : 0;
      const h = headerH + (hideAnnounce ? 0 : announceH);
      document.documentElement.style.setProperty("--pub-topbar-h", `${h}px`);
    }
    update();
    const ro = new ResizeObserver(update);
    if (announceEl) ro.observe(announceEl);
    if (headerEl) ro.observe(headerEl);
    return () => ro.disconnect();
  }, [minimal, hideAnnounce]);
  const stockHref = lang === "ro" ? "/ro/telefoane" : "/";
  const wishlistHref = lang === "ro" ? "/ro/favorite" : "/kedvencek";
  const repairHref = lang === "ro" ? "/ro/estimare" : "/becsles";
  const otherLang = lang === "ro" ? "hu" : "ro";
  const defaultTarget = DEFAULT_LANG_TARGETS[activeNav] || FALLBACK_LANG_TARGET;
  const resolvedLangHref = langSwitchHref || defaultTarget[otherLang];
  const faqHref = lang === "ro" ? "/ro/intrebari-frecvente" : "/gyik";

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

  // "Minimal" fejléc — a csak-nyomonkövetés origin-en minden más menüpont (webshop, kosár,
  // fiók, ajánlat-sáv) úgyis sehova sem vezetne, mert az egyetlen elérhető funkció ez az oldal.
  // A nyelvváltó viszont marad — a szöveg egyelőre magyar, de legalább a keret követi.
  if (minimal) {
    return (
      <header className="pub-header pub-header-standalone">
        <div className="pub-header-inner">
          <div className="pub-brand-row pub-brand-row-minimal" style={{ alignItems: "center" }}>
            <div className="pub-wordmark" aria-label="Telefonos">
              <img src="/logo.png" alt="Telefonos" className="pub-logo-img" />
            </div>
            {langSwitch}
          </div>
          <div className={`pub-header-children${mobileSearchOpen ? " open" : ""}`}>{children}</div>
        </div>
      </header>
    );
  }

  return (
    <>
    <div className="pub-topbar">
      <div className={`pub-announce-bar${hideAnnounce ? " hidden" : ""}`} ref={announceRef}>
        <div className="pub-announce-inner">
          {ANNOUNCEMENTS.map((a, i) => (
            <a
              key={i}
              className={`pub-announce-msg${i === announceIdx ? " active" : ""}`}
              href={lang === "ro" ? a.href.ro : a.href.hu}
              data-umami-event="announce-bar-click"
              data-umami-event-msg={a.id}
            >
              {lang === "ro" ? a.ro : a.hu}
            </a>
          ))}
          <button
            type="button"
            className="pub-announce-pause"
            aria-label={announcePaused ? "Lejátszás" : "Szüneteltetés"}
            onClick={() => setAnnouncePaused((v) => !v)}
          >
            {announcePaused ? (
              <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
            )}
          </button>
        </div>
      </div>

      <header className="pub-header" ref={headerRef}>
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
            <a className={`pub-mobile-icon${activeNav === "wishlist" ? " active" : ""}`} href={wishlistHref} aria-label={s.navWishlist} title={s.navWishlist}>
              <HeartIcon width={18} height={18} />
              {wishlistCount > 0 && <span className="pub-cart-badge">{wishlistCount}</span>}
            </a>
            <a className={`pub-mobile-icon${activeNav === "login" ? " active" : ""}`} href="/fiok" aria-label={s.navLogin} title={s.navLogin}>
              <UserIcon width={18} height={18} />
            </a>
            <a className={`pub-mobile-icon${activeNav === "cart" ? " active" : ""}`} href="/kosar" aria-label="Kosár" title="Kosár">
              <CartIcon width={19} height={19} />
              {cartCount > 0 && <span className="pub-cart-badge">{cartCount}</span>}
            </a>
          </div>
        </div>

        <div className={`pub-header-children${mobileSearchOpen ? " open" : ""}`}>{children}</div>

        <nav className="pub-row2-nav">
          <a className={`pub-nav-link${activeNav === "stock" ? " active" : ""}`} href={stockHref}>{s.navStock}</a>
          <a className={`pub-nav-link${activeNav === "buyback" ? " active" : ""}`} href="/eladom">{s.navBuyback}</a>
          <a className={`pub-nav-link${activeNav === "repair" ? " active" : ""}`} href={repairHref}>{s.navRepair}</a>
          <a className={`pub-nav-link${activeNav === "status" ? " active" : ""}`} href="/status">{s.navStatus}</a>
        </nav>

        <div className="pub-account-links">
          {children ? (
            <button
              type="button"
              className={`pub-mobile-icon${mobileSearchOpen ? " active" : ""}`}
              aria-label={s.navSearch}
              title={s.navSearch}
              aria-expanded={mobileSearchOpen}
              onClick={() => setMobileSearchOpen((v) => !v)}
            >
              <SearchIcon width={20} height={20} stroke="currentColor" />
            </button>
          ) : (
            <a className="pub-mobile-icon" href={stockHref} aria-label={s.navSearch} title={s.navSearch}>
              <SearchIcon width={20} height={20} stroke="currentColor" />
            </a>
          )}
          <a className={`pub-mobile-icon${activeNav === "wishlist" ? " active" : ""}`} href={wishlistHref} aria-label={s.navWishlist} title={s.navWishlist}>
            <HeartIcon width={20} height={20} />
            {wishlistCount > 0 && <span className="pub-cart-badge">{wishlistCount}</span>}
          </a>
          <a className={`pub-mobile-icon${activeNav === "login" ? " active" : ""}`} href="/fiok" aria-label={s.navLogin} title={s.navLogin}>
            <UserIcon width={20} height={20} />
          </a>
          <a className={`pub-mobile-icon${activeNav === "cart" ? " active" : ""}`} href="/kosar" aria-label="Kosár" title="Kosár">
            <CartIcon width={21} height={21} />
            {cartCount > 0 && <span className="pub-cart-badge">{cartCount}</span>}
          </a>
        </div>
      </div>
    </header>
    </div>

    <nav className={`pub-nav${menuOpen ? " open" : ""}`}>
      <div className="pub-mnav-top">
        <button type="button" className="pub-mnav-close" aria-label="Menü bezárása" onClick={() => setMenuOpen(false)}>
          <CloseIcon width={20} height={20} />
        </button>
        <a className="pub-mnav-wordmark" href={stockHref} aria-label="Telefonos" onClick={() => setMenuOpen(false)}>
          <img src="/logo.png" alt="Telefonos" className="pub-logo-img" />
        </a>
        <span className="pub-mnav-top-spacer" />
      </div>

      <a className="pub-mnav-search" href={stockHref} onClick={() => setMenuOpen(false)}>
        <SearchIcon width={16} height={16} stroke="var(--pub-ink-soft)" />
        <span>{s.navSearch}</span>
      </a>

      <div className="pub-mnav-body">
        <div className="pub-mnav-list">
          <a className={`pub-mnav-link${activeNav === "stock" ? " active" : ""}`} href={stockHref} onClick={() => setMenuOpen(false)}>
            <span className="pub-mnav-link-ic"><PhoneCaseIcon width={18} height={18} /></span>
            <span className="pub-mnav-link-label">{s.navStock}</span>
            <ChevronRightIcon />
          </a>
          <a className={`pub-mnav-link${activeNav === "repair" ? " active" : ""}`} href={repairHref} onClick={() => setMenuOpen(false)}>
            <span className="pub-mnav-link-ic"><ServiceIcon width={18} height={18} /></span>
            <span className="pub-mnav-link-label">{s.navRepair}</span>
            <ChevronRightIcon />
          </a>
          <a className={`pub-mnav-link${activeNav === "status" ? " active" : ""}`} href="/status" onClick={() => setMenuOpen(false)}>
            <span className="pub-mnav-link-ic"><ClockIcon width={18} height={18} /></span>
            <span className="pub-mnav-link-label">{s.navStatus}</span>
            <ChevronRightIcon />
          </a>
        </div>

        <a className="pub-mnav-promo" href="/eladom" onClick={() => setMenuOpen(false)}>
          <span className="pub-mnav-promo-ic"><BuybackIcon width={17} height={17} /></span>
          <span className="pub-mnav-promo-text">
            <span className="pub-mnav-promo-title">{s.navBuyback}</span>
            <span className="pub-mnav-promo-sub">{s.navBuybackSub}</span>
          </span>
          <ChevronRightIcon />
        </a>

        <div className="pub-mnav-divider" />

        <div className="pub-mnav-list">
          <a className={`pub-mnav-link pub-mnav-link-sm${activeNav === "cart" ? " active" : ""}`} href="/kosar" onClick={() => setMenuOpen(false)}>
            <span className="pub-mnav-link-ic">
              <CartIcon width={17} height={17} />
              {cartCount > 0 && <span className="pub-cart-badge">{cartCount}</span>}
            </span>
            <span className="pub-mnav-link-label">Kosár{cartCount > 0 ? ` (${cartCount})` : ""}</span>
            <ChevronRightIcon />
          </a>
          <a className={`pub-mnav-link pub-mnav-link-sm${activeNav === "wishlist" ? " active" : ""}`} href={wishlistHref} onClick={() => setMenuOpen(false)}>
            <span className="pub-mnav-link-ic">
              <HeartIcon width={17} height={17} />
              {wishlistCount > 0 && <span className="pub-cart-badge">{wishlistCount}</span>}
            </span>
            <span className="pub-mnav-link-label">{s.navWishlist}{wishlistCount > 0 ? ` (${wishlistCount})` : ""}</span>
            <ChevronRightIcon />
          </a>
          <a className={`pub-mnav-link pub-mnav-link-sm${activeNav === "login" ? " active" : ""}`} href="/fiok" onClick={() => setMenuOpen(false)}>
            <span className="pub-mnav-link-ic"><UserIcon width={17} height={17} /></span>
            <span className="pub-mnav-link-label">{s.navLogin}</span>
            <ChevronRightIcon />
          </a>
        </div>
      </div>

      <div className="pub-mnav-foot">
        <a href={faqHref} onClick={() => setMenuOpen(false)}>{s.footerFaq}</a>
        <div className="pub-mnav-foot-loc">
          <PinIcon width={14} height={14} />
          <span>Gyimes &amp; Szentgyörgy</span>
        </div>
      </div>
    </nav>
    </>
  );
}
