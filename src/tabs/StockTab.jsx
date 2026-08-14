import { useMemo, useState } from "react";
import { money, brandColor } from "../lib/utils";
import { SearchIcon, EditIcon, ListViewIcon, GridViewIcon } from "../components/icons";
import ConfirmDelete from "../components/ConfirmDelete";

const SORTS = [
  { key: "recent", label: "Legújabb elöl" },
  { key: "price-desc", label: "Ár: magas → alacsony" },
  { key: "price-asc", label: "Ár: alacsony → magas" },
  { key: "name", label: "Név A–Z" },
];

function sortItems(items, sortBy) {
  if (sortBy === "recent") return items;
  const arr = [...items];
  if (sortBy === "price-desc") arr.sort((a, b) => (Number(b.salePrice) || 0) - (Number(a.salePrice) || 0));
  else if (sortBy === "price-asc") arr.sort((a, b) => (Number(a.salePrice) || 0) - (Number(b.salePrice) || 0));
  else if (sortBy === "name") arr.sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`));
  return arr;
}

function Thumb({ brand }) {
  return (
    <div className="stk-thumb" style={{ background: brandColor(brand) }}>
      {(brand || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function StockTab({
  effectiveLocFilter, locName, busy, setStockModal, search, setSearch, loadingData, filteredStock,
  locations, reserveLocId, setProductDetailId, deleteProduct, setSellModal, stockStats,
  showSold, setShowSold, soldStock,
}) {
  const [condFilter, setCondFilter] = useState("all"); // all | New | Refurbished
  const [sortBy, setSortBy] = useState("recent");
  const [view, setView] = useState("list"); // list | grid

  const condFiltered = useMemo(() => {
    if (condFilter === "all") return filteredStock;
    return filteredStock.filter((i) => i.condition === condFilter);
  }, [filteredStock, condFilter]);

  const visibleLocations = effectiveLocFilter === "all" ? locations : locations.filter((l) => l.id === effectiveLocFilter || l.id === reserveLocId);

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Telefonok</div><div className="page-sub">{effectiveLocFilter === "all" ? "Mindkét helyszín" : locName(effectiveLocFilter)}</div></div>
        <button className="btn" disabled={busy} onClick={() => setStockModal("add")}>+ Új termék</button>
      </div>

      <div className="statrow c4">
        <div className="statcard accent"><div className="lbl">Raktáron</div><div className="val">{stockStats.count} db</div></div>
        <div className="statcard"><div className="lbl">Készlet értéke</div><div className="val">{money(stockStats.value)}</div></div>
        <div className="statcard"><div className="lbl">Besz. érték</div><div className="val">{money(stockStats.cost)}</div></div>
        <div className="statcard"><div className="lbl">Várható profit</div><div className="val" style={{ color: "#22C55E" }}>{money(stockStats.profit)}</div></div>
      </div>

      <div className="filter-row">
        <div className="searchbar"><SearchIcon /><input placeholder="Keresés márka, modell, IMEI..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="seg">
          <button className={condFilter === "all" ? "active" : ""} onClick={() => setCondFilter("all")}>Mind</button>
          <button className={condFilter === "New" ? "active" : ""} onClick={() => setCondFilter("New")}>Új</button>
          <button className={condFilter === "Refurbished" ? "active" : ""} onClick={() => setCondFilter("Refurbished")}>Felújított</button>
        </div>
        <select className="filter-sel" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <div className="seg" style={{ marginLeft: "auto" }}>
          <button className={view === "list" ? "active" : ""} title="Lista nézet" onClick={() => setView("list")}><ListViewIcon /></button>
          <button className={view === "grid" ? "active" : ""} title="Rács nézet" onClick={() => setView("grid")}><GridViewIcon /></button>
        </div>
      </div>

      {loadingData ? <div className="empty">Betöltés...</div> : condFiltered.length === 0 ? <div className="empty">Nincs termék raktáron.</div> : (
        visibleLocations.map((loc) => {
          const items = sortItems(condFiltered.filter((i) => i.locationId === loc.id), sortBy);
          if (items.length === 0) return null;
          return (
            <div key={loc.id} style={{ marginBottom: 18 }}>
              <div className="loc-group-head">
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151" }}>
                  {loc.name} <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({items.length} db)</span>
                </div>
              </div>

              {view === "list" ? (
                <div className="tw">
                  <table>
                    <thead><tr><th>Termék</th><th>Állapot</th><th>Besz.</th><th>Ár</th><th></th></tr></thead>
                    <tbody>
                      {items.map((i) => (
                        <tr key={i.id} style={{ cursor: "pointer" }} onClick={() => setProductDetailId(i.id)}>
                          <td>
                            <div className="stk-row">
                              <Thumb brand={i.brand} />
                              <div>
                                <div className="stk-name">
                                  {i.brand} {i.model}
                                  {!i.onShelf && <span style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", background: "#F1F2F6", borderRadius: 999, padding: "2px 7px" }} title="Nem látszik a webshopban">nem polcon</span>}
                                </div>
                                <div className="stk-sub">{[i.storage, i.color, i.imei].filter(Boolean).join(" · ") || "—"}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="stk-badges">
                              <span className={`st ${i.condition === "New" ? "st-kesz" : "st-beveve"}`}>{i.condition === "New" ? "Új" : `Felúj. ${i.grade || ""}`}</span>
                              {i.warranty && <span className="gar-pill">{i.warranty}</span>}
                            </div>
                          </td>
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
                </div>
              ) : (
                <div className="stk-grid">
                  {items.map((i) => (
                    <div key={i.id} className="stk-card" onClick={() => setProductDetailId(i.id)}>
                      <div className="stk-card-top">
                        <Thumb brand={i.brand} />
                        <div className="stk-badges" style={{ justifyContent: "flex-end" }}>
                          <span className={`st ${i.condition === "New" ? "st-kesz" : "st-beveve"}`}>{i.condition === "New" ? "Új" : `Felúj. ${i.grade || ""}`}</span>
                        </div>
                      </div>
                      <div className="stk-card-name">
                        {i.brand} {i.model}
                        {!i.onShelf && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "#9CA3AF", background: "#F1F2F6", borderRadius: 999, padding: "2px 7px" }} title="Nem látszik a webshopban">nem polcon</span>}
                      </div>
                      <div className="stk-card-sub">{[i.storage, i.color].filter(Boolean).join(" · ") || "—"}{i.warranty ? ` · ${i.warranty} gar.` : ""}</div>
                      <div className="stk-card-price">{money(i.salePrice)}</div>
                      <div className="stk-card-cost">besz. {money(i.costPrice)}</div>
                      <div className="stk-card-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="btn sec sm" disabled={busy} onClick={() => setSellModal(i)}>Eladva</button>
                        <button className="iconbtn" disabled={busy} onClick={() => setStockModal(i)}><EditIcon /></button>
                        <ConfirmDelete disabled={busy} onConfirm={() => deleteProduct(i.id)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      <span className="toggle-link" onClick={() => setShowSold((v) => !v)}>
        {showSold ? "Eladott telefonok elrejtése" : `Eladott telefonok megtekintése (${soldStock.length})`}
      </span>
      {showSold && (
        <div className="tw" style={{ marginTop: 12 }}>
          {soldStock.length === 0 ? <div className="empty">Nincs eladott telefon.</div> : (
            <table>
              <thead><tr><th>Termék</th><th>Helyszín</th><th>Eladva</th><th>Vevő</th><th>Ár</th></tr></thead>
              <tbody>
                {soldStock.map((i) => (
                  <tr key={i.id} style={{ cursor: "pointer" }} onClick={() => setProductDetailId(i.id)}>
                    <td>
                      <div className="stk-row">
                        <Thumb brand={i.brand} />
                        <div>
                          <div className="stk-name">{i.brand} {i.model}</div>
                          <div className="stk-sub">{i.imei || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge-loc">{locName(i.locationId)}</span></td>
                    <td className="mono">{i.saleTx?.date || "—"}</td>
                    <td>{i.saleTx?.customerName || "—"}</td>
                    <td className="mono" style={{ fontWeight: 700 }}>{money(i.salePrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
