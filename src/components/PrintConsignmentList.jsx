import { money } from "../lib/utils";

function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

const pageStyle = { fontFamily: "Inter, sans-serif", color: "#111827", padding: "20px 30px", fontSize: 11, lineHeight: 1.4, maxWidth: 760 };
const h1 = { fontSize: 15, fontWeight: 800, marginBottom: 2, textAlign: "center" };
const sub = { fontSize: 10.5, color: "#6B7280", textAlign: "center", marginBottom: 16 };
const thStyle = { border: "1px solid #D1D5DB", padding: "5px 6px", textAlign: "left", background: "#F3F4F6" };
const tdStyle = { border: "1px solid #D1D5DB", padding: "5px 6px" };

// A bizomány-lista nyomtatható összesítője: minden benti (raktáron levő), kifizetetlen
// bizományos telefon egy táblázatban, bizományosonként csoportosítva — amint egy tétel
// eladódik, a `status === "in_stock"` szűrő miatt magától lekerül a listáról.
export default function PrintConsignmentList({ items = [], locations = [] }) {
  if (!items.length) return null;
  const locName = (id) => locations.find((l) => l.id === id)?.name || "";
  const bySeller = {};
  items.forEach((p) => {
    const seller = p.acquisition?.sellerName || "Ismeretlen";
    (bySeller[seller] ||= []).push(p);
  });
  const sellers = Object.keys(bySeller).sort();
  const grandTotal = items.reduce((sum, p) => sum + (Number(p.acquisition?.consignorPayoutAmount) || 0), 0);

  return (
    <div className="doc-page" style={pageStyle}>
      <div style={h1}>Aktív bizományok</div>
      <div style={sub}>{fmtDate(new Date().toISOString().slice(0, 10))} — {items.length} db tétel, összesen {money(grandTotal)} tartozás</div>

      {sellers.map((seller) => {
        const rows = bySeller[seller];
        const sellerTotal = rows.reduce((sum, p) => sum + (Number(p.acquisition?.consignorPayoutAmount) || 0), 0);
        return (
          <div key={seller} style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>
              {seller}{rows[0]?.acquisition?.sellerPhone ? ` — ${rows[0].acquisition.sellerPhone}` : ""}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
              <thead>
                <tr>
                  {["Eszköz", "IMEI", "Helyszín", "Bekerülés", "Okmány szám", "Összeg"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td style={tdStyle}>{[p.brand, p.model].filter(Boolean).join(" ")}</td>
                    <td style={tdStyle}>{p.imei || "—"}</td>
                    <td style={tdStyle}>{locName(p.locationId)}</td>
                    <td style={tdStyle}>{fmtDate(p.dateAdded)}</td>
                    <td style={tdStyle}>{p.acquisition?.consignmentDocNo || "—"}</td>
                    <td style={tdStyle}>{money(Number(p.acquisition?.consignorPayoutAmount) || 0)}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ ...tdStyle, fontWeight: 700, border: "none" }} colSpan={5}>Részösszeg — {seller}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{money(sellerTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}

      <div style={{ marginTop: 20, fontWeight: 800, fontSize: 12, textAlign: "right" }}>
        Végösszeg: {money(grandTotal)}
      </div>
    </div>
  );
}
