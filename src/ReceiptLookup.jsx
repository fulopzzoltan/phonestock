import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import { money, warrantyExpiry, isWarrantyActive, SALE_WARRANTY_TERMS } from "./lib/utils";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import SignaturePad from "./components/SignaturePad";

const SALE_CONSENT_TEXT = "Megvásároltam, átvettem, elfogadom a garanciafeltételeket";

// Kézzel beírt keresés (token nélkül) mostantól a /status egyesített oldalon zajlik
// (szerviz + vásárlás egy helyen, telefonszám alapján) — ez a komponens csak a
// már kinyomtatott/kiküldött /receipt/:token linkeket szolgálja ki, hogy azok
// visszamenőleg is működjenek.
export default function ReceiptLookup({ token, signStage }) {
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [signature, setSignature] = useState(null);
  const [signerName, setSignerName] = useState("");
  const [signBusy, setSignBusy] = useState(false);
  const [signError, setSignError] = useState("");

  const signMode = signStage === "sale";

  useEffect(() => {
    if (!token) {
      window.location.replace("/status");
      return;
    }
    (async () => {
      try {
        const { data, error: err } = await supabase.rpc("get_receipt_by_token", { p_token: token });
        if (err) throw err;
        if (!data || data.length === 0) {
          setError("Érvénytelen vagy lejárt link.");
          return;
        }
        setResult(data[0]);
        setSignerName(data[0].customer_name || "");
        if (signMode) {
          const { data: sigs } = await supabase.rpc("get_public_signatures", { p_kind: "purchase", p_token: token });
          const existing = (sigs || []).find((s) => s.stage === "sale");
          if (existing) setSignature(existing);
        }
      } catch (err) {
        setError(err.message || "Hiba történt a keresés közben.");
      } finally {
        setBusy(false);
      }
    })();
  }, [token]);

  async function submitSignature(dataUrl) {
    setSignBusy(true);
    setSignError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("submit-signature", {
        body: { token, kind: "purchase", stage: "sale", signerName, imageDataUrl: dataUrl },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setSignature({ stage: "sale", signer_name: data.signature.signerName, signed_at: data.signature.signedAt, image_path: data.signature.imagePath });
    } catch (err) {
      setSignError(err.message || "Hiba történt az aláírás mentése közben.");
    } finally {
      setSignBusy(false);
    }
  }

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
              <div style={{ fontSize: 16, fontWeight: 800 }}>{signMode ? "Aláírás — vásárlási bizonylat" : "Vásárlási bizonylat"}</div>
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
            {signMode && (
              signature ? (
                <div className="dp-section" style={{ marginTop: 14, textAlign: "center" }}>
                  <div style={{ color: "#22C55E", fontWeight: 700, fontSize: 14 }}>✓ Aláírva — {signature.signer_name}</div>
                  <div style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>{new Date(signature.signed_at).toLocaleString("hu-HU")}</div>
                </div>
              ) : (
                <div className="dp-section" style={{ marginTop: 14 }}>
                  <div className="dp-section-title">Aláírás</div>
                  <div style={{ fontSize: 12.5, color: "#374151", marginBottom: 10, lineHeight: 1.5 }}>{SALE_CONSENT_TEXT}</div>
                  {signError && <div className="errbar" style={{ marginBottom: 10 }}>{signError}</div>}
                  <div className="field" style={{ marginBottom: 10 }}>
                    <label>Aláíró neve</label>
                    <input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Név" />
                  </div>
                  <SignaturePad onSave={submitSignature} busy={signBusy} />
                </div>
              )
            )}
          </div>
        )}
      </div>
      </main>
      <PublicFooter />
    </div>
  );
}
