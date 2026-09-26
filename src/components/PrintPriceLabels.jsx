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
  position: "relative", padding: "20px 16px", textAlign: "center",
  breakInside: "avoid", pageBreakInside: "avoid",
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
};

function Label({ p }) {
  const isNew = p.condition === "New";
  const showBattery = !isNew && p.batteryHealth !== null && p.batteryHealth !== undefined && p.batteryHealth !== "";
  return (
    <div style={cellStyle}>
      {isNew && (
        <span style={{
          position: "absolute", top: 10, right: 12, width: 30, height: 30, borderRadius: "50%",
          background: "var(--primary)", color: "#fff", fontSize: 11, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>Új</span>
      )}
      <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>{labelTitle(p)}</div>
      {p.storage && <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{p.storage}</div>}
      {p.ram && p.brand !== "Apple" && <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{p.ram} RAM</div>}
      {showBattery && <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Baterie: {Math.round(Number(p.batteryHealth))}%</div>}
      {p.warranty && <div style={{ fontSize: 16, fontWeight: 700, color: "#159C46" }}>Garantie: {warrantyRo(p.warranty)}</div>}
      <div style={{
        marginTop: 5, background: "#E11D3F", color: "#fff", fontWeight: 800, fontSize: 18,
        borderRadius: 8, padding: "7px 20px", display: "inline-block",
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
        {items.map((p) => <Label key={p.id} p={p} />)}
      </div>
    </div>
  );
}
