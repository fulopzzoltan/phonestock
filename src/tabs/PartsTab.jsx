import { useMemo, useState } from "react";
import { money, PART_CATEGORIES, partCode, ticketCode } from "../lib/utils";
import { SearchIcon, EditIcon, PartsIcon } from "../components/icons";
import ConfirmDelete from "../components/ConfirmDelete";
import { EmptyState, LoadingState } from "../components/EmptyState";
import HistorySection from "../components/HistorySection";
import ResponsiveTable from "../components/ResponsiveTable";

const SORTS = [
  { key: "recent", label: "Legújabb elöl" },
  { key: "qty-asc", label: "Készlet: kevés → sok" },
  { key: "qty-desc", label: "Készlet: sok → kevés" },
  { key: "name", label: "Név A–Z" },
];

function sortItems(items, sortBy) {
  const arr = [...items];
  if (sortBy === "recent") arr.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "") || (Number(b.partNo) || 0) - (Number(a.partNo) || 0));
  else if (sortBy === "qty-asc") arr.sort((a, b) => (Number(a.quantity) || 0) - (Number(b.quantity) || 0));
  else if (sortBy === "qty-desc") arr.sort((a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0));
  else if (sortBy === "name") arr.sort((a, b) => a.name.localeCompare(b.name));
  return arr;
}

const CATS = [...PART_CATEGORIES, "Egyéb"];

const UseIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="7" width="18" height="12" rx="2" /><path d="M8 7V5.5A1.5 1.5 0 019.5 4h5A1.5 1.5 0 0116 5.5V7" />
    <path d="M9.5 13l2 2 3.5-3.5" />
  </svg>
);

export default function PartsTab({
  busy, setPartModal, partSearch, setPartSearch, loadingData, filteredParts, setPartDetailId, deletePart,
  allUsedParts = [], locName, setDetailId, setPdfImportModal, onUsePart,
}) {
  const [catFilter, setCatFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  const catFiltered = useMemo(() => {
    if (catFilter === "all") return filteredParts;
    if (catFilter === "Egyéb") return filteredParts.filter((p) => !PART_CATEGORIES.includes(p.category));
    return filteredParts.filter((p) => p.category === catFilter);
  }, [filteredParts, catFilter]);

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Alkatrész raktár</div></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn sec" disabled={busy} onClick={() => setPdfImportModal(true)}>+ Rendelés PDF-ből</button>
          <button className="btn" disabled={busy} onClick={() => setPartModal("add")}>+ Új alkatrész</button>
        </div>
      </div>

      <div className="filter-row">
        <div className="searchbar"><SearchIcon /><input placeholder="Keresés név, márka, kategória, forrás szerint..." value={partSearch} onChange={(e) => setPartSearch(e.target.value)} /></div>
        <div className="seg">
          <button className={catFilter === "all" ? "active" : ""} onClick={() => setCatFilter("all")}>Mind</button>
          {CATS.map((cat) => (
            <button key={cat} className={catFilter === cat ? "active" : ""} onClick={() => setCatFilter(cat)}>{cat}</button>
          ))}
        </div>
        <select className="filter-sel" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {loadingData ? <div className="tw"><LoadingState /></div> : catFiltered.length === 0 ? <div className="tw"><EmptyState icon={PartsIcon}>Nincs találat.</EmptyState></div> : (
        CATS.map((cat) => {
          const items = sortItems(cat === "Egyéb"
            ? catFiltered.filter((p) => !PART_CATEGORIES.includes(p.category))
            : catFiltered.filter((p) => p.category === cat), sortBy);
          if (items.length === 0) return null;
          return (
            <div key={cat} style={{ marginBottom: 18 }}>
              <div className="loc-group-head">
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151" }}>
                  {cat} <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({items.length} db)</span>
                </div>
              </div>
              <ResponsiveTable
                columns={[{ key: "p", label: "Alkatrész", className: "col-grow" }, { key: "c", label: "Beérk. ár" }, { key: "s", label: "Forrás" }, { key: "x", label: "" }]}
                rows={items}
                rowKey={(p) => p.id}
                renderRow={(p) => (
                  <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setPartDetailId(p.id)}>
                    <td>
                      <div className="stk-name" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        <span className="stk-sub" style={{ marginTop: 0 }}>{partCode(p.partNo) || "—"}</span>
                        {p.name}{[p.brand, p.modelFit].filter(Boolean).length > 0 ? ` — ${[p.brand, p.modelFit].filter(Boolean).join(", ")}` : ""}
                      </div>
                    </td>
                    <td className="mono" style={{ color: "#6B7280", whiteSpace: "nowrap" }}>{money(p.costPrice)}</td>
                    <td style={{ color: "#6B7280", fontSize: 12, whiteSpace: "nowrap" }}>{p.source || "—"}</td>
                    <td className="stk-actions" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="use-btn" disabled={busy || !p.quantity} onClick={() => onUsePart(p)}><UseIcon width={13} height={13} />Felhasználás</button>
                      <button className="iconbtn" disabled={busy} onClick={() => setPartModal(p)}><EditIcon /></button>
                      <ConfirmDelete disabled={busy} onConfirm={() => deletePart(p.id)} />
                    </td>
                  </tr>
                )}
                renderMobileRow={(p) => (
                  <div className="mob-row" onClick={() => setPartDetailId(p.id)}>
                    <div className="mob-row-top">
                      <div className="mob-row-main" style={{ minWidth: 0 }}>
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          <span className="stk-sub" style={{ marginTop: 0, marginRight: 6 }}>{partCode(p.partNo) || "—"}</span>
                          {p.name}{[p.brand, p.modelFit].filter(Boolean).length > 0 ? ` — ${[p.brand, p.modelFit].filter(Boolean).join(", ")}` : ""}
                        </span>
                      </div>
                      <div className="mob-row-amount">{money(p.costPrice)}</div>
                    </div>
                    <div className="mob-row-sub" style={{ marginTop: 8, gap: 6 }} onClick={(e) => e.stopPropagation()}>
                      <span style={{ fontSize: 11 }}>{p.source || "—"}</span>
                      <button type="button" className="use-btn" style={{ marginLeft: "auto" }} disabled={busy || !p.quantity} onClick={() => onUsePart(p)}><UseIcon width={13} height={13} />Felhasználás</button>
                      <button className="iconbtn" disabled={busy} onClick={() => setPartModal(p)}><EditIcon /></button>
                      <ConfirmDelete disabled={busy} onConfirm={() => deletePart(p.id)} />
                    </div>
                  </div>
                )}
              />
            </div>
          );
        })
      )}

      <HistorySection
        icon={PartsIcon}
        label="Felhasznált alkatrészek"
        items={allUsedParts}
        searchPlaceholder="Keresés alkatrész, munkalap vagy vevő szerint..."
        filterFn={(sp, q) => [sp.partName, sp.ticket.customerName, sp.ticket.brand, sp.ticket.model, ticketCode(sp.ticket.ticketNo, locName(sp.ticket.intakeLocationId || sp.ticket.locationId))].filter(Boolean).join(" ").toLowerCase().includes(q)}
      >
        {(rows) => (
          <ResponsiveTable
            wrap={false}
            columns={[{ key: "p", label: "Alkatrész" }, { key: "t", label: "Munkalap" }, { key: "c", label: "Vevő" }, { key: "q", label: "Menny." }, { key: "a", label: "Ár" }, { key: "d", label: "Dátum" }]}
            rows={rows}
            rowKey={(sp) => sp.id}
            renderRow={(sp) => (
              <tr key={sp.id} style={{ cursor: "pointer" }} onClick={() => setDetailId(sp.ticket.id)}>
                <td style={{ fontWeight: 600 }}>{sp.partName}</td>
                <td>{ticketCode(sp.ticket.ticketNo, locName(sp.ticket.intakeLocationId || sp.ticket.locationId))}</td>
                <td>{sp.ticket.customerName || "—"}</td>
                <td style={{ fontWeight: 700 }}>{sp.quantity} db</td>
                <td className="mono" style={{ fontWeight: 700 }}>{money((sp.costPrice || 0) * sp.quantity)}</td>
                <td className="mono" style={{ color: "#9CA3AF" }}>{(sp.usedAt || "").slice(0, 10) || "—"}</td>
              </tr>
            )}
            renderMobileRow={(sp) => (
              <div className="mob-row" onClick={() => setDetailId(sp.ticket.id)}>
                <div className="mob-row-top">
                  <div className="mob-row-main"><span>{sp.partName}</span></div>
                  <div className="mob-row-amount">{money((sp.costPrice || 0) * sp.quantity)}</div>
                </div>
                <div className="mob-row-sub">
                  <span>{ticketCode(sp.ticket.ticketNo, locName(sp.ticket.intakeLocationId || sp.ticket.locationId))}</span>
                  <span>{sp.ticket.customerName || "—"}</span>
                  <span>{sp.quantity} db</span>
                  <span>{(sp.usedAt || "").slice(0, 10) || "—"}</span>
                </div>
              </div>
            )}
          />
        )}
      </HistorySection>
    </>
  );
}
