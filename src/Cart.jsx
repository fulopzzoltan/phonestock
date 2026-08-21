import { supabase } from "./lib/supabaseClient";
import { useCart, removeFromCart, cartTotal } from "./lib/cart";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import { CartIcon, TrashIcon } from "./components/icons";
import { EmptyState } from "./components/EmptyState";

function photoUrl(path) {
  return supabase.storage.from("product-photos").getPublicUrl(path).data.publicUrl;
}

export default function Cart() {
  const items = useCart();

  return (
    <div className="pub-shop">
      <PublicHeader activeNav="cart" />
      <main className="pub-lookup-main">
        <div className="login-card" style={{ maxWidth: 520 }}>
          <div className="login-title">Kosár</div>
          {items.length === 0 ? (
            <EmptyState icon={CartIcon}>
              A kosarad üres.
              <br />
              <a href="/" className="pub-ask-btn" style={{ marginTop: 12 }}>Vissza a készlethez</a>
            </EmptyState>
          ) : (
            <>
              <div className="dp-section">
                {items.map((it) => (
                  <div key={it.id} className="dp-row">
                    <span className="dp-key" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {it.photoPath ? (
                        <img src={photoUrl(it.photoPath)} alt="" style={{ width: 34, height: 34, borderRadius: 8, objectFit: "cover" }} />
                      ) : null}
                      <span>
                        {it.brand} {it.model}
                        {it.storage ? ` · ${it.storage}` : ""}
                        {it.color ? ` · ${it.color}` : ""}
                      </span>
                    </span>
                    <span className="dp-val" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="mono" style={{ fontWeight: 700 }}>{Number(it.salePrice).toLocaleString("hu-HU")} Lei</span>
                      <button type="button" className="iconbtn" onClick={() => removeFromCart(it.id)}><TrashIcon /></button>
                    </span>
                  </div>
                ))}
                <div className="dp-row" style={{ borderTop: "1px solid #EEF0F2", paddingTop: 10, marginTop: 4 }}>
                  <span className="dp-key" style={{ fontWeight: 700 }}>Összesen</span>
                  <span className="dp-val mono" style={{ fontWeight: 800, fontSize: 15 }}>{cartTotal(items).toLocaleString("hu-HU")} Lei</span>
                </div>
              </div>
              <a href="/penztar" className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>Tovább a pénztárhoz</a>
              <div className="login-note" style={{ marginTop: 10, textAlign: "center" }}>
                <a href="/">← Vissza a készlethez</a>
              </div>
            </>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
