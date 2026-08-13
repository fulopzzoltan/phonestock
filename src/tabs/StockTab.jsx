import { money } from "../lib/utils";
import { SearchIcon, EditIcon } from "../components/icons";
import ConfirmDelete from "../components/ConfirmDelete";

export default function StockTab({
  effectiveLocFilter, locName, busy, setStockModal, search, setSearch, loadingData, filteredStock,
  locations, reserveLocId, setProductDetailId, deleteProduct, setSellModal,
}) {
  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Telefonok</div><div className="page-sub">{effectiveLocFilter === "all" ? "Mindkét helyszín" : locName(effectiveLocFilter)}</div></div>
        <button className="btn" disabled={busy} onClick={() => setStockModal("add")}>+ Új termék</button>
      </div>
      <div className="filter-row">
        <div className="searchbar"><SearchIcon /><input placeholder="Keresés..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>
      {loadingData ? <div className="empty">Betöltés...</div> : filteredStock.length === 0 ? <div className="empty">Nincs termék raktáron.</div> : (
        (effectiveLocFilter === "all" ? locations : locations.filter((l) => l.id === effectiveLocFilter || l.id === reserveLocId)).map((loc) => {
          const items = filteredStock.filter((i) => i.locationId === loc.id);
          if (items.length === 0) return null;
          return (
            <div key={loc.id} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "0 0 8px 2px" }}>
                {loc.name} <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({items.length} db)</span>
              </div>
              <div className="tw">
                {items.length === 0 ? <div className="empty">Nincs termék ezen a helyszínen.</div> : (
                  <table>
                    <thead><tr><th>Termék</th><th>Állapot</th><th>Tárhely/Szín</th><th>IMEI</th><th>Besz.</th><th>Ár</th><th></th></tr></thead>
                    <tbody>
                      {items.map((i) => (
                        <tr key={i.id} style={{ cursor: "pointer" }} onClick={() => setProductDetailId(i.id)}>
                          <td style={{ fontWeight: 600 }}>{i.brand} {i.model}</td>
                          <td><span className={`st ${i.condition === "New" ? "st-kesz" : "st-beveve"}`}>{i.condition === "New" ? "Új" : `Felúj. ${i.grade || ""}`}</span></td>
                          <td className="mono">{[i.storage, i.color].filter(Boolean).join(" / ") || "—"}</td>
                          <td className="mono" style={{ color: "#9CA3AF" }}>{i.imei || "—"}</td>
                          <td className="mono" style={{ color: "#6B7280" }}>{money(i.costPrice)}</td>
                          <td className="mono" style={{ fontWeight: 700 }}>{money(i.salePrice)}</td>
                          <td style={{ display: "flex", gap: 5 }} onClick={(e) => e.stopPropagation()}>
                            <button className="btn sec sm" disabled={busy} onClick={() => setSellModal(i)}>Eladva</button>
                            <button className="iconbtn" disabled={busy} onClick={() => setStockModal(i)}><EditIcon /></button>
                            <ConfirmDelete disabled={busy} onConfirm={() => deleteProduct(i.id)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
