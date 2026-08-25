import { money } from "../lib/utils";
import ConfirmDelete from "../components/ConfirmDelete";
import { TrashNavIcon } from "../components/icons";
import { EmptyState, LoadingState } from "../components/EmptyState";
import ResponsiveTable from "../components/ResponsiveTable";

export default function TrashTab({
  trashLoading, trash, busy, restoreProduct, hardDeleteProduct, restorePart, hardDeletePart,
  restoreTransaction, hardDeleteTransaction, restoreTicket, hardDeleteTicket, hardDeleteAllTrash,
}) {
  const totalCount = trash ? trash.products.length + trash.parts.length + trash.transactions.length + trash.tickets.length : 0;
  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Kuka</div></div>
        {totalCount > 0 && (
          <ConfirmDelete
            variant="full"
            disabled={busy}
            label="Kuka ürítése"
            confirmLabel={`Biztos? ${totalCount} tétel véglegesen törlődik.`}
            onConfirm={hardDeleteAllTrash}
          />
        )}
      </div>
      {trashLoading || !trash ? <div className="tw"><LoadingState /></div> : (
        <>
          {trash.products.length === 0 && trash.parts.length === 0 && trash.transactions.length === 0 && trash.tickets.length === 0 && (
            <div className="tw"><EmptyState icon={TrashNavIcon}>A kuka üres.</EmptyState></div>
          )}
          {trash.products.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>Telefonok <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({trash.products.length} db)</span></div>
              <ResponsiveTable
                columns={[{ key: "p", label: "Termék" }, { key: "i", label: "IMEI" }, { key: "a", label: "Ár" }, { key: "x", label: "" }]}
                rows={trash.products}
                rowKey={(p) => p.id}
                renderRow={(p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.brand} {p.model}</td>
                    <td className="mono" style={{ color: "#9CA3AF" }}>{p.imei || "—"}</td>
                    <td className="mono" style={{ fontWeight: 700 }}>{money(p.salePrice)}</td>
                    <td style={{ display: "flex", gap: 6 }}>
                      <button className="btn sec sm" disabled={busy} onClick={() => restoreProduct(p.id)}>Visszaállítás</button>
                      <ConfirmDelete variant="full" disabled={busy} onConfirm={() => hardDeleteProduct(p.id)} />
                    </td>
                  </tr>
                )}
                renderMobileRow={(p) => (
                  <div className="mob-row">
                    <div className="mob-row-top">
                      <div className="mob-row-main"><span>{p.brand} {p.model}</span></div>
                      <div className="mob-row-amount">{money(p.salePrice)}</div>
                    </div>
                    <div className="mob-row-sub">{p.imei || "—"}</div>
                    <div className="mob-row-sub" style={{ marginTop: 8 }}>
                      <button className="btn sec sm" disabled={busy} onClick={() => restoreProduct(p.id)}>Visszaállítás</button>
                      <ConfirmDelete variant="full" disabled={busy} onConfirm={() => hardDeleteProduct(p.id)} />
                    </div>
                  </div>
                )}
              />
            </div>
          )}
          {trash.parts.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>Alkatrészek <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({trash.parts.length} db)</span></div>
              <ResponsiveTable
                columns={[{ key: "p", label: "Alkatrész" }, { key: "c", label: "Kategória" }, { key: "q", label: "Készlet" }, { key: "x", label: "" }]}
                rows={trash.parts}
                rowKey={(p) => p.id}
                renderRow={(p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ color: "#6B7280", fontSize: 12 }}>{p.category || "—"}</td>
                    <td style={{ fontWeight: 700 }}>{p.quantity} db</td>
                    <td style={{ display: "flex", gap: 6 }}>
                      <button className="btn sec sm" disabled={busy} onClick={() => restorePart(p.id)}>Visszaállítás</button>
                      <ConfirmDelete variant="full" disabled={busy} onConfirm={() => hardDeletePart(p.id)} />
                    </td>
                  </tr>
                )}
                renderMobileRow={(p) => (
                  <div className="mob-row">
                    <div className="mob-row-top">
                      <div className="mob-row-main"><span>{p.name}</span></div>
                      <div className="mob-row-amount">{p.quantity} db</div>
                    </div>
                    <div className="mob-row-sub">{p.category || "—"}</div>
                    <div className="mob-row-sub" style={{ marginTop: 8 }}>
                      <button className="btn sec sm" disabled={busy} onClick={() => restorePart(p.id)}>Visszaállítás</button>
                      <ConfirmDelete variant="full" disabled={busy} onConfirm={() => hardDeletePart(p.id)} />
                    </div>
                  </div>
                )}
              />
            </div>
          )}
          {trash.transactions.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>Bevételek &amp; Kiadások <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({trash.transactions.length} db)</span></div>
              <ResponsiveTable
                columns={[{ key: "d", label: "Leírás" }, { key: "a", label: "Összeg" }, { key: "dt", label: "Dátum" }, { key: "x", label: "" }]}
                rows={trash.transactions}
                rowKey={(t) => t.id}
                renderRow={(t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.description}</td>
                    <td className="mono" style={{ fontWeight: 700, color: t.type === "income" ? "#15803D" : "#B91C1C" }}>{t.type === "income" ? "+" : "-"}{money(t.amount)}</td>
                    <td style={{ color: "#6B7280" }}>{t.date}</td>
                    <td style={{ display: "flex", gap: 6 }}>
                      <button className="btn sec sm" disabled={busy} onClick={() => restoreTransaction(t.id)}>Visszaállítás</button>
                      <ConfirmDelete variant="full" disabled={busy} onConfirm={() => hardDeleteTransaction(t.id)} />
                    </td>
                  </tr>
                )}
                renderMobileRow={(t) => (
                  <div className="mob-row">
                    <div className="mob-row-top">
                      <div className="mob-row-main"><span>{t.description}</span></div>
                      <div className="mob-row-amount" style={{ color: t.type === "income" ? "#15803D" : "#B91C1C" }}>{t.type === "income" ? "+" : "-"}{money(t.amount)}</div>
                    </div>
                    <div className="mob-row-sub">{t.date}</div>
                    <div className="mob-row-sub" style={{ marginTop: 8 }}>
                      <button className="btn sec sm" disabled={busy} onClick={() => restoreTransaction(t.id)}>Visszaállítás</button>
                      <ConfirmDelete variant="full" disabled={busy} onConfirm={() => hardDeleteTransaction(t.id)} />
                    </div>
                  </div>
                )}
              />
            </div>
          )}
          {trash.tickets.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>Szerviz munkalapok <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({trash.tickets.length} db)</span></div>
              <ResponsiveTable
                columns={[{ key: "n", label: "#" }, { key: "c", label: "Ügyfél" }, { key: "d", label: "Eszköz" }, { key: "x", label: "" }]}
                rows={trash.tickets}
                rowKey={(t) => t.id}
                renderRow={(t) => (
                  <tr key={t.id}>
                    <td className="mono" style={{ color: "#9CA3AF" }}>{t.ticketNo}</td>
                    <td style={{ fontWeight: 600 }}>{t.customerName}</td>
                    <td style={{ color: "#6B7280" }}>{[t.brand, t.model].filter(Boolean).join(" ")}</td>
                    <td style={{ display: "flex", gap: 6 }}>
                      <button className="btn sec sm" disabled={busy} onClick={() => restoreTicket(t.id)}>Visszaállítás</button>
                      <ConfirmDelete variant="full" disabled={busy} onConfirm={() => hardDeleteTicket(t.id)} />
                    </td>
                  </tr>
                )}
                renderMobileRow={(t) => (
                  <div className="mob-row">
                    <div className="mob-row-top">
                      <div className="mob-row-main"><span>{t.customerName}</span></div>
                      <div className="mob-row-amount">{t.ticketNo}</div>
                    </div>
                    <div className="mob-row-sub">{[t.brand, t.model].filter(Boolean).join(" ")}</div>
                    <div className="mob-row-sub" style={{ marginTop: 8 }}>
                      <button className="btn sec sm" disabled={busy} onClick={() => restoreTicket(t.id)}>Visszaállítás</button>
                      <ConfirmDelete variant="full" disabled={busy} onConfirm={() => hardDeleteTicket(t.id)} />
                    </div>
                  </div>
                )}
              />
            </div>
          )}
        </>
      )}
    </>
  );
}
