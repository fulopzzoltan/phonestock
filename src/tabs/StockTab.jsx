import { useMemo, useState } from "react";
import { money, displayName, phoneCode, daysOnShelf, isSlowMoving, stockStatusLabel, conditionGradeLabel, exportToCsv, today } from "../lib/utils";
import { SearchIcon, PhoneCaseIcon, ServiceIcon, CartIcon, ScanIcon, PrintIcon, CloseIcon } from "../components/icons";
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
  effectiveLocFilter, locName, busy, search, setSearch, onScan, loadingData, filteredStock,
  locations, reserveLocId, setProductDetailId, setSellModal,
  soldStock, isAdmin = true, myLocationId = null, onPrintLabels,
}) {
  const [condFilter, setCondFilter] = useState("all"); // all | New | Refurbished
  const reserveLoc = locations.find((l) => l.name === "Tartalék");
  const [showSold, setShowSold] = useState(false);
  const [showReserve, setShowReserve] = useState(false);
  // Árcimke-nyomtatás: bepipálható telefonok, hogy egyszerre (pl. 4 új felvitel után)
  // egy lapon lehessen kinyomtatni a címkéiket, ahelyett hogy egyesével mennénk.
  const [selectedIds, setSelectedIds] = useState(new Set());
  const toggleSelect = (id) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const selectedItems = filteredStock.filter((i) => selectedIds.has(i.id));
  // Alkalmazott csak a saját helyszínén (és a közös Tartalékon) tud eladni/szerkeszteni —
  // a másik helyszín készletét csak megtekintheti.
  const canAct = (item) => isAdmin || item.locationId === myLocationId || item.locationId === reserveLocId;

  const condFiltered = useMemo(() => (
    condFilter === "all" ? filteredStock : filteredStock.filter((i) => i.condition === condFilter)
  ), [filteredStock, condFilter]);

  const visibleLocations = (effectiveLocFilter === "all" ? locations : locations.filter((l) => l.id === effectiveLocFilter || l.id === reserveLocId))
    .filter((l) => l.id !== reserveLocId);

  function renderPhoneTable(items) {
    return (
      <ResponsiveTable
        className="tw-apple"
        columns={[{ key: "c", label: "" }, { key: "n", label: "Sorszám", className: "col-serial" },{ key: "p", label: "Termék", className: "col-device" }, { key: "s", label: "Specifikáció", className: "col-grow" }, { key: "f", label: "" }, { key: "a", label: "Ár", className: "num-col" }, { key: "x", label: "" }]}
        rows={items}
        rowKey={(i) => i.id}
        renderRow={(i) => (
          <tr key={i.id} style={{ cursor: "pointer" }} onClick={() => setProductDetailId(i.id)}>
            <td onClick={(e) => e.stopPropagation()}>
              <input type="checkbox" className="chk" checked={selectedIds.has(i.id)} onChange={() => toggleSelect(i.id)} title="Kijelölés címkenyomtatáshoz" />
            </td>
            <td className="mono col-serial" style={{ color: "#9CA3AF", whiteSpace: "nowrap" }}>{phoneCode(i.productNo) || "—"}</td>
            <td style={{ whiteSpace: "nowrap" }}>
              <div className="stk-name" style={{ flexWrap: "nowrap" }}>
                {displayName(i.brand, i.model)}
                <span className={`st st-fill ${i.condition === "New" ? "st-kesz" : "st-beveve"}`}>{conditionGradeLabel(i.condition, i.grade)}</span>
                {i.acquisition?.acquisitionType === "consignment" && <span className="badge-loc">Bizomány</span>}
                {i.stockStatus === "lefoglalt" && <span style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", background: "#F1F2F6", borderRadius: 999, padding: "2px 7px" }} title="Nem látszik a webshopban">{stockStatusLabel(i.stockStatus)}</span>}
              </div>
            </td>
            <td style={{ whiteSpace: "nowrap" }}>
              <div className="stk-badges" style={{ flexWrap: "nowrap" }}>
                {i.storage && <span className="stk-sub" style={{ marginTop: 0 }}>{i.storage}</span>}
                {i.brand !== "Apple" && i.ram && <span className="stk-sub" style={{ marginTop: 0 }}>{i.ram} RAM</span>}
                {i.color && <span className="stk-sub" style={{ marginTop: 0 }}>{i.color}</span>}
              </div>
            </td>
            <td style={{ whiteSpace: "nowrap" }}>
              <span className="svc-flags">
                {i.stockStatus === "javitando" && <span className="stk-repair-badge" title="Javítandó — nem látszik a webshopban"><ServiceIcon width={11} height={11} /></span>}
                {isSlowMoving(i, reserveLocId) && <span className="stk-day-pill" title={`${daysOnShelf(i.dateAdded)} napja a polcon`}>{daysOnShelf(i.dateAdded)}</span>}
              </span>
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
                <input
                  type="checkbox" className="chk" style={{ marginRight: 6 }} checked={selectedIds.has(i.id)}
                  onClick={(e) => e.stopPropagation()} onChange={() => toggleSelect(i.id)} title="Kijelölés címkenyomtatáshoz"
                />
                <span className="stk-sub" style={{ marginTop: 0, marginRight: 6 }}>{phoneCode(i.productNo) || "—"}</span>
                <span>{displayName(i.brand, i.model)}</span>
                <span className={`st st-fill ${i.condition === "New" ? "st-kesz" : "st-beveve"}`} style={{ marginLeft: 6 }}>{conditionGradeLabel(i.condition, i.grade)}</span>
              </div>
              <div className="mob-row-amount">{money(i.salePrice)}</div>
            </div>
            <div className="mob-row-sub">
              {i.storage && <span>{i.storage}</span>}
              {i.brand !== "Apple" && i.ram && <span>{i.ram} RAM</span>}
              {i.color && <span>{i.color}</span>}
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
    );
  }

  function exportStock() {
    exportToCsv(`keszlet-${today()}`, [
      { key: "n", label: "Sorszám" }, { key: (i) => i.brand, label: "Márka" }, { key: (i) => i.model, label: "Modell" },
      { key: (i) => (i.condition === "New" ? "Új" : "Felújított"), label: "Állapot" }, { key: (i) => i.grade || "", label: "Grade" },
      { key: (i) => i.storage || "", label: "Tárhely" }, { key: (i) => i.ram || "", label: "RAM" }, { key: (i) => i.color || "", label: "Szín" },
      { key: (i) => i.imei || "", label: "IMEI" }, { key: (i) => locName(i.locationId), label: "Helyszín" },
      { key: (i) => i.costPrice ?? "", label: "Beszerzési ár" }, { key: (i) => i.salePrice ?? "", label: "Eladási ár" },
      { key: (i) => i.warranty || "", label: "Garancia" }, { key: (i) => stockStatusLabel(i.stockStatus), label: "Raktár állapot" },
      { key: (i) => i.source || "", label: "Forrás" }, { key: (i) => i.dateAdded || "", label: "Felvéve" },
    ], condFiltered.map((i) => ({ ...i, n: phoneCode(i.productNo) || "" })));
  }

  return (
    <div className="apple-page">
      {selectedIds.size > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, background: "var(--primary-soft)",
          border: "1px solid var(--primary)", borderRadius: 12, padding: "8px 12px", marginBottom: 10,
        }}>
          <span style={{ fontWeight: 700, fontSize: 12.5, color: "var(--primary-ink)" }}>{selectedIds.size} telefon kiválasztva</span>
          <button
            type="button" className="btn sec sm" style={{ marginLeft: "auto" }}
            onClick={() => { onPrintLabels?.(selectedItems); setSelectedIds(new Set()); }}
          >
            <PrintIcon width={13} height={13} /> Címkék nyomtatása
          </button>
          <button type="button" className="btn sec sm icon-only" title="Kijelölés törlése" onClick={() => setSelectedIds(new Set())}>
            <CloseIcon width={13} height={13} />
          </button>
        </div>
      )}
      <div className="filter-row">
        <div className="searchbar"><SearchIcon /><input value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        {onScan && <button type="button" className="btn sec scan-trigger" onClick={onScan} title="QR/vonalkód szkennelése"><ScanIcon width={16} height={16} /></button>}
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
        <button type="button" className="btn sec sm" onClick={exportStock} disabled={condFiltered.length === 0} title="A jelenleg szűrt lista letöltése CSV-ként">Exportálás CSV-be</button>
        {reserveLoc && (
          <button type="button" className={`history-toolbar-btn${showReserve ? " active" : ""}`} onClick={() => setShowReserve((v) => !v)}>
            <PhoneCaseIcon width={14} height={14} />
            Tartalék <span className="cnt">{condFiltered.filter((i) => i.locationId === reserveLoc.id).length}</span>
          </button>
        )}
        <button type="button" className={`history-toolbar-btn${showSold ? " active" : ""}`} style={{ marginLeft: reserveLoc ? 0 : "auto" }} onClick={() => setShowSold((v) => !v)}>
          <PhoneCaseIcon width={14} height={14} />
          Eladott telefonok <span className="cnt">{soldStock.length}</span>
        </button>
      </div>

      {reserveLoc && showReserve && (() => {
        const items = sortItems(condFiltered.filter((i) => i.locationId === reserveLoc.id));
        return (
          <div style={{ marginBottom: 16 }}>
            {items.length === 0 ? <div className="tw tw-apple"><EmptyState icon={PhoneCaseIcon}>Nincs termék a Tartalékban.</EmptyState></div> : renderPhoneTable(items)}
          </div>
        );
      })()}

      <HistorySection
        hideToggle
        open={showSold}
        onToggle={setShowSold}
        className="tw-apple"
        icon={PhoneCaseIcon}
        label="Eladott telefonok"
        items={soldStock}
        filterFn={(i, q) => [i.brand, i.model, i.saleTx?.customerName, phoneCode(i.productNo)].filter(Boolean).join(" ").toLowerCase().includes(q)}
      >
        {(rows) => (
          <ResponsiveTable
            wrap={false}
            columns={[{ key: "n", label: "Sorszám", className: "col-serial" },{ key: "p", label: "Termék" }, { key: "l", label: "Helyszín" }, { key: "d", label: "Eladva" }, { key: "c", label: "Vevő" }, { key: "a", label: "Ár", className: "num-col" }]}
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
                <td className="row-price">{money(i.salePrice)}</td>
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

      {loadingData ? <LoadingState /> : condFiltered.length === 0 ? <EmptyState icon={PhoneCaseIcon}>Nincs termék raktáron.</EmptyState> : (
        visibleLocations.map((loc) => {
          const items = sortItems(condFiltered.filter((i) => i.locationId === loc.id));
          if (items.length === 0) return null;
          return (
            <div key={loc.id} style={{ marginBottom: 18 }}>
              {renderPhoneTable(items)}
            </div>
          );
        })
      )}
    </div>
  );
}
