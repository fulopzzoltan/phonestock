import { money, periodKey, periodLabel } from "../lib/utils";
import { EditIcon } from "./icons";
import ConfirmDelete from "./ConfirmDelete";

export default function TransactionsPeriodList({ transactions, period, locName, onEdit, onDelete, onOpenReceipt, busy }) {
  if (transactions.length === 0) {
    return <div className="tw"><div className="empty">Nincs rögzített tranzakció.</div></div>;
  }
  const groups = {};
  transactions.forEach((t) => {
    const key = periodKey(t.date, period);
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });
  const keys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <>
      {keys.map((key) => {
        const rows = groups[key];
        const income = rows.filter((r) => r.type === "income").reduce((a, r) => a + (Number(r.amount) || 0), 0);
        const expense = rows.filter((r) => r.type === "expense").reduce((a, r) => a + (Number(r.amount) || 0), 0);
        return (
          <div key={key} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 14px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "10px 10px 0 0", borderBottom: "none" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{periodLabel(key, period)}</div>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#6B7280" }}>{rows.length} tétel</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#15803D" }}>+{money(income)}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#B91C1C" }}>-{money(expense)}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{money(income - expense)}</span>
              </div>
            </div>
            <div className="tw" style={{ borderRadius: "0 0 10px 10px", borderTop: "2px solid #22C55E" }}>
              <table>
                <thead><tr><th>Leírás</th><th>Típus</th><th>Kategória</th><th>Helyszín</th><th>Fizetés</th><th>Összeg</th><th></th></tr></thead>
                <tbody>
                  {rows.map((t) => {
                    const isSale = t.type === "income" && t.category === "Készlet";
                    return (
                      <tr key={t.id} style={isSale ? { cursor: "pointer" } : undefined} onClick={isSale ? () => onOpenReceipt(t.id) : undefined}>
                        <td style={{ fontWeight: 500, color: "#111827" }}>{t.description}</td>
                        <td>{t.type === "income" ? <span className="badge-income">Bevétel</span> : <span className="badge-expense">Kiadás</span>}</td>
                        <td style={{ color: "#6B7280" }}>{t.category}</td>
                        <td><span className="badge-loc">{locName(t.locationId)}</span></td>
                        <td style={{ color: "#6B7280" }}>{t.payment || "—"}</td>
                        <td className="mono" style={{ fontWeight: 700, color: t.type === "income" ? "#15803D" : "#B91C1C" }}>
                          {t.type === "income" ? "+" : "-"}{money(t.amount)}
                        </td>
                        <td style={{ display: "flex", gap: 5 }} onClick={(e) => isSale && e.stopPropagation()}>
                          <button className="iconbtn" disabled={busy} onClick={() => onEdit(t)}><EditIcon /></button>
                          <ConfirmDelete disabled={busy} onConfirm={() => onDelete(t.id)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </>
  );
}
