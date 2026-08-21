import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import { useCart, clearCart, cartTotal } from "./lib/cart";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import { EmptyState } from "./components/EmptyState";
import { CartIcon } from "./components/icons";

export default function Checkout() {
  const items = useCart();
  const [locations, setLocations] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [locationId, setLocationId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_public_locations");
      setLocations(data || []);
      if (data && data.length > 0) setLocationId(data[0].id);
    })();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { data, error: err } = await supabase.rpc("create_web_order", {
        p_items: items.map((i) => i.id),
        p_location_id: locationId,
        p_guest_name: name,
        p_guest_email: email || null,
        p_guest_phone: phone,
      });
      if (err) throw err;
      const order = data?.[0];
      if (!order) throw new Error("Nem sikerült leadni a rendelést.");
      clearCart();
      window.location.href = `/rendeles/${order.public_token}`;
    } catch (err) {
      setError(err.message || "Hiba történt a rendelés leadása közben.");
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="pub-shop">
        <PublicHeader activeNav="cart" />
        <main className="pub-lookup-main">
          <div className="login-card" style={{ maxWidth: 460 }}>
            <EmptyState icon={CartIcon}>
              A kosarad üres.
              <br />
              <a href="/" className="pub-ask-btn" style={{ marginTop: 12 }}>Vissza a készlethez</a>
            </EmptyState>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="pub-shop">
      <PublicHeader activeNav="cart" />
      <main className="pub-lookup-main">
        <div className="login-card" style={{ maxWidth: 460 }}>
          <div className="login-title">Pénztár</div>

          <div className="dp-section" style={{ marginBottom: 16 }}>
            {items.map((it) => (
              <div key={it.id} className="dp-row">
                <span className="dp-key">{it.brand} {it.model}{it.storage ? ` · ${it.storage}` : ""}</span>
                <span className="dp-val mono">{Number(it.salePrice).toLocaleString("hu-HU")} Lei</span>
              </div>
            ))}
            <div className="dp-row" style={{ borderTop: "1px solid #EEF0F2", paddingTop: 10, marginTop: 4 }}>
              <span className="dp-key" style={{ fontWeight: 700 }}>Összesen</span>
              <span className="dp-val mono" style={{ fontWeight: 800, fontSize: 15 }}>{cartTotal(items).toLocaleString("hu-HU")} Lei</span>
            </div>
          </div>

          {error && <div className="errbar">{error}</div>}
          <form onSubmit={submit}>
            <div className="field"><label>Név</label><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="pl. Kovács János" /></div>
            <div className="field"><label>Telefonszám</label><input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xx xxx xxx" /></div>
            <div className="field"><label>Email (opcionális)</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="te@pelda.hu" /></div>
            <div className="field">
              <label>Átvételi helyszín</label>
              <select required value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="login-note" style={{ marginBottom: 10 }}>
              Nincs online bankkártyás fizetés — a rendelést a boltban, átvételkor fizeted ki. A kiválasztott telefonokat biztosan félretesszük neked.
            </div>
            <button className="btn" style={{ width: "100%", justifyContent: "center" }} disabled={busy || !locationId} type="submit">
              {busy ? "Küldés..." : "Rendelés leadása"}
            </button>
          </form>
          <div className="login-note" style={{ marginTop: 10, textAlign: "center" }}>
            <a href="/kosar">← Vissza a kosárhoz</a>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
