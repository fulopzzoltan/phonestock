import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { ShieldCheckIcon } from "./icons";

const FOLIA_PRICE = 30;
const FOLIA_LIST_PRICE = 49;
const FOLIA_SAVING_PCT = Math.round((1 - FOLIA_PRICE / FOLIA_LIST_PRICE) * 100);
const FOLIA_SAVING_AMOUNT = FOLIA_LIST_PRICE - FOLIA_PRICE;

// Value-stack: nem "olcsóbb fólia", hanem a valós, ellenőrizhető előnyök, amiért pont
// most, itt éri meg igent mondani — Hormozi offer-logika (érzékelt érték fel, erőfeszítés/
// kockázat le), de csak olyan állítással, ami ténylegesen igaz a folyamatra.
const VALUE_STACK = [
  { emoji: "💯", title: "Buborékmentes garancia", text: "Szakemberünk patyolattisztán, tökéletesen helyezi fel." },
  { emoji: "⏳", title: "Időt spórolsz", text: "Már védve kapod vissza a telefont, nem kell máshova szaladgálnod." },
  { emoji: "💳", title: "Kényelmes fizetés", text: "Nincs macera, csak hozzáadjuk a végszámlához." },
];

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
    <div style={{ background: "var(--primary-soft)", border: "1px solid var(--primary)", borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: "0 10px 26px rgba(15,122,54,0.14)" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--warning)", color: "#451A03", fontSize: 10.5, fontWeight: 800, letterSpacing: 0.3, textTransform: "uppercase", padding: "4px 10px", borderRadius: 999, marginBottom: 10 }}>
        Spórolj {FOLIA_SAVING_AMOUNT} Leit, amíg a telefon nálunk van!
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 10, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary-ink)" }}>
          <ShieldCheckIcon width={24} height={24} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#111827", marginBottom: 4 }}>
            Tökéletes kijelző, nulla stressz: Kérsz rá egy prémium védőfóliát?
          </div>
          <div style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.5 }}>
            Ez a legjobb pillanat rá — utána, ha otthon próbálod felragasztani, könnyen kerül alá buborék vagy porszem. Itt egy kattintás, és a szervizzel együtt elkészül.
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {VALUE_STACK.map((v) => (
          <div key={v.title} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12, color: "#374151" }}>
            <span style={{ flexShrink: 0, marginTop: 1 }}>{v.emoji}</span>
            <span><b style={{ color: "#111827" }}>{v.title}</b> – {v.text}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: "var(--primary)", letterSpacing: -0.5 }}>{FOLIA_PRICE} Lei</span>
        <span style={{ fontSize: 13, color: "#9CA3AF", textDecoration: "line-through" }}>{FOLIA_LIST_PRICE} Lei</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "var(--danger)", padding: "2px 7px", borderRadius: 999 }}>-{FOLIA_SAVING_PCT}%</span>
      </div>
      <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 14 }}>a helyszíni {FOLIA_LIST_PRICE} Lei-es ár helyett — csak most, a szervizzel egyszerre</div>

      {message && <div style={{ fontSize: 12, color: "#B91C1C", marginBottom: 10 }}>{message}</div>}
      <div style={{ fontSize: 11, color: "#6B7280", textAlign: "center", marginBottom: 7 }}>
        Az ügyfeleink 80%-a kéri ezt a védelmet javítás után.
      </div>
      <button
        type="button"
        className="btn"
        style={{ width: "100%", justifyContent: "center", fontWeight: 700 }}
        disabled={busy}
        onClick={submit}
      >
        {busy ? "Feldolgozás..." : `KÉREM A FÓLIÁT (Csak +${FOLIA_PRICE} Lei)`}
      </button>
      <div style={{ fontSize: 10.5, color: "#9CA3AF", textAlign: "center", marginTop: 7 }}>
        Ha buborékos lenne, ingyen cseréljük! Fizetés csak átvételkor.
      </div>
    </div>
  );
}
