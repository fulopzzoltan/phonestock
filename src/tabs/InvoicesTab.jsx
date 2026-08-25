import { useMemo, useState } from "react";
import { money, today } from "../lib/utils";
import { InvoiceIcon, ChevronDownIcon } from "../components/icons";
import { EmptyState } from "../components/EmptyState";
import ResponsiveTable from "../components/ResponsiveTable";

const DOC_TYPE_LABELS = { invoice: "Számla", bon: "Bon", chitanta: "Nyugta" };
const QUICK_DOC_TYPES = [
  { key: "bon", label: "Bon" },
  { key: "chitanta", label: "Nyugta" },
  { key: "invoice", label: "Számla" },
];

function QuickIssuePanel({ defaultLocId, busy, onIssue }) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [docType, setDocType] = useState("bon");
  const [error, setError] = useState("");

  const valid = desc.trim() && Number(amount) > 0;

  async function submit() {
    setError("");
    const ok = await onIssue(desc.trim(), amount, customerName.trim(), docType, defaultLocId);
    if (ok) {
      setDesc(""); setAmount(""); setCustomerName(""); setOpen(false);
    } else {
      setError("Hiba történt a kiállítás közben.");
    }
  }

  return (
    <div className="tw" style={{ marginBottom: 16 }}>
      <button type="button" className="history-toggle" onClick={() => setOpen((v) => !v)}>
        <InvoiceIcon width={14} height={14} />
        <span>Gyors kiállítás — rendszerben nem rögzített eladáshoz</span>
        <ChevronDownIcon style={{ marginLeft: "auto", transform: open ? "rotate(180deg)" : undefined }} />
      </button>
      {open && (
        <div style={{ padding: 14, borderTop: "1px solid #F3F4F6" }}>
          {!defaultLocId && <div className="errbar" style={{ marginBottom: 10 }}>Válassz helyszínt a bal oldali sávban a rögzítéshez.</div>}
          {error && <div className="errbar" style={{ marginBottom: 10 }}>{error}</div>}
          <div className="row2">
            <div className="field"><label>Leírás</label><input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="pl. Fólia" /></div>
            <div className="field"><label>Összeg (Lei)</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></div>
          </div>
          <div className="field"><label>Vevő neve (opcionális)</label><input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="pl. Kovács János" /></div>
          <div className="field">
            <label>Dokumentum típusa</label>
            <div className="seg">
              {QUICK_DOC_TYPES.map((d) => (
                <button type="button" key={d.key} className={docType === d.key ? "active" : ""} onClick={() => setDocType(d.key)}>{d.label}</button>
              ))}
            </div>
          </div>
          <button className="btn" disabled={busy || !valid || !defaultLocId} onClick={submit}>
            {busy ? "Kiállítás..." : "Rögzítés + kiállítás"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function InvoicesTab({ transactions, locName, isAdmin, setIssueInvoiceModal, retrySmartbillDocument, issueDailyBons, quickIssueDocument, defaultLocId, busy }) {
  const docs = useMemo(
    () => transactions.filter((t) => t.smartbillDoc).sort((a, b) => (a.smartbillDoc.createdAt < b.smartbillDoc.createdAt ? 1 : -1)),
    [transactions]
  );
  const pendingBonCount = useMemo(() => {
    const todayStr = today();
    return transactions.filter((t) =>
      t.date === todayStr && t.type === "income" && ["Készpénz", "Kártya"].includes(t.payment)
      && t.locationId === defaultLocId && t.smartbillDoc?.status !== "issued"
    ).length;
  }, [transactions, defaultLocId]);

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Számlák</div></div>
        <div style={{ display: "flex", gap: 8 }}>
          {pendingBonCount > 0 && (
            <button className="btn sec" disabled={busy} onClick={issueDailyBons}>
              {busy ? "Kiállítás..." : `Napi bonok kiállítása (${pendingBonCount})`}
            </button>
          )}
          <button className="btn" onClick={() => setIssueInvoiceModal(true)}>+ Kiállítás</button>
        </div>
      </div>

      <QuickIssuePanel defaultLocId={defaultLocId} busy={busy} onIssue={quickIssueDocument} />

      {docs.length === 0 ? (
        <div className="tw"><EmptyState icon={InvoiceIcon}>Még nincs kiállított SmartBill dokumentum.</EmptyState></div>
      ) : (
        <ResponsiveTable
          columns={[{ key: "d", label: "Leírás" }, { key: "t", label: "Típus" }, { key: "dt", label: "Dátum" }, { key: "l", label: "Helyszín" }, { key: "a", label: "Összeg" }, { key: "s", label: "Státusz" }, { key: "n", label: "Szám" }, { key: "x", label: "" }]}
          rows={docs}
          rowKey={(t) => t.id}
          renderRow={(t) => {
            const d = t.smartbillDoc;
            return (
              <tr key={t.id}>
                <td style={{ fontWeight: 500, color: "#111827" }}>{t.description}</td>
                <td><span className="badge-loc">{DOC_TYPE_LABELS[d.docType] || d.docType}</span></td>
                <td style={{ color: "#6B7280" }}>{t.date}</td>
                <td><span className="badge-loc">{locName(t.locationId)}</span></td>
                <td className="mono" style={{ fontWeight: 700, color: "#15803D" }}>+{money(t.amount)}</td>
                <td>
                  {d.status === "issued" && <span className="badge-loc" style={{ color: "#15803D" }}>Kiállítva</span>}
                  {d.status === "failed" && <span className="badge-loc" style={{ color: "#B91C1C" }} title={d.errorText || ""}>Hiba{d.errorText ? `: ${d.errorText}` : ""}</span>}
                  {d.status === "pending" && <span className="badge-loc" style={{ color: "#6B7280" }}>Folyamatban</span>}
                </td>
                <td className="mono" style={{ color: "#6B7280" }}>
                  {d.status === "issued" ? `${d.smartbillSeries}-${d.smartbillNumber}` : "—"}
                </td>
                <td>
                  {d.status === "issued" && d.smartbillDocumentViewUrl && (
                    <a href={d.smartbillDocumentViewUrl} target="_blank" rel="noreferrer" className="btn sec sm">Megnyitás</a>
                  )}
                  {d.status === "failed" && (
                    <button type="button" className="btn sec sm" disabled={busy} onClick={() => retrySmartbillDocument(t)}>Újrapróbálás</button>
                  )}
                </td>
              </tr>
            );
          }}
          renderMobileRow={(t) => {
            const d = t.smartbillDoc;
            return (
              <div className="mob-row">
                <div className="mob-row-top">
                  <div className="mob-row-main"><span>{t.description}</span></div>
                  <div className="mob-row-amount" style={{ color: "#15803D" }}>+{money(t.amount)}</div>
                </div>
                <div className="mob-row-sub">
                  <span className="badge-loc">{DOC_TYPE_LABELS[d.docType] || d.docType}</span>
                  <span>{t.date}</span>
                  <span className="badge-loc">{locName(t.locationId)}</span>
                  {d.status === "issued" && <span style={{ color: "#15803D" }}>Kiállítva {d.smartbillSeries}-{d.smartbillNumber}</span>}
                  {d.status === "failed" && <span style={{ color: "#B91C1C" }}>Hiba{d.errorText ? `: ${d.errorText}` : ""}</span>}
                  {d.status === "pending" && <span style={{ color: "#6B7280" }}>Folyamatban</span>}
                </div>
                {(d.status === "issued" && d.smartbillDocumentViewUrl) || d.status === "failed" ? (
                  <div className="mob-row-sub" style={{ marginTop: 8 }}>
                    {d.status === "issued" && d.smartbillDocumentViewUrl && (
                      <a href={d.smartbillDocumentViewUrl} target="_blank" rel="noreferrer" className="btn sec sm">Megnyitás</a>
                    )}
                    {d.status === "failed" && (
                      <button type="button" className="btn sec sm" disabled={busy} onClick={() => retrySmartbillDocument(t)}>Újrapróbálás</button>
                    )}
                  </div>
                ) : null}
              </div>
            );
          }}
        />
      )}

      {isAdmin && (
        <div className="tw" style={{ marginTop: 16, padding: "12px 14px", fontSize: 12.5, color: "#6B7280" }}>
          A számlasorozat, ÁFA-kulcs és a SmartBill-kapcsolat tesztelése a Beállítások fülön található.
        </div>
      )}
    </>
  );
}
