import { useMemo, useState } from "react";
import { money, displayName, phoneCode, daysOnShelf, isSlowMoving, stockStatusLabel, conditionGradeLabel } from "../lib/utils";
import { SearchIcon, EditIcon, ListViewIcon, GridViewIcon, PhoneCaseIcon, ChevronDownIcon, CalendarIcon, WarrantyIcon } from "../components/icons";
import Thumb from "../components/Thumb";
import { EmptyState, LoadingState } from "../components/EmptyState";
import HistorySection from "../components/HistorySection";

const SORTS = [
  { key: "recent", label: "Legújabb elöl" },
  { key: "price-desc", label: "Ár: magas → alacsony" },
  { key: "price-asc", label: "Ár: alacsony → magas" },
  { key: "name", label: "Név A–Z" },
];

const BRAND_PRIORITY = ["Apple", "Samsung", "Huawei"];
function brandRank(brand) {
  const i = BRAND_PRIORITY.indexOf(brand);
  return i === -1 ? BRAND_PRIORITY.length : i;
}

function sortItems(items, sortBy) {
  const arr = [...items];
  if (sortBy === "recent") arr.sort((a, b) => brandRank(a.brand) - brandRank(b.brand));
  else if (sortBy === "price-desc") arr.sort((a, b) => (Number(b.salePrice) || 0) - (Number(a.salePrice) || 0));
  else if (sortBy === "price-asc") arr.sort((a, b) => (Number(a.salePrice) || 0) - (Number(b.salePrice) || 0));
  else if (sortBy === "name") arr.sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`));
  return arr;
}


export default function StockTab({
  effectiveLocFilter, locName, busy, setStockModal, search, setSearch, loadingData, filteredStock,
  locations, reserveLocId, setProductDetailId, setSellModal,
  soldStock,
}) {
  const [condFilter, setCondFilter] = useState("all"); // all | New | Refurbished
  const [sortBy, setSortBy] = useState("recent");
  const [view, setView] = useState("list"); // list | grid
  const [collapsedOverride, setCollapsedOverride] = useState({}); // loc.id -> bool
  const isCollapsed = (loc) => collapsedOverride[loc.id] ?? loc.name === "Tartalék";
  const toggleCollapse = (loc) => setCollapsedOverride((c) => ({ ...c, [loc.id]: !isCollapsed(loc) }));

  const condFiltered = useMemo(() => {
    return condFilter === "all" ? filteredStock : filteredStock.filter((i) => i.condition === condFilter);
  }, [filteredStock, condFilter]);

  const visibleLocations = effectiveLocFilter === "all" ? locations : locations.filter((l) => l.id === effectiveLocFilter || l.id === reserveLocId);

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Telefonok</div><div className="page-sub">{effectiveLocFilter === "all" ? "Mindkét helyszín" : locName(effectiveLocFilter)}</div></div>
        <button className="btn" disabled={busy} onClick={() => setStockModal("add")}>+ Új termék</button>
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
                    <thead><tr><th>Termék</th><th>Állapot</th><th>Ár</th><th></th></tr></thead>
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
                                <div className="stk-sub">{[phoneCode(i.productNo), i.storage].filter(Boolean).join(" · ") || "—"}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="stk-badges">
                              <span className={`st ${i.condition === "New" ? "st-kesz" : "st-beveve"}`}>{conditionGradeLabel(i.condition, i.grade)}</span>
                              {i.warranty && <span className="gar-pill"><WarrantyIcon width={10} height={10} />{i.warranty}</span>}
                            </div>
                          </td>
                          <td className="mono" style={{ fontWeight: 800 }} title={`Beszerzési ár: ${money(i.costPrice)}`}>{money(i.salePrice)}</td>
                          <td className="stk-actions" onClick={(e) => e.stopPropagation()}>
                            <button className="btn sec sm" disabled={busy} onClick={() => setSellModal(i)}>Eladás</button>
                            <button className="iconbtn" disabled={busy} onClick={() => setStockModal(i)}><EditIcon /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="stk-grid">
                  {items.map((i) => {
                    const slow = isSlowMoving(i, reserveLocId);
                    return (
                      <div key={i.id} className="stk-card" onClick={() => setProductDetailId(i.id)}>
                        <div className="stk-card-top">
                          <Thumb brand={i.brand} size="lg" />
                          <span className="stk-card-code">{phoneCode(i.productNo)}</span>
                        </div>
                        <div className="stk-card-name">
                          {displayName(i.brand, i.model)}
                          {i.stockStatus === "javitando" && <span className="tag" style={{ marginLeft: 6, background: "var(--danger-soft)", color: "var(--danger-ink)", fontWeight: 700 }}>Javítandó</span>}
                          {i.stockStatus === "lefoglalt" && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "#9CA3AF", background: "#F1F2F6", borderRadius: 999, padding: "2px 7px" }}>{stockStatusLabel(i.stockStatus)}</span>}
                        </div>
                        <div className="stk-card-meta">
                          {[conditionGradeLabel(i.condition, i.grade), i.storage].filter(Boolean).join(" · ")}
                          {i.warranty && <span className="stk-card-warranty">{(i.condition || i.storage) && " · "}{i.warranty}<WarrantyIcon width={11} height={11} /></span>}
                        </div>
                        <div className="stk-card-price-row" title={`Beszerzési ár: ${money(i.costPrice)}`}>
                          <div className="stk-card-price">{money(i.salePrice)}</div>
                          <div className={`stk-card-days${slow ? " warn" : ""}`}><CalendarIcon width={13} height={13} />{daysOnShelf(i.dateAdded)}</div>
                        </div>
                        <div className="stk-card-actions">
                          <button className="iconbtn stk-card-iconbtn edit" disabled={busy} onClick={(e) => { e.stopPropagation(); setStockModal(i); }}><EditIcon /></button>
                          <button className="btn sm" disabled={busy} onClick={(e) => { e.stopPropagation(); setSellModal(i); }}>Eladás</button>
                        </div>
                      </div>
                    );
                  })}
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
