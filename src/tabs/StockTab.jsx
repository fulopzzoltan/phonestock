import { useMemo, useState } from "react";
import { money, displayName, phoneCode, daysOnShelf, isSlowMoving, stockStatusLabel, conditionGradeLabel } from "../lib/utils";
import { SearchIcon, PhoneCaseIcon, ChevronDownIcon, WarrantyIcon, ServiceIcon, CartIcon } from "../components/icons";
import { EmptyState, LoadingState } from "../components/EmptyState";
import HistorySection from "../components/HistorySection";
import ResponsiveTable from "../components/ResponsiveTable";

const BRAND_PRIORITY = ["Apple", "Samsung", "Huawei"];
function brandRank(brand) {
  const i = BRAND_PRIORITY.indexOf(brand);
  return i === -1 ? BRAND_PRIORITY.length : i;
}

function sortItems(items) {
  const arr = [...items];
  arr.sort((a, b) => brandRank(a.brand) - brandRank(b.brand));
  return arr;
}


export default function StockTab({
  effectiveLocFilter, locName, busy, search, setSearch, loadingData, filteredStock,
  locations, reserveLocId, setProductDetailId, setSellModal,
  soldStock, isAdmin = true, myLocationId = null,
}) {
  const [condFilter, setCondFilter] = useState("all"); // all | New | Refurbished
  const [collapsedOverride, setCollapsedOverride] = useState({}); // loc.id -> bool
  const isCollapsed = (loc) => collapsedOverride[loc.id] ?? loc.name === "Tartalék";
  const toggleCollapse = (loc) => setCollapsedOverride((c) => ({ ...c, [loc.id]: !isCollapsed(loc) }));
  // Alkalmazott csak a saját helyszínén (és a közös Tartalékon) tud eladni/szerkeszteni —
  // a másik helyszín készletét csak megtekintheti.
  const canAct = (item) => isAdmin || item.locationId === myLocationId || item.locationId === reserveLocId;

  const condFiltered = useMemo(() => (
    condFilter === "all" ? filteredStock : filteredStock.filter((i) => i.condition === condFilter)
  ), [filteredStock, condFilter]);

  const visibleLocations = effectiveLocFilter === "all" ? locations : locations.filter((l) => l.id === effectiveLocFilter || l.id === reserveLocId);

  return (
    <>
      <div className="filter-row">
        <div className="searchbar"><SearchIcon /><input value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="status-seg">
          <button className={condFilter === "all" ? "active" : ""} onClick={() => setCondFilter("all")}>
            <span className="dot" style={{ background: "#9CA3AF" }} />Mind <span className="cnt">{filteredStock.length}</span>
          </button>
          <button className={condFilter === "New" ? "active" : ""} onClick={() => setCondFilter("New")}>
            <span className="dot" style={{ background: "#22C55E" }} />Új <span className="cnt">{filteredStock.filter((i) => i.condition === "New").length}</span>
          </button>
          <button className={condFilter === "Refurbished" ? "active" : ""} onClick={() => setCondFilter("Refurbished")}>
            <span className="dot" style={{ background: "#F59E0B" }} />Felújított <span className="cnt">{filteredStock.filter((i) => i.condition === "Refurbished").length}</span>
          </button>
        </div>
      </div>

      {loadingData ? <LoadingState /> : condFiltered.length === 0 ? <EmptyState icon={PhoneCaseIcon}>Nincs termék raktáron.</EmptyState> : (
        visibleLocations.map((loc) => {
          const items = sortItems(condFiltered.filter((i) => i.locationId === loc.id));
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

              {collapsed ? null : (
                <ResponsiveTable
                  columns={[{ key: "n", label: "Sorszám", className: "col-serial" },{ key: "p", label: "Termék", className: "col-device" }, { key: "s", label: "Specifikáció", className: "col-grow" }, { key: "a", label: "Ár" }, { key: "x", label: "" }]}
                  rows={items}
                  rowKey={(i) => i.id}
                  renderRow={(i) => (
                    <tr key={i.id} style={{ cursor: "pointer" }} onClick={() => setProductDetailId(i.id)}>
                      <td className="mono col-serial" style={{ color: "#9CA3AF", whiteSpace: "nowrap" }}>{phoneCode(i.productNo) || "—"}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div className="stk-name" style={{ flexWrap: "nowrap" }}>
                          {displayName(i.brand, i.model)}
                          {i.acquisition?.acquisitionType === "consignment" && <span className="badge-loc">Bizomány</span>}
                          {i.stockStatus === "javitando" && <span className="stk-repair-badge" title="Javítandó — nem látszik a webshopban"><ServiceIcon width={11} height={11} /></span>}
                          {i.stockStatus === "lefoglalt" && <span style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", background: "#F1F2F6", borderRadius: 999, padding: "2px 7px" }} title="Nem látszik a webshopban">{stockStatusLabel(i.stockStatus)}</span>}
                          {isSlowMoving(i, reserveLocId) && <span className="stk-day-pill" title={`${daysOnShelf(i.dateAdded)} napja a polcon`}>{daysOnShelf(i.dateAdded)}</span>}
                        </div>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div className="stk-badges" style={{ flexWrap: "nowrap" }}>
                          <span className={`st ${i.condition === "New" ? "st-kesz" : "st-beveve"}`}>{conditionGradeLabel(i.condition, i.grade)}</span>
                          {i.storage && <span className="stk-sub" style={{ marginTop: 0 }}>{i.storage}</span>}
                          {i.ram && <span className="stk-sub" style={{ marginTop: 0 }}>{i.ram} RAM</span>}
                          {i.warranty && <span className="gar-pill"><WarrantyIcon width={10} height={10} />{i.warranty}</span>}
                        </div>
                      </td>
                      <td className="row-price" title={`Beszerzési ár: ${money(i.costPrice)}`}>{money(i.salePrice)}</td>
                      <td className="stk-actions" onClick={(e) => e.stopPropagation()}>
                        {canAct(i) && (
                          <button className="btn sec sm icon-only" disabled={busy} title="Eladás" onClick={() => setSellModal(i)}><CartIcon width={13} height={13} /></button>
                        )}
                      </td>
                    </tr>
                  )}
                  renderMobileRow={(i) => (
                    <div className="mob-row" onClick={() => setProductDetailId(i.id)}>
                      <div className="mob-row-top">
                        <div className="mob-row-main">
                          <span className="stk-sub" style={{ marginTop: 0, marginRight: 6 }}>{phoneCode(i.productNo) || "—"}</span>
                          <span>{displayName(i.brand, i.model)}</span>
                        </div>
                        <div className="mob-row-amount">{money(i.salePrice)}</div>
                      </div>
                      <div className="mob-row-sub">
                        {i.storage && <span>{i.storage}</span>}
                        {i.ram && <span>{i.ram} RAM</span>}
                        <span className={`st ${i.condition === "New" ? "st-kesz" : "st-beveve"}`}>{conditionGradeLabel(i.condition, i.grade)}</span>
                        {i.warranty && <span className="gar-pill"><WarrantyIcon width={10} height={10} />{i.warranty}</span>}
                        {i.acquisition?.acquisitionType === "consignment" && <span className="badge-loc">Bizomány</span>}
                        {i.stockStatus === "javitando" && <span className="tag" style={{ background: "var(--danger-soft)", color: "var(--danger-ink)", fontWeight: 700 }}>Javítandó</span>}
                        {i.stockStatus === "lefoglalt" && <span style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", background: "#F1F2F6", borderRadius: 999, padding: "2px 7px" }}>{stockStatusLabel(i.stockStatus)}</span>}
                        {isSlowMoving(i, reserveLocId) && <span className="tag" style={{ background: "var(--warning-soft)", color: "var(--warning-ink)", fontWeight: 700 }}>{daysOnShelf(i.dateAdded)} napja</span>}
                      </div>
                      {canAct(i) && (
                        <div className="mob-row-sub" style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                          <button className="btn sec sm icon-only" disabled={busy} title="Eladás" onClick={() => setSellModal(i)}><CartIcon width={13} height={13} /></button>
                        </div>
                      )}
                    </div>
                  )}
                />
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
          <ResponsiveTable
            wrap={false}
            columns={[{ key: "n", label: "Sorszám", className: "col-serial" },{ key: "p", label: "Termék" }, { key: "l", label: "Helyszín" }, { key: "d", label: "Eladva" }, { key: "c", label: "Vevő" }, { key: "a", label: "Ár" }]}
            rows={rows}
            rowKey={(i) => i.id}
            renderRow={(i) => (
              <tr key={i.id} style={{ cursor: "pointer" }} onClick={() => setProductDetailId(i.id)}>
                <td className="mono col-serial" style={{ color: "#9CA3AF", whiteSpace: "nowrap" }}>{phoneCode(i.productNo) || "—"}</td>
                <td>
                  <div className="stk-name">
                    {displayName(i.brand, i.model)}
                  </div>
                  {i.imei && <div className="stk-sub">{i.imei}</div>}
                </td>
                <td><span className="badge-loc">{locName(i.locationId)}</span></td>
                <td className="mono">{i.saleTx?.date || "—"}</td>
                <td>{i.saleTx?.customerName || "—"}</td>
                <td className="mono" style={{ fontWeight: 700 }}>{money(i.salePrice)}</td>
              </tr>
            )}
            renderMobileRow={(i) => (
              <div className="mob-row" onClick={() => setProductDetailId(i.id)}>
                <div className="mob-row-top">
                  <div className="mob-row-main">
                    <span className="stk-sub" style={{ marginTop: 0, marginRight: 6 }}>{phoneCode(i.productNo) || "—"}</span>
                    <span>{displayName(i.brand, i.model)}</span>
                  </div>
                  <div className="mob-row-amount">{money(i.salePrice)}</div>
                </div>
                <div className="mob-row-sub">
                  <span className="badge-loc">{locName(i.locationId)}</span>
                  {i.imei && <span>{i.imei}</span>}
                  <span>{i.saleTx?.date || "—"}</span>
                  <span>{i.saleTx?.customerName || "—"}</span>
                </div>
              </div>
            )}
          />
        )}
      </HistorySection>
    </>
  );
}
