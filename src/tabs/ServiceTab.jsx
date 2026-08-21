import { useState } from "react";
import { DndContext, useDraggable, useDroppable, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { money, STATUSES, statusLabel, displayName, ticketCode } from "../lib/utils";
import { SearchIcon, ChevronDownIcon, ServiceIcon } from "../components/icons";
import TicketCard from "../components/TicketCard";
import Thumb from "../components/Thumb";
import { LoadingState } from "../components/EmptyState";
import HistorySection from "../components/HistorySection";

function DroppableCol({ id, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <div className={`k-col-body${isOver ? " k-col-body-over" : ""}`} ref={setNodeRef}>{children}</div>;
}

function DraggableCard({ id, children }) {
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({ id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={isDragging ? "t-card-dragging" : undefined}>
      {children}
    </div>
  );
}

export default function ServiceTab({
  effectiveLocFilter, locName, busy, setTicketModal, svcSearch, setSvcSearch, svcKindFilter, setSvcKindFilter,
  loadingData, activeTickets, setDetailId, handedOverTickets, setTicketStatus,
}) {
  const [showFailedInCol, setShowFailedInCol] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;
    const ticket = activeTickets.find((t) => t.id === active.id);
    if (ticket && over.id !== ticket.status) setTicketStatus(ticket.id, over.id, null);
  }
  function handleStep(id, dir) {
    const ticket = activeTickets.find((t) => t.id === id);
    if (!ticket) return;
    const idx = STATUSES.findIndex((c) => c.key === ticket.status);
    const newIdx = dir === "prev" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= STATUSES.length) return;
    setTicketStatus(id, STATUSES[newIdx].key, null);
  }
  function handleCloseReady(id) {
    setTicketStatus(id, "Átadásra", "Átadva");
  }

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Szerviz</div></div>
        <button className="btn" disabled={busy} onClick={() => setTicketModal("add")}>+ Új munkalap</button>
      </div>

      <div className="filter-row">
        <div className="searchbar"><SearchIcon /><input value={svcSearch} onChange={(e) => setSvcSearch(e.target.value)} /></div>
        <div className="seg">
          <button type="button" className={svcKindFilter === "all" ? "active" : ""} onClick={() => setSvcKindFilter("all")}>Mind</button>
          <button type="button" className={svcKindFilter === "customer" ? "active" : ""} onClick={() => setSvcKindFilter("customer")}>Ügyfél</button>
          <button type="button" className={svcKindFilter === "own" ? "active" : ""} onClick={() => setSvcKindFilter("own")}>Saját</button>
        </div>
      </div>
      {loadingData ? <LoadingState /> : (
        <div className="kanban-wrap">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="kanban">
              {STATUSES.map((col, colIdx) => {
                const items = activeTickets.filter((t) => t.status === col.key);
                const isReadyCol = col.key === "Átadásra";
                const shownItems = isReadyCol ? items.filter((t) => t.subStatus !== "Sikertelen") : items;
                const failedItems = isReadyCol ? items.filter((t) => t.subStatus === "Sikertelen") : [];
                const stepPrev = colIdx > 0;
                const stepNext = colIdx < STATUSES.length - 1;
                return (
                  <div className="k-col" key={col.key} style={{ "--col-color": col.color }}>
                    <div className="k-col-head">
                      <div className="k-col-title"><span className="k-dot"></span>{statusLabel(col.key)}</div>
                      <span className="k-count">{items.length}</span>
                    </div>
                    <DroppableCol id={col.key}>
                      {items.length === 0 && <div className="k-empty"><ServiceIcon />Üres</div>}
                      {shownItems.map((t) => (
                        <DraggableCard key={t.id} id={t.id}>
                          <TicketCard ticket={t} locName={locName} onOpen={setDetailId} onStep={handleStep} stepPrev={stepPrev} stepNext={stepNext} onClose={handleCloseReady} />
                        </DraggableCard>
                      ))}
                      {failedItems.length > 0 && (
                        <>
                          <button type="button" className="k-collapse-toggle" onClick={() => setShowFailedInCol((v) => !v)}>
                            <ChevronDownIcon style={{ transform: showFailedInCol ? "rotate(180deg)" : undefined }} />
                            {showFailedInCol ? "Sikertelenek elrejtése" : `Sikertelenek (${failedItems.length})`}
                          </button>
                          {showFailedInCol && failedItems.map((t) => (
                            <DraggableCard key={t.id} id={t.id}>
                              <TicketCard ticket={t} locName={locName} onOpen={setDetailId} onStep={handleStep} stepPrev={stepPrev} stepNext={stepNext} />
                            </DraggableCard>
                          ))}
                        </>
                      )}
                    </DroppableCol>
                  </div>
                );
              })}
            </div>
          </DndContext>
        </div>
      )}
      <HistorySection
        icon={ServiceIcon}
        label="Átadott munkalapok"
        items={handedOverTickets}
        searchPlaceholder="Keresés vevő, márka, modell szerint..."
        filterFn={(t, q) => [t.customerName, t.brand, t.model, ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))].filter(Boolean).join(" ").toLowerCase().includes(q)}
      >
        {(rows) => (
          <table>
            <thead><tr><th>Eszköz</th><th>Helyszín</th><th>Bejött</th><th>Átadva</th><th>Vevő</th><th>Díj</th></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => setDetailId(t.id)}>
                  <td>
                    <div className="stk-row">
                      <Thumb brand={t.brand} />
                      <div>
                        <div className="stk-name">{displayName(t.brand, t.model) || "—"}</div>
                        <div className="stk-sub">{ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge-loc">{locName(t.locationId)}</span></td>
                  <td className="mono">{t.dateIn}</td>
                  <td className="mono">{t.dateOut || "—"}</td>
                  <td>{t.customerName}</td>
                  <td className="mono" style={{ fontWeight: 700 }}>{money(t.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </HistorySection>
    </>
  );
}
