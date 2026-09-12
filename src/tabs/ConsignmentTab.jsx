import { money, displayName } from "../lib/utils";
import { ConsignmentIcon } from "../components/icons";
import { EmptyState, LoadingState } from "../components/EmptyState";
import ResponsiveTable from "../components/ResponsiveTable";

// Csak a raktáron levő ("in_stock") bizományos tételeket mutatjuk — amint egy telefon
// eladódik (status "sold"), a hívó App.jsx-ben szűrt `stock` prop miatt magától kikerül
// erről a listáról, nincs hozzá külön logika.
export default function ConsignmentTab({ locName, busy, loadingData, stock, setProductDetailId, payoutConsignor }) {
  const items = stock
    .filter((p) => p.acquisition?.acquisitionType === "consignment")
    .sort((a, b) => (a.acquisition?.sellerName || "").localeCompare(b.acquisition?.sellerName || "", "hu"));
  const total = items.reduce((sum, p) => sum + (Number(p.acquisition?.consignorPayoutAmount) || 0), 0);
  const sellerCount = new Set(items.map((p) => p.acquisition?.sellerName).filter(Boolean)).size;

  return (
    <div className="apple-page">
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div className="statcard" style={{ minWidth: 150 }}>
          <div className="lbl">Bent, ki nem fizetve</div>
          <div className="val">{money(total)}</div>
        </div>
        <div className="statcard" style={{ minWidth: 110 }}>
          <div className="lbl">Tétel</div>
          <div className="val">{items.length}</div>
        </div>
        <div className="statcard" style={{ minWidth: 110 }}>
          <div className="lbl">Bizományos</div>
          <div className="val">{sellerCount}</div>
        </div>
      </div>

      {loadingData ? <LoadingState /> : items.length === 0 ? (
        <EmptyState icon={ConsignmentIcon}>Nincs jelenleg raktáron bizományos telefon.</EmptyState>
      ) : (
        <ResponsiveTable
          className="tw-apple"
          columns={[
            { key: "p", label: "Termék", className: "col-device" },
            { key: "s", label: "Bizományos" },
            { key: "l", label: "Helyszín" },
            { key: "d", label: "Bekerülés" },
            { key: "a", label: "Összeg", className: "num-col" },
            { key: "x", label: "" },
          ]}
          rows={items}
          rowKey={(i) => i.id}
          renderRow={(i) => (
            <tr key={i.id} style={{ cursor: "pointer" }} onClick={() => setProductDetailId(i.id)}>
              <td style={{ whiteSpace: "nowrap" }}>
                <div className="stk-name">{displayName(i.brand, i.model)}</div>
                {i.imei && <div className="stk-sub">{i.imei}</div>}
              </td>
              <td style={{ whiteSpace: "nowrap" }}>
                <div>{i.acquisition?.sellerName || "—"}</div>
                {i.acquisition?.sellerPhone && <div className="stk-sub">{i.acquisition.sellerPhone}</div>}
              </td>
              <td><span className="badge-loc">{locName(i.locationId)}</span></td>
              <td className="mono">{i.dateAdded || "—"}</td>
              <td className="row-price">{money(Number(i.acquisition?.consignorPayoutAmount) || 0)}</td>
              <td className="stk-actions" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="btn sec sm" disabled={busy} onClick={() => payoutConsignor(i.id)}>Kifizetés</button>
              </td>
            </tr>
          )}
          renderMobileRow={(i) => (
            <div className="mob-row" onClick={() => setProductDetailId(i.id)}>
              <div className="mob-row-top">
                <div className="mob-row-main">
                  <span>{displayName(i.brand, i.model)}</span>
                </div>
                <div className="mob-row-amount">{money(Number(i.acquisition?.consignorPayoutAmount) || 0)}</div>
              </div>
              <div className="mob-row-sub">
                <span className="badge-loc">{locName(i.locationId)}</span>
                <span>{i.acquisition?.sellerName || "—"}</span>
                <span>{i.dateAdded || "—"}</span>
              </div>
              <div className="mob-row-sub" style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                <button type="button" className="btn sec sm" disabled={busy} onClick={() => payoutConsignor(i.id)}>Kifizetés</button>
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}
