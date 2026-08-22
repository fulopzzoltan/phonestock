import { useState, useMemo } from "react";
import { CloseIcon } from "./icons";
import { money } from "../lib/utils";

export default function IssueInvoiceModal({ transactions, locName, onClose, onIssue, busy }) {
  const [search, setSearch] = useState("");
  const [selectedTx, setSelectedTx] = useState(null);
  const [buyerType, setBuyerType] = useState("person");
  const [companyName, setCompanyName] = useState("");
  const [companyCui, setCompanyCui] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions
      .filter((t) => t.type === "income")
      .filter((t) => !q || t.description.toLowerCase().includes(q) || (t.customerName || "").toLowerCase().includes(q))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 30);
  }, [transactions, search]);

  const valid = buyerType === "person" || (companyName.trim() && companyCui.trim());

  async function submit() {
    const client = buyerType === "company"
      ? { name: companyName.trim(), cui: companyCui.trim(), address: companyAddress.trim() || undefined }
      : undefined;
    const ok = await onIssue(selectedTx.id, selectedTx.locationId, client);
    if (ok) onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Számla kiállítása <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>

        {!selectedTx ? (
          <>
            <div className="field">
              <label>Tranzakció keresése</label>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Leírás vagy vevő neve..." autoFocus />
            </div>
            <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid #E5E7EB", borderRadius: 10 }}>
              {candidates.length === 0 && (
                <div style={{ padding: 16, color: "#6B7280", fontSize: 13 }}>Nincs találat.</div>
              )}
              {candidates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTx(t)}
                  style={{ padding: "10px 12px", borderBottom: "1px solid #F1F2F6", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: "#111827" }}>{t.description}</div>
                    <div style={{ fontSize: 12, color: "#6B7280" }}>{t.date} · {locName(t.locationId)}{t.customerName ? ` · ${t.customerName}` : ""}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {t.smartbillDoc?.status === "issued" && <span className="badge-loc" style={{ color: "#15803D" }}>Van számla</span>}
                    <div className="mono" style={{ fontWeight: 700, color: "#15803D" }}>+{money(t.amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="field"><label>Tranzakció</label><input disabled value={`${selectedTx.description} — ${money(selectedTx.amount)} (${selectedTx.date})`} /></div>
            <button type="button" className="toggle-link" style={{ marginBottom: 12 }} onClick={() => setSelectedTx(null)}>← Másik tranzakció választása</button>

            <div className="field">
              <label style={{ display: "flex", gap: 16 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 500, textTransform: "none", letterSpacing: 0, cursor: "pointer" }}>
                  <input type="radio" name="buyerType" checked={buyerType === "person"} onChange={() => setBuyerType("person")} /> Magánszemély
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 500, textTransform: "none", letterSpacing: 0, cursor: "pointer" }}>
                  <input type="radio" name="buyerType" checked={buyerType === "company"} onChange={() => setBuyerType("company")} /> Cég
                </span>
              </label>
            </div>

            {buyerType === "company" && (
              <>
                <div className="row2">
                  <div className="field"><label>Cégnév *</label><input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Példa S.R.L." /></div>
                  <div className="field"><label>CUI *</label><input value={companyCui} onChange={(e) => setCompanyCui(e.target.value)} placeholder="RO12345678" /></div>
                </div>
                <div className="field"><label>Cím</label><input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="Székhely cím" /></div>
              </>
            )}

            <div className="modal-actions">
              <button className="btn sec" onClick={onClose}>Mégse</button>
              <button className="btn" disabled={busy || !valid} onClick={submit}>{busy ? "Kiállítás..." : "Számla kiállítása"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
