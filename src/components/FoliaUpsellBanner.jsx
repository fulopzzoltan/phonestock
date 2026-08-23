import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function FoliaUpsellBanner({ token, onDone }) {
  const [checked, setChecked] = useState(false);
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
      else setMessage(r?.message || "Hiba történt.");
    } catch (err) {
      setMessage(err.message || "Hiba történt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: 14, marginBottom: 14 }}>
      <div style={{ fontSize: 13, color: "#111827", lineHeight: 1.5, marginBottom: 10 }}>
        Amíg nálunk van a géped: védőfólia felhelyezése most csak <b>30 Lei</b> a szokásos 49 Lei helyett!
      </div>
      {message && <div style={{ fontSize: 12, color: "#B91C1C", marginBottom: 8 }}>{message}</div>}
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#374151", marginBottom: 10, cursor: "pointer" }}>
        <input type="checkbox" className="chk" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        Kérem a védőfóliát 30 Lei-ért
      </label>
      <button type="button" className="btn sm" disabled={!checked || busy} onClick={submit}>
        {busy ? "Feldolgozás..." : "Megrendelem"}
      </button>
    </div>
  );
}
