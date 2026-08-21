import { money } from "../lib/utils";
import { REPAIR_FAMILIES, PRICED_PROBLEMS, PROBLEM_LABELS } from "../lib/repairCatalog";
import { RepairPriceIcon } from "../components/icons";
import { EmptyState } from "../components/EmptyState";

export default function RepairPricesTab({
  repairPrices, setRepairPriceModal, repairLeads, repairLeadFilter, setRepairLeadFilter, busy,
  setRepairLeadConvert, setTicketModal, rejectRepairLead, locName,
}) {
  const filteredLeads = repairLeads.filter((l) => repairLeadFilter === "Mind" || l.status === repairLeadFilter);
  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Szerviz árbecslő</div></div>
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>Árazási mátrix</div>
      <div className="tw" style={{ marginBottom: 22 }}>
        <table>
          <thead><tr><th>Modellcsalád</th>{PRICED_PROBLEMS.map((tag) => <th key={tag}>{tag}</th>)}</tr></thead>
          <tbody>
            {Object.entries(REPAIR_FAMILIES).map(([familyKey, familyLabel]) => (
              <tr key={familyKey}>
                <td style={{ fontWeight: 600 }}>{familyLabel}</td>
                {PRICED_PROBLEMS.map((tag) => {
                  const row = repairPrices.find((p) => p.familyKey === familyKey && p.problemTag === tag);
                  return (
                    <td key={tag} style={{ cursor: "pointer" }} onClick={() => setRepairPriceModal({ familyKey, problemTag: tag, price: row })}>
                      {row?.priceOem != null ? (
                        <span className="mono" style={{ fontWeight: 700 }}>{money(row.priceOem)}</span>
                      ) : (
                        <span style={{ color: "#9CA3AF", fontSize: 12 }}>+ Ár megadása</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 8px 2px" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151" }}>Beérkezett érdeklődők <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({filteredLeads.length} db)</span></div>
        <div style={{ display: "flex", gap: 6 }}>
          {["Új", "Feldolgozva", "Elvetve", "Mind"].map((f) => (
            <button key={f} type="button" className={`btn sec sm${repairLeadFilter === f ? " active" : ""}`}
              style={repairLeadFilter === f ? { background: "#111827", color: "#fff", borderColor: "#111827" } : undefined}
              onClick={() => setRepairLeadFilter(f)}>{f}</button>
          ))}
        </div>
      </div>
      <div className="tw">
        {filteredLeads.length === 0 ? (
          <EmptyState icon={RepairPriceIcon}>Nincs ilyen státuszú érdeklődő.</EmptyState>
        ) : (
          <table>
            <thead><tr><th>Ügyfél</th><th>Telefon</th><th>Eszköz</th><th>Probléma</th><th>Becsült ár</th><th>Helyszín</th><th>Beérkezett</th><th></th></tr></thead>
            <tbody>
              {filteredLeads.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600 }}>{l.customerName}</td>
                  <td className="mono">{l.customerPhone}</td>
                  <td>{[l.brand, l.model].filter(Boolean).join(" ")}</td>
                  <td>{l.problemTag ? (PROBLEM_LABELS[l.problemTag] || l.problemTag) : (l.note || "—")}</td>
                  <td className="mono">{l.estimatedPrice != null ? money(l.estimatedPrice) : "—"}</td>
                  <td><span className="badge-loc">{locName(l.preferredLocationId)}</span></td>
                  <td className="mono" style={{ color: "#6B7280" }}>{(l.createdAt || "").slice(0, 10)}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    {l.status === "Új" && (
                      <>
                        <button className="btn sec sm" disabled={busy} onClick={() => { setRepairLeadConvert(l); setTicketModal("add"); }}>Munkalap létrehozása</button>
                        <button className="btn sec sm" disabled={busy} onClick={() => rejectRepairLead(l.id)}>Elvetés</button>
                      </>
                    )}
                    {l.status === "Feldolgozva" && <span className="badge-income">Feldolgozva</span>}
                    {l.status === "Elvetve" && <span style={{ color: "#9CA3AF", fontSize: 12 }}>Elvetve</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
