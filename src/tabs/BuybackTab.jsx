import { money, BUYBACK_CONDITION_QUESTIONS, BUYBACK_STATUSES, buybackStatusCls, displayName } from "../lib/utils";
import { EditIcon, BuybackIcon } from "../components/icons";
import ConfirmDelete from "../components/ConfirmDelete";
import { EmptyState, LoadingState } from "../components/EmptyState";
import BuybackOfferCard from "../components/BuybackOfferCard";
import HistorySection from "../components/HistorySection";

export default function BuybackTab({
  busy, buybackModels, setBuybackModelModal, deleteBuybackModel, buybackRules, setBuybackRuleModal, deleteBuybackRule,
  buybackOffers, loadingData, setBuybackOfferDetailId, setBuybackOfferStatus,
}) {
  const activeOffers = (buybackOffers || []).filter((o) => o.status !== "Kifizetve" && o.status !== "Elutasítva");
  const closedOffers = (buybackOffers || []).filter((o) => o.status === "Kifizetve" || o.status === "Elutasítva");

  function handleStep(id, dir) {
    const offer = buybackOffers.find((o) => o.id === id);
    if (!offer) return;
    const idx = BUYBACK_STATUSES.findIndex((c) => c.key === offer.status);
    const newIdx = dir === "prev" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= BUYBACK_STATUSES.length) return;
    setBuybackOfferStatus(id, BUYBACK_STATUSES[newIdx].key);
  }

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Felvásárlás</div></div>
      </div>

      {loadingData ? <LoadingState /> : (
        <div className="kanban-wrap" style={{ marginBottom: 24 }}>
          <div className="kanban">
            {BUYBACK_STATUSES.map((col, colIdx) => {
              const items = activeOffers.filter((o) => o.status === col.key);
              const stepPrev = colIdx > 0;
              const stepNext = colIdx < BUYBACK_STATUSES.length - 1;
              return (
                <div className="k-col" key={col.key} style={{ "--col-color": col.color }}>
                  <div className="k-col-head">
                    <div className="k-col-title"><span className="k-dot"></span>{col.key}</div>
                    <span className="k-count">{items.length}</span>
                  </div>
                  <div className="k-col-body">
                    {items.length === 0 && <div className="k-empty"><BuybackIcon />Üres</div>}
                    {items.map((o) => (
                      <BuybackOfferCard key={o.id} offer={o} onOpen={setBuybackOfferDetailId} onStep={handleStep} stepPrev={stepPrev} stepNext={stepNext} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <HistorySection
        icon={BuybackIcon}
        label="Lezárt ajánlatok"
        items={closedOffers}
        searchPlaceholder="Keresés ügyfél, márka, modell szerint..."
        filterFn={(o, q) => [o.customerName, o.brand, o.model].filter(Boolean).join(" ").toLowerCase().includes(q)}
      >
        {(rows) => (
          <table>
            <thead><tr><th>Eszköz</th><th>Ügyfél</th><th>Státusz</th><th>Végleges ár</th></tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} style={{ cursor: "pointer" }} onClick={() => setBuybackOfferDetailId(o.id)}>
                  <td>{displayName(o.brand, o.model) || "—"}</td>
                  <td>{o.customerName}</td>
                  <td><span className={`st ${buybackStatusCls(o.status)}`}>{o.status}</span></td>
                  <td className="mono" style={{ fontWeight: 700 }}>{money(o.finalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </HistorySection>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "24px 0 8px 2px" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151" }}>Modellek <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({buybackModels.length} db)</span></div>
        <button className="btn sec sm" disabled={busy} onClick={() => setBuybackModelModal("add")}>+ Új modell</button>
      </div>
      <div className="tw" style={{ marginBottom: 22 }}>
        {buybackModels.length === 0 ? (
          <EmptyState icon={BuybackIcon}>Nincs modell felvéve — az /eladom oldal addig üres marad.</EmptyState>
        ) : (
          <table>
            <thead><tr><th>Márka</th><th>Modell</th><th>Tárhely</th><th>Alapár</th><th>Állapot</th><th></th></tr></thead>
            <tbody>
              {buybackModels.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.brand}</td>
                  <td>{m.model}</td>
                  <td style={{ color: "#6B7280" }}>{m.storage || "—"}</td>
                  <td className="mono" style={{ fontWeight: 700 }}>{money(m.basePrice)}</td>
                  <td>{m.active ? <span className="badge-income">Aktív</span> : <span style={{ color: "#9CA3AF", fontSize: 12 }}>Inaktív</span>}</td>
                  <td style={{ display: "flex", gap: 5 }}>
                    <button className="iconbtn" disabled={busy} onClick={() => setBuybackModelModal(m)}><EditIcon /></button>
                    <ConfirmDelete disabled={busy} onConfirm={() => deleteBuybackModel(m.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 8px 2px" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151" }}>Levonási szabályok <span style={{ color: "#9CA3AF", fontWeight: 500 }}>({buybackRules.length} db)</span></div>
        <button className="btn sec sm" disabled={busy} onClick={() => setBuybackRuleModal("add")}>+ Új szabály</button>
      </div>
      <div className="tw">
        {buybackRules.length === 0 ? (
          <EmptyState icon={BuybackIcon}>Nincs levonási szabály — minden készülék az alapáron kerül felajánlásra, függetlenül az állapottól.</EmptyState>
        ) : (
          <table>
            <thead><tr><th>Kérdés</th><th>Válasz</th><th>Szöveg</th><th>Levonás</th><th>Állapot</th><th></th></tr></thead>
            <tbody>
              {buybackRules.map((r) => {
                const q = BUYBACK_CONDITION_QUESTIONS.find((x) => x.key === r.questionKey);
                const opt = q?.options.find((o) => o.key === r.answerKey);
                return (
                  <tr key={r.id}>
                    <td style={{ color: "#6B7280", fontSize: 12.5 }}>{q?.question || r.questionKey}</td>
                    <td style={{ fontSize: 12.5 }}>{opt?.label || r.answerKey}</td>
                    <td style={{ fontWeight: 600 }}>{r.label}</td>
                    <td className="mono" style={{ fontWeight: 700, color: "#DC2626" }}>
                      −{r.deductionType === "percent" ? `${r.deductionValue}%` : money(r.deductionValue)}
                    </td>
                    <td>{r.active ? <span className="badge-income">Aktív</span> : <span style={{ color: "#9CA3AF", fontSize: 12 }}>Inaktív</span>}</td>
                    <td style={{ display: "flex", gap: 5 }}>
                      <button className="iconbtn" disabled={busy} onClick={() => setBuybackRuleModal(r)}><EditIcon /></button>
                      <ConfirmDelete disabled={busy} onConfirm={() => deleteBuybackRule(r.id)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
