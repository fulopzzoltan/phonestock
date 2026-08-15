import { useState } from "react";
import { money, adaptivePeriodBucket, periodLabel, today } from "../lib/utils";
import { EditIcon, FinanceIcon } from "./icons";
import ConfirmDelete from "./ConfirmDelete";
import { EmptyState } from "./EmptyState";

export default function TransactionsPeriodList({ transactions, locName, onEdit, onDelete, onOpenReceipt, busy }) {
  const currentKey = adaptivePeriodBucket(today()).key;
  const [expanded, setExpanded] = useState(() => new Set([currentKey]));

  if (transactions.length === 0) {
    return <div className="tw"><EmptyState icon={FinanceIcon}>Nincs rögzített tranzakció.</EmptyState></div>;
  }
  const groups = {};
  transactions.forEach((t) => {
    const { key, granularity } = adaptivePeriodBucket(t.date);
    if (!groups[key]) groups[key] = { granularity, rows: [] };
    groups[key].rows.push(t);
  });
  const keys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  function toggle(key) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <>
      {keys.map((key) => {
        const { granularity, rows } = groups[key];
        const income = rows.filter((r) => r.type === "income").reduce((a, r) => a + (Number(r.amount) || 0), 0);
        const expense = rows.filter((r) => r.type === "expense").reduce((a, r) => a + (Number(r.amount) || 0), 0);
        const margin = rows.filter((r) => r.type === "income").reduce((a, r) => a + ((Number(r.amount) || 0) - (Number(r.costPrice) || 0)), 0);
        const isOpen = expanded.has(key);
        return (
          <div key={key} style={{ marginBottom: 14 }}>
            <div
              className="pgh"
              onClick={() => toggle(key)}
              style={{
                borderRadius: isOpen ? "10px 10px 0 0" : "10px", borderBottom: isOpen ? "none" : "1px solid #E5E7EB",
              }}
            >
              <div className="pgh-left">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5"
                  style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .12s", flexShrink: 0 }}>
                  <polyline points="9 6 15 12 9 18" />
                </svg>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{periodLabel(key, granularity)}</div>
                {granularity !== "day" && (
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: "#9CA3AF", background: "#F1F2F6", borderRadius: 999, padding: "2px 8px" }}>
                    {granularity === "week" ? "heti összesítő" : granularity === "month" ? "havi összesítő" : "éves összesítő"}
                  </span>
                )}
              </div>
              <div className="pgh-right">
                <span className="pgh-hide-mob" style={{ fontSize: 12, color: "#6B7280" }}>{rows.length} tétel</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#15803D" }}>+{money(income)}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#B91C1C" }}>-{money(expense)}</span>
                <span className="pgh-hide-mob" style={{ fontSize: 12, color: "#6B7280" }}>haszon {money(margin)}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#111827" }} title="Profit (bevétel − kiadás)">{money(income - expense)}</span>
              </div>
            </div>
            {isOpen && (
              <div className="tw" style={{ borderRadius: "0 0 10px 10px", borderTop: "2px solid #22C55E" }}>
                <table>
                  <thead><tr><th>Leírás</th><th>Típus</th><th>Kategória</th><th>Helyszín</th><th>Fizetés</th><th>Haszon</th><th>Összeg</th><th></th></tr></thead>
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
                          <td className="mono" style={{ color: "#6B7280" }}>
                            {t.type === "income" ? money((Number(t.amount) || 0) - (Number(t.costPrice) || 0)) : "—"}
                          </td>
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
                <div className="mob-cards">
                  {rows.map((t) => {
                    const isSale = t.type === "income" && t.category === "Készlet";
                    return (
                      <div key={t.id} className="mob-row" onClick={isSale ? () => onOpenReceipt(t.id) : undefined} style={isSale ? undefined : { cursor: "default" }}>
                        <div className="mob-row-top">
                          <div className="mob-row-main"><span>{t.description}</span></div>
                          <span className="mob-row-amount" style={{ color: t.type === "income" ? "#15803D" : "#B91C1C" }}>
                            {t.type === "income" ? "+" : "-"}{money(t.amount)}
                          </span>
                        </div>
                        <div className="mob-row-sub">
                          {t.type === "income" ? <span className="badge-income">Bevétel</span> : <span className="badge-expense">Kiadás</span>}
                          <span>{t.category}</span>
                          <span className="badge-loc">{locName(t.locationId)}</span>
                          <span>{t.payment || "—"}</span>
                          <span onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", gap: 5, marginLeft: "auto" }}>
                            <button className="iconbtn" disabled={busy} onClick={() => onEdit(t)}><EditIcon /></button>
                            <ConfirmDelete disabled={busy} onConfirm={() => onDelete(t.id)} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
