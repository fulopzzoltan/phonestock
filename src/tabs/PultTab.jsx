import { useMemo } from "react";
import { today, ticketCode, statusCls, subStatusLabel, displayName } from "../lib/utils";
import { ClockIcon, NoteIcon, PartsIcon } from "../components/icons";
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

      <div className="dp-section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><ClockIcon width={14} height={14} />Ma ígért munkák</div>
      {promisedToday.length === 0 ? <EmptyState icon={ClockIcon}>Ma nincs konkrétan ígért munka.</EmptyState> : (
        <div className="statrow c3" style={{ marginBottom: 24 }}>
          {promisedToday.map((t) => (
            <div key={t.id} className="statcard" style={{ cursor: "pointer" }} onClick={() => setDetailId(t.id)}>
              <div className="lbl">{t.customerName}</div>
              <div style={{ fontSize: 12.5, color: "#6B7280", margin: "2px 0 8px" }}>{displayName(t.brand, t.model)} · {ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))}</div>
              <span className={`st ${statusCls(t.status)}`}>{t.subStatus ? subStatusLabel(t.status, t.subStatus) : t.status}</span>
            </div>
          ))}
        </div>
      )}

      <div className="dp-section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><NoteIcon width={14} height={14} />Cetlik</div>
      <NoteComposer users={users} tickets={tickets} stock={stock} parts={parts} customersTable={customersTable} warranties={warranties} locName={locName} onSave={addNote} />
      {openNotes.length === 0 ? <EmptyState icon={NoteIcon}>Nincs nyitott cetli.</EmptyState> : (
        <div className="stk-grid" style={{ marginBottom: 8 }}>
          {openNotes.map((n) => (
            <NoteCard key={n.id} note={n} users={users} onComplete={() => completeNote(n.id)} onDelete={() => deleteNote(n.id)}
              onOpenLink={{ ticket: onOpenTicket, product: onOpenProduct, part: onOpenPart, customer: onOpenCustomer, warranty: onOpenWarranty }} />
          ))}
        </div>
      )}
      <HistorySection icon={NoteIcon} label="Elintézett cetlik" items={doneNotes} searchPlaceholder="Keresés..." filterFn={(n, q) => n.body.toLowerCase().includes(q)}>
        {(rows) => (
          <div className="stk-grid" style={{ padding: 12 }}>
            {rows.map((n) => <NoteCard key={n.id} note={n} users={users} done onReopen={() => reopenNote(n.id)} />)}
          </div>
        )}
      </HistorySection>

      <div className="dp-section-title" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 24 }}><PartsIcon width={14} height={14} />Várakozik valamire</div>
      <WaitingList items={activeWaiting} onAdd={addWaitingItem} onAdvance={advanceWaiting} onDelete={deleteWaitingItem} />
      <HistorySection icon={PartsIcon} label="Lezárt várakozások" items={closedWaiting} searchPlaceholder="Keresés..." filterFn={(w, q) => [w.description, w.customerName].filter(Boolean).join(" ").toLowerCase().includes(q)}>
        {(rows) => (
          <table>
            <thead><tr><th>Tétel</th><th>Kinek</th><th>Forrás</th></tr></thead>
            <tbody>{rows.map((w) => <tr key={w.id}><td>{w.description}</td><td>{w.customerName || "—"}</td><td>{w.supplier || "—"}</td></tr>)}</tbody>
          </table>
        )}
      </HistorySection>
    </>
  );
}
