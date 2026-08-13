import { today, stripAccents } from "../lib/utils";
import { supabase } from "../lib/supabaseClient";
import CallLink from "../components/CallLink";

export default function WarrantyTab({
  busy, setWarrantyModal, activeWarranties, warrantyFilter, setWarrantyFilter, loadingData, filteredWarranties,
  setWarrantyDetailKey, locName, setError,
}) {
  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Garancia</div><div className="page-sub">Aktív garanciák — telefon és szerviz, kézzel is felvehető</div></div>
        <button className="btn" disabled={busy} onClick={() => setWarrantyModal("add")}>+ Garancia felvétele</button>
      </div>
      <div className="statrow c1">
        <div className="statcard accent"><div className="lbl">Aktív garancia</div><div className="val">{activeWarranties.length} db</div></div>
      </div>
      <div style={{ display: "flex", gap: 8, margin: "0 0 14px 2px" }}>
        {[["all", "Mind"], ["sale", "Telefon garancia"], ["service", "Szerviz garancia"]].map(([key, label]) => (
          <button key={key} type="button"
            className={`btn sec sm${warrantyFilter === key ? " active" : ""}`}
            style={warrantyFilter === key ? { background: "#111827", color: "#fff", borderColor: "#111827" } : undefined}
            onClick={() => setWarrantyFilter(key)}>{label}</button>
        ))}
      </div>
      <div className="tw">
        {loadingData ? <div className="empty">Betöltés...</div> : filteredWarranties.length === 0 ? <div className="empty">Nincs aktív garancia.</div> : (
          <table>
            <thead><tr><th>Típus</th><th>Ügyfél</th><th>Termék / Eszköz</th><th>Garancia</th><th>Lejárat</th><th>Helyszín</th><th>Művelet</th></tr></thead>
            <tbody>
              {filteredWarranties.map((w) => {
                const daysLeft = w.expiry ? Math.ceil((new Date(w.expiry) - new Date(today())) / 86400000) : null;
                function sendReminder(e) {
                  e.stopPropagation();
                  const message = stripAccents(`Szia! A(z) ${w.label} garanciája hamarosan lejár (${w.expiry}). Ha bármi gond van a készülékkel, keress minket!`);
                  supabase.functions.invoke("send-sms", { body: { phone: w.customerPhone, message } })
                    .then(() => alert("SMS elküldve."))
                    .catch((err) => { console.error(err); setError("Az SMS nem ment ki."); });
                }
                return (
                  <tr key={w.key} style={{ cursor: "pointer" }} onClick={() => setWarrantyDetailKey(w.key)}>
                    <td>{w.kind === "sale" ? <span className="badge-income">Eladás</span> : <span className="badge-loc">Szerviz</span>}</td>
                    <td style={{ fontWeight: 600 }}>{w.customerName || "—"}</td>
                    <td>{w.label || "—"}</td>
                    <td><span className="gar-pill">{w.warranty}</span></td>
                    <td className="mono" style={{ fontWeight: 700, color: daysLeft != null && daysLeft <= 14 ? "#DC2626" : "#111827" }}>
                      {w.expiry} {daysLeft != null && <span style={{ fontWeight: 500, color: "#9CA3AF" }}>({daysLeft} nap)</span>}
                    </td>
                    <td><span className="badge-loc">{locName(w.locationId)}</span></td>
                    <td style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                      <CallLink phone={w.customerPhone} />
                      <button type="button" className="btn sec sm" disabled={!w.customerPhone} onClick={sendReminder}>Emlékeztető SMS</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
