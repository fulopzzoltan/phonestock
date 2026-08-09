import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import { money, statusCls } from "./lib/utils";

export default function StatusLookup({ token }) {
  const [ticketNo, setTicketNo] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(!!token);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data, error: err } = await supabase.rpc("get_ticket_status_by_token", { p_token: token });
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
      const { data, error: err } = await supabase.rpc("get_ticket_status", {
        p_ticket_no: Number(ticketNo),
        p_phone: phone,
      });
      if (err) throw err;
      if (!data || data.length === 0) {
        setError("Nem található munkalap ezzel a számmal és telefonszámmal.");
      } else {
        setResult(data[0]);
      }
    } catch (err) {
      setError(err.message || "Hiba történt a keresés közben.");
    } finally {
      setBusy(false);
    }
  }

  const probs = (result?.issue || "").split(",").map((p) => p.trim()).filter(Boolean);

  return (
    <div className="login-shell">
      <div className="login-card" style={{ maxWidth: 420 }}>
        <div className="login-brand">
          <div className="brand-icon"><svg viewBox="0 0 24 24"><path d="M17 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2zm-5 15a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3-7H9V5h6v5z" /></svg></div>
          <div className="brand-name">TELEF<span>O</span>NOS</div>
        </div>
        <div className="login-title">Javítás állapota</div>
        {error && <div className="errbar">{error}</div>}
        {busy && !result && <div style={{ textAlign: "center", color: "#6B7280", fontSize: 13, padding: "10px 0" }}>Betöltés...</div>}
        {!token && !result && !busy && (
          <form onSubmit={submit}>
            <div className="field"><label>Munkalapszám</label><input type="number" required value={ticketNo} onChange={(e) => setTicketNo(e.target.value)} placeholder="pl. 1102" /></div>
            <div className="field"><label>Telefonszám</label><input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xx xxx xxx" /></div>
            <button className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} disabled={busy} type="submit">
              {busy ? "Keresés..." : "Állapot lekérése"}
            </button>
          </form>
        )}
        {result && (
          <div>
            <div className="dp-section">
              <div className="dp-row"><span className="dp-key">Munkalap</span><span className="dp-val">#{result.ticket_no}</span></div>
              <div className="dp-row"><span className="dp-key">Ügyfél</span><span className="dp-val">{result.customer_name}</span></div>
              <div className="dp-row"><span className="dp-key">Eszköz</span><span className="dp-val">{[result.brand, result.model].filter(Boolean).join(" ")}</span></div>
              <div className="dp-row"><span className="dp-key">Helyszín</span><span className="dp-val">{result.location_name || "—"}</span></div>
              <div className="dp-row"><span className="dp-key">Beérkezés</span><span className="dp-val">{result.date_in}</span></div>
              {result.handover_date && <div className="dp-row"><span className="dp-key">Várható átadás</span><span className="dp-val">{result.handover_date}</span></div>}
              <div className="dp-row"><span className="dp-key">Díj</span><span className="dp-val">{money(result.price)}</span></div>
            </div>
            {probs.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {probs.map((p, i) => <span key={i} className="prob-pill">{p}</span>)}
              </div>
            )}
            <div style={{ textAlign: "center", margin: "18px 0" }}>
              <span className={`st ${statusCls(result.status)}`} style={{ fontSize: 14, padding: "8px 18px" }}>{result.status}</span>
            </div>
            {!token && (
              <button className="btn sec" style={{ width: "100%", justifyContent: "center" }} onClick={() => { setResult(null); setTicketNo(""); setPhone(""); }}>Új keresés</button>
            )}
          </div>
        )}
        {!token && <div className="login-note">Írd be a munkalapszámot (pl. #1102 esetén 1102) és a leadáskor megadott telefonszámot.</div>}
      </div>
    </div>
  );
}
