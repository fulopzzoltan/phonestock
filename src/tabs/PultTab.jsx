import { useMemo } from "react";
import { today, phoneCode, displayName, money, LEAVE_STATUS_CLS } from "../lib/utils";
import { ClockIcon, NoteIcon, PartsIcon, PhoneCaseIcon, LeaveIcon, CustomersIcon, CartIcon } from "../components/icons";
import TicketCard from "../components/TicketCard";
import NoteComposer from "../components/NoteComposer";
import NoteCard from "../components/NoteCard";
import WaitingList from "../components/WaitingList";
import HistorySection from "../components/HistorySection";
import { EmptyState } from "../components/EmptyState";

const LEAVE_SOON_DAYS = 14;
const REQUEST_TYPE_LABEL = { return: "Visszaküldés", warranty_claim: "Garancia-igény" };
const REQUEST_STATUS_CLS = { uj: "st-alkatresz", attekintve: "st-garancialis" };
const REQUEST_NEXT = { uj: "attekintve", attekintve: "lezarva" };
const REQUEST_NEXT_LABEL = { uj: "Áttekintve", attekintve: "Lezárva" };

export default function PultTab({
  effectiveLocFilter, locName, filteredTickets, setDetailId,
  notes, addNote, completeNote, reopenNote, deleteNote,
  waitingItems, addWaitingItem, advanceWaiting, deleteWaitingItem,
  users, currentUserId, tickets, stock, parts, customersTable, warranties,
  upcomingLeave, leaveTypes, customerRequests, advanceCustomerRequest,
  webOrders, confirmWebOrder, cancelWebOrder, completeWebOrder,
  onOpenTicket, onOpenProduct, onOpenPart, onOpenCustomer, onOpenWarranty,
}) {
  const promisedToday = useMemo(() => {
    const t0 = today();
    return filteredTickets.filter((t) => t.status !== "Átadásra" && (t.dueDate === t0 || t.handoverDate === t0));
  }, [filteredTickets]);

  const reservedPhones = useMemo(() => {
    return stock.filter((i) => i.status === "in_stock" && i.stockStatus === "lefoglalt" && (effectiveLocFilter === "all" || i.locationId === effectiveLocFilter));
  }, [stock, effectiveLocFilter]);

  const leaveSoon = useMemo(() => {
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + LEAVE_SOON_DAYS);
    const horizonStr = horizon.toISOString().slice(0, 10);
    return upcomingLeave.filter((r) => {
      const reqUser = users.find((u) => u.id === r.userId);
      return r.startDate <= horizonStr && (effectiveLocFilter === "all" || reqUser?.locationId === effectiveLocFilter);
    });
  }, [upcomingLeave, users, effectiveLocFilter]);

  const openNotes = notes.filter((n) => n.status === "open");
  const doneNotes = notes.filter((n) => n.status === "done");
  const activeWaiting = waitingItems.filter((w) => w.status !== "lezarva");
  const closedWaiting = waitingItems.filter((w) => w.status === "lezarva");

  return (
    <>
      <div className="pult-grid">
        <div className="pult-col">
          <div className="pult-section">
            <div className="pult-section-head"><CartIcon width={16} height={16} />Webes rendelések{webOrders.length > 0 && <span className="cnt">{webOrders.length}</span>}</div>
            {webOrders.length === 0 ? <EmptyState icon={CartIcon}>Nincs függő webes rendelés.</EmptyState> : (
              <div className="tw">
                {webOrders.map((o) => (
                  <div key={o.id} className="dp-row" style={{ padding: "10px 14px", alignItems: "flex-start" }}>
                    <span className="dp-key">
                      <span className={`st ${o.status === "fizetve" ? "st-alkatresz" : "st-garancialis"}`} style={{ marginRight: 8 }}>#{o.orderNo}</span>
                      {o.guestName} · {o.guestPhone}
                      <span className="badge-loc" style={{ marginLeft: 8 }}>{o.locationName}</span>
                      <div style={{ fontSize: 11.5, color: "#6B7280", marginTop: 3 }}>
                        {o.items.map((it) => [it.brand, it.model].filter(Boolean).join(" ")).join(", ")}
                      </div>
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                      <span className="mono" style={{ fontWeight: 700 }}>{money(o.totalAmount)}</span>
                      <span style={{ display: "flex", gap: 6 }}>
                        {o.status === "fizetve" && <button type="button" className="btn sec sm" onClick={() => confirmWebOrder(o.id)}>Előkészítve</button>}
                        {o.status === "visszaigazolva" && <button type="button" className="btn sm" onClick={() => completeWebOrder(o.id)}>Átadva</button>}
                        <button type="button" className="btn sec sm" onClick={() => cancelWebOrder(o.id)}>Lemondás</button>
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pult-section">
            <div className="pult-section-head"><ClockIcon width={16} height={16} />Ma ígért munkák{promisedToday.length > 0 && <span className="cnt">{promisedToday.length}</span>}</div>
            {promisedToday.length === 0 ? <EmptyState icon={ClockIcon}>Ma nincs konkrétan ígért munka.</EmptyState> : (
              <div className="stk-grid">
                {promisedToday.map((t) => <TicketCard key={t.id} ticket={t} locName={locName} onOpen={setDetailId} />)}
              </div>
            )}
          </div>

          <div className="pult-section">
            <div className="pult-section-head"><NoteIcon width={16} height={16} />Cetlik{openNotes.length > 0 && <span className="cnt">{openNotes.length} nyitott</span>}</div>
            <NoteComposer users={users} tickets={tickets} stock={stock} parts={parts} customersTable={customersTable} warranties={warranties} locName={locName} onSave={addNote} />
            {openNotes.length === 0 ? <EmptyState icon={NoteIcon}>Nincs nyitott cetli.</EmptyState> : (
              <div className="stk-grid">
                {openNotes.map((n) => (
                  <NoteCard key={n.id} note={n} users={users} currentUserId={currentUserId} onComplete={() => completeNote(n.id)} onDelete={() => deleteNote(n.id)}
                    onOpenLink={{ ticket: onOpenTicket, product: onOpenProduct, part: onOpenPart, customer: onOpenCustomer, warranty: onOpenWarranty }} />
                ))}
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              <HistorySection icon={NoteIcon} label="Elintézett cetlik" items={doneNotes} searchPlaceholder="Keresés..." filterFn={(n, q) => n.body.toLowerCase().includes(q)}>
                {(rows) => (
                  <div className="stk-grid" style={{ padding: 12 }}>
                    {rows.map((n) => <NoteCard key={n.id} note={n} users={users} currentUserId={currentUserId} done onReopen={() => reopenNote(n.id)} />)}
                  </div>
                )}
              </HistorySection>
            </div>
          </div>
        </div>

        <div className="pult-col">
          <div className="pult-section">
            <div className="pult-section-head"><PhoneCaseIcon width={16} height={16} />Lefoglalt telefonok{reservedPhones.length > 0 && <span className="cnt">{reservedPhones.length}</span>}</div>
            {reservedPhones.length === 0 ? <EmptyState icon={PhoneCaseIcon}>Nincs lefoglalt telefon.</EmptyState> : (
              <div className="tw">
                {reservedPhones.map((i) => (
                  <div key={i.id} className="dp-row" style={{ padding: "10px 14px", cursor: "pointer" }} onClick={() => onOpenProduct(i.id)}>
                    <span className="dp-key">
                      {displayName(i.brand, i.model)} <span style={{ color: "#9CA3AF" }}>· {phoneCode(i.productNo)}</span>
                      {effectiveLocFilter === "all" && <span className="badge-loc" style={{ marginLeft: 8 }}>{locName(i.locationId)}</span>}
                    </span>
                    <span className="mono" style={{ fontWeight: 700 }}>{money(i.salePrice)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pult-section">
            <div className="pult-section-head"><PartsIcon width={16} height={16} />Várakozik valamire{activeWaiting.length > 0 && <span className="cnt">{activeWaiting.length}</span>}</div>
            <WaitingList items={activeWaiting} onAdd={addWaitingItem} onAdvance={advanceWaiting} onDelete={deleteWaitingItem} />
            <HistorySection icon={PartsIcon} label="Lezárt várakozások" items={closedWaiting} searchPlaceholder="Keresés..." filterFn={(w, q) => [w.description, w.customerName].filter(Boolean).join(" ").toLowerCase().includes(q)}>
              {(rows) => (
                <table>
                  <thead><tr><th>Tétel</th><th>Kinek</th><th>Forrás</th></tr></thead>
                  <tbody>{rows.map((w) => <tr key={w.id}><td>{w.description}</td><td>{w.customerName || "—"}</td><td>{w.supplier || "—"}</td></tr>)}</tbody>
                </table>
              )}
            </HistorySection>
          </div>

          <div className="pult-section">
            <div className="pult-section-head"><LeaveIcon width={16} height={16} />Közelgő szabadság{leaveSoon.length > 0 && <span className="cnt">{leaveSoon.length}</span>}</div>
            {leaveSoon.length === 0 ? <EmptyState icon={LeaveIcon}>Nincs közelgő szabadság a következő {LEAVE_SOON_DAYS} napban.</EmptyState> : (
              <div className="tw">
                {leaveSoon.map((r) => {
                  const reqUser = users.find((u) => u.id === r.userId);
                  const lt = leaveTypes.find((t) => t.id === r.leaveTypeId);
                  return (
                    <div key={r.id} className="dp-row" style={{ padding: "10px 14px" }}>
                      <span className="dp-key">
                        <span style={{ fontWeight: 600 }}>{reqUser?.fullName || "?"}</span>
                        <span className="badge-loc" style={{ marginLeft: 8 }}>{locName(reqUser?.locationId)}</span>
                        <span className="leave-type-chip" style={{ marginLeft: 8 }}><span className="leave-type-dot" style={{ background: lt?.color || "#9CA3AF" }} />{lt?.name || "—"}</span>
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="mono">{r.startDate} – {r.endDate}</span>
                        <span className={LEAVE_STATUS_CLS[r.status] || "badge-loc"}>{r.status}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pult-section">
            <div className="pult-section-head"><CustomersIcon width={16} height={16} />Ügyfél-kérések{customerRequests.length > 0 && <span className="cnt">{customerRequests.length}</span>}</div>
            {customerRequests.length === 0 ? <EmptyState icon={CustomersIcon}>Nincs nyitott ügyfél-kérés.</EmptyState> : (
              <div className="tw">
                {customerRequests.map((r) => (
                  <div key={r.id} className="dp-row" style={{ padding: "10px 14px" }}>
                    <span className="dp-key">
                      <span className={`st ${REQUEST_STATUS_CLS[r.status] || "st-alkatresz"}`} style={{ marginRight: 8 }}>{REQUEST_TYPE_LABEL[r.type] || r.type}</span>
                      {r.customerName}{r.customerPhone ? ` · ${r.customerPhone}` : ""} — {r.description}
                    </span>
                    <span style={{ display: "flex", gap: 6 }}>
                      {REQUEST_NEXT[r.status] && <button type="button" className="btn sec sm" onClick={() => advanceCustomerRequest(r.id, REQUEST_NEXT[r.status])}>{REQUEST_NEXT_LABEL[r.status]}</button>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
