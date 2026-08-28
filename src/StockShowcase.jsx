import { useState, useEffect, useMemo, Fragment } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "./lib/supabaseClient";
import { photoUrl } from "./lib/imageResize";
import { t, translateColor, translateWarranty } from "./lib/i18n";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import { SearchIcon, FilterIcon, CartIcon, HeartIcon, BuybackIcon, ServiceIcon, CheckIcon } from "./components/icons";
import { EmptyState, LoadingState } from "./components/EmptyState";
import { addToCart, useCart } from "./lib/cart";
import { toggleWishlist, useWishlist } from "./lib/wishlist";

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
  const cart = useCart();
  const wishlist = useWishlist();

  useEffect(() => {
    (async () => {
      try {
        const { data, error: err } = await supabase.rpc("get_public_stock");
        if (err) throw err;
        setPhones(shuffle(data || []));
      } catch (err) {
        setError(err.message || "Hiba történt a készlet betöltése közben.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const brands = useMemo(() => [...new Set(phones.map((p) => p.brand))].sort((a, b) => a.localeCompare(b)), [phones]);
  function toggleBrand(b) {
    setSelectedBrands((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  }

  // Nincs külön "operációs rendszer" mező az adatbázisban — a márkából derítjük
  // (Apple = iOS, minden más márka = Android), ez a szektorban egyértelmű megfeleltetés.
  const osOf = (brand) => (brand === "Apple" ? "iOS" : "Android");
  const osOptions = useMemo(() => [...new Set(phones.map((p) => osOf(p.brand)))].sort((a) => (a === "iOS" ? -1 : 1)), [phones]);
  function toggleOS(o) {
    setSelectedOS((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));
  }

  const storages = useMemo(() => [...new Set(phones.map((p) => p.storage).filter(Boolean))]
    .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0)), [phones]);
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
  const countsByStorage = useMemo(() => { const m = {}; phones.forEach((p) => { if (p.storage) m[p.storage] = (m[p.storage] || 0) + 1; }); return m; }, [phones]);
  const countsByCondition = useMemo(() => { const m = {}; phones.forEach((p) => { m[p.condition] = (m[p.condition] || 0) + 1; }); return m; }, [phones]);

  const stockCounts = useMemo(() => {
    const counts = {};
    phones.forEach((p) => {
      const key = `${p.brand}|${p.model}|${p.storage || ""}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [phones]);

  const filtered = useMemo(() => {
    let items = phones.filter((p) => {
      if (selectedBrands.length > 0 && !selectedBrands.includes(p.brand)) return false;
      if (selectedConditions.length > 0 && !selectedConditions.includes(p.condition)) return false;
      if (selectedStorages.length > 0 && !selectedStorages.includes(p.storage)) return false;
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

  const activeFilterCount = selectedBrands.length + selectedConditions.length + selectedStorages.length + selectedOS.length;

  // A rácsba illesztett infó-kártyák (flip.ro mintájára) — valós, meglévő funkciókra mutatnak,
  // nem kitalált akciók.
  const PROMO_CARDS = [
    { variant: "dark", Icon: BuybackIcon, title: s.promoBuybackTitle, desc: s.promoBuybackDesc, cta: s.promoBuybackCta, href: "/eladom" },
    { variant: "accent", Icon: ServiceIcon, title: s.promoRepairTitle, desc: s.promoRepairDesc, cta: s.promoRepairCta, href: lang === "ro" ? "/ro/estimare" : "/becsles" },
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

      <div className="pub-results-bar">
        <div className="pub-results-count">{loading ? "…" : s.resultsCount(filtered.length)}</div>
      </div>

      <main className="pub-main">
        {error && <div className="errbar">{error}</div>}
        <div className="pub-body">
          <aside className={`pub-sidebar${filtersOpen ? " open" : ""}`}>
            <div className="pub-sidebar-head">
              <div className="pub-sidebar-title">{s.filters}</div>
              {activeFilterCount > 0 && <button type="button" className="pub-sidebar-clear" onClick={clearFilters}>{s.clearFilters}</button>}
            </div>

            <div className="pub-sidebar-group">
              <div className="pub-sidebar-label">{s.allBrands}</div>
              {brands.map((b) => (
                <button key={b} type="button" className={`pub-check-row${selectedBrands.includes(b) ? " active" : ""}`} onClick={() => toggleBrand(b)}>
                  <span className="pub-check">{selectedBrands.includes(b) && <CheckIcon width={10} height={10} strokeWidth={3} />}</span>
                  <span className="pub-check-row-label">{b}</span>
                  <span className="pub-check-row-count">{countsByBrand[b]}</span>
                </button>
              ))}
            </div>

            {osOptions.length > 1 && (
              <div className="pub-sidebar-group">
                <div className="pub-sidebar-label">{s.os}</div>
                {osOptions.map((o) => (
                  <button key={o} type="button" className={`pub-check-row${selectedOS.includes(o) ? " active" : ""}`} onClick={() => toggleOS(o)}>
                    <span className="pub-check">{selectedOS.includes(o) && <CheckIcon width={10} height={10} strokeWidth={3} />}</span>
                    <span className="pub-check-row-label">{o}</span>
                    <span className="pub-check-row-count">{countsByOS[o]}</span>
                  </button>
                ))}
              </div>
            )}

            {storages.length > 0 && (
              <div className="pub-sidebar-group">
                <div className="pub-sidebar-label">{s.storageLabel}</div>
                {storages.map((st) => (
                  <button key={st} type="button" className={`pub-check-row${selectedStorages.includes(st) ? " active" : ""}`} onClick={() => toggleStorage(st)}>
                    <span className="pub-check">{selectedStorages.includes(st) && <CheckIcon width={10} height={10} strokeWidth={3} />}</span>
                    <span className="pub-check-row-label">{st}</span>
                    <span className="pub-check-row-count">{countsByStorage[st]}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="pub-sidebar-group">
              <div className="pub-sidebar-label">{s.allConditions}</div>
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
            </div>
          </aside>

          <div className="pub-results">
            <div className="pub-results-top">
              <div />
              <select className="pub-sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recommended">{s.sortRecommended}</option>
                <option value="price-asc">{s.sortPriceAsc}</option>
                <option value="price-desc">{s.sortPriceDesc}</option>
                <option value="brand">{s.sortBrand}</option>
              </select>
            </div>

            {loading ? (
              <LoadingState />
            ) : filtered.length === 0 ? (
              <EmptyState icon={SearchIcon}>{s.noResults}</EmptyState>
            ) : (
              <div className="pub-grid">
                {filtered.map((p, i) => {
                  const isLastOne = stockCounts[`${p.brand}|${p.model}|${p.storage || ""}`] === 1;
                  const hasAnchor = p.new_price && Number(p.new_price) > Number(p.sale_price);
                  const href = lang === "ro" ? `/ro/telefon/${p.id}` : `/telefon/${p.id}`;
                  const inWishlist = wishlist.includes(p.id);
                  const showPromo = (i + 1) % 8 === 0;
                  const promo = showPromo ? PROMO_CARDS[(Math.floor((i + 1) / 8) - 1) % PROMO_CARDS.length] : null;
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
                        <div className="pub-card-top">
                          <span className={`pub-cond-pill ${p.condition === "New" ? "new" : "refurb"}`}>{p.condition === "New" ? s.conditionNew : s.conditionRefurb}</span>
                          {isLastOne && <span className="pub-scarcity-pill">{s.scarcity}</span>}
                        </div>
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
                        <div className="pub-card-name">{p.brand} {p.model}</div>
                        <div className="pub-card-specs">
                          {p.storage && <span>{p.storage}</span>}
                          {p.color && <span>{translateColor(p.color, lang)}</span>}
                        </div>
                        {p.battery_health != null && (
                          <div className="pub-battery-row">
                            <div className="pub-battery-track"><div className="pub-battery-fill" style={{ width: `${p.battery_health}%` }} /></div>
                            <span className="pub-battery-label mono">{p.battery_health}%</span>
                          </div>
                        )}
                        {p.warranty && (
                          <div className="pub-warranty-tag">
                            <svg viewBox="0 0 24 24" style={{ width: 11, height: 11, stroke: "var(--pub-ink-soft)", fill: "none", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }}><path d="M12 3l7 2.5v5.8c0 4.2-2.9 7.6-7 8.7-4.1-1.1-7-4.5-7-8.7V5.5L12 3z" /></svg>
                            {s.warrantyTag(translateWarranty(p.warranty, lang))}
                          </div>
                        )}
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
                            <a className="pub-ask-btn pub-ask-btn-added" href="/kosar" onClick={(e) => e.stopPropagation()}><CartIcon width={13} height={13} />Kosárban</a>
                          ) : (
                            <button type="button" className="pub-ask-btn" onClick={(e) => {
                              e.stopPropagation();
                              addToCart({ id: p.id, brand: p.brand, model: p.model, storage: p.storage, color: p.color, salePrice: p.sale_price, photoPath: p.photo_paths?.[0] || null, locationId: p.location_id, locationName: p.location_name });
                            }}><CartIcon width={13} height={13} />Kosárba</button>
                          )}
                        </div>
                      </div>
                      {promo && (
                        <a className={`pub-promo-card ${promo.variant}`} href={promo.href}>
                          <div>
                            <promo.Icon width={22} height={22} />
                            <div className="pub-promo-title">{promo.title}</div>
                            <div className="pub-promo-desc">{promo.desc}</div>
                          </div>
                          <span className="pub-promo-cta">{promo.cta}</span>
                        </a>
                      )}
                    </Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <PublicFooter lang={lang} />
    </div>
  );
}
