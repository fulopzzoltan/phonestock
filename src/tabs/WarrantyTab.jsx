import { useMemo, useState } from "react";
import { today } from "../lib/utils";
import { SearchIcon, WarrantyIcon } from "../components/icons";
import CallLink from "../components/CallLink";
import Thumb from "../components/Thumb";
import { EmptyState, LoadingState } from "../components/EmptyState";
import HistorySection from "../components/HistorySection";

const FILTERS = [["all", "Mind"], ["sale", "Telefon garancia"], ["service", "Szerviz garancia"]];

export default function WarrantyTab({
  busy, setWarrantyModal, activeWarranties, warrantyFilter, setWarrantyFilter, loadingData, filteredWarranties,
  setWarrantyDetailKey, locName, expiredWarranties,
}) {
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filteredWarranties;
    return filteredWarranties.filter((w) => [w.customerName, w.label].join(" ").toLowerCase().includes(q));
  }, [filteredWarranties, search]);

  const expiringSoon = useMemo(() => activeWarranties.filter((w) => {
    if (!w.expiry) return false;
    const daysLeft = Math.ceil((new Date(w.expiry) - new Date(today())) / 86400000);
    return daysLeft <= 14;
  }).length, [activeWarranties]);

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Garancia</div><div className="page-sub">Aktív garanciák — telefon és szerviz, kézzel is felvehető</div></div>
        <button className="btn" disabled={busy} onClick={() => setWarrantyModal("add")}>+ Garancia felvétele</button>
      </div>

      <div className="statrow c2">
        <div className="statcard accent"><div className="lbl">Aktív garancia</div><div className="val">{activeWarranties.length} db</div></div>
        <div className="statcard"><div className="lbl">Lejár 14 napon belül</div><div className="val" style={{ color: expiringSoon > 0 ? "#DC2626" : undefined }}>{expiringSoon} db</div></div>
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
              <thead><tr><th>Típus</th><th>Ügyfél</th><th>Termék / Eszköz</th><th>Garancia</th><th>Lejárat</th><th>Helyszín</th><th>Művelet</th></tr></thead>
              <tbody>
                {rows.map((w) => {
                  const daysLeft = w.expiry ? Math.ceil((new Date(w.expiry) - new Date(today())) / 86400000) : null;
                  return (
                    <tr key={w.key} style={{ cursor: "pointer" }} onClick={() => setWarrantyDetailKey(w.key)}>
                      <td>{w.kind === "sale" ? <span className="badge-income">Eladás</span> : <span className="badge-loc">Szerviz</span>}</td>
                      <td style={{ fontWeight: 600 }}>{w.customerName || "—"}</td>
                      <td>
                        <div className="stk-row">
                          <Thumb brand={w.label || "?"} size="sm" />
                          <div>{w.label || "—"}</div>
                        </div>
                      </td>
                      <td><span className="gar-pill">{w.warranty}</span></td>
                      <td className="mono" style={{ fontWeight: 700, color: daysLeft != null && daysLeft <= 14 ? "#DC2626" : "#111827" }}>
                        {w.expiry} {daysLeft != null && <span style={{ fontWeight: 500, color: "#9CA3AF" }}>({daysLeft} nap)</span>}
                      </td>
                      <td><span className="badge-loc">{locName(w.locationId)}</span></td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <CallLink phone={w.customerPhone} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mob-cards">
              {rows.map((w) => {
                const daysLeft = w.expiry ? Math.ceil((new Date(w.expiry) - new Date(today())) / 86400000) : null;
                return (
                  <div key={w.key} className="mob-row" onClick={() => setWarrantyDetailKey(w.key)}>
                    <div className="mob-row-top">
                      <div className="mob-row-main"><span>{w.customerName || "—"}</span></div>
                      <span className="mob-row-amount" style={{ color: daysLeft != null && daysLeft <= 14 ? "#DC2626" : "#111827" }}>
                        {w.expiry}{daysLeft != null && ` (${daysLeft} nap)`}
                      </span>
                    </div>
                    <div className="mob-row-sub">
                      {w.kind === "sale" ? <span className="badge-income">Eladás</span> : <span className="badge-loc">Szerviz</span>}
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Thumb brand={w.label || "?"} size="sm" />{w.label || "—"}</span>
                      <span className="gar-pill">{w.warranty}</span>
                      <span className="badge-loc">{locName(w.locationId)}</span>
                      <span onClick={(e) => e.stopPropagation()}><CallLink phone={w.customerPhone} /></span>
                    </div>
                  </div>
                );
              })}
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
            <thead><tr><th>Típus</th><th>Ügyfél</th><th>Termék / Eszköz</th><th>Garancia</th><th>Lejárt</th><th>Helyszín</th></tr></thead>
            <tbody>
              {rows.map((w) => (
                <tr key={w.key} style={{ cursor: "pointer" }} onClick={() => setWarrantyDetailKey(w.key)}>
                  <td>{w.kind === "sale" ? <span className="badge-income">Eladás</span> : <span className="badge-loc">Szerviz</span>}</td>
                  <td style={{ fontWeight: 600 }}>{w.customerName || "—"}</td>
                  <td><div className="stk-row"><Thumb brand={w.label || "?"} size="sm" /><div>{w.label || "—"}</div></div></td>
                  <td><span className="gar-pill">{w.warranty}</span></td>
                  <td className="mono" style={{ color: "#9CA3AF" }}>{w.expiry}</td>
                  <td><span className="badge-loc">{locName(w.locationId)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </HistorySection>
    </>
  );
}
