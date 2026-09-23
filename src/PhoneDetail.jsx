import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "./lib/supabaseClient";
import { photoUrl } from "./lib/imageResize";
import { t, translateColor, translateWarranty } from "./lib/i18n";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import { PhoneCaseIcon, HeartIcon, CheckIcon, WarrantyIcon, PinIcon, FoliaIcon } from "./components/icons";
import { EmptyState, LoadingState } from "./components/EmptyState";
import { addToCart, useCart } from "./lib/cart";
import { toggleWishlist, useWishlist } from "./lib/wishlist";
import { normalizeBrand, normalizeStorage, SALE_WARRANTY_TERMS } from "./lib/utils";
import ReviewsSection, { ReviewsBadge } from "./components/PublicReviews";
import PhoneMiniCard from "./components/PhoneMiniCard";
import InfoPanel from "./components/InfoPanel";

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
  const [headerHeight, setHeaderHeight] = useState(0);
  const [warrantyPanelOpen, setWarrantyPanelOpen] = useState(false);
  const cart = useCart();
  const wishlist = useWishlist();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_public_stock");
      setAllPhones((data || []).map((p) => ({ ...p, brand: normalizeBrand(p.brand) })));
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
    if (!header) return;
    const sync = () => setHeaderHeight(header.offsetHeight);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [phone]);

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
  const title = `${phone.brand} ${phone.model}${phone.storage ? " " + normalizeStorage(phone.storage) : ""}, ${Number(phone.sale_price).toLocaleString("hu-HU")} Lei | Telefonos`;
  const description = lang === "ro"
    ? `${phone.brand} ${phone.model} ${phone.condition === "New" ? "nou" : "recondiționat"}${phone.warranty ? `, garanție ${translateWarranty(phone.warranty, "ro")}` : ""} — ${Number(phone.sale_price).toLocaleString("hu-HU")} Lei.`
    : `${phone.brand} ${phone.model} ${phone.condition === "New" ? "új" : "felújított"}${phone.warranty ? `, ${phone.warranty} garanciával` : ""} — ${Number(phone.sale_price).toLocaleString("hu-HU")} Lei.`;

  return (
    <div className="pub-shop pub-shop-sticky-cta">
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

      <div className="pub-sticky-bar" style={{ "--pub-header-h": `${headerHeight}px` }}>
        <div className="pub-sticky-bar-inner">
          <div className="pub-sticky-thumb">
            {photos.length > 0 ? <img src={photoUrl(photos[0], "thumb")} alt="" /> : deviceSvg}
          </div>
          <div className="pub-sticky-info">
            <div className="pub-sticky-name">{phone.brand} {phone.model}{phone.storage ? ` · ${normalizeStorage(phone.storage)}` : ""}</div>
            <div className="pub-sticky-cond">{phone.condition === "New" ? s.conditionNew : s.conditionRefurb}</div>
          </div>
          <div className="pub-sticky-price mono">{Number(phone.sale_price).toLocaleString("hu-HU")}<span className="pub-cur">Lei</span></div>
          {cart.some((c) => c.id === phone.id) ? (
            <a className="pub-ask-btn pub-ask-btn-added" href="/kosar">Kosárban</a>
          ) : (
            <button type="button" className="pub-ask-btn" onClick={() => addToCart({ id: phone.id, brand: phone.brand, model: phone.model, storage: normalizeStorage(phone.storage), color: phone.color, salePrice: phone.sale_price, photoPath: photos[0] || null, locationId: phone.location_id, locationName: phone.location_name })}>
              Kosárba
            </button>
          )}
        </div>
      </div>

      <main className="pub-detail-main">
        <div className="pub-breadcrumb">
          <a href={lang === "ro" ? "/ro/telefoane" : "/"}>{s.navStock}</a> › <span>{phone.brand}</span> › <span className="current">{phone.model}</span>
        </div>
        <div className="pub-detail-grid">
          <div className="pub-detail-media">
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
                <a className="pub-ask-btn pub-ask-btn-added" style={{ padding: "13px 22px", fontSize: 14 }} href="/kosar">Kosárban — tovább a kosárhoz</a>
              ) : (
                <button type="button" className="pub-ask-btn" style={{ padding: "13px 22px", fontSize: 14 }} onClick={() => addToCart({ id: phone.id, brand: phone.brand, model: phone.model, storage: normalizeStorage(phone.storage), color: phone.color, salePrice: phone.sale_price, photoPath: photos[0] || null, locationId: phone.location_id, locationName: phone.location_name })}>
                  Kosárba
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

            <div className="pub-detail-trust">
              {phone.warranty && (
                <button type="button" className="pub-detail-trust-row" style={{ border: "none", background: "none", font: "inherit", textAlign: "left", cursor: "pointer", width: "100%" }} onClick={() => setWarrantyPanelOpen(true)}>
                  <WarrantyIcon width={19} height={19} />
                  <div><div className="pub-detail-trust-title">{s.detailTrustWarranty(translateWarranty(phone.warranty, lang))}</div><div className="pub-detail-trust-sub">{s.detailTrustWarrantySub} →</div></div>
                </button>
              )}
              <div className="pub-detail-trust-row">
                <FoliaIcon width={19} height={19} />
                <div><div className="pub-detail-trust-title">{s.detailTrustFolia}</div><div className="pub-detail-trust-sub">{s.detailTrustFoliaSub}</div></div>
              </div>
              {phone.condition === "New" ? (
                <div className="pub-detail-trust-row">
                  <CheckIcon width={19} height={19} strokeWidth={2.4} />
                  <div><div className="pub-detail-trust-title">{s.detailConditionNewTitle}</div><div className="pub-detail-trust-sub">{s.detailTrustNewSub}</div></div>
                </div>
              ) : (
                <a className="pub-detail-trust-row" href={lang === "ro" ? "/ro/reconditionare-verificata" : "/ellenorzott-felujitas"} style={{ textDecoration: "none", color: "inherit" }}>
                  <CheckIcon width={19} height={19} strokeWidth={2.4} />
                  <div><div className="pub-detail-trust-title">{s.detailTrustCondition}</div><div className="pub-detail-trust-sub">{lang === "ro" ? "Vezi ce verificăm exact →" : "Nézd meg pontosan mit ellenőrzünk →"}</div></div>
                </a>
              )}
              {phone.location_name && (
                <div className="pub-detail-trust-row">
                  <PinIcon width={19} height={19} />
                  <div><div className="pub-detail-trust-title">{s.detailTrustPickup}</div><div className="pub-detail-trust-sub">{s.detailTrustPickupSub(phone.location_name)}</div></div>
                </div>
              )}
            </div>
          </div>

          <div className="pub-detail-extras">
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
                    <div><div className="pub-detail-spec-label">{s.storageLabel}</div><div className="pub-detail-spec-value">{normalizeStorage(phone.storage)}</div></div>
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
        </div>

        {related.length > 0 && (
          <div className="pub-related">
            <div className="pub-related-title">{s.detailRelatedTitle}</div>
            <div className="pub-related-grid">
              {related.map((p) => (
                <PhoneMiniCard key={p.id} phone={p} lang={lang} />
              ))}
            </div>
          </div>
        )}
      </main>

      <ReviewsSection lang={lang} />

      <PublicFooter lang={lang} />
      <InfoPanel open={warrantyPanelOpen} onClose={() => setWarrantyPanelOpen(false)} title={lang === "ro" ? "Condiții de garanție" : "Garancia feltételek"}>
        {SALE_WARRANTY_TERMS}
      </InfoPanel>
    </div>
  );
}
