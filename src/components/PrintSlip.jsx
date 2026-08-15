import { money, subStatusLabel, warrantyExpiry, isWarrantyActive, SERVICE_WARRANTY_TERMS, ticketCode } from "../lib/utils";

export default function PrintSlip({ ticket, location, intakeLocation }) {
  const probs = (ticket.issue || "").split(",").map((p) => p.trim()).filter(Boolean);
  const expiry = ticket.dateOut ? warrantyExpiry(ticket.dateOut, ticket.warranty) : null;
  const active = ticket.dateOut ? isWarrantyActive(ticket.dateOut, ticket.warranty) : true;

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
        <div style={{ fontSize: 20, fontWeight: 800, textAlign: "center" }}>Szerviz átadási lap</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{ticketCode(ticket.ticketNo, (intakeLocation || location)?.name)}</div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 24 }}>
        <tbody>
          {row("Ügyfél", ticket.customerName)}
          {row("Elérhetőség", ticket.customerPhone || "—")}
          {row("Helyszín", location?.name || "—")}
          {row("Modell", [ticket.brand, ticket.model].filter(Boolean).join(" "))}
          {row("Bejelentett hibák", probs.length ? probs.join(", ") : "—")}
          {row("Javítási költség", money(ticket.price))}
          {row("Átvéve", ticket.dateIn || "—")}
          {row("Elkészülés / átadás dátuma", ticket.dateOut || "—")}
          {row("Státusz", ticket.subStatus ? subStatusLabel(ticket.status, ticket.subStatus) : ticket.status)}
          {row("Garanciaidő", ticket.warranty ? (expiry ? `${ticket.warranty} (${active ? "érvényes" : "lejárt"} ${expiry}-ig)` : ticket.warranty) : "Nincs")}
        </tbody>
      </table>

      <div style={{ fontSize: 9.5, color: "#374151", lineHeight: 1.45, whiteSpace: "pre-line", borderTop: "1px solid #E5E7EB", paddingTop: 16 }}>
        {SERVICE_WARRANTY_TERMS}
      </div>
    </div>
  );
}
