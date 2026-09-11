import { displayName } from "../lib/utils";

// A telefonos árcimkék nyomtatható rácsa — a Figma "telefon arcimkek" makett alapján:
// vastag márka+modell cím, tárhely/RAM/akku sorok, zöld garancia-szöveg, piros ár-pill,
// és egy zöld "Új" jelvény a vadonatúj (nem felújított) készülékeknél. Az ügyfél ezt látja
// kirakva a polcon, ezért szándékosan román nyelvű (a bolt vegyes magyar/román vevőkört
// szolgál ki), függetlenül attól, hogy az admin-felület maga magyar.
const WARRANTY_RO = { "1 hó": "1 luna", "3 hó": "3 luni", "6 hó": "6 luni", "1 év": "1 an", "2 év": "2 ani" };
function warrantyRo(w) {
  return WARRANTY_RO[w] || w || "";
}
function labelTitle(p) {
  const name = displayName(p.brand, p.model);
  return p.brand === "Apple" ? `Apple ${name}` : name;
}

const cellStyle = {
  position: "relative", padding: "14px 12px", textAlign: "center",
  borderRight: "1px solid #D1D5DB", borderBottom: "1px solid #D1D5DB",
  breakInside: "avoid", pageBreakInside: "avoid",
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
};

function Label({ p }) {
  const isNew = p.condition === "New";
  const showBattery = !isNew && p.batteryHealth !== null && p.batteryHealth !== undefined && p.batteryHealth !== "";
  return (
    <div style={cellStyle}>
      {isNew && (
        <span style={{
          position: "absolute", top: 8, right: 10, width: 26, height: 26, borderRadius: "50%",
          background: "#22C55E", color: "#fff", fontSize: 9.5, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>Új</span>
      )}
      <div style={{ fontSize: 14.5, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>{labelTitle(p)}</div>
      {p.storage && <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{p.storage}</div>}
      {p.ram && p.brand !== "Apple" && <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{p.ram} RAM</div>}
      {showBattery && <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Baterie: {Math.round(Number(p.batteryHealth))}%</div>}
      {p.warranty && <div style={{ fontSize: 13, fontWeight: 700, color: "#16A34A" }}>Garantie: {warrantyRo(p.warranty)}</div>}
      <div style={{
        marginTop: 4, background: "#E11D3F", color: "#fff", fontWeight: 800, fontSize: 15,
        borderRadius: 8, padding: "5px 16px", display: "inline-block",
      }}>
        {(Number(p.salePrice) || 0).toFixed(2)} Lei
      </div>
    </div>
  );
}

export default function PrintPriceLabels({ items = [] }) {
  if (!items.length) return null;
  return (
    <div className="doc-page" style={{ fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", border: "1px solid #D1D5DB", borderRight: "none", borderBottom: "none" }}>
        {items.map((p) => <Label key={p.id} p={p} />)}
      </div>
    </div>
  );
}
