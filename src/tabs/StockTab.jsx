import { useEffect, useMemo, useRef, useState } from "react";
import {
  money, displayName, phoneCode, daysOnShelf, isSlowMoving, stockStatusLabel, stockStatusColor, STOCK_STATUSES,
  conditionGradeLabel, STORAGE_OPTIONS, RAM_OPTIONS, PHONE_COLORS, SOURCES, WARRANTIES,
  CONDITION_GRADES, conditionGradeKey,
} from "../lib/utils";
import { SearchIcon, PhoneCaseIcon, CartIcon, ScanIcon, PrintIcon, CloseIcon, MoreIcon, ChevronDownIcon, CheckIcon, PlusIcon } from "../components/icons";
import { EmptyState, LoadingState } from "../components/EmptyState";
import HistorySection from "../components/HistorySection";
import ResponsiveTable from "../components/ResponsiveTable";
import BrandPickerButton from "../components/BrandPickerButton";
import CustomerAutocomplete from "../components/CustomerAutocomplete";
import DayChip from "../components/DayChip";

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

const STATUS_ORDER = Object.fromEntries(STOCK_STATUSES.map((s, i) => [s.key, i]));
function groupItemsByStatus(items) {
  const arr = [...items];
  arr.sort((a, b) => (STATUS_ORDER[a.stockStatus] ?? 99) - (STATUS_ORDER[b.stockStatus] ?? 99));
  return arr;
}

// Raktár-állapot választó — a Szerviz fül StatusPicker-jével azonos komponens-mintát és CSS
// osztályokat (wl-status-wrap/status-picker-trigger/wl-status-menu) újrahasznosítva, hogy a
// két fül kinézete egységes legyen. A pötty-szín a STOCK_STATUSES saját színéből jön.
function StockStatusPicker({ item, disabled, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const dotColor = stockStatusColor(item.stockStatus);

  return (
    <div className="wl-status-wrap" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button type="button" className="status-picker-trigger" disabled={disabled} onClick={() => setOpen((v) => !v)}>
        <span className="status-dot-halo" style={{ background: `color-mix(in srgb, ${dotColor} 22%, white)` }}>
          <span className="status-dot" style={{ background: dotColor }} />
        </span>
        <span className="stk-status-w">{stockStatusLabel(item.stockStatus)}</span>
        <ChevronDownIcon width={11} height={11} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .12s" }} />
      </button>
      {open && (
        <div className="wl-status-menu status-drop-menu">
          {STOCK_STATUSES.map((s) => {
            const isCurrent = s.key === item.stockStatus;
            return (
              <div
                key={s.key}
                className={`wl-status-opt${isCurrent ? " current" : ""}`}
                onClick={() => { setOpen(false); if (!isCurrent) onChange(item.id, s.key); }}
              >
                <span className="dot" style={{ background: s.color }} />{s.label}
                {isCurrent && <CheckIcon width={13} height={13} style={{ marginLeft: "auto", flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Új termék — a Szerviz "Új munkalap" inline sorával azonos mintát követve: nem forma-popup,
// hanem egy szerkeszthető sor a lista tetején, ugyanazokkal a "svc-nr-*" osztályokkal (dobozos
// elsődleges mezők, aláhúzásos "Több adat" sáv), plusz a StockModal teljes mezőkészlete
// (beszerzés típusa/eladó adatok bizománynál, IMEI, ár, garancia stb.).
function NewPhoneRow({ open, onCancel, onCreate, customers, defaultLocId, busy }) {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [storage, setStorage] = useState("");
  const [ram, setRam] = useState("");
  const [color, setColor] = useState("");
  const [imei, setImei] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [warranty, setWarranty] = useState("");
  const [source, setSource] = useState("");
  const [stockStatus, setStockStatus] = useState("webshop");
  const [condition, setCondition] = useState("New");
  const [grade, setGrade] = useState("A");
  const [batteryHealth, setBatteryHealth] = useState("");
  const [productNo, setProductNo] = useState("");
  const [acqType, setAcqType] = useState("purchase");
  const [sellerName, setSellerName] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [sellerCustomerId, setSellerCustomerId] = useState(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNow, setPayoutNow] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Amíg a sor nyílik/csukódik, a cellák overflow:hidden-nel vágják a tartalmat, hogy a
  // max-height átmenet működjön — de ez a Márka-választó / Állapot-választó legördülőjét is
  // levágná, ha nyitva marad. Az animáció végeztével "settled"-re váltunk (lásd Szerviz
  // "Új munkalap" sora), ahol a cellák overflow:visible-lé válnak.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!open) { setSettled(false); return; }
    const t = setTimeout(() => setSettled(true), 400);
    return () => clearTimeout(t);
  }, [open]);
  const revealStyle = (maxH) => ({ maxHeight: open ? maxH : 0, opacity: open ? 1 : 0, overflow: settled ? "visible" : "hidden" });
  const isConsignment = acqType === "consignment";
  const missing = [
    !brand.trim() && "márka",
    !model.trim() && "modell",
    salePrice === "" && "eladási ár",
    !defaultLocId && "helyszín",
    isConsignment && !sellerName.trim() && "eladó neve",
    isConsignment && !sellerPhone.trim() && "eladó telefonszáma",
    isConsignment && payoutAmount === "" && "kifizetendő összeg",
  ].filter(Boolean);
  const valid = missing.length === 0;

  function submit() {
    if (!valid || busy) return;
    const finalF = {
      brand, model, condition, grade, storage, ram, color, imei,
      costPrice: isConsignment ? payoutAmount : costPrice,
      salePrice, warranty, source, batteryHealth, newPrice, stockStatus, productNo,
    };
    const acquisition = {
      acquisitionType: acqType,
      sellerName: sellerName.trim(), sellerIdDoc: "", sellerCnp: "",
      sellerPhone: sellerPhone.trim(), sellerAddress: "", sellerCustomerId,
      consignorPayoutAmount: isConsignment ? payoutAmount : null,
      payoutNow: isConsignment ? payoutNow : false,
    };
    onCreate(finalF, defaultLocId, acquisition);
  }

  return (
    <>
      <tr className="svc-nr-row">
        <td className="mono col-serial" style={{ padding: 0 }}>
          <div className="svc-nr-reveal" style={{ ...revealStyle(140), color: "#B7BCC4", padding: "11px 16px" }}>—</div>
        </td>
        <td style={{ padding: 0 }}>
          <div className="svc-nr-reveal" style={{ ...revealStyle(140), color: "#B7BCC4", padding: "11px 16px" }}>—</div>
        </td>
        <td style={{ padding: 0 }}>
          <div className="svc-nr-reveal" style={{ ...revealStyle(140), padding: "11px 16px" }}>
            <div className="svc-nr-stack">
              <BrandPickerButton value={brand} onChange={setBrand} disabled={busy} />
              <input className="svc-nr-top" placeholder="Modell (pl. Galaxy S23)" value={model} onChange={(e) => setModel(e.target.value)} autoFocus disabled={busy} />
            </div>
          </div>
        </td>
        <td style={{ padding: 0 }}>
          <div className="svc-nr-reveal" style={{ ...revealStyle(140), padding: "11px 16px" }}>
            <div className="svc-nr-stack">
              <select className="svc-nr-top" value={storage} onChange={(e) => setStorage(e.target.value)} disabled={busy}>
                <option value="">Tárhely...</option>
                {STORAGE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <select className="svc-nr-top" value={color} onChange={(e) => setColor(e.target.value)} disabled={busy}>
                <option value="">Szín...</option>
                {PHONE_COLORS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </td>
        <td className="col-status" style={{ padding: 0 }}>
          <div className="svc-nr-reveal" style={{ ...revealStyle(140), padding: "11px 16px" }}>
            <StockStatusPicker item={{ id: null, stockStatus }} disabled={busy} onChange={(_, key) => setStockStatus(key)} />
          </div>
        </td>
        <td className="row-price" style={{ padding: 0 }}>
          <div className="svc-nr-reveal" style={{ ...revealStyle(140), padding: "11px 16px" }}>
            <input className="svc-nr-top" style={{ textAlign: "right" }} placeholder="0 Lei" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} disabled={busy} />
          </div>
        </td>
        <td className="stk-actions" style={{ padding: 0 }}>
          <div className="svc-nr-reveal" style={{ ...revealStyle(140), padding: "11px 16px", display: "flex", gap: 6 }}>
            <button
              type="button" title={valid ? "Hozzáadás" : `Hiányzik: ${missing.join(", ")}`} disabled={!valid || busy} onClick={submit}
              style={{ width: 28, height: 28, borderRadius: 999, border: "none", background: valid ? "#1DB954" : "#D1D5DB", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: valid ? "pointer" : "default", flexShrink: 0 }}
            >
              <CheckIcon width={13} height={13} />
            </button>
            <button
              type="button" title="Mégse" disabled={busy} onClick={onCancel}
              style={{ width: 28, height: 28, borderRadius: 999, border: "1px solid #E5E7EB", background: "#fff", color: "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
            >
              <CloseIcon width={12} height={12} />
            </button>
          </div>
        </td>
      </tr>
      <tr className="svc-nr-row">
        <td colSpan={6} style={{ padding: 0 }}>
          <div className="svc-nr-reveal" style={revealStyle(40)}>
            <button type="button" className={`svc-nr-more-toggle${moreOpen ? " open" : ""}`} onClick={() => setMoreOpen((v) => !v)}>
              <ChevronDownIcon className="chev" width={9} height={9} style={{ transform: moreOpen ? "none" : "rotate(-90deg)" }} />
              Több adat (beszerzés, IMEI, minőség, garancia)
            </button>
          </div>
          {open && moreOpen && (
            <div className="svc-nr-rr">
              <div className="svc-nr-rr-grid svc-nr-rr-4">
                <div>
                  <span className="svc-nr-rr-lbl">Beszerzés típusa</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span className={`svc-nr-chip${acqType === "purchase" ? " on" : ""}`} onClick={() => !busy && setAcqType("purchase")}>Saját vásárlás</span>
                    <span className={`svc-nr-chip${acqType === "consignment" ? " on" : ""}`} onClick={() => !busy && setAcqType("consignment")}>Bizomány</span>
                  </div>
                </div>
                <div>
                  <span className="svc-nr-rr-lbl">IMEI</span>
                  <input className="svc-nr-cell" placeholder="35xxxxxxxxxxxxx" value={imei} onChange={(e) => setImei(e.target.value)} disabled={busy} />
                </div>
                <div>
                  <span className="svc-nr-rr-lbl">RAM</span>
                  <select className="svc-nr-cell" value={ram} onChange={(e) => setRam(e.target.value)} disabled={busy}>
                    <option value="">—</option>
                    {RAM_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <span className="svc-nr-rr-lbl">Sorszám (kód)</span>
                  <input className="svc-nr-cell" type="number" placeholder="automatikus" value={productNo} onChange={(e) => setProductNo(e.target.value)} disabled={busy} />
                </div>
              </div>

              {isConsignment && (
                <div className="svc-nr-rr-grid svc-nr-rr-4" style={{ marginTop: 12 }}>
                  <div>
                    <span className="svc-nr-rr-lbl">Eladó neve</span>
                    <CustomerAutocomplete
                      customers={customers}
                      name={sellerName}
                      onChangeName={(name) => { setSellerName(name); setSellerCustomerId(null); }}
                      onSelect={(c) => { setSellerName(c.name); setSellerPhone(c.phone || sellerPhone); setSellerCustomerId(c.id); }}
                      placeholder="pl. Kovács János"
                      className="svc-nr-cell"
                    />
                  </div>
                  <div>
                    <span className="svc-nr-rr-lbl">Eladó telefonszáma</span>
                    <input className="svc-nr-cell" placeholder="07xx xxx xxx" value={sellerPhone} onChange={(e) => setSellerPhone(e.target.value)} disabled={busy} />
                  </div>
                  <div>
                    <span className="svc-nr-rr-lbl">Kifizetendő összeg</span>
                    <input className="svc-nr-cell" placeholder="0 Lei" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} disabled={busy} />
                  </div>
                  <div>
                    <span className="svc-nr-rr-lbl">Kifizetés most</span>
                    <label className={`svc-nr-flag${payoutNow ? " on" : ""}`} style={{ paddingTop: 6 }}>
                      <input type="checkbox" checked={payoutNow} onChange={(e) => setPayoutNow(e.target.checked)} disabled={busy} />Átvételkor, nem eladáskor
                    </label>
                  </div>
                </div>
              )}

              <div className="svc-nr-rr-grid svc-nr-rr-5" style={{ marginTop: 12 }}>
                <div style={{ gridColumn: "span 2" }}>
                  <span className="svc-nr-rr-lbl">Minőség</span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 2 }}>
                    {CONDITION_GRADES.map((g) => {
                      const key = conditionGradeKey(condition, grade);
                      const on = key === g.key;
                      return (
                        <span
                          key={g.key} className={`svc-nr-chip${on ? " on" : ""}`}
                          onClick={() => { if (busy) return; if (g.key === "New") { setCondition("New"); } else { setCondition("Refurbished"); setGrade(g.key); } }}
                        >
                          {g.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
                {!isConsignment && (
                  <div>
                    <span className="svc-nr-rr-lbl">Beszerzési ár</span>
                    <input className="svc-nr-cell" placeholder="0 Lei" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} disabled={busy} />
                  </div>
                )}
                <div>
                  <span className="svc-nr-rr-lbl">Becsült új kori ár</span>
                  <input className="svc-nr-cell" placeholder="pl. 2500" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} disabled={busy} />
                </div>
                <div>
                  <span className="svc-nr-rr-lbl">Garancia</span>
                  <select className="svc-nr-cell" value={warranty} onChange={(e) => setWarranty(e.target.value)} disabled={busy}>
                    <option value="">Nincs</option>
                    {WARRANTIES.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                {condition === "Refurbished" && (
                  <div>
                    <span className="svc-nr-rr-lbl">Akkuállapot (%)</span>
                    <input className="svc-nr-cell" type="number" min="0" max="100" placeholder="100" value={batteryHealth} onChange={(e) => setBatteryHealth(e.target.value)} disabled={busy} />
                  </div>
                )}
              </div>

              <div className="svc-nr-rr-grid svc-nr-rr-4" style={{ marginTop: 12 }}>
                <div>
                  <span className="svc-nr-rr-lbl">Forrás</span>
                  <select className="svc-nr-cell" value={source} onChange={(e) => setSource(e.target.value)} disabled={busy}>
                    <option value="">—</option>
                    {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </td>
      </tr>
    </>
  );
}


export default function StockTab({
  effectiveLocFilter, locName, busy, search, setSearch, onScan, loadingData, filteredStock,
  locations, reserveLocId, setProductDetailId, setSellModal,
  soldStock, isAdmin = true, myLocationId = null, onPrintLabels, onStockStatusChange,
  customers, defaultLocId, onCreateProduct,
}) {
  const [statusFilter, setStatusFilter] = useState("all"); // all | STOCK_STATUSES key
  const [groupByStatus, setGroupByStatus] = useState(false);
  const [showSold, setShowSold] = useState(false);
  const [showReserve, setShowReserve] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreMenuRef = useRef(null);
  useEffect(() => {
    if (!moreOpen) return;
    function onClickOutside(e) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) setMoreOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [moreOpen]);

  // Új termék: a Szerviz "Új munkalap" sorával azonos "+" -> beleesik a táblába -> kibomlik
  // animáció. addMounted amíg a sor a DOM-ban van (a záró animáció alatt is), addOpen a
  // vizuálisan kinyílt állapot, addAnimPhase a "+" gomb ikonjának csepp-be/pop-ki animációja.
  const [addMounted, setAddMounted] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addAnimPhase, setAddAnimPhase] = useState("idle"); // idle | dropping | popping
  const [tableRipple, setTableRipple] = useState(false);
  const addTimersRef = useRef([]);
  useEffect(() => () => addTimersRef.current.forEach(clearTimeout), []);
  function clearAddTimers() {
    addTimersRef.current.forEach(clearTimeout);
    addTimersRef.current = [];
  }
  function openAddRow() {
    clearAddTimers();
    setAddMounted(true);
    setAddAnimPhase("dropping");
    setTableRipple(true);
    addTimersRef.current.push(
      setTimeout(() => setAddOpen(true), 20),
      setTimeout(() => setAddAnimPhase("idle"), 360),
      setTimeout(() => setTableRipple(false), 540),
    );
  }
  function closeAddRow() {
    clearAddTimers();
    setAddAnimPhase("popping");
    setAddOpen(false);
    addTimersRef.current.push(
      setTimeout(() => setAddAnimPhase("idle"), 320),
      setTimeout(() => setAddMounted(false), 420),
    );
  }

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

  const statusFiltered = useMemo(() => (
    statusFilter === "all" ? filteredStock : filteredStock.filter((i) => i.stockStatus === statusFilter)
  ), [filteredStock, statusFilter]);

  const visibleLocations = (effectiveLocFilter === "all" ? locations : locations.filter((l) => l.id === effectiveLocFilter || l.id === reserveLocId))
    .filter((l) => l.id !== reserveLocId);

  function renderPhoneTable(items) {
    return (
      <ResponsiveTable
        className="tw-apple stk-table"
        columns={[
          { key: "n", label: "Szám", className: "col-serial" },
          { key: "i", label: "Bejött" },
          { key: "p", label: "Termék", className: "col-device" },
          { key: "s", label: "Specifikáció", className: "col-grow" },
          {
            key: "st", className: "col-status", label: (
              <button
                type="button"
                onClick={() => setGroupByStatus((v) => !v)}
                title="Rendezés állapot szerint"
                style={{ display: "flex", alignItems: "center", gap: 3, background: "none", border: "none", padding: "0 0 0 4px", font: "inherit", fontWeight: 600, color: groupByStatus ? "#111827" : "inherit", cursor: "pointer" }}
              >
                Állapot
                <ChevronDownIcon width={10} height={10} style={{ opacity: groupByStatus ? 1 : 0.45, transform: groupByStatus ? "rotate(180deg)" : "none", transition: "transform .12s" }} />
              </button>
            ),
          },
          { key: "a", label: "Ár", className: "num-col" },
          { key: "x", label: "" },
        ]}
        rows={items}
        rowKey={(i) => i.id}
        renderRow={(i) => i.__newRow ? (
          <NewPhoneRow
            key="__new__"
            open={addOpen}
            customers={customers}
            defaultLocId={defaultLocId}
            busy={busy}
            onCancel={closeAddRow}
            onCreate={async (data, locId, acquisition) => {
              const created = await onCreateProduct(data, locId, acquisition);
              if (created) closeAddRow();
            }}
          />
        ) : (
          <tr key={i.id} style={{ cursor: "pointer" }} onClick={() => setProductDetailId(i.id)}>
            <td className="mono col-serial" style={{ color: "#9CA3AF", whiteSpace: "nowrap" }}>{phoneCode(i.productNo) || "—"}</td>
            <td style={{ whiteSpace: "nowrap" }}><DayChip days={daysOnShelf(i.dateAdded)} /></td>
            <td style={{ whiteSpace: "nowrap" }}>
              <div className="stk-name" style={{ flexWrap: "nowrap" }}>
                {displayName(i.brand, i.model)}
                {i.acquisition?.acquisitionType === "consignment" && <span className="badge-loc">Bizomány</span>}
              </div>
            </td>
            <td style={{ whiteSpace: "nowrap" }}>
              <div className="stk-badges" style={{ flexWrap: "nowrap" }}>
                <span className="stk-sub" style={{ marginTop: 0 }}><span className="stk-spec-w">{i.storage || "—"}</span></span>
                <span className="stk-sub" style={{ marginTop: 0 }}><span className="stk-spec-w stk-spec-wl">{i.brand === "Apple" ? (i.batteryHealth != null ? `${i.batteryHealth}%` : "—") : (i.ram || "—")}</span></span>
                <span className="stk-sub" style={{ marginTop: 0 }}><span className="stk-spec-w stk-spec-wl">{i.color || "—"}</span></span>
                <span className={`st st-fill ${i.condition === "New" ? "st-kesz" : "st-beveve"}`}>{conditionGradeLabel(i.condition, i.grade)}</span>
              </div>
            </td>
            <td className="col-status" style={{ whiteSpace: "nowrap" }}>
              <StockStatusPicker item={i} disabled={busy} onChange={onStockStatusChange} />
            </td>
            <td className="row-price" title={`Beszerzési ár: ${money(i.costPrice)}`}>{money(i.salePrice)}</td>
            <td className="stk-actions" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={`btn sec sm icon-only stk-print-chk${selectedIds.has(i.id) ? " active" : ""}`}
                onClick={() => toggleSelect(i.id)}
                title="Kijelölés címkenyomtatáshoz"
              >
                <PrintIcon width={13} height={13} />
              </button>
              {canAct(i) && (
                <button className="btn sec sm icon-only" disabled={busy} title="Eladás" onClick={() => setSellModal(i)}><CartIcon width={13} height={13} /></button>
              )}
            </td>
          </tr>
        )}
        renderMobileRow={(i) => i.__newRow ? null : (
          <div className="mob-row mob-row-coded" onClick={() => setProductDetailId(i.id)}>
            <div className={`mob-code-col ${i.condition === "New" ? "st-kesz" : "st-beveve"}`}>
              {String(i.productNo).split("").map((ch, k) => <span key={k}>{ch}</span>)}
            </div>
            <div className="mob-row-content">
              <div className="mob-row-top">
                <div className="mob-row-main">
                  <span style={{ flex: 1, minWidth: 0 }}>{displayName(i.brand, i.model)}</span>
                  <span className={`st st-fill ${i.condition === "New" ? "st-kesz" : "st-beveve"}`} style={{ flexShrink: 0 }}>{conditionGradeLabel(i.condition, i.grade)}</span>
                </div>
                <div className="mob-row-amount">{money(i.salePrice)}</div>
              </div>
              <div className="mob-row-sub">
                {i.storage && <span>{i.storage}</span>}
                {i.brand !== "Apple" && i.ram && <span>{i.ram} RAM</span>}
                {i.color && <span>{i.color}</span>}
                {i.acquisition?.acquisitionType === "consignment" && <span className="badge-loc">Bizomány</span>}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#374151" }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: stockStatusColor(i.stockStatus) }} />{stockStatusLabel(i.stockStatus)}
                </span>
                {isSlowMoving(i, reserveLocId) && <span className="tag" style={{ background: "var(--warning-soft)", color: "var(--warning-ink)", fontWeight: 700 }}>{daysOnShelf(i.dateAdded)} napja</span>}
              </div>
              {canAct(i) && (
                <div className="mob-row-sub" style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                  <button className="btn sec sm icon-only" disabled={busy} title="Eladás" onClick={() => setSellModal(i)}><CartIcon width={13} height={13} /></button>
                </div>
              )}
            </div>
          </div>
        )}
      />
    );
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
      <div className="filter-row svc-filter-row">
        <button type="button" className={`history-toolbar-btn${showSold ? " active" : ""}`} style={{ marginLeft: 0 }} onClick={() => setShowSold((v) => !v)}>
          Eladott telefonok <span className="cnt">{soldStock.length}</span>
        </button>
        <button type="button" className={`history-toolbar-btn${showReserve ? " active" : ""}`} onClick={() => setShowReserve((v) => !v)}>
          Tartalék <span className="cnt">{filteredStock.filter((i) => i.stockStatus === "tartalek").length}</span>
        </button>
        <button type="button" className="history-toolbar-btn stock-more-trigger" onClick={() => setMoreOpen((v) => !v)} title="Szűrők és listák">
          <MoreIcon className="history-toolbar-btn-dots" width={16} height={16} />
          <span className="history-toolbar-btn-text">Szűrők</span>
        </button>
        <div className={`stock-more-wrap${moreOpen ? " open" : ""}`} ref={moreMenuRef}>
          <div className="status-seg">
            {STOCK_STATUSES.filter((s) => s.key === "szerviz" || s.key === "lefoglalt").map((s) => (
              <button key={s.key} className={statusFilter === s.key ? "active" : ""} onClick={() => setStatusFilter((f) => (f === s.key ? "all" : s.key))}>
                <span className="dot" style={{ background: s.color }} />{s.label} <span className="cnt">{filteredStock.filter((i) => i.stockStatus === s.key).length}</span>
              </button>
            ))}
          </div>
        </div>
        {onScan && <button type="button" className="btn sec scan-trigger" style={{ marginLeft: "auto" }} onClick={onScan} title="QR/vonalkód szkennelése"><ScanIcon width={16} height={16} /></button>}
        <div className="searchbar"><SearchIcon /><input value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <button type="button" className="btn header-add-btn" disabled={busy || addMounted} title="Új termék" onClick={openAddRow}>
          <span className="header-add-ring" /><span className="header-add-ring ring2" />
          <PlusIcon width={16} height={16} className={addAnimPhase === "dropping" ? "svc-plus-drop" : addAnimPhase === "popping" ? "svc-plus-pop" : ""} />
        </button>
      </div>

      {addMounted && (
        <div className={`svc-table-ripple${tableRipple ? " pulse" : ""}`} style={{ marginBottom: 16 }}>
          {renderPhoneTable([{ id: "__new__", __newRow: true }])}
        </div>
      )}

      {showReserve && (() => {
        const items = (groupByStatus ? groupItemsByStatus : sortItems)(filteredStock.filter((i) => i.stockStatus === "tartalek"));
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
        className="tw-apple stk-table"
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
              <div className="mob-row mob-row-coded" onClick={() => setProductDetailId(i.id)}>
                <div className={`mob-code-col ${i.condition === "New" ? "st-kesz" : "st-beveve"}`}>
                  {String(i.productNo).split("").map((ch, k) => <span key={k}>{ch}</span>)}
                </div>
                <div className="mob-row-content">
                  <div className="mob-row-top">
                    <div className="mob-row-main">
                      <span style={{ flex: 1, minWidth: 0 }}>{displayName(i.brand, i.model)}</span>
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
              </div>
            )}
          />
        )}
      </HistorySection>

      {loadingData ? <LoadingState /> : statusFiltered.length === 0 ? <EmptyState icon={PhoneCaseIcon}>Nincs termék raktáron.</EmptyState> : (
        visibleLocations.map((loc) => {
          const items = (groupByStatus ? groupItemsByStatus : sortItems)(statusFiltered.filter((i) => i.locationId === loc.id));
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
