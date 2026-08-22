import { useMemo } from "react";
import { money } from "../lib/utils";
import { InvoiceIcon } from "../components/icons";
import { EmptyState } from "../components/EmptyState";

export default function InvoicesTab({ transactions, locName, setIssueInvoiceModal }) {
  const docs = useMemo(
    () => transactions.filter((t) => t.smartbillDoc).sort((a, b) => (a.smartbillDoc.createdAt < b.smartbillDoc.createdAt ? 1 : -1)),
    [transactions]
  );

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Számlák</div></div>
        <button className="btn" onClick={() => setIssueInvoiceModal(true)}>+ Számla kiállítása</button>
      </div>

      {docs.length === 0 ? (
        <div className="tw"><EmptyState icon={InvoiceIcon}>Még nincs kiállított SmartBill számla.</EmptyState></div>
      ) : (
        <div className="tw">
          <table>
            <thead><tr><th>Leírás</th><th>Dátum</th><th>Helyszín</th><th>Összeg</th><th>Státusz</th><th>Szám</th><th></th></tr></thead>
            <tbody>
              {docs.map((t) => {
                const d = t.smartbillDoc;
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500, color: "#111827" }}>{t.description}</td>
                    <td style={{ color: "#6B7280" }}>{t.date}</td>
                    <td><span className="badge-loc">{locName(t.locationId)}</span></td>
                    <td className="mono" style={{ fontWeight: 700, color: "#15803D" }}>+{money(t.amount)}</td>
                    <td>
                      {d.status === "issued" && <span className="badge-loc" style={{ color: "#15803D" }}>Kiállítva</span>}
                      {d.status === "failed" && <span className="badge-loc" style={{ color: "#B91C1C" }} title={d.errorText || ""}>Hiba</span>}
                      {d.status === "pending" && <span className="badge-loc" style={{ color: "#6B7280" }}>Folyamatban</span>}
                    </td>
                    <td className="mono" style={{ color: "#6B7280" }}>
                      {d.status === "issued" ? `${d.smartbillSeries}-${d.smartbillNumber}` : "—"}
                    </td>
                    <td>
                      {d.status === "issued" && d.smartbillDocumentViewUrl && (
                        <a href={d.smartbillDocumentViewUrl} target="_blank" rel="noreferrer" className="btn sec sm">Megnyitás</a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
