import { photoUrl } from "../lib/imageResize";
import { t, translateColor, translateWarranty } from "../lib/i18n";
import { normalizeStorage } from "../lib/utils";
import { CartIcon } from "./icons";
import { addToCart, useCart } from "../lib/cart";

const deviceSvg = (
  <svg viewBox="0 0 40 64" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="2" y="2" width="36" height="60" rx="7" />
    <line x1="15" y1="56" x2="25" y2="56" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

// Kompakt termékkártya kereszt-ajánlatokhoz (szerviz-becslő, felvásárlás "vidd tovább" blokkja,
// telefon-választó segítő) — ugyanaz a pub-card markup, amit a StockShowcase is használ.
export default function PhoneMiniCard({ phone: p, lang = "hu" }) {
  const s = t(lang);
  const cart = useCart();
  const href = lang === "ro" ? `/ro/telefon/${p.id}` : `/telefon/${p.id}`;
  const inCart = cart.some((c) => c.id === p.id);

  return (
    <div className="pub-card" role="link" tabIndex={0}
      onClick={() => { window.location.href = href; }}
      onKeyDown={(e) => { if (e.key === "Enter") window.location.href = href; }}
    >
      <div className="pub-card-top">
        <span className={`pub-cond-pill ${p.condition === "New" ? "new" : "refurb"}`}>{p.condition === "New" ? s.conditionNew : s.conditionRefurb}</span>
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
        {p.storage && <span>{normalizeStorage(p.storage)}</span>}
        {p.color && <span>{translateColor(p.color, lang)}</span>}
      </div>
      {p.warranty && (
        <div className="pub-warranty-tag">
          <svg viewBox="0 0 24 24" style={{ width: 11, height: 11, stroke: "var(--pub-ink-soft)", fill: "none", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }}><path d="M12 3l7 2.5v5.8c0 4.2-2.9 7.6-7 8.7-4.1-1.1-7-4.5-7-8.7V5.5L12 3z" /></svg>
          {s.warrantyTag(translateWarranty(p.warranty, lang))}
        </div>
      )}
      <div className="pub-card-foot">
        <div className="pub-price mono">{Number(p.sale_price).toLocaleString("hu-HU")}<span className="pub-cur">Lei</span></div>
        {inCart ? (
          <a className="pub-ask-btn pub-ask-btn-added" href="/kosar" aria-label="Kosárban" onClick={(e) => e.stopPropagation()}><CartIcon width={13} height={13} /><span className="pub-ask-btn-label">Kosárban</span></a>
        ) : (
          <button type="button" className="pub-ask-btn" aria-label="Kosárba" onClick={(e) => {
            e.stopPropagation();
            addToCart({ id: p.id, brand: p.brand, model: p.model, storage: normalizeStorage(p.storage), color: p.color, salePrice: p.sale_price, photoPath: p.photo_paths?.[0] || null, locationId: p.location_id, locationName: p.location_name });
          }}><CartIcon width={13} height={13} /><span className="pub-ask-btn-label">Kosárba</span></button>
        )}
      </div>
    </div>
  );
}
