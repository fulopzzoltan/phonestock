import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import { clearCart } from "./lib/cart";
import { money } from "./lib/utils";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";

export default function PaymentMock({ token }) {
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvc: "" });

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase.rpc("get_web_order_by_token", { p_token: token });
      if (err || !data || data.length === 0) {
        setError("A rendelés nem található.");
      } else if (data[0].status !== "uj") {
        window.location.href = `/rendeles/${token}`;
        return;
      } else {
        setOrder(data[0]);
      }
      setBusy(false);
    })();
  }, [token]);

  async function simulate(success) {
    setBusy(true);
    setError("");
    try {
      if (success) {
        const { error: err } = await supabase.rpc("mark_web_order_paid", { p_token: token });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.rpc("cancel_web_order_by_token", { p_token: token });
        if (err) throw err;
      }
      clearCart();
      window.location.href = `/rendeles/${token}`;
    } catch (err) {
      setError(err.message || "Hiba történt.");
      setBusy(false);
    }
  }

  return (
    <div className="pub-shop">
      <PublicHeader activeNav="cart" />
      <div className="mock-pay-banner">
        ⚠️ TESZT FIZETŐOLDAL — ez egy szimuláció, nem történik valódi terhelés. A valódi Netopia-fizetés bekötése folyamatban van.
      </div>
      <main className="pub-lookup-main">
        <div className="login-card" style={{ maxWidth: 420 }}>
          {busy && !order && <div style={{ textAlign: "center", color: "#6B7280", fontSize: 13, padding: "10px 0" }}>Betöltés...</div>}
          {error && <div className="errbar">{error}</div>}
          {order && (
            <>
              <div className="login-title">Kártyás fizetés (teszt)</div>
              <div className="checkout-pickup-line" style={{ textAlign: "center", marginBottom: 16 }}>
                Fizetendő: <b className="mono">{money(order.total_amount)}</b>
              </div>
              <div className="field"><label>Kártyaszám</label><input value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} placeholder="4111 1111 1111 1111" inputMode="numeric" /></div>
              <div className="field"><label>Kártyabirtokos neve</label><input value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} placeholder={order.guest_name} /></div>
              <div style={{ display: "flex", gap: 10 }}>
                <div className="field" style={{ flex: 1 }}><label>Lejárat</label><input value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} placeholder="HH/ÉÉ" /></div>
                <div className="field" style={{ flex: 1 }}><label>CVC</label><input value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} placeholder="123" inputMode="numeric" /></div>
              </div>
              <div className="login-note" style={{ marginBottom: 10 }}>
                Ez az űrlap nem valódi — bármit beírhatsz, semmilyen kártyaadat nem kerül mentésre vagy továbbításra.
              </div>
              <button className="btn checkout-submit" disabled={busy} onClick={() => simulate(true)}>Fizetés szimulálása — sikeres</button>
              <button className="btn sec checkout-submit" style={{ marginTop: 8 }} disabled={busy} onClick={() => simulate(false)}>Fizetés szimulálása — sikertelen</button>
            </>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
