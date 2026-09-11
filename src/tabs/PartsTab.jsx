import { useMemo, useState } from "react";
import { money, PART_CATEGORIES, partCode, ticketCode } from "../lib/utils";
import { SearchIcon, EditIcon, PartsIcon, ScanIcon } from "../components/icons";
import ConfirmDelete from "../components/ConfirmDelete";
import { EmptyState, LoadingState } from "../components/EmptyState";
import HistorySection from "../components/HistorySection";
import ResponsiveTable from "../components/ResponsiveTable";

function sortItems(items) {
  const arr = [...items];
  arr.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "") || (Number(b.partNo) || 0) - (Number(a.partNo) || 0));
  return arr;
}

// A részletnézet (PartDetailPanel) a testvér-tételeket (azonos megnevezés/kategória/márka/
// típus/forrás) csoportban mutatja — ugyanígy kell azonosítani a csoportot innen kattintva is.
function groupKeyOf(p) {
  return [p.name, p.category, p.brand, p.modelFit, p.source].join("|");
}

// A sor címkéje a Szerviznél megszokott "eszköz márkája és típusa" mintát követi
// (a szabad szöveges Megnevezés helyett) — az eredet (Eredeti/Utángyártott/Felújított)
// külön "Típus" oszlopban jelenik meg.
function partLabel(p) {
  return [p.brand, p.modelFit].filter(Boolean).join(" ") || p.name || "—";
}
const ORIGIN_CLS = { "Eredeti": "st-eredeti", "Utángyártott": "st-utangyartott", "Felújított": "st-felujitott" };
function originPill(origin) {
  if (!origin) return null;
  return <span className={`st st-fill ${ORIGIN_CLS[origin] || "st-utangyartott"}`}>{origin}</span>;
}

const CATS = [...PART_CATEGORIES, "Egyéb"];

// Kategória-jelzés minden soron, a Szerviz Státusz-oszlopához hasonlóan — mivel a
// listán a "Mind" nézetnél a kategóriák immár egymás alatt, fejléc nélkül futnak,
// soronként is látszania kell, mi az alkatrész típusa.
const CATEGORY_STYLE = {
  "Kijelző": { "--pill-bg": "var(--info-soft)", "--pill-fg": "var(--info-ink)" },
  "Akkumulátor": { "--pill-bg": "var(--warning-soft)", "--pill-fg": "var(--warning-ink)" },
  "Hátlap": { "--pill-bg": "#EDE9FE", "--pill-fg": "#6D28D9" },
};
const CATEGORY_DOT = {
  "Kijelző": "var(--info)",
  "Akkumulátor": "var(--warning)",
  "Hátlap": "#7C3AED",
};
function categoryPill(cat) {
  const style = CATEGORY_STYLE[cat] || { "--pill-bg": "#F3F4F6", "--pill-fg": "#6B7280" };
  return <span className="st st-fill" style={style}>{cat}</span>;
}

const UseIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="7" width="18" height="12" rx="2" /><path d="M8 7V5.5A1.5 1.5 0 019.5 4h5A1.5 1.5 0 0116 5.5V7" />
    <path d="M9.5 13l2 2 3.5-3.5" />
  </svg>
);

export default function PartsTab({
  busy, partSearch, setPartSearch, onScan, loadingData, filteredParts, setPartDetailId, deletePart,
  allUsedParts = [], locName, setDetailId, onUsePart,
}) {
  const [catFilter, setCatFilter] = useState("all");
  const [showUsed, setShowUsed] = useState(false);

  const catFiltered = useMemo(() => {
    if (catFilter === "all") return filteredParts;
    if (catFilter === "Egyéb") return filteredParts.filter((p) => !PART_CATEGORIES.includes(p.category));
    return filteredParts.filter((p) => p.category === catFilter);
  }, [filteredParts, catFilter]);

  return (
    <div className="apple-page">

      <div className="filter-row">
        <div className="searchbar"><SearchIcon /><input value={partSearch} onChange={(e) => setPartSearch(e.target.value)} /></div>
        {onScan && <button type="button" className="btn sec scan-trigger" onClick={onScan} title="QR/vonalkód szkennelése"><ScanIcon width={16} height={16} /></button>}
        <div className="status-seg">
          <button className={catFilter === "all" ? "active" : ""} onClick={() => setCatFilter("all")}>
            <span className="dot" style={{ background: "#9CA3AF" }} />Mind <span className="cnt">{filteredParts.length}</span>
          </button>
          {CATS.map((cat) => {
            const count = cat === "Egyéb"
              ? filteredParts.filter((p) => !PART_CATEGORIES.includes(p.category)).length
              : filteredParts.filter((p) => p.category === cat).length;
            return (
              <button key={cat} className={catFilter === cat ? "active" : ""} onClick={() => setCatFilter(cat)}>
                <span className="dot" style={{ background: CATEGORY_DOT[cat] || "#9CA3AF" }} />{cat} <span className="cnt">{count}</span>
              </button>
            );
          })}
        </div>
        <button type="button" className={`history-toolbar-btn${showUsed ? " active" : ""}`} onClick={() => setShowUsed((v) => !v)}>
          <PartsIcon width={14} height={14} />
          Felhasznált alkatrészek <span className="cnt">{allUsedParts.length}</span>
        </button>
      </div>

      <HistorySection
        hideToggle
        open={showUsed}
        onToggle={setShowUsed}
        className="tw-apple"
        icon={PartsIcon}
        label="Felhasznált alkatrészek"
        items={allUsedParts}
        filterFn={(sp, q) => [sp.partName, sp.ticket.customerName, sp.ticket.brand, sp.ticket.model, ticketCode(sp.ticket.ticketNo, locName(sp.ticket.intakeLocationId || sp.ticket.locationId))].filter(Boolean).join(" ").toLowerCase().includes(q)}
      >
        {(rows) => (
          <ResponsiveTable
            wrap={false}
            columns={[{ key: "t", label: "Munkalap", className: "col-serial" }, { key: "p", label: "Alkatrész" }, { key: "c", label: "Vevő" }, { key: "q", label: "Menny." }, { key: "a", label: "Ár" }, { key: "d", label: "Dátum" }]}
            rows={rows}
            rowKey={(sp) => sp.id}
            renderRow={(sp) => (
              <tr key={sp.id} style={{ cursor: "pointer" }} onClick={() => setDetailId(sp.ticket.id)}>
                <td className="mono col-serial" style={{ color: "#9CA3AF", whiteSpace: "nowrap" }}>{ticketCode(sp.ticket.ticketNo, locName(sp.ticket.intakeLocationId || sp.ticket.locationId))}</td>
                <td style={{ fontWeight: 600 }}>{sp.partName}</td>
                <td>{sp.ticket.customerName || "—"}</td>
                <td style={{ fontWeight: 700 }}>{sp.quantity} db</td>
                <td className="row-price">{money((sp.costPrice || 0) * sp.quantity)}</td>
                <td className="mono" style={{ color: "#9CA3AF" }}>{(sp.usedAt || "").slice(0, 10) || "—"}</td>
              </tr>
            )}
            renderMobileRow={(sp) => (
              <div className="mob-row" onClick={() => setDetailId(sp.ticket.id)}>
                <div className="mob-row-top">
                  <div className="mob-row-main">
                    <span className="stk-sub" style={{ marginTop: 0, marginRight: 6 }}>{ticketCode(sp.ticket.ticketNo, locName(sp.ticket.intakeLocationId || sp.ticket.locationId))}</span>
                    <span>{sp.partName}</span>
                  </div>
                  <div className="mob-row-amount">{money((sp.costPrice || 0) * sp.quantity)}</div>
                </div>
                <div className="mob-row-sub">
                  <span>{sp.ticket.customerName || "—"}</span>
                  <span>{sp.quantity} db</span>
                  <span>{(sp.usedAt || "").slice(0, 10) || "—"}</span>
                </div>
              </div>
            )}
          />
        )}
      </HistorySection>

      {loadingData ? <div className="tw tw-apple"><LoadingState /></div> : catFiltered.length === 0 ? <div className="tw tw-apple"><EmptyState icon={PartsIcon}>Nincs találat.</EmptyState></div> : (
        CATS.map((cat) => {
          const items = sortItems(cat === "Egyéb"
            ? catFiltered.filter((p) => !PART_CATEGORIES.includes(p.category))
            : catFiltered.filter((p) => p.category === cat));
          if (items.length === 0) return null;
          return (
            <div key={cat} style={{ marginBottom: 18 }}>
              <ResponsiveTable
                className="tw-apple"
                columns={[{ key: "n", label: "Sorszám", className: "col-serial" }, { key: "p", label: "Alkatrész", className: "col-grow" }, { key: "s", label: "Forrás" }, { key: "k", label: "Kategória" }, { key: "c", label: "Beérk. ár" }, { key: "x", label: "" }]}
                rows={items}
                rowKey={(p) => p.id}
                renderRow={(p) => (
                  <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setPartDetailId(groupKeyOf(p))}>
                    <td className="mono col-serial" style={{ color: "#9CA3AF", whiteSpace: "nowrap" }}>{partCode(p.partNo) || "—"}</td>
                    <td>
                      <div className="stk-name" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {partLabel(p)}
                        {originPill(p.origin)}
                      </div>
                    </td>
                    <td style={{ color: "#6B7280", fontSize: 12, whiteSpace: "nowrap" }}>{p.source || "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{categoryPill(p.category || "Egyéb")}</td>
                    <td className="row-price">{money(p.costPrice)}</td>
                    <td className="stk-actions" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="use-btn icon-only" disabled={busy || !p.quantity} title="Felhasználás" onClick={() => onUsePart(p)}><UseIcon width={13} height={13} /></button>
                    </td>
                  </tr>
                )}
                renderMobileRow={(p) => (
                  <div className="mob-row" onClick={() => setPartDetailId(groupKeyOf(p))}>
                    <div className="mob-row-top">
                      <div className="mob-row-main" style={{ minWidth: 0 }}>
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          <span className="stk-sub" style={{ marginTop: 0, marginRight: 6 }}>{partCode(p.partNo) || "—"}</span>
                          {partLabel(p)}
                        </span>
                      </div>
                      <div className="mob-row-amount">{money(p.costPrice)}</div>
                    </div>
                    <div className="mob-row-sub" style={{ marginTop: 8, gap: 6 }}>
                      {categoryPill(p.category || "Egyéb")}
                      {originPill(p.origin)}
                      <span style={{ fontSize: 11 }}>{p.source || "—"}</span>
                    </div>
                    <div className="mob-row-sub" style={{ marginTop: 8, gap: 6 }} onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="use-btn icon-only" style={{ marginLeft: "auto" }} disabled={busy || !p.quantity} title="Felhasználás" onClick={() => onUsePart(p)}><UseIcon width={13} height={13} /></button>
                    </div>
                  </div>
                )}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
