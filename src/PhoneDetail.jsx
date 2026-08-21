import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "./lib/supabaseClient";
import { t, translateColor, translateWarranty } from "./lib/i18n";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import { PhoneCaseIcon, CartIcon } from "./components/icons";
import { EmptyState, LoadingState } from "./components/EmptyState";
import { addToCart, useCart } from "./lib/cart";

const SITE = "https://phonestock-manager.netlify.app";

const deviceSvg = (
  <svg viewBox="0 0 40 64" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="2" y="2" width="36" height="60" rx="7" />
    <line x1="15" y1="56" x2="25" y2="56" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

function photoUrl(path) {
  return supabase.storage.from("product-photos").getPublicUrl(path).data.publicUrl;
}

export default function PhoneDetail({ id, lang = "hu" }) {
  const s = t(lang);
  const [phone, setPhone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const cart = useCart();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_public_stock");
      setPhone((data || []).find((p) => p.id === id) || null);
      setLoading(false);
    })();
  }, [id]);

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
      <main className="pub-detail-main">
        <a href={lang === "ro" ? "/ro/telefoane" : "/"} className="pub-back-link">← {s.backToStock}</a>
        <div className="pub-detail-grid">
          <div className="pub-detail-gallery">
            <div className="pub-detail-photo-main">
              {photos.length > 0 ? <img src={photoUrl(photos[activePhoto])} alt={`${phone.brand} ${phone.model}`} /> : <div className="pub-device-art" style={{ height: 320, width: "100%" }}>{deviceSvg}</div>}
            </div>
            {photos.length > 1 && (
              <div className="pub-detail-thumbs">
                {photos.map((ph, i) => (
                  <button key={i} type="button" className={`pub-detail-thumb${i === activePhoto ? " active" : ""}`} onClick={() => setActivePhoto(i)}>
                    <img src={photoUrl(ph)} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="pub-detail-info">
            <span className={`pub-cond-pill ${phone.condition === "New" ? "new" : "refurb"}`}>{phone.condition === "New" ? s.conditionNew : s.conditionRefurb}</span>
            <h1 className="pub-detail-title">{phone.brand} {phone.model}</h1>
            <div className="pub-detail-specs">
              {phone.storage && <div><b>{s.storageLabel}</b> {phone.storage}</div>}
              {phone.color && <div><b>{s.colorLabel}</b> {translateColor(phone.color, lang)}</div>}
              {phone.battery_health != null && <div><b>{s.batteryLabel}</b> {phone.battery_health}%</div>}
              {phone.warranty && <div><b>{s.warrantyLabel}</b> {translateWarranty(phone.warranty, lang)}</div>}
            </div>
            {phone.new_price && Number(phone.new_price) > Number(phone.sale_price) && (
              <div className="pub-anchor" style={{ fontSize: 14 }}>
                <span className="pub-anchor-old">{Number(phone.new_price).toLocaleString("hu-HU")} Lei</span>
                <span className="pub-anchor-save">{s.saveLabel(Math.round(phone.new_price - phone.sale_price).toLocaleString("hu-HU"))}</span>
              </div>
            )}
            <div className="pub-detail-price mono">{Number(phone.sale_price).toLocaleString("hu-HU")}<span className="pub-cur">Lei</span></div>
            {cart.some((c) => c.id === phone.id) ? (
              <a className="pub-ask-btn pub-ask-btn-added" style={{ padding: "13px 22px", fontSize: 14 }} href="/kosar"><CartIcon width={15} height={15} />Kosárban — tovább a kosárhoz</a>
            ) : (
              <button type="button" className="pub-ask-btn" style={{ padding: "13px 22px", fontSize: 14 }} onClick={() => addToCart({ id: phone.id, brand: phone.brand, model: phone.model, storage: phone.storage, color: phone.color, salePrice: phone.sale_price, photoPath: photos[0] || null, locationId: phone.location_id, locationName: phone.location_name })}>
                <CartIcon width={15} height={15} />Kosárba
              </button>
            )}
            <a className="pub-ask-btn" style={{ padding: "10px 18px", fontSize: 12.5, marginTop: 8, background: "none", color: "var(--pub-ink-soft)" }} href="tel:0773985278">{s.interestedCall}</a>
            <div className="pub-detail-note">{s.priceNote}</div>
          </div>
        </div>
      </main>
      <PublicFooter lang={lang} />
    </div>
  );
}
