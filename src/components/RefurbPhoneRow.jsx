import { useState } from "react";
import { money, phoneCode, conditionGradeLabel } from "../lib/utils";
import { ChevronDownIcon, TrashIcon, RefurbIcon } from "./icons";
import PhonePartsPicker from "./PhonePartsPicker";

const TASK_STATUSES = [
  { key: "kell", label: "Kell" },
  { key: "rendelve", label: "Beszerzés alatt" },
  { key: "kesz", label: "Kész" },
];

function TaskRow({ task, busy, onUpdateStatus, onDelete }) {
  return (
    <div className={`rft-row rft-row-${task.status}`}>
      <span className="rft-desc">{task.description}</span>
      <span className="rft-cost">{money(task.estCost)}</span>
      <div className="rft-status-seg">
        {TASK_STATUSES.map((s) => (
          <button
            key={s.key}
            type="button"
            className={task.status === s.key ? "active" : ""}
            disabled={busy}
            onClick={() => onUpdateStatus(task.id, s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <button type="button" className="iconbtn" disabled={busy} onClick={() => onDelete(task.id)}><TrashIcon width={13} height={13} /></button>
    </div>
  );
}

// Egysoros, kinyitható tétel a Felújítás listában — ugyanaz a mintázat, mint a Szerviznél
// (rf-row, sorszám · név · státusz-badge, kattintásra bővül a feladatlistával), csak
// felújítás-specifikus jelvényekkel: üresen egy "+ Feladat" jelzés a mondat helyett,
// nyitott feladattal a becsült ár, késszel egy zöld "kész" jelvény.
export default function RefurbPhoneRow({
  product, tasks = [], rankPos, canMoveUp, canMoveDown, busy, locName,
  expanded, onToggle, onMoveUp, onMoveDown, onAddTask, onUpdateTaskStatus, onDeleteTask,
  activeTicket, availableParts = [], allParts = [], onAddPart, onRemovePart, onStartService, onOpenTicket,
  onOpenInspection,
}) {
  const [newDesc, setNewDesc] = useState("");
  const [newCost, setNewCost] = useState("");
  const [showParts, setShowParts] = useState(false);

  const openCost = tasks.filter((t) => t.status !== "kesz").reduce((s, t) => s + (Number(t.estCost) || 0), 0);
  const allDone = tasks.length > 0 && tasks.every((t) => t.status === "kesz");
  const partsCost = (activeTicket?.usedParts || []).reduce((s, sp) => s + (Number(sp.costPrice) || 0) * (Number(sp.quantity) || 0), 0);

  function submitTask() {
    if (!newDesc.trim()) return;
    onAddTask(product.id, { description: newDesc.trim(), estCost: Number(newCost) || 0 });
    setNewDesc("");
    setNewCost("");
  }

  return (
    <div className="rfr">
      <div className="rfr-head" style={expanded ? { background: "#FAFAFA" } : undefined} onClick={onToggle}>
        <span className="mono rfr-serial">{phoneCode(product.productNo) || "—"}</span>
        <div className="rfr-title">
          <span className="rfr-name">{product.brand} {product.model}</span>
          <span className="rfr-meta">
            {conditionGradeLabel(product.condition, product.grade)} · {locName(product.locationId)}
          </span>
        </div>
        {tasks.length === 0 ? (
          <span className="rfr-add-badge"><span className="d">+</span>Feladat</span>
        ) : allDone ? (
          <span className="rfr-done-badge">kész</span>
        ) : (
          <span className="rfr-cost-badge">{money(openCost)}</span>
        )}
        <div className="rf-rank-ctrl" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="rf-rank-btn" disabled={!canMoveUp || busy} onClick={() => onMoveUp(product.id)} title="Előrébb">
            <ChevronDownIcon style={{ transform: "rotate(180deg)" }} />
          </button>
          <span className="rf-rank-num">{rankPos}</span>
          <button type="button" className="rf-rank-btn" disabled={!canMoveDown || busy} onClick={() => onMoveDown(product.id)} title="Hátrébb">
            <ChevronDownIcon />
          </button>
        </div>
        <ChevronDownIcon className="rfr-chev" style={expanded ? { transform: "rotate(180deg)" } : undefined} />
      </div>

      {expanded && (
        <div className="rfr-body">
          <div className="rf-tasks">
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} busy={busy} onUpdateStatus={onUpdateTaskStatus} onDelete={onDeleteTask} />
            ))}
            <div className="rft-add-row">
              <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Mi kell hozzá? pl. Kijelző" onKeyDown={(e) => e.key === "Enter" && submitTask()} />
              <input type="number" value={newCost} onChange={(e) => setNewCost(e.target.value)} placeholder="Becsült ár" style={{ width: 100 }} onKeyDown={(e) => e.key === "Enter" && submitTask()} />
              <button type="button" className="btn sec sm" disabled={!newDesc.trim() || busy} onClick={submitTask}>+ Feladat</button>
            </div>
          </div>

          <div className="rf-parts-section">
            {activeTicket ? (
              <>
                <button type="button" className="rf-parts-toggle" onClick={() => setShowParts((v) => !v)}>
                  Alkatrészek a raktárból {showParts ? "▲" : "▼"}
                </button>
                {showParts && (
                  <PhonePartsPicker
                    usedParts={activeTicket.usedParts || []}
                    availableParts={availableParts}
                    allParts={allParts}
                    onAdd={(part, qty) => onAddPart(product, part, qty)}
                    onRemove={(sp) => onRemovePart(activeTicket.id, sp)}
                    busy={busy}
                  />
                )}
                {partsCost > 0 && <div className="rf-parts-cost">Felhasznált alkatrészek: {money(partsCost)}</div>}
                <button type="button" className="btn sec sm" style={{ marginTop: 8 }} onClick={() => onOpenTicket(activeTicket.id)}>Munkalap megnyitása</button>
              </>
            ) : (
              <button type="button" className="btn sec sm" disabled={busy} onClick={() => onStartService(product)}>Szerviz előkészítés indítása</button>
            )}
          </div>

          <div className="rfr-actions">
            {product.inspectionCompletedAt && (
              <span className="rf-inspected-note">Utoljára tesztelve: {new Date(product.inspectionCompletedAt).toLocaleDateString("hu-HU")}</span>
            )}
            <button type="button" className="btn sm" disabled={busy} onClick={() => onOpenInspection(product)}>
              <RefurbIcon width={14} height={14} /> Tesztelés / kategorizálás
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
