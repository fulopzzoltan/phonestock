import { useState, useEffect, useRef, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "./lib/supabaseClient";
import { photoUrl } from "./lib/imageResize";
import { t, translateColor, translateWarranty } from "./lib/i18n";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import { PhoneCaseIcon, CartIcon, HeartIcon, CheckIcon, WarrantyIcon, PinIcon } from "./components/icons";
import { EmptyState, LoadingState } from "./components/EmptyState";
import { addToCart, useCart } from "./lib/cart";
import { toggleWishlist, useWishlist } from "./lib/wishlist";
import { ReviewsBadge } from "./components/PublicReviews";

const SITE = "https://phonestock-manager.netlify.app";

const deviceSvg = (
  <svg viewBox="0 0 40 64" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="2" y="2" width="36" height="60" rx="7" />
    <line x1="15" y1="56" x2="25" y2="56" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export default function PhoneDetail({ id, lang = "hu" }) {
  const s = t(lang);
  const [allPhones, setAllPhones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const cart = useCart();
  const wishlist = useWishlist();
  const ctaSentinelRef = useRef(null);
  const hasSeenCtaRef = useRef(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_public_stock");
      setAllPhones(data || []);
      setLoading(false);
    })();
  }, [id]);

  const phone = useMemo(() => allPhones.find((p) => p.id === id) || null, [allPhones, id]);
  const related = useMemo(
    () => (phone ? allPhones.filter((p) => p.id !== phone.id && p.brand === phone.brand).slice(0, 4) : []),
    [allPhones, phone]
  );

  useEffect(() => {
    const header = document.querySelector(".pub-header");
    if (header) setHeaderHeight(header.offsetHeight);
  }, [phone]);

  // A mini sáv csak akkor jelenjen meg, ha a felhasználó már túlgörgetett a valódi
  // Kosárba gombon — mobilon a galéria a kártya adatai előtt van a DOM-ban, így a gomb
  // kezdetben "nem látszik" (lentebb van), de ez még nem jelenti, hogy túlgörgettünk rajta.
  useEffect(() => {
    hasSeenCtaRef.current = false;
    setShowStickyBar(false);
    if (!ctaSentinelRef.current) return;
    const el = ctaSentinelRef.current;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        hasSeenCtaRef.current = true;
        setShowStickyBar(false);
      } else if (hasSeenCtaRef.current) {
        setShowStickyBar(true);
      }
    }, { rootMargin: `-${headerHeight}px 0px 0px 0px` });
    obs.observe(el);
    return () => obs.disconnect();
  }, [phone?.id, headerHeight]);

  const langSwitchHref = lang === "ro" ? `/telefon/${id}` : `/ro/telefon/${id}`;

  if (loading) {
    return (
      <div className="pub-shop">
        <PublicHeader activeNav="stock" lang={lang} langSwitchHref={langSwitchHref} />
        <LoadingState />
        <PublicFooter lang={lang} />
      </div>
    );
  }
  if (!phone) {
    return (
      <div className="pub-shop">
        <PublicHeader activeNav="stock" lang={lang} langSwitchHref={langSwitchHref} />
        <EmptyState icon={PhoneCaseIcon}>{s.soldOut}<br /><a href={lang === "ro" ? "/ro/telefoane" : "/"} className="pub-ask-btn" style={{ marginTop: 12 }}>{s.backToStock}</a></EmptyState>
        <PublicFooter lang={lang} />
      </div>
    );
  }

  const photos = phone.photo_paths || [];
  const canonical = lang === "ro" ? `${SITE}/ro/telefon/${id}` : `${SITE}/telefon/${id}`;
  const title = `${phone.brand} ${phone.model}${phone.storage ? " " + phone.storage : ""}, ${Number(phone.sale_price).toLocaleString("hu-HU")} Lei | Telefonos`;
  const description = lang === "ro"
    ? `${phone.brand} ${phone.model} ${phone.condition === "New" ? "nou" : "recondiționat"}${phone.warranty ? `, garanție ${translateWarranty(phone.warranty, "ro")}` : ""} — ${Number(phone.sale_price).toLocaleString("hu-HU")} Lei.`
    : `${phone.brand} ${phone.model} ${phone.condition === "New" ? "új" : "felújított"}${phone.warranty ? `, ${phone.warranty} garanciával` : ""} — ${Number(phone.sale_price).toLocaleString("hu-HU")} Lei.`;

  return (
    <div className="pub-shop">
      <Helmet>
        <html lang={lang} />
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <link rel="alternate" hrefLang="hu" href={`${SITE}/telefon/${id}`} />
        <link rel="alternate" hrefLang="ro" href={`${SITE}/ro/telefon/${id}`} />
        <link rel="alternate" hrefLang="x-default" href={`${SITE}/telefon/${id}`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="product" />
        {photos.length > 0 && <meta property="og:image" content={photoUrl(photos[0])} />}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org", "@type": "Product",
          name: `${phone.brand} ${phone.model}`,
          image: photos.map(photoUrl),
          itemCondition: phone.condition === "New" ? "https://schema.org/NewCondition" : "https://schema.org/RefurbishedCondition",
          inLanguage: lang,
          offers: { "@type": "Offer", price: phone.sale_price, priceCurrency: "RON", availability: "https://schema.org/InStock" },
        })}</script>
      </Helmet>
      <PublicHeader activeNav="stock" lang={lang} langSwitchHref={langSwitchHref} />

      {showStickyBar && (
        <div className="pub-sticky-bar" style={{ top: headerHeight }}>
          <div className="pub-sticky-bar-inner">
            <div className="pub-sticky-thumb">
              {photos.length > 0 ? <img src={photoUrl(photos[0], "thumb")} alt="" /> : deviceSvg}
            </div>
            <div className="pub-sticky-info">
              <div className="pub-sticky-name">{phone.brand} {phone.model}{phone.storage ? ` · ${phone.storage}` : ""}</div>
              <div className="pub-sticky-cond">{phone.condition === "New" ? s.conditionNew : s.conditionRefurb}</div>
            </div>
            <div className="pub-sticky-price mono">{Number(phone.sale_price).toLocaleString("hu-HU")} <span>Lei</span></div>
            {cart.some((c) => c.id === phone.id) ? (
              <a className="pub-ask-btn pub-ask-btn-added" href="/kosar"><CartIcon width={13} height={13} />Kosárban</a>
            ) : (
              <button type="button" className="pub-ask-btn" onClick={() => addToCart({ id: phone.id, brand: phone.brand, model: phone.model, storage: phone.storage, color: phone.color, salePrice: phone.sale_price, photoPath: photos[0] || null, locationId: phone.location_id, locationName: phone.location_name })}>
                <CartIcon width={13} height={13} />Kosárba
              </button>
            )}
          </div>
        </div>
      )}

      <main className="pub-detail-main">
        <div className="pub-breadcrumb">
          <a href={lang === "ro" ? "/ro/telefoane" : "/"}>{s.navStock}</a> › <span>{phone.brand}</span> › <span className="current">{phone.model}</span>
        </div>
        <div className="pub-detail-grid">
          <div className="pub-detail-gallery">
            <div className="pub-detail-photo-main">
              {photos.length > 0 ? (
                <img
                  src={photoUrl(photos[activePhoto], "full")}
                  alt={`${phone.brand} ${phone.model}`}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              ) : <div className="pub-device-art" style={{ height: 320, width: "100%" }}>{deviceSvg}</div>}
            </div>
            {photos.length > 1 && (
              <div className="pub-detail-thumbs">
                {photos.map((ph, i) => (
                  <button key={i} type="button" className={`pub-detail-thumb${i === activePhoto ? " active" : ""}`} onClick={() => setActivePhoto(i)}>
                    <img
                      src={photoUrl(ph, "thumb")}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = photoUrl(ph, "full"); }}
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="pub-detail-box">
              <div className="pub-detail-box-title">{phone.condition === "New" ? s.detailConditionNewTitle : s.detailConditionRefurbTitle}</div>
              <div className="pub-detail-box-text">{phone.condition === "New" ? s.detailConditionNewDesc : s.detailConditionRefurbDesc}</div>
            </div>

            <div className="pub-detail-box">
              <div className="pub-sidebar-label" style={{ marginBottom: 14 }}>{s.detailSpecsTitle}</div>
              <div className="pub-detail-specs-grid">
                {phone.storage && (
                  <div className="pub-detail-spec-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17"><rect x="7" y="2" width="10" height="20" rx="2" /><line x1="11" y1="18" x2="13" y2="18" /></svg>
                    <div><div className="pub-detail-spec-label">{s.storageLabel}</div><div className="pub-detail-spec-value">{phone.storage}</div></div>
                  </div>
                )}
                {phone.color && (
                  <div className="pub-detail-spec-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17"><circle cx="12" cy="12" r="9" /></svg>
                    <div><div className="pub-detail-spec-label">{s.colorLabel}</div><div className="pub-detail-spec-value">{translateColor(phone.color, lang)}</div></div>
                  </div>
                )}
                {phone.battery_health != null && (
                  <div className="pub-detail-spec-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17"><rect x="1" y="7" width="18" height="10" rx="2" /><line x1="21" y1="10" x2="21" y2="14" /></svg>
                    <div><div className="pub-detail-spec-label">{s.batteryLabel}</div><div className="pub-detail-spec-value">{phone.battery_health}%</div></div>
                  </div>
                )}
                {phone.warranty && (
                  <div className="pub-detail-spec-item">
                    <WarrantyIcon width={17} height={17} />
                    <div><div className="pub-detail-spec-label">{s.warrantyLabel}</div><div className="pub-detail-spec-value">{translateWarranty(phone.warranty, lang)}</div></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pub-detail-info">
            <span className={`pub-cond-pill ${phone.condition === "New" ? "new" : "refurb"}`}>{phone.condition === "New" ? s.conditionNew : s.conditionRefurb}</span>
            <h1 className="pub-detail-title">{phone.brand} {phone.model}</h1>

            <ReviewsBadge lang={lang} style={{ marginBottom: 16 }} />

            {phone.new_price && Number(phone.new_price) > Number(phone.sale_price) && (
              <div className="pub-anchor" style={{ fontSize: 14 }}>
                <span className="pub-anchor-old">{Number(phone.new_price).toLocaleString("hu-HU")} Lei</span>
                <span className="pub-anchor-save">{s.saveLabel(Math.round(phone.new_price - phone.sale_price).toLocaleString("hu-HU"))}</span>
              </div>
            )}
            <div className="pub-detail-price mono">{Number(phone.sale_price).toLocaleString("hu-HU")}<span className="pub-cur">Lei</span></div>

            <div className="pub-detail-cta-row">
              {cart.some((c) => c.id === phone.id) ? (
                <a className="pub-ask-btn pub-ask-btn-added" style={{ padding: "13px 22px", fontSize: 14 }} href="/kosar"><CartIcon width={15} height={15} />Kosárban — tovább a kosárhoz</a>
              ) : (
                <button type="button" className="pub-ask-btn" style={{ padding: "13px 22px", fontSize: 14 }} onClick={() => addToCart({ id: phone.id, brand: phone.brand, model: phone.model, storage: phone.storage, color: phone.color, salePrice: phone.sale_price, photoPath: photos[0] || null, locationId: phone.location_id, locationName: phone.location_name })}>
                  <CartIcon width={15} height={15} />Kosárba
                </button>
              )}
              <button
                type="button"
                className={`pub-detail-wishlist-btn${wishlist.includes(phone.id) ? " active" : ""}`}
                aria-label={s.wishlistToggle}
                onClick={() => toggleWishlist(phone.id)}
              >
                <HeartIcon width={18} height={18} />
              </button>
            </div>

            <div ref={ctaSentinelRef} />

            <div className="pub-detail-trust">
              {phone.warranty && (
                <div className="pub-detail-trust-row">
                  <WarrantyIcon width={19} height={19} />
                  <div><div className="pub-detail-trust-title">{s.detailTrustWarranty(translateWarranty(phone.warranty, lang))}</div><div className="pub-detail-trust-sub">{s.detailTrustWarrantySub}</div></div>
                </div>
              )}
              <div className="pub-detail-trust-row">
                <CheckIcon width={19} height={19} strokeWidth={2.4} />
                <div><div className="pub-detail-trust-title">{s.detailTrustCondition}</div><div className="pub-detail-trust-sub">{s.detailTrustConditionSub}</div></div>
              </div>
              {phone.location_name && (
                <div className="pub-detail-trust-row">
                  <PinIcon width={19} height={19} />
                  <div><div className="pub-detail-trust-title">{s.detailTrustPickup}</div><div className="pub-detail-trust-sub">{s.detailTrustPickupSub(phone.location_name)}</div></div>
                </div>
              )}
            </div>

            <a className="pub-ask-btn" style={{ padding: "10px 18px", fontSize: 12.5, background: "none", color: "var(--pub-ink-soft)" }} href="tel:0773985278">{s.interestedCall}</a>
            <div className="pub-detail-note">{s.priceNote}</div>
          </div>
        </div>

        {related.length > 0 && (
          <div className="pub-related">
            <div className="pub-related-title">{s.detailRelatedTitle}</div>
            <div className="pub-related-grid">
              {related.map((p) => {
                const rPhotos = p.photo_paths || [];
                const href = lang === "ro" ? `/ro/telefon/${p.id}` : `/telefon/${p.id}`;
                return (
                  <a key={p.id} className="pub-related-card" href={href}>
                    <div className="pub-related-photo">
                      {rPhotos.length > 0 ? <img src={photoUrl(rPhotos[0], "thumb")} alt={`${p.brand} ${p.model}`} loading="lazy" decoding="async" /> : deviceSvg}
                    </div>
                    <div className="pub-related-name">{p.brand} {p.model}</div>
                    <div className="pub-related-specs">{[p.storage, p.color ? translateColor(p.color, lang) : null].filter(Boolean).join(" · ")}</div>
                    <div className="pub-related-price">{Number(p.sale_price).toLocaleString("hu-HU")} Lei</div>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </main>
      <PublicFooter lang={lang} />
    </div>
  );
}
