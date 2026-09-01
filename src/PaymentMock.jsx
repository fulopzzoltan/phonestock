import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import { clearCart } from "./lib/cart";
import { money } from "./lib/utils";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";

// A valódi Netopia-fizetés még nincs bekötve — a korábbi "szimulált sikeres fizetés" gomb
// a mark_web_order_paid RPC-t hívta, amit bárki (a saját public_token-jével bíró vásárló,
// vagy akár egy böngésző-konzolból dolgozó rosszindulatú látogató) meg tudott volna hívni
// valódi fizetés nélkül is — ezért az RPC-t szerver-oldalon lezártuk (ld. biztonsági audit),
// itt pedig nem kínálunk fel egy amúgy sem működő "fizetés" gombot.
export default function PaymentMock({ token }) {
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

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

  async function cancelOrder() {
    setBusy(true);
    setError("");
    try {
      const { error: err } = await supabase.rpc("cancel_web_order_by_token", { p_token: token });
      if (err) throw err;
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
        ⚠️ Az online bankkártyás fizetés még nem aktív ezen az oldalon.
      </div>
      <main className="pub-lookup-main">
        <div className="login-card" style={{ maxWidth: 420 }}>
          {busy && !order && <div style={{ textAlign: "center", color: "#6B7280", fontSize: 13, padding: "10px 0" }}>Betöltés...</div>}
          {error && <div className="errbar">{error}</div>}
          {order && (
            <>
              <div className="login-title">Fizetés</div>
              <div className="checkout-pickup-line" style={{ textAlign: "center", marginBottom: 16 }}>
                Fizetendő: <b className="mono">{money(order.total_amount)}</b>
              </div>
              <div className="login-note" style={{ marginBottom: 16 }}>
                A rendelésed rögzítettük és a kiválasztott terméket lefoglaltuk — az online
                kártyás fizetés hamarosan elérhető lesz. Addig kérjük, vedd fel velünk a
                kapcsolatot, hogy egyeztessük a fizetés/átvétel módját, vagy mondd le a
                rendelést, ha meggondoltad magad.
              </div>
              <button className="btn sec checkout-submit" disabled={busy} onClick={cancelOrder}>Rendelés lemondása</button>
            </>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
