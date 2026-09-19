import { photoUrl } from "../lib/imageResize";
import { t, translateColor, colorSwatch } from "../lib/i18n";
import { normalizeStorage, conditionGradeLabel } from "../lib/utils";
import { HeartIcon } from "./icons";
import { addToCart, useCart } from "../lib/cart";
import { toggleWishlist, useWishlist } from "../lib/wishlist";

const deviceSvg = (
  <svg viewBox="0 0 40 64" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="2" y="2" width="36" height="60" rx="7" />
    <line x1="15" y1="56" x2="25" y2="56" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

// Kompakt termékkártya kereszt-ajánlatokhoz (szerviz-becslő, felvásárlás "vidd tovább" blokkja,
// telefon-választó segítő) — ugyanaz a markup, amit a StockShowcase termékrácsa használ, hogy
// mindenhol egységes legyen a kártya-dizájn.
export default function PhoneMiniCard({ phone: p, lang = "hu" }) {
  const s = t(lang);
  const cart = useCart();
  const wishlist = useWishlist();
  const href = lang === "ro" ? `/ro/telefon/${p.id}` : `/telefon/${p.id}`;
  const inCart = cart.some((c) => c.id === p.id);
  const inWishlist = wishlist.includes(p.id);

  return (
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
        <span className="pub-card-name">{p.brand} {p.model}</span>
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
        <div className="pub-price mono">{Number(p.sale_price).toLocaleString("hu-HU")}<span className="pub-cur">Lei</span></div>
        {inCart ? (
          <a className="pub-ask-btn pub-ask-btn-added" href="/kosar" aria-label="Kosárban" onClick={(e) => e.stopPropagation()}>Kosárban</a>
        ) : (
          <button type="button" className="pub-ask-btn" aria-label="Kosárba" onClick={(e) => {
            e.stopPropagation();
            addToCart({ id: p.id, brand: p.brand, model: p.model, storage: normalizeStorage(p.storage), color: p.color, salePrice: p.sale_price, photoPath: p.photo_paths?.[0] || null, locationId: p.location_id, locationName: p.location_name });
          }}>Kosárba</button>
        )}
      </div>
    </div>
  );
}
