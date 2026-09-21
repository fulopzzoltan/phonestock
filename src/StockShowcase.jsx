import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "./lib/supabaseClient";
import { photoUrl } from "./lib/imageResize";
import { t, translateColor, colorSwatch } from "./lib/i18n";
import { normalizeStorage, normalizeBrand, displayName, conditionGradeLabel } from "./lib/utils";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import { SearchIcon, FilterIcon, FilterLinesIcon, SortIcon, HeartIcon, CompassIcon, CheckIcon, ChevronDownIcon, WarrantyIcon, ReturnIcon, FoliaIcon, TransferIcon, BuybackIcon } from "./components/icons";
import { EmptyState, LoadingState } from "./components/EmptyState";
import { addToCart, useCart } from "./lib/cart";
import { toggleWishlist, useWishlist } from "./lib/wishlist";
import ReviewsSection, { ReviewsBadge, usePublicReviews } from "./components/PublicReviews";

const SITE = "https://phonestock-manager.netlify.app";

const deviceSvg = (
  <svg viewBox="0 0 40 64" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="2" y="2" width="36" height="60" rx="7" />
    <line x1="15" y1="56" x2="25" y2="56" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

// A publikus RPC nem ad vissza dátumot (nincs "legújabb" mező), és nem is akarjuk mindig
// ugyanazt a pár telefont az élen tartani ár szerint — ezért alapból egyszer, betöltéskor
// megkeverjük a listát, ez marad a "recommended" (alapértelmezett) sorrend a session alatt.
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const BRAND_COLLAPSE_LIMIT = 6;

function SidebarGroup({ label, open, onToggle, children }) {
  return (
    <div className="pub-sidebar-group">
      <button type="button" className="pub-sidebar-grouphead" onClick={onToggle}>
        <span className="pub-sidebar-label" style={{ marginBottom: 0 }}>{label}</span>
        <ChevronDownIcon style={{ transform: open ? "none" : "rotate(-90deg)", transition: "transform .15s", flexShrink: 0 }} />
      </button>
      {open && <div className="pub-sidebar-groupbody">{children}</div>}
    </div>
  );
}

export default function StockShowcase({ lang = "hu" }) {
  const s = t(lang);
  const [phones, setPhones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [selectedStorages, setSelectedStorages] = useState([]);
  const [selectedOS, setSelectedOS] = useState([]);
  const [sort, setSort] = useState("recommended");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({ brand: true, os: false, storage: false, condition: false });
  const [brandsExpanded, setBrandsExpanded] = useState(false);
  const cart = useCart();
  const wishlist = useWishlist();
  const { avg: reviewsAvg, count: reviewsCount } = usePublicReviews();

  // A Telefon Kalauz kártya iránytűje az egér felé fordul — amint mozdul az egér,
  // leáll a saját (rögzített) lengő animációja és a kurzor irányát mutatja.
  const compassNeedleRef = useRef(null);
  useEffect(() => {
    let raf = null;
    function onMove(e) {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const node = compassNeedleRef.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) + 90;
        node.style.animation = "none";
        node.style.transform = `rotate(${angle}deg)`;
      });
    }
    window.addEventListener("mousemove", onMove);
    return () => { window.removeEventListener("mousemove", onMove); if (raf) cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data, error: err } = await supabase.rpc("get_public_stock");
        if (err) throw err;
        setPhones(shuffle((data || []).map((p) => ({ ...p, brand: normalizeBrand(p.brand) }))));
      } catch (err) {
        setError(err.message || "Hiba történt a készlet betöltése közben.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Nincs külön "operációs rendszer" mező az adatbázisban — a márkából derítjük
  // (Apple = iOS, minden más márka = Android), ez a szektorban egyértelmű megfeleltetés.
  const osOf = (brand) => (brand === "Apple" ? "iOS" : "Android");
  function toggleOS(o) {
    setSelectedOS((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));
  }
  function toggleBrand(b) {
    setSelectedBrands((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  }
  function toggleStorage(st) {
    setSelectedStorages((prev) => (prev.includes(st) ? prev.filter((x) => x !== st) : [...prev, st]));
  }
  function toggleCondition(c) {
    setSelectedConditions((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function clearFilters() {
    setSelectedBrands([]);
    setSelectedConditions([]);
    setSelectedStorages([]);
    setSelectedOS([]);
  }

  // Szűrő-melléksáv opciónkénti darabszáma — a teljes (aktuális szűréstől független) készletből,
  // hogy a lista ne "ugráljon" minden kattintásnál, csak tájékoztat, mennyi van összesen.
  const countsByBrand = useMemo(() => { const m = {}; phones.forEach((p) => { m[p.brand] = (m[p.brand] || 0) + 1; }); return m; }, [phones]);
  const countsByOS = useMemo(() => { const m = {}; phones.forEach((p) => { const o = osOf(p.brand); m[o] = (m[o] || 0) + 1; }); return m; }, [phones]);
  const countsByStorage = useMemo(() => { const m = {}; phones.forEach((p) => { const st = normalizeStorage(p.storage); if (st) m[st] = (m[st] || 0) + 1; }); return m; }, [phones]);
  const countsByCondition = useMemo(() => { const m = {}; phones.forEach((p) => { m[p.condition] = (m[p.condition] || 0) + 1; }); return m; }, [phones]);

  // A legtöbb készleten lévő márka elöl — a ritkábbak "Több márka" mögé kerülnek, hogy a
  // szűrő ne legyen elsőre egy 10+ soros lista.
  const brands = useMemo(() => [...new Set(phones.map((p) => p.brand))]
    .sort((a, b) => (countsByBrand[b] || 0) - (countsByBrand[a] || 0) || a.localeCompare(b)), [phones, countsByBrand]);
  const visibleBrands = brandsExpanded ? brands : brands.slice(0, BRAND_COLLAPSE_LIMIT);

  const osOptions = useMemo(() => [...new Set(phones.map((p) => osOf(p.brand)))].sort((a) => (a === "iOS" ? -1 : 1)), [phones]);

  const storages = useMemo(() => [...new Set(phones.map((p) => normalizeStorage(p.storage)).filter(Boolean))]
    .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0)), [phones]);

  function toggleGroup(key) {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const filtered = useMemo(() => {
    let items = phones.filter((p) => {
      if (selectedBrands.length > 0 && !selectedBrands.includes(p.brand)) return false;
      if (selectedConditions.length > 0 && !selectedConditions.includes(p.condition)) return false;
      if (selectedStorages.length > 0 && !selectedStorages.includes(normalizeStorage(p.storage))) return false;
      if (selectedOS.length > 0 && !selectedOS.includes(osOf(p.brand))) return false;
      if (q.trim() && !`${p.brand} ${p.model} ${p.color || ""}`.toLowerCase().includes(q.trim().toLowerCase())) return false;
      return true;
    });
    if (sort === "recommended") return items;
    items = [...items].sort((a, b) => {
      if (sort === "price-asc") return (Number(a.sale_price) || 0) - (Number(b.sale_price) || 0);
      if (sort === "price-desc") return (Number(b.sale_price) || 0) - (Number(a.sale_price) || 0);
      return a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model);
    });
    return items;
  }, [phones, selectedBrands, selectedConditions, selectedStorages, selectedOS, q, sort]);

  const BASE_PAGE_SIZE = 30;
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [selectedBrands, selectedConditions, selectedStorages, selectedOS, q, sort]);
  const resultsTopRef = useRef(null);

  // Az oszlopszámot a rács tényleges (reszponzív) szélességéből számoljuk ki —
  // ugyanaz a képlet, mint a .pub-grid CSS repeat(auto-fill,minmax(192px,1fr)) szabálya —
  // hogy az oldalméret mindig teljes sorral záruljon, sose maradjon árva, félig üres sor.
  const [columns, setColumns] = useState(5);
  useEffect(() => {
    const el = resultsTopRef.current;
    if (!el) return;
    const GAP = 14, MIN_COL = 192;
    const compute = () => setColumns(Math.max(1, Math.floor((el.clientWidth + GAP) / (MIN_COL + GAP))));
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // A reklámkártya 6 telefononként ismétlődik, ezért egy oldal csak akkor zárul
  // mindig teljes sorral (reklámkártyástól is), ha az oldalméret a 6×oszlopszám
  // többszöröse — így minden oldalon pontosan `columns` db reklámkártya kerül be,
  // és a (telefon + reklám) cellák összesen is kiadnak egész sorokat.
  const PAGE_SIZE = 6 * columns * Math.ceil(BASE_PAGE_SIZE / (6 * columns));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  function goToPage(p) {
    setPage(p);
    resultsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const activeFilterCount = selectedBrands.length + selectedConditions.length + selectedStorages.length + selectedOS.length;
  const SORT_OPTIONS = [
    { value: "recommended", label: s.sortRecommended },
    { value: "price-asc", label: s.sortPriceAsc },
    { value: "price-desc", label: s.sortPriceDesc },
    { value: "brand", label: s.sortBrand },
  ];

  // A rácsba illesztett bizalomépítő kártyák — egyik sem visz el a telefonok közül,
  // a cél nem konverzió-elterelés, hanem bizalomépítés böngészés közben.
  const CORE_BENEFITS = [
    { Icon: WarrantyIcon, label: s.trustWarrantyTitle },
    { Icon: ReturnIcon, label: s.trustReturnTitle },
    { Icon: CheckIcon, label: s.trustTestedTitle },
  ];
  // Ez a 3 pont az, amiben más telefonos boltokhoz képest ténylegesen mást adunk —
  // nem az általános bizalmi ígéretek (garancia, visszaküldés), hanem konkrét, senki más
  // által nem hangoztatott extrák. Külön kártyaként fut a CORE_BENEFITS mellett a rácsban.
  const DIFFERENTIATOR_BENEFITS = [
    { Icon: FoliaIcon, label: s.trustFoliaTitle },
    { Icon: TransferIcon, label: s.trustDataMoveTitle },
    { Icon: BuybackIcon, label: s.trustTradeinDataTitle },
  ];
  // `image` opcionális, csak kódból tölthető ki (pl. "/promo/setup.png" a public/promo mappából
  // vagy egy importált asset) — nem kell hozzá admin-felület, üresen hagyva a kártya kép nélkül,
  // a jelenlegi szöveges elrendezéssel jelenik meg.
  const PROMO_CARDS = [
    { variant: "finder" },
    { variant: "benefits-green", benefits: CORE_BENEFITS, image: null },
    { variant: "benefits-dark", benefits: DIFFERENTIATOR_BENEFITS, image: null },
    { variant: "benefits-light", benefits: CORE_BENEFITS, image: null },
    { variant: "try", title: s.trustTryTitle, desc: s.trustTryDesc, tag: s.trustTryTag, image: null },
    { variant: "service", title: s.trustServiceTitle, desc: s.trustServiceDesc, tag: s.trustServiceTag, image: null },
  ];

  const canonical = lang === "ro" ? `${SITE}/ro/telefoane` : `${SITE}/keszlet`;
  const title = lang === "ro" ? "Telefoane second-hand și noi — Telefonos" : "Használt és új telefonok — Telefonos";
  const description = lang === "ro"
    ? "Telefoane recondiționate și noi, verificate, cu garanție, în Ghimeș și Sfântu Gheorghe."
    : "Felújított és új telefonok, garanciával, Gyimesben és Szentgyörgyön.";

  return (
    <div className="pub-shop">
      <Helmet>
        <html lang={lang} />
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <link rel="alternate" hrefLang="hu" href={`${SITE}/keszlet`} />
        <link rel="alternate" hrefLang="ro" href={`${SITE}/ro/telefoane`} />
        <link rel="alternate" hrefLang="x-default" href={`${SITE}/keszlet`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org", "@type": "ElectronicsStore",
          name: "Telefonos", priceRange: "$$", telephone: "+40773985278",
          inLanguage: lang,
          // Cím/nyitvatartás: valós adat kell ide (TASKS_SEO_GEO.md 6. pont) — placeholder, amíg meg nem adod.
          address: [
            { "@type": "PostalAddress", addressLocality: "Ghimeș", addressRegion: "Harghita", addressCountry: "RO" },
            { "@type": "PostalAddress", addressLocality: "Sfântu Gheorghe", addressRegion: "Covasna", addressCountry: "RO" },
          ],
          ...(reviewsCount > 0 ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: reviewsAvg.toFixed(1), bestRating: 5, worstRating: 1, ratingCount: reviewsCount,
            },
          } : {}),
        })}</script>
      </Helmet>
      <PublicHeader activeNav="stock" lang={lang}>
        <div className="pub-search-row">
          <div className="pub-search-box">
            <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, stroke: "var(--pub-ink-soft)", fill: "none", strokeWidth: 2 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input placeholder={s.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button type="button" className="pub-filters-toggle" onClick={() => setFiltersOpen((v) => !v)}>
            <FilterIcon width={15} height={15} />
            {s.filters}
            {activeFilterCount > 0 && <span className="pub-filters-count">{activeFilterCount}</span>}
          </button>
        </div>
      </PublicHeader>

      <main className="pub-main">
        {error && <div className="errbar">{error}</div>}
        <div className="pub-mobile-filterbar">
          <div className="pub-mfb-third">
            <button type="button" className="pub-mfb-plain" onClick={() => setSortSheetOpen(true)}>
              <SortIcon width={13} height={13} />
              <span className="pub-mfb-plain-label">{s.sortLabel}</span>
            </button>
          </div>
          <span className="pub-mfb-divider" />
          <div className="pub-mfb-third">
            <a className="pub-mfb-finder" href={lang === "ro" ? "/ro/asistent" : "/segito"} aria-label={s.finderNavTitle} title={s.finderNavTitle}>
              <CompassIcon width={14} height={14} />
              <span className="pub-mfb-plain-label">{s.finderShort}</span>
            </a>
          </div>
          <span className="pub-mfb-divider" />
          <div className="pub-mfb-third">
            <button type="button" className="pub-mfb-plain pub-filters-toggle" onClick={() => setFiltersOpen((v) => !v)}>
              <FilterLinesIcon width={15} height={15} />
              <span className="pub-mfb-plain-label">{s.filters}</span>
              {activeFilterCount > 0 && <span className="pub-filters-count">{activeFilterCount}</span>}
            </button>
          </div>
        </div>
        <div className="pub-body">
          {filtersOpen && <div className="pub-sheet-backdrop" onClick={() => setFiltersOpen(false)} />}
          <aside className={`pub-sidebar${filtersOpen ? " open" : ""}`}>
            <div className="pub-sheet-handle" />
            <div className="pub-sheet-mobile-head">
              <span>{s.filters}</span>
              <button type="button" className="pub-sheet-close" onClick={() => setFiltersOpen(false)} aria-label="Bezárás">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="pub-sidebar-card pub-sidebar-card-sort">
              <div className="pub-sort-field">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="recommended">{s.sortRecommended}</option>
                  <option value="price-asc">{s.sortPriceAsc}</option>
                  <option value="price-desc">{s.sortPriceDesc}</option>
                  <option value="brand">{s.sortBrand}</option>
                </select>
                <ChevronDownIcon />
              </div>
            </div>

            <div className="pub-sidebar-card">
            <div className="pub-sidebar-head">
              <div className="pub-sidebar-title">{s.filters}</div>
              {activeFilterCount > 0 && <button type="button" className="pub-sidebar-clear" onClick={clearFilters}>{s.clearFilters}</button>}
            </div>

            <SidebarGroup label={s.allBrands} open={openGroups.brand} onToggle={() => toggleGroup("brand")}>
              {visibleBrands.map((b) => (
                <button key={b} type="button" className={`pub-check-row${selectedBrands.includes(b) ? " active" : ""}`} onClick={() => toggleBrand(b)}>
                  <span className="pub-check">{selectedBrands.includes(b) && <CheckIcon width={10} height={10} strokeWidth={3} />}</span>
                  <span className="pub-check-row-label">{b === "Apple" ? "iPhone" : b}</span>
                  <span className="pub-check-row-count">{countsByBrand[b]}</span>
                </button>
              ))}
              {brands.length > BRAND_COLLAPSE_LIMIT && (
                <button type="button" className="pub-sidebar-more" onClick={() => setBrandsExpanded((v) => !v)}>
                  {brandsExpanded ? s.showFewerBrands : s.showMoreBrands(brands.length - BRAND_COLLAPSE_LIMIT)}
                </button>
              )}
            </SidebarGroup>

            {osOptions.length > 1 && (
              <SidebarGroup label={s.os} open={openGroups.os} onToggle={() => toggleGroup("os")}>
                {osOptions.map((o) => (
                  <button key={o} type="button" className={`pub-check-row${selectedOS.includes(o) ? " active" : ""}`} onClick={() => toggleOS(o)}>
                    <span className="pub-check">{selectedOS.includes(o) && <CheckIcon width={10} height={10} strokeWidth={3} />}</span>
                    <span className="pub-check-row-label">{o}</span>
                    <span className="pub-check-row-count">{countsByOS[o]}</span>
                  </button>
                ))}
              </SidebarGroup>
            )}

            {storages.length > 0 && (
              <SidebarGroup label={s.storageLabel} open={openGroups.storage} onToggle={() => toggleGroup("storage")}>
                {storages.map((st) => (
                  <button key={st} type="button" className={`pub-check-row${selectedStorages.includes(st) ? " active" : ""}`} onClick={() => toggleStorage(st)}>
                    <span className="pub-check">{selectedStorages.includes(st) && <CheckIcon width={10} height={10} strokeWidth={3} />}</span>
                    <span className="pub-check-row-label">{st}</span>
                    <span className="pub-check-row-count">{countsByStorage[st]}</span>
                  </button>
                ))}
              </SidebarGroup>
            )}

            <SidebarGroup label={s.allConditions} open={openGroups.condition} onToggle={() => toggleGroup("condition")}>
              <button type="button" className={`pub-check-row${selectedConditions.includes("New") ? " active" : ""}`} onClick={() => toggleCondition("New")}>
                <span className="pub-check">{selectedConditions.includes("New") && <CheckIcon width={10} height={10} strokeWidth={3} />}</span>
                <span className="pub-check-row-label">{s.conditionNew}</span>
                <span className="pub-check-row-count">{countsByCondition.New || 0}</span>
              </button>
              <button type="button" className={`pub-check-row${selectedConditions.includes("Refurbished") ? " active" : ""}`} onClick={() => toggleCondition("Refurbished")}>
                <span className="pub-check">{selectedConditions.includes("Refurbished") && <CheckIcon width={10} height={10} strokeWidth={3} />}</span>
                <span className="pub-check-row-label">{s.conditionRefurb}</span>
                <span className="pub-check-row-count">{countsByCondition.Refurbished || 0}</span>
              </button>
            </SidebarGroup>
            </div>

            <div className="pub-sidebar-card">
              <ReviewsBadge lang={lang} stacked />
            </div>

            <div className="pub-sheet-footer">
              <button type="button" className="pub-sheet-footer-clear" onClick={clearFilters} disabled={activeFilterCount === 0}>{s.clearFilters}</button>
              <button type="button" className="pub-sheet-footer-done" onClick={() => setFiltersOpen(false)}>{s.filtersDone}</button>
            </div>
          </aside>

          <div className="pub-results" ref={resultsTopRef}>
            {loading ? (
              <LoadingState />
            ) : filtered.length === 0 ? (
              <EmptyState icon={SearchIcon}>{s.noResults}</EmptyState>
            ) : (
              <div className="pub-grid">
                {pagedItems.map((p, i) => {
                  const hasAnchor = p.new_price && Number(p.new_price) > Number(p.sale_price);
                  const href = lang === "ro" ? `/ro/telefon/${p.id}` : `/telefon/${p.id}`;
                  const inWishlist = wishlist.includes(p.id);
                  // Az első reklámkártya a 3. termék után jön, utána 6 termékenként ismétlődik
                  // (3., 9., 15. termék után stb.) — a teljes (lapozás előtti) listaindex alapján,
                  // hogy az ütem oldalváltás után is folytatódjon.
                  const absoluteIndex = (page - 1) * PAGE_SIZE + i;
                  const showPromo = absoluteIndex >= 2 && (absoluteIndex - 2) % 6 === 0;
                  const promo = showPromo ? PROMO_CARDS[Math.floor((absoluteIndex - 2) / 6) % PROMO_CARDS.length] : null;
                  return (
                    <Fragment key={p.id}>
                      <div className="pub-card" role="link" tabIndex={0}
                        onClick={() => { window.location.href = href; }}
                        onKeyDown={(e) => { if (e.key === "Enter") window.location.href = href; }}
                      >
                        <button
                          type="button"
                          className={`pub-wishlist-btn${inWishlist ? " active" : ""}`}
                          aria-label={s.wishlistToggle}
                          onClick={(e) => { e.stopPropagation(); toggleWishlist(p.id); }}
                        >
                          <HeartIcon width={14} height={14} />
                        </button>
                        {p.condition === "New" && (
                          <span className="pub-new-btn">{s.conditionNew}</span>
                        )}
                        <div className="pub-device-art">
                          {p.photo_paths && p.photo_paths.length > 0 ? (
                            <img
                              src={photoUrl(p.photo_paths[0], "thumb")}
                              alt={`${p.brand} ${p.model}`}
                              className="pub-device-photo"
                              loading="lazy"
                              decoding="async"
                              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = photoUrl(p.photo_paths[0], "full"); }}
                            />
                          ) : deviceSvg}
                        </div>
                        <div className="pub-card-name-row">
                          <span className="pub-card-name">{displayName(p.brand, p.model)}</span>
                        </div>
                        <div className="pub-card-swatch-row">
                          {p.color && <span className="pub-card-swatch" style={{ background: colorSwatch(p.color) }} title={translateColor(p.color, lang)} />}
                          <span className="pub-card-storage-text pub-card-grade">{conditionGradeLabel(p.condition, p.grade)}</span>
                          {p.storage && <span className="pub-card-storage-text">· {normalizeStorage(p.storage)}</span>}
                          {/iphone|apple/i.test(p.brand) && p.battery_health ? (
                            <span className="pub-card-storage-text">· {p.battery_health}%</span>
                          ) : (!/iphone|apple/i.test(p.brand) && p.ram ? (
                            <span className="pub-card-storage-text">· {normalizeStorage(p.ram)} RAM</span>
                          ) : null)}
                        </div>
                        <div className="pub-card-foot">
                          <div>
                            {hasAnchor && (
                              <div className="pub-anchor">
                                <span className="pub-anchor-old">{Number(p.new_price).toLocaleString("hu-HU")} Lei</span>
                                <span className="pub-anchor-save">{s.saveLabel(Math.round(p.new_price - p.sale_price).toLocaleString("hu-HU"))}</span>
                              </div>
                            )}
                            <div className="pub-price mono">{Number(p.sale_price).toLocaleString("hu-HU")}<span className="pub-cur">Lei</span></div>
                          </div>
                          {cart.some((c) => c.id === p.id) ? (
                            <a className="pub-ask-btn pub-ask-btn-added" href="/kosar" aria-label="Kosárban" onClick={(e) => e.stopPropagation()}>Kosárban</a>
                          ) : (
                            <button type="button" className="pub-ask-btn" aria-label="Kosárba" onClick={(e) => {
                              e.stopPropagation();
                              addToCart({ id: p.id, brand: p.brand, model: p.model, storage: normalizeStorage(p.storage), color: p.color, salePrice: p.sale_price, photoPath: p.photo_paths?.[0] || null, locationId: p.location_id, locationName: p.location_name });
                            }}>Kosárba</button>
                          )}
                        </div>
                      </div>
                      {promo && (promo.variant === "finder" ? (
                        <a className="pub-promo-card finder" href={lang === "ro" ? "/ro/asistent" : "/segito"}>
                          <span className="pub-promo-eyebrow">{s.finderBrandName}</span>
                          <div className="pub-promo-finder-body">
                            <div className="pub-promo-title">{s.finderNavTitle}</div>
                            <div className="pub-finder-compass">
                              <span className="pub-finder-compass-ring" />
                              <span className="pub-finder-compass-ring pub-finder-compass-ring-2" />
                              <div className="pub-finder-compass-badge">
                                <span ref={compassNeedleRef} className="pub-finder-compass-needle">
                                  <CompassIcon width={44} height={44} />
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className="pub-promo-finder-cta">{s.finderNavCta}</span>
                        </a>
                      ) : promo.variant.startsWith("benefits") ? (
                        <div className={`pub-promo-card ${promo.variant}`}>
                          <div className="pub-promo-benefits-rows">
                            {(promo.benefits || CORE_BENEFITS).map((b, i) => (
                              <div className="pub-promo-benefits-row" key={i}>
                                <span className="pub-promo-benefits-ic"><b.Icon width={17} height={17} /></span>
                                <span className="pub-promo-benefits-label">{b.label}</span>
                              </div>
                            ))}
                          </div>
                          {promo.image && <img className="pub-promo-img" src={promo.image} alt="" />}
                        </div>
                      ) : (
                        <div className={`pub-promo-card ${promo.variant}`}>
                          <span className="pub-promo-eyebrow">{promo.tag}</span>
                          <div className="pub-promo-title">{promo.title}</div>
                          <div className="pub-promo-desc">{promo.desc}</div>
                          {promo.image && <img className="pub-promo-img" src={promo.image} alt="" />}
                        </div>
                      ))}
                    </Fragment>
                  );
                })}
              </div>
            )}
            {!loading && totalPages > 1 && (
              <div className="pub-pagination">
                <button type="button" className="pub-page-btn" disabled={page === 1} onClick={() => goToPage(page - 1)} aria-label="Előző oldal">‹</button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                  <button key={p} type="button" className={`pub-page-btn${p === page ? " active" : ""}`} onClick={() => goToPage(p)}>{p}</button>
                ))}
                <button type="button" className="pub-page-btn" disabled={page === totalPages} onClick={() => goToPage(page + 1)} aria-label="Következő oldal">›</button>
              </div>
            )}
          </div>
        </div>
      </main>

      {sortSheetOpen && (
        <>
          <div className="pub-sheet-backdrop" onClick={() => setSortSheetOpen(false)} />
          <div className="pub-sort-sheet">
            <div className="pub-sheet-handle" />
            <div className="pub-sheet-mobile-head">
              <span>{s.sortLabel}</span>
              <button type="button" className="pub-sheet-close" onClick={() => setSortSheetOpen(false)} aria-label="Bezárás">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                className="pub-sort-sheet-row"
                onClick={() => { setSort(o.value); setSortSheetOpen(false); }}
              >
                <span>{o.label}</span>
                <span className={`pub-sort-sheet-radio${sort === o.value ? " active" : ""}`} />
              </button>
            ))}
          </div>
        </>
      )}

      <ReviewsSection lang={lang} />

      <PublicFooter lang={lang} />
    </div>
  );
}
