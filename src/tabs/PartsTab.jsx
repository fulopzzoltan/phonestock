import { money, PART_CATEGORIES, partCode } from "../lib/utils";
import { SearchIcon, EditIcon } from "../components/icons";
import ConfirmDelete from "../components/ConfirmDelete";

export default function PartsTab({
  busy, setPartModal, partSearch, setPartSearch, loadingData, filteredParts, setPartDetailId, deletePart,
}) {
  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Alkatrész raktár</div><div className="page-sub">Közös raktár — mindkét helyszín</div></div>
        <button className="btn" disabled={busy} onClick={() => setPartModal("add")}>+ Új alkatrész</button>
      </div>
      <div className="filter-row">
        <div className="searchbar"><SearchIcon /><input placeholder="Keresés név, márka, kategória, forrás szerint..." value={partSearch} onChange={(e) => setPartSearch(e.target.value)} /></div>
      </div>
      {loadingData ? <div className="tw"><div className="empty">Betöltés...</div></div> : filteredParts.length === 0 ? <div className="tw"><div className="empty">Nincs találat.</div></div> : (
        [...PART_CATEGORIES, "Egyéb"].map((cat) => {
          const items = cat === "Egyéb"
            ? filteredParts.filter((p) => !PART_CATEGORIES.includes(p.category))
            : filteredParts.filter((p) => p.category === cat);
          if (items.length === 0) return null;
          return (
            <div key={cat} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>
                {cat} <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({items.length} db)</span>
              </div>
              <div className="tw">
                <table>
                  <thead><tr><th>#</th><th>Alkatrész</th><th>Márka/Illik</th><th>Készlet</th><th>Beérk. ár</th><th>Forrás</th><th></th></tr></thead>
                  <tbody>
                    {items.map((p) => (
                      <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setPartDetailId(p.id)}>
                        <td className="mono" style={{ color: "#9CA3AF" }}>{partCode(p.partNo)}</td>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td style={{ color: "#6B7280", fontSize: 12 }}>{[p.brand, p.modelFit].filter(Boolean).join(" · ") || "—"}</td>
                        <td style={{ fontWeight: 700 }}>{p.quantity} db</td>
                        <td className="mono" style={{ color: "#6B7280" }}>{money(p.costPrice)}</td>
                        <td style={{ color: "#6B7280", fontSize: 12 }}>{p.source || "—"}</td>
                        <td style={{ display: "flex", gap: 5 }} onClick={(e) => e.stopPropagation()}>
                          <button className="iconbtn" disabled={busy} onClick={() => setPartModal(p)}><EditIcon /></button>
                          <ConfirmDelete disabled={busy} onConfirm={() => deletePart(p.id)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
