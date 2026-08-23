import { warrantyExpiry, isWarrantyActive, SERVICE_WARRANTY_TERMS, SALE_WARRANTY_TERMS } from "../lib/utils";

export default function PrintWarrantySlip({ w, location }) {
  const expiry = warrantyExpiry(w.from, w.warranty);
  const active = isWarrantyActive(w.from, w.warranty);
  const row = (k, v) => (
    <tr>
      <td style={{ padding: "6px 0", fontWeight: 700, textAlign: "right", width: "38%", verticalAlign: "top" }}>{k}</td>
      <td style={{ padding: "6px 0 6px 14px", verticalAlign: "top" }}>{v}</td>
    </tr>
  );
  return (
    <div style={{ fontFamily: "Inter, sans-serif", color: "#111827", padding: "18px 24px", maxWidth: 760 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 26 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>TELEF<span style={{ color: "#22C55E" }}>O</span>NOS</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{location?.phone || ""}</div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, textAlign: "center" }}>Garancialevél</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#6B7280" }}>{w.kind === "sale" ? "Telefon garancia" : "Szerviz garancia"}</div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 24 }}>
        <tbody>
          {row("Ügyfél", w.customerName || "—")}
          {row("Elérhetőség", w.customerPhone || "—")}
          {row("Helyszín", location?.name || "—")}
          {row("Termék / Eszköz", w.label)}
          {row("Kezdete", w.from)}
          {row("Garanciaidő", `${w.warranty} (${active ? "érvényes" : "lejárt"} ${expiry}-ig)`)}
        </tbody>
      </table>
      <div style={{ fontSize: 9.5, color: "#374151", lineHeight: 1.45, whiteSpace: "pre-line", borderTop: "1px solid #E5E7EB", paddingTop: 16 }}>
        {w.kind === "sale" ? SALE_WARRANTY_TERMS : SERVICE_WARRANTY_TERMS}
      </div>
    </div>
  );
}
