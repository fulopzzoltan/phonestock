import { useState, useEffect, useMemo } from "react";
import { supabase } from "./lib/supabaseClient";
import { useCart, cartTotal } from "./lib/cart";
import { photoUrl } from "./lib/imageResize";
import { money } from "./lib/utils";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import { EmptyState } from "./components/EmptyState";
import { CartIcon, ChevronDownIcon } from "./components/icons";

export default function Checkout() {
  const items = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);

  const locationIds = useMemo(() => [...new Set(items.map((i) => i.locationId).filter(Boolean))], [items]);
  const singleLocation = locationIds.length === 1 ? items.find((i) => i.locationId === locationIds[0]) : null;
  const mixedLocations = locationIds.length > 1;

  const phoneError = touched.phone && phone.replace(/\D/g, "").length < 6 ? "Adj meg egy érvényes telefonszámot." : "";
  const emailError = touched.email && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Ez nem tűnik érvényes email-címnek." : "";
  const nameError = touched.name && name.trim().length < 2 ? "Add meg a neved." : "";
  const canSubmit = !mixedLocations && locationIds.length === 1 && name.trim().length >= 2 && phone.replace(/\D/g, "").length >= 6 && !emailError;

  useEffect(() => {
    document.title = "Pénztár — Telefonos";
  }, []);

  async function submit(e) {
    e.preventDefault();
    setTouched({ name: true, phone: true, email: true });
    if (!canSubmit) return;
    setError("");
    setBusy(true);
    try {
      const { data, error: err } = await supabase.rpc("create_web_order", {
        p_items: items.map((i) => i.id),
        p_location_id: locationIds[0],
        p_guest_name: name,
        p_guest_email: email || null,
        p_guest_phone: phone,
      });
      if (err) throw err;
      const order = data?.[0];
      if (!order) throw new Error("Nem sikerült leadni a rendelést.");
      window.location.href = `/fizetes/${order.public_token}`;
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

  const total = cartTotal(items);

  const summary = (
    <div className="checkout-summary">
      <div className="checkout-summary-items">
        {items.map((it) => (
          <div key={it.id} className="checkout-item-row">
            {it.photoPath ? (
              <img
                src={photoUrl(it.photoPath, "thumb")}
                alt=""
                className="checkout-item-thumb"
                loading="lazy"
                decoding="async"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = photoUrl(it.photoPath, "full"); }}
              />
            ) : <div className="checkout-item-thumb checkout-item-thumb-empty" />}
            <div className="checkout-item-info">
              <div className="checkout-item-name">{it.brand} {it.model}</div>
              <div className="checkout-item-sub">{[it.storage, it.color].filter(Boolean).join(" · ")}</div>
            </div>
            <div className="checkout-item-price mono">{money(it.salePrice)}</div>
          </div>
        ))}
      </div>
      <div className="checkout-totals">
        <div className="checkout-totals-row"><span>Részösszeg</span><span className="mono">{money(total)}</span></div>
        <div className="checkout-totals-row checkout-totals-final"><span>Végösszeg</span><span className="mono">{money(total)}</span></div>
      </div>
    </div>
  );

  return (
    <div className="pub-shop">
      <PublicHeader activeNav="cart" />
      <main className="pub-lookup-main" style={{ maxWidth: 900 }}>
        <div className="checkout-grid">
          <div className="checkout-form-col">
            <div className="login-title" style={{ marginBottom: 4 }}>Pénztár</div>

            <button type="button" className="checkout-summary-toggle" onClick={() => setSummaryOpen((v) => !v)}>
              Rendelés összegzése — {money(total)}
              <ChevronDownIcon style={{ transform: summaryOpen ? "rotate(180deg)" : undefined }} />
            </button>
            {summaryOpen && summary}

            {error && <div className="errbar" role="alert" aria-live="polite">{error}</div>}

            <form onSubmit={submit} noValidate>
              <div className="checkout-section-title">Kapcsolat</div>
              <div className="field">
                <label htmlFor="co-name">Név</label>
                <input id="co-name" required autoComplete="name" value={name}
                  onChange={(e) => setName(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                  placeholder="pl. Kovács János" />
                {nameError && <div className="field-error" aria-live="polite">{nameError}</div>}
              </div>
              <div className="field">
                <label htmlFor="co-phone">Telefonszám</label>
                <input id="co-phone" required type="tel" inputMode="tel" autoComplete="tel" value={phone}
                  onChange={(e) => setPhone(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                  placeholder="07xx xxx xxx" />
                {phoneError && <div className="field-error" aria-live="polite">{phoneError}</div>}
              </div>
              <div className="field">
                <label htmlFor="co-email">Email (nem kötelező)</label>
                <input id="co-email" type="email" autoComplete="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  placeholder="te@pelda.hu" />
                {emailError && <div className="field-error" aria-live="polite">{emailError}</div>}
              </div>

              <div className="checkout-section-title">Átvétel</div>
              {mixedLocations ? (
                <div className="errbar">A kosaradban különböző üzletekből (Gyimes és Szentgyörgy) származó telefonok vannak — egyszerre csak egy üzletből rendelhetsz. Vedd ki az egyik tételt a kosárból a folytatáshoz.</div>
              ) : singleLocation ? (
                <div className="checkout-pickup-line">Átvehető: <b>{singleLocation.locationName || "—"}</b></div>
              ) : null}

              <div className="checkout-trust">
                <span>💳 Visa / Mastercard</span>
                <span>🔒 Biztonságos fizetés — Netopia</span>
              </div>
              <div className="login-note" style={{ marginBottom: 10 }}>
                Fizetés után azonnal foglaljuk a kiválasztott telefont — előkészítjük, és SMS-ben/telefonon szólunk, ha átvehető a boltban.
              </div>
              <div className="login-note" style={{ marginBottom: 10 }}>
                A megrendeléstől számított 14 napon belül indoklás nélkül elállhatsz a vásárlástól. Részletek az <a href="/aszf">Általános Szerződési Feltételekben</a>.
              </div>

              <button className="btn checkout-submit" disabled={busy || !canSubmit} type="submit">
                {busy ? "Feldolgozás..." : `Fizetés — ${money(total)}`}
              </button>
            </form>
            <div className="login-note" style={{ marginTop: 10, textAlign: "center" }}>
              <a href="/kosar">← Vissza a kosárhoz</a>
            </div>
          </div>
          <div className="checkout-sidebar">{summary}</div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
