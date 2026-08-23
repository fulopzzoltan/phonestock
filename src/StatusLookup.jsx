import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import { money, statusCls, subStatusLabel, warrantyExpiry, isWarrantyActive, SERVICE_WARRANTY_TERMS } from "./lib/utils";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import SignaturePad from "./components/SignaturePad";

const INTAKE_CONSENT_TEXT = "Átadom a készüléket javításra, elfogadom a leírt hibát/állapotot";

export default function StatusLookup({ token, shortCode, signStage }) {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(!!token || !!shortCode);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [matches, setMatches] = useState(null);
  const [signature, setSignature] = useState(null);
  const [signerName, setSignerName] = useState("");
  const [signBusy, setSignBusy] = useState(false);
  const [signError, setSignError] = useState("");

  const signMode = signStage === "service_intake" || signStage === "service_handover";

  useEffect(() => {
    if (!token && !shortCode) return;
    (async () => {
      try {
        const { data, error: err } = shortCode
          ? await supabase.rpc("get_ticket_status_by_short_code", { p_code: shortCode })
          : await supabase.rpc("get_ticket_status_by_token", { p_token: token });
        if (err) throw err;
        if (!data || data.length === 0) {
          setError("Érvénytelen vagy lejárt link.");
          return;
        }
        setResult({ kind: "ticket", ...data[0] });
        setSignerName(data[0].customer_name || "");
        if (signMode && token) {
          const { data: sigs } = await supabase.rpc("get_public_signatures", { p_kind: "ticket", p_token: token });
          const existing = (sigs || []).find((s) => s.stage === signStage);
          if (existing) setSignature(existing);
        }
      } catch (err) {
        setError(err.message || "Hiba történt a keresés közben.");
      } finally {
        setBusy(false);
      }
    })();
  }, [token, shortCode]);

  async function submitSignature(dataUrl) {
    setSignBusy(true);
    setSignError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("submit-signature", {
        body: { token, kind: "ticket", stage: signStage, signerName, imageDataUrl: dataUrl },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setSignature({ stage: signStage, signer_name: data.signature.signerName, signed_at: data.signature.signedAt, image_path: data.signature.imagePath });
    } catch (err) {
      setSignError(err.message || "Hiba történt az aláírás mentése közben.");
    } finally {
      setSignBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    setMatches(null);
    try {
      const [ticketsRes, purchasesRes] = await Promise.all([
        supabase.rpc("get_ticket_status_by_phone", { p_phone: phone }),
        supabase.rpc("get_receipt_by_phone", { p_phone: phone }),
      ]);
      if (ticketsRes.error) throw ticketsRes.error;
      if (purchasesRes.error) throw purchasesRes.error;
      const combined = [
        ...(ticketsRes.data || []).map((t) => ({ kind: "ticket", ...t })),
        ...(purchasesRes.data || []).map((r) => ({ kind: "purchase", ...r })),
      ];
      if (combined.length === 0) {
        setError("Nem található munkalap vagy vásárlás ezzel a telefonszámmal.");
      } else if (combined.length === 1) {
        setResult(combined[0]);
      } else {
        setMatches(combined);
      }
    } catch (err) {
      setError(err.message || "Hiba történt a keresés közben.");
    } finally {
      setBusy(false);
    }
  }

  const isTicket = result?.kind === "ticket";
  const isPurchase = result?.kind === "purchase";
  const probs = (result?.issue || "").split(",").map((p) => p.trim()).filter(Boolean);
  const handedOver = result?.sub_status === "Átadva";
  const handoverAllowed = result?.status === "Átadásra" && result?.sub_status !== "Sikertelen";
  const warrantyFrom = result?.date_out || null;
  const ticketExpiry = handedOver ? warrantyExpiry(warrantyFrom, result?.warranty) : null;
  const ticketActive = handedOver ? isWarrantyActive(warrantyFrom, result?.warranty) : false;
  const purchaseExpiry = isPurchase ? warrantyExpiry(result.date, result.warranty) : null;
  const purchaseActive = isPurchase ? isWarrantyActive(result.date, result.warranty) : false;

  return (
    <div className="pub-shop">
      <PublicHeader activeNav="status" />
      <main className="pub-lookup-main">
      <div className="login-card" style={{ maxWidth: 460 }}>
        {!result && <div className="login-title">Vásárlás / szerviz állapota</div>}
        {error && <div className="errbar">{error}</div>}
        {busy && !result && <div style={{ textAlign: "center", color: "#6B7280", fontSize: 13, padding: "10px 0" }}>Betöltés...</div>}
        {!token && !shortCode && !result && !matches && !busy && (
          <form onSubmit={submit}>
            <div className="field"><label>Telefonszám</label><input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xx xxx xxx" /></div>
            <button className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} disabled={busy} type="submit">
              {busy ? "Keresés..." : "Adatok lekérése"}
            </button>
          </form>
        )}
        {matches && !result && (
          <div>
            <div className="login-note" style={{ marginBottom: 10 }}>Több találatot is találtunk — válaszd ki, melyiket keresed:</div>
            <div className="dp-section">
              {matches.map((m) => (
                <div key={`${m.kind}-${m.kind === "ticket" ? m.ticket_no : m.receipt_no}`} className="dp-row" style={{ cursor: "pointer" }} onClick={() => setResult(m)}>
                  <span className="dp-key">
                    <span className="badge-loc" style={{ marginRight: 6 }}>{m.kind === "ticket" ? "Szerviz" : "Vásárlás"}</span>
                    #{m.kind === "ticket" ? m.ticket_no : m.receipt_no} · {m.kind === "ticket" ? [m.brand, m.model].filter(Boolean).join(" ") : m.description}
                    <br /><span style={{ color: "#9CA3AF", fontWeight: 500 }}>{m.customer_name}</span>
                  </span>
                  {m.kind === "ticket" ? (
                    <span className={`st ${statusCls(m.status)}`}>{m.sub_status ? subStatusLabel(m.status, m.sub_status) : m.status}</span>
                  ) : (
                    <span className="dp-val mono">{money(m.amount)}</span>
                  )}
                </div>
              ))}
            </div>
            <button className="btn sec" style={{ width: "100%", justifyContent: "center", marginTop: 10 }} onClick={() => setMatches(null)}>Vissza</button>
          </div>
        )}
        {isTicket && (
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
                    <span className={`st ${ticketActive ? "st-kesz" : "st-kiadva"}`}>{ticketActive ? `Érvényes (${ticketExpiry}-ig)` : `Lejárt (${ticketExpiry})`}</span>
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
            {signMode && signStage === "service_handover" && !handoverAllowed && (
              <div className="errbar" style={{ marginBottom: 14 }}>Ez a munkalap még nincs átadásra kész.</div>
            )}
            {signMode && (signStage === "service_intake" || handoverAllowed) && (
              signature ? (
                <div className="dp-section" style={{ marginBottom: 14, textAlign: "center" }}>
                  <div style={{ color: "#22C55E", fontWeight: 700, fontSize: 14 }}>✓ Aláírva — {signature.signer_name}</div>
                  <div style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>{new Date(signature.signed_at).toLocaleString("hu-HU")}</div>
                </div>
              ) : (
                <div className="dp-section" style={{ marginBottom: 14 }}>
                  <div className="dp-section-title">{signStage === "service_intake" ? "Átvételi aláírás" : "Átadási aláírás"}</div>
                  {signStage === "service_intake" && (
                    <div style={{ fontSize: 12.5, color: "#374151", marginBottom: 10, lineHeight: 1.5 }}>{INTAKE_CONSENT_TEXT}</div>
                  )}
                  {signError && <div className="errbar" style={{ marginBottom: 10 }}>{signError}</div>}
                  <div className="field" style={{ marginBottom: 10 }}>
                    <label>Aláíró neve</label>
                    <input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Név" />
                  </div>
                  <SignaturePad onSave={submitSignature} busy={signBusy} />
                </div>
              )
            )}
            {!token && !shortCode && (
              <div style={{ display: "flex", gap: 8 }}>
                {matches && <button className="btn sec" style={{ flex: 1, justifyContent: "center" }} onClick={() => setResult(null)}>← Vissza a találatokhoz</button>}
                <button className="btn sec" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setResult(null); setMatches(null); setPhone(""); }}>Új keresés</button>
              </div>
            )}
          </div>
        )}
        {isPurchase && (
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
                    <span className={`st ${purchaseActive ? "st-kesz" : "st-kiadva"}`}>{purchaseActive ? `Érvényes (${purchaseExpiry}-ig)` : `Lejárt (${purchaseExpiry})`}</span>
                  ) : (
                    <span className="st st-sikertelen">Nincs</span>
                  )}
                </span>
              </div>
            </div>
            {!token && !shortCode && (
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {matches && <button className="btn sec" style={{ flex: 1, justifyContent: "center" }} onClick={() => setResult(null)}>← Vissza a találatokhoz</button>}
                <button className="btn sec" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setResult(null); setMatches(null); setPhone(""); }}>Új keresés</button>
              </div>
            )}
          </div>
        )}
        {!token && !shortCode && !result && !matches && <div className="login-note">Írd be a leadáskor/vásárláskor megadott telefonszámot — a szervizmunkáidat és a vásárlásaidat is megmutatjuk.</div>}
        {!token && !shortCode && !result && !matches && (
          <div className="login-note" style={{ marginTop: 6 }}>
            Vissza a <a href="/">készlethez</a>.
          </div>
        )}
      </div>
      </main>
      <PublicFooter />
    </div>
  );
}
