import { useState, useEffect, useMemo } from "react";
import { supabase } from "./lib/supabaseClient";
import { useCart, cartTotal } from "./lib/cart";
import { photoUrl } from "./lib/imageResize";
import { money } from "./lib/utils";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import { EmptyState } from "./components/EmptyState";
import { CardIcon, CartIcon, CashIcon, ChevronDownIcon, FoliaIcon, LockIcon, TruckIcon } from "./components/icons";

const ROMANIAN_COUNTIES = [
  "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani", "Brăila", "Brașov", "București",
  "Buzău", "Călărași", "Caraș-Severin", "Cluj", "Constanța", "Covasna", "Dâmbovița", "Dolj", "Galați", "Giurgiu",
  "Gorj", "Harghita", "Hunedoara", "Ialomița", "Iași", "Ilfov", "Maramureș", "Mehedinți", "Mureș", "Neamț",
  "Olt", "Prahova", "Sălaj", "Satu Mare", "Sibiu", "Suceava", "Teleorman", "Timiș", "Tulcea", "Vâlcea", "Vaslui", "Vrancea",
];

const SHIPPING_FEE = 20;
const LOCKER_SHIPPING_FEE = 12;
const FREE_SHIPPING_OVER = 1000;

export default function Checkout() {
  const items = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);

  const [deliveryMethod, setDeliveryMethod] = useState("pickup");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryCounty, setDeliveryCounty] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPostalCode, setDeliveryPostalCode] = useState("");
  const [lockerQuery, setLockerQuery] = useState("");
  const [lockerResults, setLockerResults] = useState([]);
  const [selectedLocker, setSelectedLocker] = useState(null);

  useEffect(() => {
    if (deliveryMethod !== "courier_locker" || lockerQuery.trim().length < 2) { setLockerResults([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      const { data } = await supabase.from("sameday_lockers").select("id, name, city, county, address")
        .or(`city.ilike.%${lockerQuery.trim()}%,address.ilike.%${lockerQuery.trim()}%,name.ilike.%${lockerQuery.trim()}%`)
        .limit(15);
      if (alive) setLockerResults(data || []);
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [deliveryMethod, lockerQuery]);

  const locationIds = useMemo(() => [...new Set(items.map((i) => i.locationId).filter(Boolean))], [items]);
  const mixedLocations = locationIds.length > 1;
  // Egy telefon fizikailag csak egy üzletben van, de a vevőnek nem kell emiatt két
  // rendelést leadnia — ha a kosárban 2 üzletből van tétel, kiválasztja melyik boltból
  // induljon (oda menne be / onnan indul a futár), a másik üzletből a személyzet hozza át.
  const involvedLocations = useMemo(() => {
    const map = new Map();
    items.forEach((i) => { if (i.locationId) map.set(i.locationId, i.locationName); });
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [items]);
  const [pickupLocationId, setPickupLocationId] = useState("");
  useEffect(() => {
    if (locationIds.length === 1) { setPickupLocationId(locationIds[0]); return; }
    setPickupLocationId((cur) => (locationIds.includes(cur) ? cur : ""));
  }, [locationIds]);
  const pickupLocationName = involvedLocations.find((l) => l.id === pickupLocationId)?.name || "—";

  const subtotal = cartTotal(items);
  const baseShippingFee = deliveryMethod === "courier_locker" ? LOCKER_SHIPPING_FEE : SHIPPING_FEE;
  const shippingFee = deliveryMethod === "pickup" ? 0 : (subtotal >= FREE_SHIPPING_OVER ? 0 : baseShippingFee);
  const total = subtotal + shippingFee;

  const phoneError = touched.phone && phone.replace(/\D/g, "").length < 6 ? "Adj meg egy érvényes telefonszámot." : "";
  const emailError = touched.email && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Ez nem tűnik érvényes email-címnek." : "";
  const nameError = touched.name && name.trim().length < 2 ? "Add meg a neved." : "";
  const deliveryValid = deliveryMethod === "pickup"
    || (deliveryMethod === "courier_home" && deliveryCity.trim() && deliveryCounty.trim() && deliveryAddress.trim())
    || (deliveryMethod === "courier_locker" && !!selectedLocker);
  const canSubmit = !!pickupLocationId && name.trim().length >= 2 && phone.replace(/\D/g, "").length >= 6 && !emailError && deliveryValid;

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
        p_location_id: pickupLocationId,
        p_guest_name: name,
        p_guest_email: email || null,
        p_guest_phone: phone,
        p_delivery_method: deliveryMethod,
        p_delivery_city: deliveryMethod === "courier_home" ? deliveryCity : null,
        p_delivery_county: deliveryMethod === "courier_home" ? deliveryCounty : null,
        p_delivery_address: deliveryMethod === "courier_home" ? deliveryAddress : null,
        p_delivery_postal_code: deliveryMethod === "courier_home" ? deliveryPostalCode || null : null,
        p_locker_id: deliveryMethod === "courier_locker" ? String(selectedLocker.id) : null,
        p_locker_name: deliveryMethod === "courier_locker" ? `${selectedLocker.name} — ${selectedLocker.city}` : null,
        p_shipping_fee: shippingFee,
      });
      if (err) throw err;
      const order = data?.[0];
      if (!order) throw new Error("Nem sikerült leadni a rendelést.");
      // Futáros (utánvétes) rendelésnél nincs online fizetési lépés — egyenesen a
      // rendelés-visszaigazoló/nyomonkövető oldalra megyünk, ott áll az AWB-adat is.
      if (order.status === "fizetve") {
        window.location.href = `/rendeles/${order.public_token}`;
      } else {
        window.location.href = `/fizetes/${order.public_token}`;
      }
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
        <div className="checkout-totals-row"><span>Részösszeg</span><span className="mono">{money(subtotal)}</span></div>
        <div className="checkout-totals-row"><span>Szállítás</span><span className="mono">{deliveryMethod === "pickup" ? "—" : (shippingFee === 0 ? "Ingyenes" : money(shippingFee))}</span></div>
        <div className="checkout-totals-row checkout-totals-final"><span>Végösszeg</span><span className="mono">{money(total)}</span></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "10px 12px", background: "var(--primary-soft)", borderRadius: 12, fontSize: 12, color: "var(--primary-ink)", fontWeight: 600 }}>
        <FoliaIcon width={16} height={16} />
        Minden telefonhoz jár ajándék kijelzővédő fólia, felrakva — nem felár
      </div>
    </div>
  );

  return (
    <div className="pub-shop">
      <PublicHeader activeNav="cart" />
      <main className="pub-lookup-main" style={{ maxWidth: 900 }}>
        <div style={{ width: "100%" }}>
        <a href="/kosar" className="pub-back-link">← Vissza</a>
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

              <div className="checkout-section-title">Átvétel / szállítás</div>
              {mixedLocations && (
                <div style={{ marginBottom: 14 }}>
                  <div className="field-hint" style={{ marginBottom: 8 }}>
                    A kosaradban két üzletből is van telefon — válaszd ki, melyikből induljon a rendelésed. A másik boltból mi hozzuk át, mielőtt jössz / indul a csomagod.
                  </div>
                  <div className="checkout-delivery-options">
                    {involvedLocations.map((l) => (
                      <label key={l.id} className={`checkout-delivery-opt${pickupLocationId === l.id ? " active" : ""}`}>
                        <input type="radio" name="pickup-location" checked={pickupLocationId === l.id} onChange={() => setPickupLocationId(l.id)} />
                        <div>
                          <div className="checkout-delivery-opt-title">{l.name}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="checkout-delivery-options">
                <label className={`checkout-delivery-opt${deliveryMethod === "pickup" ? " active" : ""}`}>
                  <input type="radio" name="delivery" checked={deliveryMethod === "pickup"} onChange={() => setDeliveryMethod("pickup")} />
                  <div>
                    <div className="checkout-delivery-opt-title">Átvétel a boltban — ingyenes</div>
                    <div className="checkout-delivery-opt-sub">{pickupLocationName}, fizetés a boltban</div>
                  </div>
                </label>
                <label className={`checkout-delivery-opt${deliveryMethod === "courier_home" ? " active" : ""}`}>
                  <input type="radio" name="delivery" checked={deliveryMethod === "courier_home"} onChange={() => setDeliveryMethod("courier_home")} />
                  <div>
                    <div className="checkout-delivery-opt-title">Házhozszállítás — {subtotal >= FREE_SHIPPING_OVER ? "ingyenes" : money(SHIPPING_FEE)}</div>
                    <div className="checkout-delivery-opt-sub">SameDay futár, fizetés utánvéttel átvételkor</div>
                  </div>
                </label>
                <label className={`checkout-delivery-opt${deliveryMethod === "courier_locker" ? " active" : ""}`}>
                  <input type="radio" name="delivery" checked={deliveryMethod === "courier_locker"} onChange={() => setDeliveryMethod("courier_locker")} />
                  <div>
                    <div className="checkout-delivery-opt-title">Csomagautomata — {subtotal >= FREE_SHIPPING_OVER ? "ingyenes" : money(LOCKER_SHIPPING_FEE)}</div>
                    <div className="checkout-delivery-opt-sub">SameDay easybox, fizetés utánvéttel átvételkor</div>
                  </div>
                </label>
              </div>

              {deliveryMethod === "courier_home" && (
                <div style={{ marginBottom: 14 }}>
                  <div className="field">
                    <label htmlFor="co-county">Megye</label>
                    <select id="co-county" value={deliveryCounty} onChange={(e) => setDeliveryCounty(e.target.value)}>
                      <option value="">Válassz megyét...</option>
                      {ROMANIAN_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="co-city">Város / község</label>
                    <input id="co-city" value={deliveryCity} onChange={(e) => setDeliveryCity(e.target.value)} placeholder="pl. Sepsiszentgyörgy" />
                  </div>
                  <div className="field">
                    <label htmlFor="co-address">Cím</label>
                    <input id="co-address" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="utca, házszám" />
                  </div>
                  <div className="field">
                    <label htmlFor="co-postal">Irányítószám (nem kötelező)</label>
                    <input id="co-postal" value={deliveryPostalCode} onChange={(e) => setDeliveryPostalCode(e.target.value)} placeholder="pl. 520000" />
                  </div>
                </div>
              )}

              {deliveryMethod === "courier_locker" && (
                <div style={{ marginBottom: 14 }}>
                  <div className="field">
                    <label htmlFor="co-locker">Keress rá a városodra</label>
                    <input id="co-locker" value={lockerQuery} onChange={(e) => { setLockerQuery(e.target.value); setSelectedLocker(null); }} placeholder="pl. Sepsiszentgyörgy" />
                  </div>
                  {selectedLocker ? (
                    <div className="checkout-pickup-line">Kiválasztva: <b>{selectedLocker.name} — {selectedLocker.city}</b> <button type="button" className="btn sec sm" onClick={() => { setSelectedLocker(null); setLockerQuery(""); }}>Módosít</button></div>
                  ) : lockerResults.length > 0 ? (
                    <div className="checkout-locker-results">
                      {lockerResults.map((l) => (
                        <button type="button" key={l.id} className="checkout-locker-result" onClick={() => setSelectedLocker(l)}>
                          <b>{l.name}</b> — {l.address}, {l.city}
                        </button>
                      ))}
                    </div>
                  ) : lockerQuery.trim().length >= 2 ? (
                    <div className="field-hint">Nincs találat — próbálj más városnevet.</div>
                  ) : null}
                </div>
              )}

              {deliveryMethod === "pickup" ? (
                <div className="checkout-trust">
                  <span><CardIcon className="inline-ic" />Visa / Mastercard</span>
                  <span><LockIcon className="inline-ic" />Biztonságos fizetés — Netopia</span>
                </div>
              ) : (
                <div className="checkout-trust">
                  <span><CashIcon className="inline-ic" />Fizetés utánvéttel</span>
                  <span><TruckIcon className="inline-ic" />SameDay futár</span>
                </div>
              )}
              <div className="login-note" style={{ marginBottom: 10 }}>
                {deliveryMethod === "pickup"
                  ? "Fizetés után azonnal foglaljuk a kiválasztott telefont — előkészítjük, és SMS-ben/telefonon szólunk, ha átvehető a boltban."
                  : "A rendelésed rögzítettük, a kiválasztott telefont lefoglaltuk — a fizetendő összeget a futárnak adod át kézbesítéskor."}
              </div>
              <div className="login-note" style={{ marginBottom: 10 }}>
                A megrendeléstől számított 14 napon belül indoklás nélkül elállhatsz a vásárlástól. Részletek az <a href="/aszf">Általános Szerződési Feltételekben</a>.
              </div>

              <button className="btn checkout-submit" disabled={busy || !canSubmit} type="submit">
                {busy ? "Feldolgozás..." : `Fizetés — ${money(total)}`}
              </button>
            </form>
          </div>
          <div className="checkout-sidebar">{summary}</div>
        </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
