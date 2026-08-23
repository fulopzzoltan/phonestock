import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { PhoneCaseIcon } from "./icons";

export default function FoliaUpsellBanner({ token, deviceLabel, onDone }) {
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
    <div style={{ background: "var(--primary-soft)", border: "1px solid var(--primary)", borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 10, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary-ink)" }}>
          <PhoneCaseIcon width={26} height={26} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#111827", marginBottom: 4 }}>Szuper hír a gépedről! ⚡</div>
          <div style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.5 }}>
            Mivel a {deviceLabel ? <b>{deviceLabel}</b> : "géped"}-ed most nálunk van szervizelés alatt, egyetlen kattintással kérhetsz rá egy védőfóliát is, felhelyezéssel.
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: "var(--primary-ink)" }}>30 Lei</span>
        <span style={{ fontSize: 13, color: "#9CA3AF", textDecoration: "line-through" }}>49 Lei</span>
        <span style={{ fontSize: 11.5, color: "#6B7280" }}>a helyszíni ár helyett</span>
      </div>
      {message && <div style={{ fontSize: 12, color: "#B91C1C", marginBottom: 10 }}>{message}</div>}
      <button
        type="button"
        className="btn"
        style={{ width: "100%", justifyContent: "center", fontWeight: 700 }}
        disabled={busy}
        onClick={submit}
      >
        {busy ? "Feldolgozás..." : "IGEN, KÉREM A FÓLIÁZÁST 30 LEI-ÉRT"}
      </button>
    </div>
  );
}
