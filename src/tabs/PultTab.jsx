import { useMemo } from "react";
import { today } from "../lib/utils";
import { ClockIcon, NoteIcon, PartsIcon } from "../components/icons";
import TicketCard from "../components/TicketCard";
import NoteComposer from "../components/NoteComposer";
import NoteCard from "../components/NoteCard";
import WaitingList from "../components/WaitingList";
import HistorySection from "../components/HistorySection";
import { EmptyState } from "../components/EmptyState";

export default function PultTab({
  effectiveLocFilter, locName, filteredTickets, setDetailId,
  notes, addNote, completeNote, reopenNote, deleteNote,
  waitingItems, addWaitingItem, advanceWaiting, deleteWaitingItem,
  users, currentUserId, tickets, stock, parts, customersTable, warranties,
  onOpenTicket, onOpenProduct, onOpenPart, onOpenCustomer, onOpenWarranty,
}) {
  const promisedToday = useMemo(() => {
    const t0 = today();
    return filteredTickets.filter((t) => t.status !== "Átadásra" && (t.dueDate === t0 || t.handoverDate === t0));
  }, [filteredTickets]);

  const openNotes = notes.filter((n) => n.status === "open");
  const doneNotes = notes.filter((n) => n.status === "done");
  const activeWaiting = waitingItems.filter((w) => w.status !== "lezarva");
  const closedWaiting = waitingItems.filter((w) => w.status === "lezarva");

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Pult</div><div className="page-sub">{effectiveLocFilter === "all" ? "Mindkét helyszín" : locName(effectiveLocFilter)}</div></div>
      </div>

      <div className="pult-grid">
        <div className="pult-section pult-full">
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
      </div>
    </>
  );
}
