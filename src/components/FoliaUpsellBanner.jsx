import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

const FOLIA_PRICE = 30;
const FOLIA_LIST_PRICE = 49;

export default function FoliaUpsellBanner({ token, onDone }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabase.rpc("request_folia_upsell_by_token", { p_token: token });
      if (error) throw error;
      const r = data?.[0];
      if (r?.success) onDone(r.message);
      else { setMessage(r?.message || "Hiba történt."); setBusy(false); }
    } catch (err) {
      setMessage(err.message || "Hiba történt.");
      setBusy(false);
    }
  }

  return (
    <div style={{ background: "var(--pub-paper-raised)", border: "1.5px solid var(--primary)", borderRadius: 16, padding: 18, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
        <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--primary-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="var(--primary-ink)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" /></svg>
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4, color: "var(--primary-ink)", textTransform: "uppercase" }}>Akciós ajánlat</span>
      </div>

      <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 6 }}>Fóliázás akciós áron!</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: "var(--primary)" }}>{FOLIA_PRICE} Lei</span>
        <span style={{ fontSize: 12.5, color: "#9CA3AF", textDecoration: "line-through" }}>{FOLIA_LIST_PRICE} Lei</span>
      </div>
      <div style={{ fontSize: 12.5, color: "#5B6472", lineHeight: 1.55, marginBottom: 16 }}>
        Amíg nálunk van a készüléked, felrakjuk a kijelzővédő fóliát — csak most, a szervizzel egyszerre.
      </div>

      {message && <div style={{ fontSize: 12, color: "#B91C1C", marginBottom: 10 }}>{message}</div>}

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", border: "1px solid var(--pub-line)", borderRadius: 0, padding: "12px 14px", background: "none", cursor: busy ? "default" : "pointer", fontFamily: "inherit", textAlign: "left" }}
      >
        <span style={{ width: 17, height: 17, borderRadius: 5, border: "1.5px solid #C1C6CC", flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
          {busy ? "Feldolgozás..." : `Igen, kérem a fóliázást (+${FOLIA_PRICE} Lei)`}
        </span>
      </button>
    </div>
  );
}
