import { useMemo, useState } from "react";
import { SearchIcon, WarrantyIcon } from "../components/icons";
import { EmptyState, LoadingState } from "../components/EmptyState";
import HistorySection from "../components/HistorySection";

const FILTERS = [["all", "Mind"], ["sale", "Telefon garancia"], ["service", "Szerviz garancia"]];

export default function WarrantyTab({
  warrantyFilter, setWarrantyFilter, loadingData, filteredWarranties,
  setWarrantyDetailKey, expiredWarranties,
}) {
  const [search, setSearch] = useState("");
  const [showExpired, setShowExpired] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filteredWarranties;
    return filteredWarranties.filter((w) => [w.customerName, w.label].join(" ").toLowerCase().includes(q));
  }, [filteredWarranties, search]);

  return (
    <div className="apple-page">
      <div className="filter-row">
        <div className="searchbar"><SearchIcon /><input value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="seg">
          {FILTERS.map(([key, label]) => (
            <button key={key} type="button" className={warrantyFilter === key ? "active" : ""} onClick={() => setWarrantyFilter(key)}>{label}</button>
          ))}
        </div>
        <button type="button" className={`history-toolbar-btn${showExpired ? " active" : ""}`} onClick={() => setShowExpired((v) => !v)}>
          <WarrantyIcon width={14} height={14} />
          Lejárt garanciák <span className="cnt">{expiredWarranties.length}</span>
        </button>
      </div>

      <HistorySection
        hideToggle
        open={showExpired}
        onToggle={setShowExpired}
        className="tw-apple"
        icon={WarrantyIcon}
        label="Lejárt garanciák"
        items={expiredWarranties}
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

      <div className="tw tw-apple">
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
    </div>
  );
}
