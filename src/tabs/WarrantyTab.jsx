import { useMemo, useState } from "react";
import { SearchIcon, WarrantyIcon } from "../components/icons";
import { EmptyState, LoadingState } from "../components/EmptyState";
import HistorySection from "../components/HistorySection";

const FILTERS = [["all", "Mind"], ["sale", "Telefon garancia"], ["service", "Szerviz garancia"]];

export default function WarrantyTab({
  busy, setWarrantyModal, warrantyFilter, setWarrantyFilter, loadingData, filteredWarranties,
  setWarrantyDetailKey, expiredWarranties,
}) {
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filteredWarranties;
    return filteredWarranties.filter((w) => [w.customerName, w.label].join(" ").toLowerCase().includes(q));
  }, [filteredWarranties, search]);

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Garancia</div></div>
        <button className="btn" disabled={busy} onClick={() => setWarrantyModal("add")}>+ Garancia felvétele</button>
      </div>

      <div className="filter-row">
        <div className="searchbar"><SearchIcon /><input placeholder="Keresés ügyfél vagy termék szerint..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="seg">
          {FILTERS.map(([key, label]) => (
            <button key={key} type="button" className={warrantyFilter === key ? "active" : ""} onClick={() => setWarrantyFilter(key)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="tw">
        {loadingData ? <LoadingState /> : rows.length === 0 ? <EmptyState icon={WarrantyIcon}>Nincs aktív garancia.</EmptyState> : (
          <>
            <table>
              <thead><tr><th>Ügyfél</th><th className="col-grow">Termék / Eszköz</th><th>Garancia</th><th>Lejárat</th></tr></thead>
              <tbody>
                {rows.map((w) => (
                  <tr key={w.key} style={{ cursor: "pointer" }} onClick={() => setWarrantyDetailKey(w.key)}>
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{w.customerName || "—"}</td>
                    <td>{w.label || "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}><span className="gar-pill">{w.warranty}</span></td>
                    <td className="mono" style={{ color: "#6B7280", whiteSpace: "nowrap" }}>{w.expiry}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mob-cards">
              {rows.map((w) => (
                <div key={w.key} className="mob-row" onClick={() => setWarrantyDetailKey(w.key)}>
                  <div className="mob-row-top">
                    <div className="mob-row-main"><span>{w.customerName || "—"}</span></div>
                    <span className="mob-row-amount">{w.expiry}</span>
                  </div>
                  <div className="mob-row-sub">
                    <span>{w.label || "—"}</span>
                    <span className="gar-pill">{w.warranty}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <HistorySection
        icon={WarrantyIcon}
        label="Lejárt garanciák"
        items={expiredWarranties}
        searchPlaceholder="Keresés ügyfél vagy termék szerint..."
        filterFn={(w, q) => [w.customerName, w.label].filter(Boolean).join(" ").toLowerCase().includes(q)}
      >
        {(rows) => (
          <table>
            <thead><tr><th>Ügyfél</th><th className="col-grow">Termék / Eszköz</th><th>Garancia</th><th>Lejárt</th></tr></thead>
            <tbody>
              {rows.map((w) => (
                <tr key={w.key} style={{ cursor: "pointer" }} onClick={() => setWarrantyDetailKey(w.key)}>
                  <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{w.customerName || "—"}</td>
                  <td>{w.label || "—"}</td>
                  <td style={{ whiteSpace: "nowrap" }}><span className="gar-pill">{w.warranty}</span></td>
                  <td className="mono" style={{ color: "#9CA3AF", whiteSpace: "nowrap" }}>{w.expiry}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </HistorySection>
    </>
  );
}
