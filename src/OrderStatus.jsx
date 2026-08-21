import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";

const STATUS_LABEL = {
  uj: "Új rendelés — visszaigazolásra vár",
  visszaigazolva: "Visszaigazolva — előkészítjük átvételre",
  atadva: "Átadva",
  lemondva: "Lemondva",
};
const STATUS_CLS = {
  uj: "st-beveve",
  visszaigazolva: "st-garancialis",
  atadva: "st-kesz",
  lemondva: "st-sikertelen",
};

export default function OrderStatus({ token }) {
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data, error: err } = await supabase.rpc("get_web_order_by_token", { p_token: token });
        if (err) throw err;
        if (!data || data.length === 0) setError("Érvénytelen vagy nem található rendelés.");
        else setOrder(data[0]);
      } catch (err) {
        setError(err.message || "Hiba történt a keresés közben.");
      } finally {
        setBusy(false);
      }
    })();
  }, [token]);

  return (
    <div className="pub-shop">
      <PublicHeader activeNav="cart" />
      <main className="pub-lookup-main">
        <div className="login-card" style={{ maxWidth: 460 }}>
          {busy && <div style={{ textAlign: "center", color: "#6B7280", fontSize: 13, padding: "10px 0" }}>Betöltés...</div>}
          {error && <div className="errbar">{error}</div>}
          {order && (
            <div>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Rendelés</div>
                <div style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 700 }}>#{order.order_no}</div>
              </div>
              <div style={{ textAlign: "center", margin: "10px 0 16px" }}>
                <span className={`st ${STATUS_CLS[order.status] || "st-beveve"}`} style={{ fontSize: 14, padding: "8px 18px" }}>
                  {STATUS_LABEL[order.status] || order.status}
                </span>
              </div>
              <div className="dp-section">
                {(order.items || []).map((it, i) => (
                  <div key={i} className="dp-row">
                    <span className="dp-key">{it.brand} {it.model}{it.storage ? ` · ${it.storage}` : ""}{it.color ? ` · ${it.color}` : ""}</span>
                    <span className="dp-val mono">{Number(it.price).toLocaleString("hu-HU")} Lei</span>
                  </div>
                ))}
                <div className="dp-row"><span className="dp-key">Név</span><span className="dp-val">{order.guest_name}</span></div>
                <div className="dp-row"><span className="dp-key">Telefonszám</span><span className="dp-val">{order.guest_phone}</span></div>
                <div className="dp-row"><span className="dp-key">Átvételi helyszín</span><span className="dp-val">{order.location_name || "—"}{order.location_phone ? ` · ${order.location_phone}` : ""}</span></div>
                <div className="dp-row"><span className="dp-key">Fizetendő átvételkor</span><span className="dp-val mono" style={{ fontWeight: 700 }}>{Number(order.total_amount).toLocaleString("hu-HU")} Lei</span></div>
              </div>
              <div style={{ background: "#F9FAFB", border: "1px solid #EEF0F2", borderRadius: 12, padding: 14, fontSize: 11, color: "#6B7280", lineHeight: 1.6, marginTop: 14 }}>
                Nincs online fizetés — a rendelést a fenti boltban, átvételkor fizeted ki. A kiválasztott telefon(oka)t félretettük neked.
              </div>
              <div className="login-note" style={{ marginTop: 10 }}>
                <a href="/">Vissza a készlethez</a>
              </div>
            </div>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
