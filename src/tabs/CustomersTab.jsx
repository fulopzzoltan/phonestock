import { formatPhone, money } from "../lib/utils";
import { SearchIcon, CustomersIcon } from "../components/icons";
import { EmptyState, LoadingState } from "../components/EmptyState";

export default function CustomersTab({
  effectiveLocFilter, locName, custSearch, setCustSearch, loadingData, customers, setCustomerKey,
}) {
  return (
    <div className="apple-page">
      <div className="filter-row">
        <div className="searchbar"><SearchIcon /><input value={custSearch} onChange={(e) => setCustSearch(e.target.value)} /></div>
      </div>

      <div className="tw tw-apple">
        {loadingData ? <LoadingState /> : customers.length === 0 ? <EmptyState icon={CustomersIcon}>Nincs ügyfél.</EmptyState> : (
          <>
            <table>
              <thead><tr><th>Név</th><th className="col-grow">Telefonszám</th><th>Vásárlások</th><th>Szerviz</th><th>Utolsó aktivitás</th></tr></thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.key} style={{ cursor: "pointer" }} onClick={() => setCustomerKey(c.key)}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <div className="stk-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {c.name || "Névtelen"}
                        {c.webshopAccount && <span className="gar-pill" title={`Webshop-fiók: ${c.webshopAccount.email || "—"}`}>Webshop</span>}
                      </div>
                    </td>
                    <td className="mono" style={{ whiteSpace: "nowrap" }}>{formatPhone(c.phone) || "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{c.purchases.length} db · <span className="mono">{money(c.purchaseTotal)}</span></td>
                    <td style={{ whiteSpace: "nowrap" }}>{c.tickets.length} db · <span className="mono">{money(c.ticketTotal)}</span></td>
                    <td className="mono" style={{ color: "#6B7280", whiteSpace: "nowrap" }}>{c.lastActivity || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mob-cards">
              {customers.map((c) => (
                <div key={c.key} className="mob-row" onClick={() => setCustomerKey(c.key)}>
                  <div className="mob-row-top">
                    <div className="mob-row-main" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{c.name || "Névtelen"}</span>
                      {c.webshopAccount && <span className="gar-pill">Webshop</span>}
                    </div>
                  </div>
                  <div className="mob-row-sub">
                    <span className="mono">{formatPhone(c.phone) || "—"}</span>
                    <span>{c.purchases.length} vásárlás · {money(c.purchaseTotal)}</span>
                    <span>{c.tickets.length} szerviz · {money(c.ticketTotal)}</span>
                    <span>{c.lastActivity || "—"}</span>
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
