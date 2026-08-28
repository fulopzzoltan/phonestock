import { useCart, removeFromCart, cartTotal } from "./lib/cart";
import { photoUrl } from "./lib/imageResize";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import { CartIcon, TrashIcon, PinIcon } from "./components/icons";
import { EmptyState } from "./components/EmptyState";

const deviceSvg = (
  <svg viewBox="0 0 40 64" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="2" y="2" width="36" height="60" rx="7" />
    <line x1="15" y1="56" x2="25" y2="56" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export default function Cart() {
  const items = useCart();
  const total = cartTotal(items);

  return (
    <div className="pub-shop">
      <PublicHeader activeNav="cart" />
      <main className="pub-cart-main">
        <div className="pub-breadcrumb">
          <a href="/">Telefonok</a> › <span className="current">Kosár</span>
        </div>
        <h1 className="pub-cart-title">Kosár</h1>

        {items.length === 0 ? (
          <EmptyState icon={CartIcon}>
            A kosarad üres.
            <br />
            <a href="/" className="pub-ask-btn" style={{ marginTop: 12 }}>Vissza a készlethez</a>
          </EmptyState>
        ) : (
          <div className="pub-cart-grid">
            <div className="pub-cart-items">
              {items.map((it) => (
                <div key={it.id} className="pub-cart-row">
                  <div className="pub-cart-photo">
                    {it.photoPath ? (
                      <img
                        src={photoUrl(it.photoPath, "thumb")}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = photoUrl(it.photoPath, "full"); }}
                      />
                    ) : deviceSvg}
                  </div>
                  <div className="pub-cart-info">
                    <a className="pub-cart-name" href={`/telefon/${it.id}`}>{it.brand} {it.model}</a>
                    <div className="pub-cart-specs">
                      {[it.storage, it.color].filter(Boolean).join(" · ")}
                    </div>
                    {it.locationName && (
                      <div className="pub-cart-loc"><PinIcon width={12} height={12} />{it.locationName}</div>
                    )}
                  </div>
                  <div className="pub-cart-price mono">{Number(it.salePrice).toLocaleString("hu-HU")} <span>Lei</span></div>
                  <button type="button" className="pub-cart-remove" aria-label="Eltávolítás a kosárból" onClick={() => removeFromCart(it.id)}>
                    <TrashIcon width={14} height={14} />
                  </button>
                </div>
              ))}
            </div>

            <aside className="pub-cart-summary">
              <div className="pub-cart-summary-title">Összegzés</div>
              <div className="pub-cart-summary-row">
                <span>{items.length === 1 ? "1 termék" : `${items.length} termék`}</span>
                <span className="mono">{total.toLocaleString("hu-HU")} Lei</span>
              </div>
              <div className="pub-cart-summary-total">
                <span>Végösszeg</span>
                <span className="mono">{total.toLocaleString("hu-HU")} Lei</span>
              </div>
              <a href="/penztar" className="pub-ask-btn pub-cart-checkout">Tovább a pénztárhoz</a>
              <div className="pub-cart-summary-note">Az ár és a készlet folyamatosan frissül, végleges adásvétel az üzletben történik.</div>
              <a href="/" className="pub-cart-back">← Vissza a készlethez</a>
            </aside>
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
