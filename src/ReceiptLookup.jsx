import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import { money, warrantyExpiry, isWarrantyActive } from "./lib/utils";

export default function ReceiptLookup({ token }) {
  const [receiptNo, setReceiptNo] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(!!token);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!token) return;
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

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const { data, error: err } = await supabase.rpc("get_receipt", {
        p_receipt_no: Number(receiptNo),
        p_phone: phone,
      });
      if (err) throw err;
      if (!data || data.length === 0) setError("Nem található bizonylat ezzel a számmal és telefonszámmal.");
      else setResult(data[0]);
    } catch (err) {
      setError(err.message || "Hiba történt a keresés közben.");
    } finally {
      setBusy(false);
    }
  }

  const expiry = result ? warrantyExpiry(result.date, result.warranty) : null;
  const active = result ? isWarrantyActive(result.date, result.warranty) : false;

  return (
    <div className="login-shell">
      <div className="login-card" style={{ maxWidth: 440 }}>
        <div className="login-brand">
          <div className="brand-icon"><svg viewBox="0 0 24 24"><path d="M17 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2zm-5 15a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3-7H9V5h6v5z" /></svg></div>
          <div className="brand-name">TELEF<span>O</span>NOS</div>
        </div>
        {!result && <div className="login-title">Vásárlás / garancia</div>}
        {error && <div className="errbar">{error}</div>}
        {busy && !result && <div style={{ textAlign: "center", color: "#6B7280", fontSize: 13, padding: "10px 0" }}>Betöltés...</div>}
        {!token && !result && !busy && (
          <form onSubmit={submit}>
            <div className="field"><label>Bizonylatszám</label><input type="number" required value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} placeholder="pl. 500" /></div>
            <div className="field"><label>Telefonszám</label><input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xx xxx xxx" /></div>
            <button className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} disabled={busy} type="submit">
              {busy ? "Keresés..." : "Adatok lekérése"}
            </button>
          </form>
        )}
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
            {!token && (
              <button className="btn sec" style={{ width: "100%", justifyContent: "center", marginTop: 4 }} onClick={() => { setResult(null); setReceiptNo(""); setPhone(""); }}>Új keresés</button>
            )}
          </div>
        )}
        {!token && !result && <div className="login-note">Írd be a bizonylatszámot és a vásárláskor megadott telefonszámot.</div>}
        {!token && (
          <div className="login-note" style={{ marginTop: 6 }}>
            Szerviz munkalapot keresel? <a href="/status">Kattints ide</a>. Vissza a <a href="/">készlethez</a>.
          </div>
        )}
      </div>
    </div>
  );
}
