import { useMemo, useState } from "react";
import { money, PART_CATEGORIES, partCode, ticketCode } from "../lib/utils";
import { SearchIcon, EditIcon, PartsIcon } from "../components/icons";
import ConfirmDelete from "../components/ConfirmDelete";
import Thumb from "../components/Thumb";
import { EmptyState, LoadingState } from "../components/EmptyState";
import HistorySection from "../components/HistorySection";

const SORTS = [
  { key: "recent", label: "Legújabb elöl" },
  { key: "qty-asc", label: "Készlet: kevés → sok" },
  { key: "qty-desc", label: "Készlet: sok → kevés" },
  { key: "name", label: "Név A–Z" },
];

function sortItems(items, sortBy) {
  if (sortBy === "recent") return items;
  const arr = [...items];
  if (sortBy === "qty-asc") arr.sort((a, b) => (Number(a.quantity) || 0) - (Number(b.quantity) || 0));
  else if (sortBy === "qty-desc") arr.sort((a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0));
  else if (sortBy === "name") arr.sort((a, b) => a.name.localeCompare(b.name));
  return arr;
}

const CATS = [...PART_CATEGORIES, "Egyéb"];

export default function PartsTab({
  busy, setPartModal, partSearch, setPartSearch, loadingData, filteredParts, setPartDetailId, deletePart, partsStats,
  allUsedParts = [], locName, setDetailId, setPdfImportModal,
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
        <div><div className="page-title">Alkatrész raktár</div><div className="page-sub">Közös raktár — mindkét helyszín</div></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn sec" disabled={busy} onClick={() => setPdfImportModal(true)}>+ Rendelés PDF-ből</button>
          <button className="btn" disabled={busy} onClick={() => setPartModal("add")}>+ Új alkatrész</button>
        </div>
      </div>

      <div className="statrow c2">
        <div className="statcard"><div className="lbl">Tételek</div><div className="val">{filteredParts.length} db</div></div>
        <div className="statcard"><div className="lbl">Készlet érték</div><div className="val">{money(partsStats.value)}</div></div>
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
              <div className="tw">
                <table>
                  <thead><tr><th>Alkatrész</th><th>Márka/Illik</th><th>Készlet</th><th>Beérk. ár</th><th>Forrás</th><th></th></tr></thead>
                  <tbody>
                    {items.map((p) => (
                      <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setPartDetailId(p.id)}>
                        <td>
                          <div className="stk-row">
                            <Thumb brand={p.category || p.name} />
                            <div>
                              <div className="stk-name">{p.name}</div>
                              <div className="stk-sub">{partCode(p.partNo) || "—"}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: "#6B7280", fontSize: 12 }}>{[p.brand, p.modelFit].filter(Boolean).join(" · ") || "—"}</td>
                        <td style={{ fontWeight: 700 }}>{p.quantity} db</td>
                        <td className="mono" style={{ color: "#6B7280" }}>{money(p.costPrice)}</td>
                        <td style={{ color: "#6B7280", fontSize: 12 }}>{p.source || "—"}</td>
                        <td className="stk-actions" onClick={(e) => e.stopPropagation()}>
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

      <HistorySection
        icon={PartsIcon}
        label="Felhasznált alkatrészek"
        items={allUsedParts}
        searchPlaceholder="Keresés alkatrész, munkalap vagy vevő szerint..."
        filterFn={(sp, q) => [sp.partName, sp.ticket.customerName, sp.ticket.brand, sp.ticket.model, ticketCode(sp.ticket.ticketNo, locName(sp.ticket.intakeLocationId || sp.ticket.locationId))].filter(Boolean).join(" ").toLowerCase().includes(q)}
      >
        {(rows) => (
          <table>
            <thead><tr><th>Alkatrész</th><th>Munkalap</th><th>Vevő</th><th>Menny.</th><th>Ár</th><th>Dátum</th></tr></thead>
            <tbody>
              {rows.map((sp) => (
                <tr key={sp.id} style={{ cursor: "pointer" }} onClick={() => setDetailId(sp.ticket.id)}>
                  <td style={{ fontWeight: 600 }}>{sp.partName}</td>
                  <td>{ticketCode(sp.ticket.ticketNo, locName(sp.ticket.intakeLocationId || sp.ticket.locationId))}</td>
                  <td>{sp.ticket.customerName || "—"}</td>
                  <td style={{ fontWeight: 700 }}>{sp.quantity} db</td>
                  <td className="mono" style={{ fontWeight: 700 }}>{money((sp.costPrice || 0) * sp.quantity)}</td>
                  <td className="mono" style={{ color: "#9CA3AF" }}>{(sp.usedAt || "").slice(0, 10) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </HistorySection>
    </>
  );
}
