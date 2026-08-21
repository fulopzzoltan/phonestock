import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import { money, statusCls, subStatusLabel, warrantyExpiry, isWarrantyActive, SERVICE_WARRANTY_TERMS } from "./lib/utils";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";

export default function StatusLookup({ token, shortCode }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(!!token || !!shortCode);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [matches, setMatches] = useState(null);

  useEffect(() => {
    if (!token && !shortCode) return;
    (async () => {
      try {
        const { data, error: err } = shortCode
          ? await supabase.rpc("get_ticket_status_by_short_code", { p_code: shortCode })
          : await supabase.rpc("get_ticket_status_by_token", { p_token: token });
        if (err) throw err;
        if (!data || data.length === 0) setError("Érvénytelen vagy lejárt link.");
        else setResult(data[0]);
      } catch (err) {
        setError(err.message || "Hiba történt a keresés közben.");
      } finally {
        setBusy(false);
      }
    })();
  }, [token, shortCode]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    setMatches(null);
    try {
      const { data, error: err } = await supabase.rpc("get_ticket_status_by_name_phone", {
        p_name: name,
        p_phone: phone,
      });
      if (err) throw err;
      if (!data || data.length === 0) {
        setError("Nem található munkalap ezzel a névvel és telefonszámmal.");
      } else if (data.length === 1) {
        setResult(data[0]);
      } else {
        setMatches(data);
      }
    } catch (err) {
      setError(err.message || "Hiba történt a keresés közben.");
    } finally {
      setBusy(false);
    }
  }

  const probs = (result?.issue || "").split(",").map((p) => p.trim()).filter(Boolean);
  const handedOver = result?.sub_status === "Átadva";
  const warrantyFrom = result?.date_out || null;
  const expiry = handedOver ? warrantyExpiry(warrantyFrom, result?.warranty) : null;
  const active = handedOver ? isWarrantyActive(warrantyFrom, result?.warranty) : false;

  return (
    <div className="pub-shop">
      <PublicHeader activeNav="status" />
      <main className="pub-lookup-main">
      <div className="login-card" style={{ maxWidth: 460 }}>
        {!result && <div className="login-title">Javítás állapota</div>}
        {error && <div className="errbar">{error}</div>}
        {busy && !result && <div style={{ textAlign: "center", color: "#6B7280", fontSize: 13, padding: "10px 0" }}>Betöltés...</div>}
        {!token && !shortCode && !result && !matches && !busy && (
          <form onSubmit={submit}>
            <div className="field"><label>Név</label><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="pl. Kovács János" /></div>
            <div className="field"><label>Telefonszám</label><input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xx xxx xxx" /></div>
            <button className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} disabled={busy} type="submit">
              {busy ? "Keresés..." : "Állapot lekérése"}
            </button>
          </form>
        )}
        {matches && (
          <div>
            <div className="login-note" style={{ marginBottom: 10 }}>Több munkalapot is találtunk — válaszd ki, melyiket keresed:</div>
            <div className="dp-section">
              {matches.map((m) => (
                <div key={m.ticket_no} className="dp-row" style={{ cursor: "pointer" }} onClick={() => { setResult(m); setMatches(null); }}>
                  <span className="dp-key">#{m.ticket_no} · {[m.brand, m.model].filter(Boolean).join(" ")}</span>
                  <span className={`st ${statusCls(m.status)}`}>{m.sub_status ? subStatusLabel(m.status, m.sub_status) : m.status}</span>
                </div>
              ))}
            </div>
            <button className="btn sec" style={{ width: "100%", justifyContent: "center", marginTop: 10 }} onClick={() => setMatches(null)}>Vissza</button>
          </div>
        )}
        {result && (
          <div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Szerviz átadási lap</div>
              <div style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 700 }}>#{result.ticket_no}</div>
            </div>
            <div className="dp-section">
              <div className="dp-row"><span className="dp-key">Ügyfél</span><span className="dp-val">{result.customer_name}</span></div>
              <div className="dp-row"><span className="dp-key">Elérhetőség</span><span className="dp-val">{result.customer_phone || "—"}</span></div>
              <div className="dp-row"><span className="dp-key">Eszköz</span><span className="dp-val">{[result.brand, result.model].filter(Boolean).join(" ")}</span></div>
              <div className="dp-row"><span className="dp-key">Helyszín</span><span className="dp-val">{result.location_name || "—"}{result.location_phone ? ` · ${result.location_phone}` : ""}</span></div>
              <div className="dp-row"><span className="dp-key">Bejelentett hibák</span><span className="dp-val">{probs.length ? probs.map((p, i) => <span key={i} className="prob-pill">{p}</span>) : "—"}</span></div>
              <div className="dp-row"><span className="dp-key">Javítási költség</span><span className="dp-val">{money(result.price)}</span></div>
              <div className="dp-row"><span className="dp-key">Átvéve</span><span className="dp-val">{result.date_in || "—"}</span></div>
              <div className="dp-row"><span className="dp-key">Átadva</span><span className="dp-val">{result.date_out || "—"}</span></div>
              <div className="dp-row">
                <span className="dp-key">Garancia</span>
                <span className="dp-val">
                  {!handedOver ? "—" : result.warranty ? (
                    <span className={`st ${active ? "st-kesz" : "st-kiadva"}`}>{active ? `Érvényes (${expiry}-ig)` : `Lejárt (${expiry})`}</span>
                  ) : (
                    <span className="st st-sikertelen">Nincs</span>
                  )}
                </span>
              </div>
            </div>
            <div style={{ textAlign: "center", margin: "16px 0" }}>
              <span className={`st ${statusCls(result.status)}`} style={{ fontSize: 14, padding: "8px 18px" }}>
                {result.sub_status ? subStatusLabel(result.status, result.sub_status) : result.status}
              </span>
            </div>
            <div style={{ background: "#F9FAFB", border: "1px solid #EEF0F2", borderRadius: 12, padding: 14, fontSize: 11, color: "#6B7280", lineHeight: 1.6, whiteSpace: "pre-line", marginBottom: 14 }}>
              {SERVICE_WARRANTY_TERMS}
            </div>
            {!token && !shortCode && (
              <button className="btn sec" style={{ width: "100%", justifyContent: "center" }} onClick={() => { setResult(null); setName(""); setPhone(""); }}>Új keresés</button>
            )}
          </div>
        )}
        {!token && !shortCode && !result && !matches && <div className="login-note">Írd be a neved és a leadáskor megadott telefonszámot.</div>}
        {!token && !shortCode && !result && !matches && (
          <div className="login-note" style={{ marginTop: 6 }}>
            Telefonvásárlás bizonylatát keresed? <a href="/receipt">Kattints ide</a>. Vissza a <a href="/">készlethez</a>.
          </div>
        )}
      </div>
      </main>
      <PublicFooter />
    </div>
  );
}
