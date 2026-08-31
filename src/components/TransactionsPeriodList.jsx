import { useState } from "react";
import { money, adaptivePeriodBucket, periodLabel, today, cashPortion, cardPortion } from "../lib/utils";
import { EditIcon, FinanceIcon, CashIcon, CardIcon, TransferIcon } from "./icons";
import ConfirmDelete from "./ConfirmDelete";
import { EmptyState } from "./EmptyState";

const num = (n) => Math.round(Number(n) || 0).toLocaleString("hu-HU");

function PaymentIcon({ payment, t }) {
  const common = { width: 15, height: 15 };
  const wrap = (title, icon) => <span title={title} style={{ color: "#6B7280", display: "inline-flex" }}>{icon}</span>;
  if (payment === "Készpénz") return wrap("Készpénz", <CashIcon {...common} />);
  if (payment === "Kártya") return wrap("Kártya", <CardIcon {...common} />);
  if (payment === "Átutalás") return wrap("Átutalás", <TransferIcon {...common} />);
  if (payment === "Vegyes") {
    return wrap(`Vegyes — készpénz: ${num(cashPortion(t))} Lei, kártya: ${num(cardPortion(t))} Lei`, <CardIcon {...common} />);
  }
  return <span title="Nincs megadva" style={{ color: "#D1D5DB" }}>—</span>;
}

function PaymentSplitLabel({ t }) {
  if (t.payment !== "Vegyes") return null;
  return (
    <span style={{ display: "block", fontSize: 11, color: "#9CA3AF" }}>
      {num(cashPortion(t))} Lei készpénz + {num(cardPortion(t))} Lei kártya
    </span>
  );
}

export function SmartBillBadge({ doc }) {
  if (!doc) return null;
  if (doc.status === "issued") {
    return (
      <a
        href={doc.smartbillDocumentViewUrl}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="badge-loc"
        style={{ color: "#15803D", textDecoration: "none" }}
        title={`Számla: ${doc.smartbillSeries || ""}${doc.smartbillNumber ? "-" + doc.smartbillNumber : ""}`}
      >
        Számla {doc.smartbillSeries}-{doc.smartbillNumber}
      </a>
    );
  }
  if (doc.status === "failed") {
    return (
      <span className="badge-loc" style={{ color: "#B91C1C" }} title={doc.errorText || "Ismeretlen hiba"}>
        Számla hiba
      </span>
    );
  }
  return <span className="badge-loc" style={{ color: "#6B7280" }}>Számla folyamatban...</span>;
}

// A napi csoporton belül a rows-t "belépési sorrendben" bontja szét: minden egyedi basket_id
// elé egy összevont fejléc-bejegyzés kerül, a hozzá tartozó tételek pedig meg vannak jelölve
// (inBasket), hogy a kártyás/táblás nézet vizuálisan összefoghassa őket. basket_id nélküli
// (régi vagy egytételes) sorok változatlanul, önállóan jelennek meg.
export function buildBasketEntries(rows) {
  const entries = [];
  const seen = new Set();
  rows.forEach((t) => {
    if (t.basketId) {
      if (!seen.has(t.basketId)) {
        seen.add(t.basketId);
        const items = rows.filter((r) => r.basketId === t.basketId);
        const total = items.reduce((s, r) => s + (r.type === "income" ? Number(r.amount) || 0 : -(Number(r.amount) || 0)), 0);
        entries.push({ kind: "basket-head", basketId: t.basketId, count: items.length, payment: items[0]?.payment, total });
      }
      entries.push({ kind: "row", tx: t, inBasket: true });
    } else {
      entries.push({ kind: "row", tx: t, inBasket: false });
    }
  });
  return entries;
}

function KindBadge({ t, productConditionById }) {
  const info = productConditionById?.get?.(t.productId);
  const fromSupplier = info?.source === "Számla" || info?.source === "Konszignáció";
  const isBuyIn = t.type === "expense" && t.category === "Készlet" && !fromSupplier && /^(Beszámítás|Felvásárlás):/.test(t.description || "");
  if (isBuyIn) return <span className="badge-buyin">Bevásárlás</span>;
  if (t.type === "income" && t.category === "Készlet") {
    if (info?.condition === "Refurbished") return <span className="badge-refurb">Felújított</span>;
    if (info?.condition === "New") return <span className="badge-new">Új</span>;
  }
  return null;
}

export function TransactionRowsTable({ rows, locName, onEdit, onDelete, onOpenReceipt, busy, productConditionById, showLocation = true }) {
  return (
    <>
      <table>
        <thead><tr><th>Leírás</th>{showLocation && <th>Helyszín</th>}<th className="num-col">Összeg</th><th className="num-col">Haszon</th><th></th></tr></thead>
        <tbody>
          {buildBasketEntries(rows).map((entry) => {
            if (entry.kind === "basket-head") return null;
            const t = entry.tx;
            const isSale = t.type === "income" && t.category === "Készlet" && !!t.productId;
            return (
              <tr key={t.id} className={entry.inBasket ? "basket-item-tr" : undefined} style={isSale ? { cursor: "pointer" } : undefined} onClick={isSale ? () => onOpenReceipt(t.id) : undefined}>
                <td style={{ fontWeight: 500, color: "#111827" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <PaymentIcon payment={t.payment} t={t} />
                    {t.description}
                    <KindBadge t={t} productConditionById={productConditionById} />
                    {t.smartbillDoc && <SmartBillBadge doc={t.smartbillDoc} />}
                  </span>
                  <PaymentSplitLabel t={t} />
                </td>
                {showLocation && <td style={{ color: "#6B7280" }}>{locName(t.locationId)}</td>}
                <td className="num-col" style={{ fontWeight: 700, color: t.type === "income" ? "#15803D" : "#B91C1C" }}>
                  {t.type === "income" ? "+" : "-"}{num(t.amount)}
                </td>
                <td className="num-col" style={{ color: "#6B7280" }}>
                  {t.type === "income" ? num((Number(t.amount) || 0) - (Number(t.costPrice) || 0)) : "—"}
                </td>
                <td style={{ display: "flex", gap: 5, justifyContent: "flex-end" }} onClick={(e) => isSale && e.stopPropagation()}>
                  <button className="iconbtn" disabled={busy} onClick={() => onEdit(t)}><EditIcon /></button>
                  <ConfirmDelete disabled={busy} onConfirm={() => onDelete(t.id)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mob-cards">
        {buildBasketEntries(rows).map((entry) => {
          if (entry.kind === "basket-head") return null;
          const t = entry.tx;
          const isSale = t.type === "income" && t.category === "Készlet" && !!t.productId;
          return (
            <div key={t.id} className={`mob-row${entry.inBasket ? " basket-item-mob" : ""}`} onClick={isSale ? () => onOpenReceipt(t.id) : undefined} style={isSale ? undefined : { cursor: "default" }}>
              <div className="mob-row-top">
                <div className="mob-row-main"><PaymentIcon payment={t.payment} t={t} /><span>{t.description}</span><KindBadge t={t} productConditionById={productConditionById} />{t.smartbillDoc && <SmartBillBadge doc={t.smartbillDoc} />}</div>
                <span className="mob-row-amount" style={{ color: t.type === "income" ? "#15803D" : "#B91C1C" }}>
                  {t.type === "income" ? "+" : "-"}{num(t.amount)}
                </span>
              </div>
              <div className="mob-row-sub">
                {t.payment === "Vegyes" && <span style={{ color: "#9CA3AF" }}>{num(cashPortion(t))} kp + {num(cardPortion(t))} kártya</span>}
                {showLocation && <span style={{ color: "#6B7280" }}>{locName(t.locationId)}</span>}
                <span onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", gap: 5, marginLeft: "auto" }}>
                  <button className="iconbtn" disabled={busy} onClick={() => onEdit(t)}><EditIcon /></button>
                  <ConfirmDelete disabled={busy} onConfirm={() => onDelete(t.id)} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function dayStats(rows) {
  const incomeCash = rows.filter((t) => t.type === "income").reduce((s, t) => s + cashPortion(t), 0);
  const incomeCard = rows.filter((t) => t.type === "income").reduce((s, t) => s + cardPortion(t), 0);
  const expenseCash = rows.filter((t) => t.type === "expense").reduce((s, t) => s + cashPortion(t), 0);
  const expenseReal = rows.filter((t) => t.type === "expense" && t.payment).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const margin = rows.filter((t) => t.type === "income").reduce((s, t) => s + ((Number(t.amount) || 0) - (Number(t.costPrice) || 0)), 0)
    - rows.filter((t) => t.type === "expense" && !t.payment).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const cashOnHand = incomeCash - expenseCash;
  return { incomeCash, incomeCard, expenseCash, expenseReal, margin, cashOnHand };
}

export default function TransactionsPeriodList({ transactions, locName, onEdit, onDelete, onOpenReceipt, busy, productConditionById, showLocation = true }) {
  const currentKey = adaptivePeriodBucket(today()).key;
  const [expanded, setExpanded] = useState(() => new Set([currentKey]));
  const [onlyOtherExpenses, setOnlyOtherExpenses] = useState(false);

  const otherExpenseCount = transactions.filter((t) => t.type === "expense" && t.category === "Egyéb").length;
  const visibleTransactions = onlyOtherExpenses ? transactions.filter((t) => t.type === "expense" && t.category === "Egyéb") : transactions;

  const filterChip = otherExpenseCount > 0 && (
    <span className="toggle-link" style={{ marginTop: 0, marginBottom: 14, display: "inline-block" }} onClick={() => setOnlyOtherExpenses((v) => !v)}>
      {onlyOtherExpenses ? "Összes tranzakció mutatása" : `Egyéb kategóriás kiadások (${otherExpenseCount}) — átnézésre`}
    </span>
  );

  if (visibleTransactions.length === 0) {
    return (
      <>
        {filterChip}
        <div className="tw"><EmptyState icon={FinanceIcon}>{onlyOtherExpenses ? "Nincs egyéb kategóriás kiadás." : "Nincs rögzített tranzakció."}</EmptyState></div>
      </>
    );
  }
  const groups = {};
  visibleTransactions.forEach((t) => {
    const { key, granularity } = adaptivePeriodBucket(t.date);
    if (!groups[key]) groups[key] = { granularity, rows: [] };
    groups[key].rows.push(t);
  });
  const keys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  keys.forEach((key) => groups[key].rows.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "")));

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
      {filterChip}
      {keys.map((key) => {
        const { granularity, rows } = groups[key];
        const income = rows.filter((r) => r.type === "income").reduce((a, r) => a + (Number(r.amount) || 0), 0);
        const expense = rows.filter((r) => r.type === "expense").reduce((a, r) => a + (Number(r.amount) || 0), 0);
        const margin = rows.filter((r) => r.type === "income").reduce((a, r) => a + ((Number(r.amount) || 0) - (Number(r.costPrice) || 0)), 0)
          - rows.filter((r) => r.type === "expense" && !r.payment).reduce((a, r) => a + (Number(r.amount) || 0), 0);
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
              <div className="tw tw-compact" style={{ borderRadius: "0 0 10px 10px", borderTop: "2px solid #22C55E", padding: granularity === "day" ? 16 : 0 }}>
                {granularity === "day" && (() => {
                  const stats = dayStats(rows);
                  return (
                    <div className="statrow c5" style={{ marginBottom: 14 }}>
                      <div className="statcard"><div className="lbl">Bevétel (készpénz)</div><div className="val" style={{ color: "#15803D" }}>{money(stats.incomeCash)}</div></div>
                      <div className="statcard"><div className="lbl">Bevétel (kártya)</div><div className="val" style={{ color: "#15803D" }}>{money(stats.incomeCard)}</div></div>
                      <div className="statcard"><div className="lbl">Kiadás</div><div className="val" style={{ color: "#B91C1C" }}>{money(stats.expenseReal)}</div></div>
                      <div className="statcard"><div className="lbl">Árrés</div><div className="val">{money(stats.margin)}</div></div>
                      <div className="statcard accent"><div className="lbl">Kézpénz maradt</div><div className="val">{money(stats.cashOnHand)}</div></div>
                    </div>
                  );
                })()}
                <TransactionRowsTable rows={rows} locName={locName} onEdit={onEdit} onDelete={onDelete} onOpenReceipt={onOpenReceipt} busy={busy} productConditionById={productConditionById} showLocation={showLocation} />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
