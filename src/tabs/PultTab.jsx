import { useMemo, useState } from "react";
import { today, displayName, money } from "../lib/utils";
import { NoteIcon, LeaveIcon, ChevronDownIcon } from "../components/icons";
import NoteComposer from "../components/NoteComposer";
import NoteCard from "../components/NoteCard";
import WaitingList from "../components/WaitingList";
import ClosedNotesPopover from "../components/ClosedNotesPopover";
import { EmptyState } from "../components/EmptyState";

const LEAVE_SOON_DAYS = 14;
const GREETINGS = ["Szia!", "Hello!", "Üdv újra!", "Szevasz!", "Jó munkát ma!", "Sziasztok!"];

export default function PultTab({
  effectiveLocFilter, filteredTickets, setDetailId,
  notes, addNote, completeNote, deleteNote,
  waitingItems, addWaitingItem, advanceWaiting,
  users, currentUserId, tickets, stock, parts, customersTable, warranties, locName,
  upcomingLeave,
  webOrders, confirmWebOrder, cancelWebOrder, completeWebOrder,
  onOpenTicket, onOpenProduct, onOpenPart, onOpenCustomer, onOpenWarranty,
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [showReceived, setShowReceived] = useState(false);
  const greeting = useMemo(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)], []);
  const promisedToday = useMemo(() => {
    const t0 = today();
    return filteredTickets.filter((t) => t.status !== "Átadásra" && (t.dueDate === t0 || t.handoverDate === t0));
  }, [filteredTickets]);

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
  const readyWaiting = activeWaiting.filter((w) => w.status === "megerkezett");
  const receivedTickets = filteredTickets.filter((t) => t.status === "Átvett");
  const partsWaitTickets = receivedTickets.filter((t) => t.subStatus === "Alkatrészre vár" || t.subStatus === "Alkatrészre és készülékre vár");

  const attentionCount = webOrders.length + promisedToday.length + readyWaiting.length + receivedTickets.length;

  return (
    <div className="pb-row3">
      <div className="pult-section">
        <div className="pb-stat-head"><span className="pb-stat-greeting">{greeting}</span></div>
        <div className="pb-stat-chips">
          <div className="pb-stat-chip"><span className="l"><span className="d" style={{ background: "var(--info)" }} />Webes rendelés</span><b>{webOrders.length}</b></div>
          <div className="pb-stat-chip"><span className="l"><span className="d" style={{ background: "var(--primary)" }} />Ígért munka ma</span><b>{promisedToday.length}</b></div>
          <div className="pb-stat-chip"><span className="l"><span className="d" style={{ background: "#7C3AED" }} />Kész várakozás</span><b>{readyWaiting.length}</b></div>
          <button
            type="button"
            className="pb-stat-chip pb-stat-chip-toggle"
            disabled={receivedTickets.length === 0}
            onClick={() => setShowReceived((v) => !v)}
          >
            <span className="l"><b>{receivedTickets.length}</b>Rögzített szervizek</span>
            {receivedTickets.length > 0 && (
              <ChevronDownIcon width={11} height={11} style={{ transform: showReceived ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
            )}
          </button>
          {partsWaitTickets.length > 0 && (
            <div className="pb-stat-chip"><span className="l"><span className="d" style={{ background: "#EA580C" }} />Alkatrészre vár</span><b>{partsWaitTickets.length}</b></div>
          )}
        </div>

        {attentionCount === 0 ? (
          <div className="pb-stat-empty">Nincs ma sürgős tétel.</div>
        ) : (
          <div className="pb-stat-list">
            {webOrders.map((o) => (
              <div key={`web-${o.id}`} className="pb-stat-row">
                <div className="top">
                  <span className="name">#{o.orderNo} {o.guestName}</span>
                  <span className="amt">{money(o.totalAmount)}</span>
                </div>
                <div className="sub">{o.items.map((it) => [it.brand, it.model].filter(Boolean).join(" ")).join(", ")}</div>
                <div className="sub">{o.guestPhone} · {o.locationName}</div>
                <div className="actions">
                  {o.status === "fizetve" && <button type="button" className="pb-stat-btn" onClick={() => confirmWebOrder(o.id)}>Előkészítve</button>}
                  {o.status === "visszaigazolva" && <button type="button" className="pb-stat-btn" onClick={() => completeWebOrder(o.id)}>Átadva</button>}
                  <button type="button" className="pb-stat-btn" onClick={() => cancelWebOrder(o.id)}>Lemondás</button>
                </div>
              </div>
            ))}

            {promisedToday.map((t) => (
              <div key={`job-${t.id}`} className="pb-stat-row job" onClick={() => setDetailId(t.id)}>
                <div className="top">
                  <span className="name">{t.customerName}</span>
                  <span className="amt">{money(t.price)}</span>
                </div>
                <div className="sub">{displayName(t.brand, t.model) || "—"}</div>
              </div>
            ))}

            {readyWaiting.map((w) => (
              <div key={`ready-${w.id}`} className="pb-stat-row ready">
                <div className="top"><span className="name">{w.description}</span></div>
                <div className="sub">{w.customerName || "—"}{w.supplier ? ` · ${w.supplier}` : ""} — megérkezett</div>
                <div className="actions">
                  <button type="button" className="pb-stat-btn" onClick={() => advanceWaiting(w.id, "ertesitve")}>Értesítettük</button>
                </div>
              </div>
            ))}

            {showReceived && receivedTickets.map((t) => (
              <div key={`recv-${t.id}`} className="pb-stat-row job" onClick={() => setDetailId(t.id)}>
                <div className="top">
                  <span className="name">{t.customerName}</span>
                  <span className="amt">{money(t.price)}</span>
                </div>
                <div className="sub">
                  {displayName(t.brand, t.model) || "—"}
                  {(t.subStatus === "Alkatrészre vár" || t.subStatus === "Alkatrészre és készülékre vár") ? " — alkatrészre vár" : " — átvéve"}
                </div>
              </div>
            ))}
          </div>
        )}

        {leaveSoon.length > 0 && (
          <div className="pb-leave-note">
            <LeaveIcon width={14} height={14} />
            {leaveSoon.length} kolléga szabadsága kezdődik a köv. {LEAVE_SOON_DAYS} napban
          </div>
        )}
      </div>

      <div className="pult-section">
        {openNotes.length === 0 ? <EmptyState icon={NoteIcon}>Nincs nyitott cetli.</EmptyState> : (
          <div className="stk-grid">
            {openNotes.map((n) => (
              <NoteCard key={n.id} note={n} users={users} currentUserId={currentUserId} onComplete={() => completeNote(n.id)} onDelete={() => deleteNote(n.id)}
                onOpenLink={{ ticket: onOpenTicket, product: onOpenProduct, part: onOpenPart, customer: onOpenCustomer, warranty: onOpenWarranty }} />
            ))}
          </div>
        )}
        <div className="wl-foot" style={{ marginTop: 10 }}>
          {!noteOpen && <ClosedNotesPopover items={doneNotes} />}
          <NoteComposer users={users} tickets={tickets} stock={stock} parts={parts} customersTable={customersTable} warranties={warranties} locName={locName} onSave={addNote} open={noteOpen} setOpen={setNoteOpen} />
        </div>
      </div>

      <div className="pult-section">
        <WaitingList items={activeWaiting} closedItems={closedWaiting} customers={customersTable} onAdd={addWaitingItem} onAdvance={advanceWaiting} />
      </div>
    </div>
  );
}
