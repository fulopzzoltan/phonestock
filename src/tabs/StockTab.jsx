import { useMemo, useState } from "react";
import { money, displayName, phoneCode, daysOnShelf, isSlowMoving, stockStatusLabel } from "../lib/utils";
import { SearchIcon, EditIcon, ListViewIcon, GridViewIcon, PhoneCaseIcon, ChevronDownIcon } from "../components/icons";
import ConfirmDelete from "../components/ConfirmDelete";
import Thumb from "../components/Thumb";
import { EmptyState, LoadingState } from "../components/EmptyState";
import HistorySection from "../components/HistorySection";

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


export default function StockTab({
  effectiveLocFilter, locName, busy, setStockModal, search, setSearch, loadingData, filteredStock,
  locations, reserveLocId, setProductDetailId, deleteProduct, setSellModal, stockStats,
  soldStock,
}) {
  const [condFilter, setCondFilter] = useState("all"); // all | New | Refurbished
  const [sortBy, setSortBy] = useState("recent");
  const [view, setView] = useState("list"); // list | grid
  const [slowOnly, setSlowOnly] = useState(false);
  const [collapsedOverride, setCollapsedOverride] = useState({}); // loc.id -> bool
  const isCollapsed = (loc) => collapsedOverride[loc.id] ?? loc.name === "Tartalék";
  const toggleCollapse = (loc) => setCollapsedOverride((c) => ({ ...c, [loc.id]: !isCollapsed(loc) }));

  const slowMovingCount = useMemo(() => filteredStock.filter((p) => isSlowMoving(p, reserveLocId)).length, [filteredStock, reserveLocId]);

  const condFiltered = useMemo(() => {
    let items = condFilter === "all" ? filteredStock : filteredStock.filter((i) => i.condition === condFilter);
    if (slowOnly) items = items.filter((p) => isSlowMoving(p, reserveLocId));
    return items;
  }, [filteredStock, condFilter, slowOnly, reserveLocId]);

  const visibleLocations = effectiveLocFilter === "all" ? locations : locations.filter((l) => l.id === effectiveLocFilter || l.id === reserveLocId);

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Telefonok</div><div className="page-sub">{effectiveLocFilter === "all" ? "Mindkét helyszín" : locName(effectiveLocFilter)}</div></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {slowMovingCount > 0 && (
            <button type="button" className="btn sec sm" style={slowOnly ? { borderColor: "var(--warning)", color: "var(--warning-ink)", background: "var(--warning-soft)" } : undefined} onClick={() => setSlowOnly((v) => !v)}>
              Lassan mozgó: {slowMovingCount} db
            </button>
          )}
          <button className="btn" disabled={busy} onClick={() => setStockModal("add")}>+ Új termék</button>
        </div>
      </div>

      <div className="statrow c4">
        <div className="statcard"><div className="lbl">Raktáron</div><div className="val">{stockStats.count} db</div></div>
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

      {loadingData ? <LoadingState /> : condFiltered.length === 0 ? <EmptyState icon={PhoneCaseIcon}>Nincs termék raktáron.</EmptyState> : (
        visibleLocations.map((loc) => {
          const items = sortItems(condFiltered.filter((i) => i.locationId === loc.id), sortBy);
          if (items.length === 0) return null;
          const isReserve = loc.name === "Tartalék";
          const collapsed = isCollapsed(loc);
          return (
            <div key={loc.id} style={{ marginBottom: 18 }}>
              {isReserve ? (
                <button type="button" className="history-toggle" style={{ marginBottom: 8 }} onClick={() => toggleCollapse(loc)}>
                  <PhoneCaseIcon width={14} height={14} />
                  <span>{loc.name} ({items.length} db)</span>
                  <ChevronDownIcon style={{ marginLeft: "auto", transform: collapsed ? undefined : "rotate(180deg)" }} />
                </button>
              ) : (
                <div className="loc-group-head">
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151" }}>
                    {loc.name} <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({items.length} db)</span>
                  </div>
                </div>
              )}

              {collapsed ? null : view === "list" ? (
                <div className="tw">
                  <table>
                    <thead><tr><th>Termék</th><th>Állapot</th><th>Ár</th><th>Besz.</th><th></th></tr></thead>
                    <tbody>
                      {items.map((i) => (
                        <tr key={i.id} style={{ cursor: "pointer" }} onClick={() => setProductDetailId(i.id)}>
                          <td>
                            <div className="stk-row">
                              <Thumb brand={i.brand} />
                              <div>
                                <div className="stk-name">
                                  {displayName(i.brand, i.model)}
                                  {i.stockStatus === "javitando" && <span className="tag" style={{ background: "var(--danger-soft)", color: "var(--danger-ink)", fontWeight: 700 }} title="Nem látszik a webshopban">Javítandó</span>}
                                  {i.stockStatus === "lefoglalt" && <span style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", background: "#F1F2F6", borderRadius: 999, padding: "2px 7px" }} title="Nem látszik a webshopban">{stockStatusLabel(i.stockStatus)}</span>}
                                  {isSlowMoving(i, reserveLocId) && <span className="tag" style={{ background: "var(--warning-soft)", color: "var(--warning-ink)", fontWeight: 700 }}>{daysOnShelf(i.dateAdded)} napja a polcon</span>}
                                </div>
                                <div className="stk-sub">{[phoneCode(i.productNo), i.storage, i.color].filter(Boolean).join(" · ") || "—"}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="stk-badges">
                              <span className={`st ${i.condition === "New" ? "st-kesz" : "st-beveve"}`}>{i.condition === "New" ? "Új" : `Felúj. ${i.grade || ""}`}</span>
                              {i.warranty && <span className="gar-pill">{i.warranty}</span>}
                            </div>
                          </td>
                          <td className="mono" style={{ fontWeight: 700 }}>{money(i.salePrice)}</td>
                          <td className="mono" style={{ color: "#6B7280" }}>{money(i.costPrice)}</td>
                          <td className="stk-actions" onClick={(e) => e.stopPropagation()}>
                            <button className="btn sec sm" disabled={busy} onClick={() => setSellModal(i)}>Eladás</button>
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
                        {displayName(i.brand, i.model)}
                        {i.stockStatus === "javitando" && <span className="tag" style={{ marginLeft: 6, background: "var(--danger-soft)", color: "var(--danger-ink)", fontWeight: 700 }} title="Nem látszik a webshopban">Javítandó</span>}
                        {i.stockStatus === "lefoglalt" && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "#9CA3AF", background: "#F1F2F6", borderRadius: 999, padding: "2px 7px" }} title="Nem látszik a webshopban">{stockStatusLabel(i.stockStatus)}</span>}
                        {isSlowMoving(i, reserveLocId) && <span className="tag" style={{ marginLeft: 6, background: "var(--warning-soft)", color: "var(--warning-ink)", fontWeight: 700 }}>{daysOnShelf(i.dateAdded)} napja a polcon</span>}
                      </div>
                      <div className="stk-card-sub">{[phoneCode(i.productNo), i.storage, i.color].filter(Boolean).join(" · ") || "—"}{i.warranty ? ` · ${i.warranty} gar.` : ""}</div>
                      <div className="stk-card-price">{money(i.salePrice)}</div>
                      <div className="stk-card-cost">besz. {money(i.costPrice)}</div>
                      <div className="stk-card-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="btn sec sm" disabled={busy} onClick={() => setSellModal(i)}>Eladás</button>
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

      <HistorySection
        icon={PhoneCaseIcon}
        label="Eladott telefonok"
        items={soldStock}
        searchPlaceholder="Keresés márka, modell, vevő szerint..."
        filterFn={(i, q) => [i.brand, i.model, i.saleTx?.customerName, phoneCode(i.productNo)].filter(Boolean).join(" ").toLowerCase().includes(q)}
      >
        {(rows) => (
          <table>
            <thead><tr><th>Termék</th><th>Helyszín</th><th>Eladva</th><th>Vevő</th><th>Ár</th></tr></thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id} style={{ cursor: "pointer" }} onClick={() => setProductDetailId(i.id)}>
                  <td>
                    <div className="stk-row">
                      <Thumb brand={i.brand} />
                      <div>
                        <div className="stk-name">{displayName(i.brand, i.model)}</div>
                        <div className="stk-sub">{[phoneCode(i.productNo), i.imei].filter(Boolean).join(" · ") || "—"}</div>
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
      </HistorySection>
    </>
  );
}
