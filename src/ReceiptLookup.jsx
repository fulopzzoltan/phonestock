import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import { money, warrantyExpiry, isWarrantyActive, SALE_WARRANTY_TERMS } from "./lib/utils";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";

// Kézzel beírt keresés (token nélkül) mostantól a /status egyesített oldalon zajlik
// (szerviz + vásárlás egy helyen, telefonszám alapján) — ez a komponens csak a
// már kinyomtatott/kiküldött /receipt/:token linkeket szolgálja ki, hogy azok
// visszamenőleg is működjenek.
export default function ReceiptLookup({ token }) {
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!token) {
      window.location.replace("/status");
      return;
    }
    (async () => {
      try {
        const { data, error: err } = await supabase.rpc("get_receipt_by_token", { p_token: token });
        if (err) throw err;
        if (!data || data.length === 0) setError("Érvénytelen vagy lejárt link.");
        else setResult(data[0]);
      } catch (err) {
        setError(err.message || "Hiba történt a keresés közben.");
      } finally {
        setBusy(false);
      }
    })();
  }, [token]);

  const expiry = result ? warrantyExpiry(result.date, result.warranty) : null;
  const active = result ? isWarrantyActive(result.date, result.warranty) : false;

  if (!token) return null;

  return (
    <div className="pub-shop">
      <PublicHeader activeNav="status" />
      <main className="pub-lookup-main">
      <div className="login-card" style={{ maxWidth: 440 }}>
        {busy && <div style={{ textAlign: "center", color: "#6B7280", fontSize: 13, padding: "10px 0" }}>Betöltés...</div>}
        {error && <div className="errbar">{error}</div>}
        {result && (
          <div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Vásárlási bizonylat</div>
              <div style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 700 }}>#{result.receipt_no}</div>
            </div>
            <div className="dp-section">
              <div className="dp-row"><span className="dp-key">Ügyfél</span><span className="dp-val">{result.customer_name || "—"}</span></div>
              <div className="dp-row"><span className="dp-key">Elérhetőség</span><span className="dp-val">{result.customer_phone || "—"}</span></div>
              <div className="dp-row"><span className="dp-key">Termék</span><span className="dp-val">{result.description}</span></div>
              <div className="dp-row"><span className="dp-key">Helyszín</span><span className="dp-val">{result.location_name || "—"}{result.location_phone ? ` · ${result.location_phone}` : ""}</span></div>
              <div className="dp-row"><span className="dp-key">Vásárlás dátuma</span><span className="dp-val">{result.date || "—"}</span></div>
              <div className="dp-row"><span className="dp-key">Ár</span><span className="dp-val">{money(result.amount)}</span></div>
              <div className="dp-row">
                <span className="dp-key">Garancia</span>
                <span className="dp-val">
                  {result.warranty ? (
                    <span className={`st ${active ? "st-kesz" : "st-kiadva"}`}>{active ? `Érvényes (${expiry}-ig)` : `Lejárt (${expiry})`}</span>
                  ) : (
                    <span className="st st-sikertelen">Nincs</span>
                  )}
                </span>
              </div>
            </div>
            {result.warranty && (
              <div style={{ background: "#F9FAFB", border: "1px solid #EEF0F2", borderRadius: 12, padding: 14, fontSize: 11, color: "#6B7280", lineHeight: 1.6, whiteSpace: "pre-line", marginTop: 14 }}>
                {SALE_WARRANTY_TERMS}
              </div>
            )}
          </div>
        )}
      </div>
      </main>
      <PublicFooter />
    </div>
  );
}
