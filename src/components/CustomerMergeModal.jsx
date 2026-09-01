import { useMemo, useState } from "react";
import { CloseIcon } from "./icons";
import { formatPhone } from "../lib/utils";

// Admin-only eszköz két ügyfélkártya összevonására — 10 év alatt szinte biztos, hogy
// lesz olyan eset, hogy ugyanaz az ember kétszer kerül fel (más névírással, vagy mert
// a telefonszáma megváltozott). Ez a duplikátum kártyát PUHÁN törli (a meglévő
// trash-mintát követve), és minden vásárlást/munkalapot/garanciát/pontot átmozgat a
// megtartott kártyára — a tényleges munkát a `merge_customers` SQL-függvény végzi el,
// egyetlen tranzakcióban, hogy ne maradhasson félkész állapot.
export default function CustomerMergeModal({ primaryCustomer, customers, busy, onMerge, onClose }) {
  const [query, setQuery] = useState("");
  const [dupId, setDupId] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers
      .filter((c) => c.id !== primaryCustomer.id)
      .filter((c) => !q || [c.name, c.phone].filter(Boolean).join(" ").toLowerCase().includes(q))
      .slice(0, 8);
  }, [customers, query, primaryCustomer.id]);

  const dup = customers.find((c) => c.id === dupId) || null;

  function pick(c) {
    setDupId(c.id);
    setConfirming(false);
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <h2>Ügyfélkártya összevonása <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>

        <div style={{ fontSize: 12.5, color: "#6B7280", marginBottom: 16 }}>
          Megtartott kártya: <b style={{ color: "#111827" }}>{primaryCustomer.name || "Névtelen"}</b>
          {primaryCustomer.phone ? ` · ${formatPhone(primaryCustomer.phone)}` : ""}
        </div>

        {!dup ? (
          <div className="field">
            <label>Melyik kártyát vonjuk össze ezzel? (duplikátum)</label>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Keresés név vagy telefonszám szerint..." autoFocus />
            <div className="pick-list" style={{ marginTop: 6 }}>
              {matches.length === 0 ? (
                <div className="pick-empty">{query.trim() ? "Nincs találat." : "Kezdj el gépelni a kereséshez."}</div>
              ) : matches.map((c) => (
                <div key={c.id} className="pick-item" onClick={() => pick(c)}>
                  <span className="pick-name">{c.name || "Névtelen"}</span>
                  <span className="pick-sub">{formatPhone(c.phone) || "—"}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div style={{ padding: "10px 12px", background: "var(--warning-soft, #FEF3C7)", border: "1px solid var(--warning, #F59E0B)", borderRadius: 10, fontSize: 12.5, marginBottom: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--warning-ink, #92400E)" }}>
                Ez a kártya megszűnik: {dup.name || "Névtelen"}{dup.phone ? ` · ${formatPhone(dup.phone)}` : ""}
              </div>
              Minden vásárlása, munkalapja, garanciája, hűségpontja és webshop-fiókja átkerül
              a(z) <b>{primaryCustomer.name || "Névtelen"}</b> kártyára. A duplikátum kártya nem
              vész el véglegesen (a Kukában visszakereshető), de innentől nem használható önállóan.
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
              <button type="button" className="btn sec" onClick={() => { setDupId(null); setConfirming(false); }}>Másikat választok</button>
              {!confirming ? (
                <button type="button" className="btn" onClick={() => setConfirming(true)}>Összevonás</button>
              ) : (
                <button type="button" className="btn" style={{ background: "var(--danger, #DC2626)", borderColor: "var(--danger, #DC2626)" }} disabled={busy} onClick={() => onMerge(dup.id)}>
                  {busy ? "Összevonás..." : "Biztosan — összevonom"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
