import { money, warrantyExpiry, isWarrantyActive, SALE_WARRANTY_TERMS } from "../lib/utils";

export default function PrintReceiptSlip({ tx, location }) {
  const expiry = warrantyExpiry(tx.date, tx.warranty);
  const active = isWarrantyActive(tx.date, tx.warranty);

  const row = (k, v) => (
    <tr>
      <td style={{ padding: "6px 0", fontWeight: 700, textAlign: "right", width: "38%", verticalAlign: "top" }}>{k}</td>
      <td style={{ padding: "6px 0 6px 14px", verticalAlign: "top" }}>{v}</td>
    </tr>
  );

  return (
    <div style={{ fontFamily: "Inter, sans-serif", color: "#111827", padding: "30px 36px", maxWidth: 760 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 26 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>TELEF<span style={{ color: "#22C55E" }}>O</span>NOS</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{location?.phone || ""}</div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, textAlign: "center" }}>Vásárlási bizonylat</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#6B7280" }}>{tx.receiptNo}</div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <tbody>
          {row("Ügyfél", tx.customerName || "—")}
          {row("Elérhetőség", tx.customerPhone || "—")}
          {row("Helyszín", location?.name || "—")}
          {row("Termék", tx.description)}
          {row("Vásárlás dátuma", tx.date)}
          {row("Ár", money(tx.amount))}
          {row("Fizetés", tx.payment === "Vegyes"
            ? `Vegyes (készpénz: ${money(tx.paymentCashAmount)}, kártya: ${money(tx.paymentCardAmount)})`
            : tx.payment || "—")}
          {row("Garancia", tx.warranty ? `${tx.warranty} (${active ? "érvényes" : "lejárt"} ${expiry}-ig)` : "Nincs")}
        </tbody>
      </table>
      {tx.warranty && (
        <div style={{ fontSize: 9.5, color: "#374151", lineHeight: 1.45, whiteSpace: "pre-line", borderTop: "1px solid #E5E7EB", paddingTop: 16 }}>
          {SALE_WARRANTY_TERMS}
        </div>
      )}
    </div>
  );
}
