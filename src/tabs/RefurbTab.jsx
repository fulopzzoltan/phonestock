import { useState, useMemo } from "react";
import { phoneCode, displayName, conditionGradeLabel } from "../lib/utils";
import { EmptyState, LoadingState } from "../components/EmptyState";
import { RefurbIcon, SearchIcon, ScanIcon, CloseIcon } from "../components/icons";
import RefurbPhoneRow from "../components/RefurbPhoneRow";
import RefurbInspectionModal from "../components/RefurbInspectionModal";

// A "+" gombbal nyíló kereső-lista, amivel egy meglévő (még nem javítandó) raktári
// telefont lehet átemelni a Felújítás listába — ugyanaz a kereső-mező + sor mintázat,
// mint a többi fülön.
function RefurbPickerModal({ items, busy, onPick, onClose }) {
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((p) => [p.brand, p.model, phoneCode(p.productNo)].filter(Boolean).join(" ").toLowerCase().includes(qq));
  }, [items, q]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <h2>Telefon átemelése a Felújításba <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        <div className="searchbar" style={{ margin: "0 0 12px 0" }}>
          <SearchIcon /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés..." autoFocus />
        </div>
        <div style={{ maxHeight: "50vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {rows.length === 0 ? (
            <EmptyState icon={RefurbIcon}>Nincs találat.</EmptyState>
          ) : rows.map((p) => (
            <button
              key={p.id}
              type="button"
              className="btn sec"
              disabled={busy}
              style={{ justifyContent: "space-between", textAlign: "left", padding: "10px 14px" }}
              onClick={() => onPick(p.id)}
            >
              <span>
                <span className="mono" style={{ color: "#9CA3AF", marginRight: 8 }}>{phoneCode(p.productNo) || "—"}</span>
                {displayName(p.brand, p.model)}
              </span>
              <span style={{ color: "#9CA3AF", fontWeight: 500 }}>{conditionGradeLabel(p.condition, p.grade)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Ugyanaz a váz, mint a Szerviz fülön (keresés + szkennelés + státusz-fülek pöttyel és
// darabszámmal, alatta sűrű, kinyitható sorlista) — csak felújítás-specifikus
// állapotokkal: nincs még felmérve, van nyitott feladata, vagy minden feladata kész.
const REFURB_STATUSES = [
  { key: "nincs_felmerve", label: "Nincs felmérve", color: "#9CA3AF" },
  { key: "folyamatban", label: "Folyamatban", color: "#F59E0B" },
  { key: "kesz", label: "Kész", color: "#1DB954" },
];

function refurbStatusOf(tasks) {
  if (!tasks || tasks.length === 0) return "nincs_felmerve";
  return tasks.every((t) => t.status === "kesz") ? "kesz" : "folyamatban";
}

export default function RefurbTab({
  loadingData, refurbPhones = [], refurbTasksByProduct, busy, locName,
  refurbSearch, setRefurbSearch, onScan,
  moveRefurbRank, addRefurbTask, updateRefurbTaskStatus, deleteRefurbTask, saveRefurbInspection,
  activeOwnTicketFor, parts = [], usePartForProduct, removePartFromTicket, openOwnServiceModal, onOpenTicket,
  refurbPickable = [], onAddToRefurb, pickerOpen, onClosePicker,
}) {
  const [inspectProduct, setInspectProduct] = useState(null);
  const [listStatus, setListStatus] = useState(REFURB_STATUSES[0].key);
  const [expandedId, setExpandedId] = useState(null);
  const availableParts = parts.filter((p) => Number(p.quantity) > 0);

  const withStatus = useMemo(() => refurbPhones.map((product, i) => {
    const tasks = refurbTasksByProduct.get(product.id) || [];
    return { product, tasks, rankPos: i + 1, status: refurbStatusOf(tasks) };
  }), [refurbPhones, refurbTasksByProduct]);

  const counts = REFURB_STATUSES.map((s) => withStatus.filter((w) => w.status === s.key).length);

  const filtered = useMemo(() => {
    const qq = refurbSearch.trim().toLowerCase();
    return withStatus
      .filter((w) => w.status === listStatus)
      .filter((w) => !qq || [w.product.brand, w.product.model, String(w.product.productNo)].filter(Boolean).join(" ").toLowerCase().includes(qq));
  }, [withStatus, listStatus, refurbSearch]);

  return (
    <div className="apple-page">
      <div className="filter-row">
        <div className="searchbar"><SearchIcon /><input value={refurbSearch} onChange={(e) => setRefurbSearch(e.target.value)} /></div>
        {onScan && <button type="button" className="btn sec scan-trigger" onClick={onScan} title="QR/vonalkód szkennelése"><ScanIcon width={16} height={16} /></button>}
        <div className="status-seg">
          {REFURB_STATUSES.map((s, i) => (
            <button key={s.key} type="button" className={listStatus === s.key ? "active" : ""} onClick={() => setListStatus(s.key)}>
              <span className="dot" style={{ background: s.color }} />
              {s.label} <span className="cnt">{counts[i]}</span>
            </button>
          ))}
        </div>
      </div>

      {loadingData ? (
        <div className="tw tw-apple"><LoadingState /></div>
      ) : refurbPhones.length === 0 ? (
        <div className="tw tw-apple">
          <EmptyState icon={RefurbIcon}>
            Nincs javítandó telefon. A "+" gombbal emelhetsz át meglévő telefont a raktárból,
            vagy a Telefonok fülön a szerkesztésnél állíts be egy tételt "Javítandó" állapotra.
          </EmptyState>
        </div>
      ) : filtered.length === 0 ? (
        <div className="tw tw-apple"><EmptyState icon={RefurbIcon}>Nincs telefon ebben az állapotban.</EmptyState></div>
      ) : (
        <div className="rf-list">
          {filtered.map(({ product, tasks, rankPos }) => (
            <RefurbPhoneRow
              key={product.id}
              product={product}
              tasks={tasks}
              rankPos={rankPos}
              canMoveUp={rankPos > 1}
              canMoveDown={rankPos < refurbPhones.length}
              busy={busy}
              locName={locName}
              expanded={expandedId === product.id}
              onToggle={() => setExpandedId((id) => (id === product.id ? null : product.id))}
              onMoveUp={(id) => moveRefurbRank(id, -1)}
              onMoveDown={(id) => moveRefurbRank(id, 1)}
              onAddTask={addRefurbTask}
              onUpdateTaskStatus={updateRefurbTaskStatus}
              onDeleteTask={deleteRefurbTask}
              activeTicket={activeOwnTicketFor(product.id)}
              availableParts={availableParts}
              allParts={parts}
              onAddPart={(prod, part, qty) => usePartForProduct(prod, part, qty)}
              onRemovePart={(ticketId, sp) => removePartFromTicket(ticketId, sp)}
              onStartService={openOwnServiceModal}
              onOpenTicket={onOpenTicket}
              onOpenInspection={setInspectProduct}
            />
          ))}
        </div>
      )}

      {inspectProduct && (
        <RefurbInspectionModal
          product={inspectProduct}
          busy={busy}
          onClose={() => setInspectProduct(null)}
          onSave={async (decision, answers, markReady) => {
            await saveRefurbInspection(inspectProduct.id, decision, answers, markReady);
            setInspectProduct(null);
          }}
        />
      )}

      {pickerOpen && (
        <RefurbPickerModal
          items={refurbPickable}
          busy={busy}
          onClose={onClosePicker}
          onPick={async (id) => { await onAddToRefurb(id); onClosePicker(); }}
        />
      )}
    </div>
  );
}
