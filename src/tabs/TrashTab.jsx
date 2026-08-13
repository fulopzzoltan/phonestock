import { money } from "../lib/utils";
import ConfirmDelete from "../components/ConfirmDelete";

export default function TrashTab({
  trashLoading, trash, busy, restoreProduct, hardDeleteProduct, restorePart, hardDeletePart,
  restoreTransaction, hardDeleteTransaction, restoreTicket, hardDeleteTicket,
}) {
  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Kuka</div><div className="page-sub">Törölt tételek — bármikor visszaállíthatók</div></div>
      </div>
      {trashLoading || !trash ? <div className="tw"><div className="empty">Betöltés...</div></div> : (
        <>
          {trash.products.length === 0 && trash.parts.length === 0 && trash.transactions.length === 0 && trash.tickets.length === 0 && (
            <div className="tw"><div className="empty">A kuka üres.</div></div>
          )}
          {trash.products.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>Telefonok <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({trash.products.length} db)</span></div>
              <div className="tw">
                <table>
                  <thead><tr><th>Termék</th><th>IMEI</th><th>Ár</th><th></th></tr></thead>
                  <tbody>
                    {trash.products.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.brand} {p.model}</td>
                        <td className="mono" style={{ color: "#9CA3AF" }}>{p.imei || "—"}</td>
                        <td className="mono" style={{ fontWeight: 700 }}>{money(p.salePrice)}</td>
                        <td style={{ display: "flex", gap: 6 }}>
                          <button className="btn sec sm" disabled={busy} onClick={() => restoreProduct(p.id)}>Visszaállítás</button>
                          <ConfirmDelete variant="full" disabled={busy} onConfirm={() => hardDeleteProduct(p.id)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {trash.parts.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>Alkatrészek <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({trash.parts.length} db)</span></div>
              <div className="tw">
                <table>
                  <thead><tr><th>Alkatrész</th><th>Kategória</th><th>Készlet</th><th></th></tr></thead>
                  <tbody>
                    {trash.parts.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td style={{ color: "#6B7280", fontSize: 12 }}>{p.category || "—"}</td>
                        <td style={{ fontWeight: 700 }}>{p.quantity} db</td>
                        <td style={{ display: "flex", gap: 6 }}>
                          <button className="btn sec sm" disabled={busy} onClick={() => restorePart(p.id)}>Visszaállítás</button>
                          <ConfirmDelete variant="full" disabled={busy} onConfirm={() => hardDeletePart(p.id)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {trash.transactions.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>Bevételek &amp; Kiadások <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({trash.transactions.length} db)</span></div>
              <div className="tw">
                <table>
                  <thead><tr><th>Leírás</th><th>Összeg</th><th>Dátum</th><th></th></tr></thead>
                  <tbody>
                    {trash.transactions.map((t) => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 600 }}>{t.description}</td>
                        <td className="mono" style={{ fontWeight: 700, color: t.type === "income" ? "#15803D" : "#B91C1C" }}>{t.type === "income" ? "+" : "-"}{money(t.amount)}</td>
                        <td style={{ color: "#6B7280" }}>{t.date}</td>
                        <td style={{ display: "flex", gap: 6 }}>
                          <button className="btn sec sm" disabled={busy} onClick={() => restoreTransaction(t.id)}>Visszaállítás</button>
                          <ConfirmDelete variant="full" disabled={busy} onConfirm={() => hardDeleteTransaction(t.id)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {trash.tickets.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>Szerviz munkalapok <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({trash.tickets.length} db)</span></div>
              <div className="tw">
                <table>
                  <thead><tr><th>#</th><th>Ügyfél</th><th>Eszköz</th><th></th></tr></thead>
                  <tbody>
                    {trash.tickets.map((t) => (
                      <tr key={t.id}>
                        <td className="mono" style={{ color: "#9CA3AF" }}>{t.ticketNo}</td>
                        <td style={{ fontWeight: 600 }}>{t.customerName}</td>
                        <td style={{ color: "#6B7280" }}>{[t.brand, t.model].filter(Boolean).join(" ")}</td>
                        <td style={{ display: "flex", gap: 6 }}>
                          <button className="btn sec sm" disabled={busy} onClick={() => restoreTicket(t.id)}>Visszaállítás</button>
                          <ConfirmDelete variant="full" disabled={busy} onConfirm={() => hardDeleteTicket(t.id)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
