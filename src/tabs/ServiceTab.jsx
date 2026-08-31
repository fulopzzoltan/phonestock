import { useState } from "react";
import { DndContext, useDraggable, useDroppable, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { money, STATUSES, statusLabel, statusCls, subStatusCls, subStatusLabel, displayName, ticketCode, daysOnShelf, slaInfo, isStaleReady } from "../lib/utils";
import { SearchIcon, ChevronDownIcon, ServiceIcon, ListViewIcon, GridViewIcon, ClockIcon, WarrantyIcon } from "../components/icons";
import TicketCard from "../components/TicketCard";
import { EmptyState, LoadingState } from "../components/EmptyState";
import HistorySection from "../components/HistorySection";
import ResponsiveTable from "../components/ResponsiveTable";

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
  const [view, setView] = useState("list"); // board | list
  const [listStatus, setListStatus] = useState(STATUSES[0].key);
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
  function handleCloseReady(id, payment) {
    setTicketStatus(id, "Átadásra", "Átadva", payment || "Készpénz");
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
        <div className="seg" style={{ marginLeft: "auto" }}>
          <button type="button" className={view === "board" ? "active" : ""} title="Tábla nézet" onClick={() => setView("board")}><GridViewIcon /></button>
          <button type="button" className={view === "list" ? "active" : ""} title="Lista nézet" onClick={() => setView("list")}><ListViewIcon /></button>
        </div>
      </div>

      {view === "list" && (
        <div className="svc-stat-tabs">
          {STATUSES.map((col) => {
            const count = activeTickets.filter((t) => t.status === col.key).length;
            return (
              <button
                key={col.key} type="button"
                className={`svc-stat-tab${listStatus === col.key ? " active" : ""}`}
                onClick={() => setListStatus(col.key)}
              >
                <span className="dot" style={{ background: col.color }} />
                <span className="lbl">{statusLabel(col.key)}</span>
                <span className="cnt">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {loadingData ? <LoadingState /> : view === "list" ? (
        (() => {
          const items = activeTickets.filter((t) => t.status === listStatus);
          if (items.length === 0) return <EmptyState icon={ServiceIcon}>Nincs munkalap ebben az állapotban.</EmptyState>;
          const probsOf = (t) => (t.issue || "").split(",").map((p) => p.trim()).filter(Boolean);
          // Sürgősség: csak akkor jelezzük, ha VAN vállalt határidő (dueDate) — ha nincs ígéret,
          // nincs mihez képest "sürgős" legyen. A 90+ napja átvehető, de el nem vitt munkalapokat
          // is ide soroljuk, mert azok is azonnali odafigyelést igényelnek.
          const urgencyOf = (t) => {
            const sla = slaInfo(t);
            if (sla && (sla.level === "warn" || sla.level === "overdue")) return sla;
            if (isStaleReady(t)) return { level: "overdue", label: "90+ napja várja az átvételt" };
            return null;
          };
          const daysOf = (t) => {
            const n = daysOnShelf(t.dateIn);
            if (n == null) return <span className="svc-days">—</span>;
            if (n <= 0) return <span className="svc-days today">Ma</span>;
            return <span className="svc-days">{n}<span className="svc-days-lbl">napja</span></span>;
          };
          const kliensOf = (t) => {
            if (t.ticketKind === "Saját készlet - előkészítés") {
              return <span className="t-kind-pill" style={{ background: "#F1F5F9", color: "#475569" }}><ServiceIcon width={11} height={11} />Saját — előkészítés</span>;
            }
            if (t.ticketKind === "Saját készlet - garanciális") {
              return <span className="t-kind-pill" style={{ background: "#FCE7F3", color: "#BE185D" }}><WarrantyIcon width={11} height={11} />Saját — garanciális</span>;
            }
            return t.customerName || "—";
          };
          const statusPill = (t) => (t.subStatus ? (
            <span className={`st ${subStatusCls(t.status, t.subStatus)}`}>{subStatusLabel(t.status, t.subStatus)}</span>
          ) : (
            <span className={`st ${statusCls(t.status)}`}>{statusLabel(t.status)}</span>
          ));
          return (
            <ResponsiveTable
              columns={[
                { key: "d", label: "Eszköz", className: "col-grow" }, { key: "c", label: "Kliens" }, { key: "i", label: "Bejött" },
                { key: "p", label: "Probléma" }, { key: "s", label: "Státusz" }, { key: "a", label: "Ár" },
              ]}
              rows={items}
              rowKey={(t) => t.id}
              renderRow={(t) => (
                <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => setDetailId(t.id)}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <div className="stk-name">
                      <span className="stk-sub" style={{ marginTop: 0, marginRight: 6 }}>{ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))}</span>
                      {displayName(t.brand, t.model) || "—"}
                      {urgencyOf(t) && (
                        <span className={`sla-badge sla-${urgencyOf(t).level}`} style={{ marginLeft: 6 }} title={urgencyOf(t).label}>
                          <ClockIcon width={11} height={11} />
                        </span>
                      )}
                      {t.isWarranty && (
                        <span className="t-kind-pill" style={{ background: "#EDE9FE", color: "#6D28D9", marginLeft: 6, marginBottom: 0 }} title={t.warrantyKind === "termék" ? "Garanciális — termék" : "Garanciális — szerviz"}>
                          <WarrantyIcon width={11} height={11} />
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{kliensOf(t)}</td>
                  <td>{daysOf(t)}</td>
                  <td>
                    <div className="svc-probs">
                      {probsOf(t).length > 0 ? probsOf(t).map((p, i) => <span key={i} className="prob-pill">{p}</span>) : "—"}
                    </div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{statusPill(t)}</td>
                  <td><span className="svc-price">{money(t.price)}</span></td>
                </tr>
              )}
              renderMobileRow={(t) => (
                <div className="mob-row" onClick={() => setDetailId(t.id)}>
                  <div className="mob-row-top">
                    <div className="mob-row-main">
                      <span className="stk-sub" style={{ marginTop: 0, marginRight: 6 }}>{ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))}</span>
                      <span>{displayName(t.brand, t.model) || "—"}</span>
                      {urgencyOf(t) && (
                        <span className={`sla-badge sla-${urgencyOf(t).level}`} style={{ marginLeft: 6 }} title={urgencyOf(t).label}>
                          <ClockIcon width={11} height={11} />
                        </span>
                      )}
                      {t.isWarranty && (
                        <span className="t-kind-pill" style={{ background: "#EDE9FE", color: "#6D28D9", marginLeft: 6, marginBottom: 0 }} title={t.warrantyKind === "termék" ? "Garanciális — termék" : "Garanciális — szerviz"}>
                          <WarrantyIcon width={11} height={11} />
                        </span>
                      )}
                    </div>
                    <div className="mob-row-amount">{money(t.price)}</div>
                  </div>
                  <div className="mob-row-sub">
                    <span>{kliensOf(t)}</span>
                    {daysOf(t)}
                    {statusPill(t)}
                  </div>
                  {probsOf(t).length > 0 && (
                    <div className="svc-probs" style={{ marginTop: 6, flexWrap: "wrap" }}>
                      {probsOf(t).map((p, i) => <span key={i} className="prob-pill">{p}</span>)}
                    </div>
                  )}
                </div>
              )}
            />
          );
        })()
      ) : (
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
                  <div className={`k-col${col.narrow ? " k-col-narrow" : ""}`} key={col.key} style={{ "--col-color": col.color }}>
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
                    <div className="stk-name">
                      <span className="stk-sub" style={{ marginTop: 0, marginRight: 6 }}>{ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))}</span>
                      {displayName(t.brand, t.model) || "—"}
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
