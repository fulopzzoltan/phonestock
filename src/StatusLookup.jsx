import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import { money, statusCls, subStatusLabel, warrantyExpiry, isWarrantyActive, SERVICE_WARRANTY_TERMS } from "./lib/utils";

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
  const handedOver = result?.sub_status === "Átadva";
  const warrantyFrom = result?.date_out || null;
  const expiry = handedOver ? warrantyExpiry(warrantyFrom, result?.warranty) : null;
  const active = handedOver ? isWarrantyActive(warrantyFrom, result?.warranty) : false;

  return (
    <div className="login-shell">
      <div className="login-card" style={{ maxWidth: 460 }}>
        <div className="login-brand">
          <div className="brand-icon"><svg viewBox="0 0 24 24"><path d="M17 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2zm-5 15a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3-7H9V5h6v5z" /></svg></div>
          <div className="brand-name">TELEF<span>O</span>NOS</div>
        </div>
        {!result && <div className="login-title">Javítás állapota</div>}
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
            {!token && (
              <button className="btn sec" style={{ width: "100%", justifyContent: "center" }} onClick={() => { setResult(null); setTicketNo(""); setPhone(""); }}>Új keresés</button>
            )}
          </div>
        )}
        {!token && !result && <div className="login-note">Írd be a munkalapszámot (pl. #1102 esetén 1102) és a leadáskor megadott telefonszámot.</div>}
      </div>
    </div>
  );
}
