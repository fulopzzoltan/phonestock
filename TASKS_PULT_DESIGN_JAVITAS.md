# TASKS — Pult: design javítás (átláthatóság)

## A probléma

A `TASKS_PULT.md` szerint elkészült Pult (`src/tabs/PultTab.jsx`) funkcionálisan jó, de a designja nem lett átlátható. Átnéztem a ténylegesen megvalósult kódot, és pontosan látom, miért:

1. **A 3 szekciót (Ma ígért munkák / Cetlik / Várakozik valamire) semmi nem választja el vizuálisan** — csak egy `.dp-section-title` felirat van fölöttük, ami egy 10px-es, halványszürke, csupa nagybetűs mikro-címke (`src/index.css` 254. sor) — ezt eredetileg egy munkalap-részletnézet **belső** alszekcióihoz terveztük (pl. "Kliens adatok"), nem egy teljes oldal 3 fő blokkjának elválasztására. Nincs kártya-keret, nincs háttér-elkülönítés — az egész oldal egy hosszú, tagolatlan görgetésnek hat.
2. **"Ma ígért munkák" a `.statcard` osztályt használja** (`PultTab.jsx` 37. sor) — ez a KPI-számkártyák stílusa (nagy szám + apró felirat), nem munka-kártyáké. Egy ügyfélnév + eszköz + státusz-pill kombó furcsán fest ebben a keretben.
3. **A cetlik a `.stk-card` osztályt használják** (`NoteCard.jsx` 14. sor) — ez a nemrég átdolgozott telefon-termékkártya stílusa: 20px-es sarok, 19px belső padding, nagy, tágas elrendezés fotó/ár/gombsor számára tervezve. Egy 1-2 soros cetlire ráhúzva rengeteg üres hely marad, semmi "cetli-érzés" nincs benne — nincs szín, nincs karakter, pontosan úgy néz ki, mint egy üres telefonkártya.

## A megoldás

Nem új koncepció kell, hanem a meglévő, már bevált mintázatok helyes újrafelhasználása:

- **"Ma ígért munkák"** → a valódi `TicketCard` komponenst használja (ugyanaz, ami a Szerviz Kanbanon fut) — így pont annyi infót mutat, amennyi kell (ügyfél, eszköz, kód, státusz-pill), és automatikusan konzisztens a Szerviz fül megjelenésével.
- **Cetlik** → önálló, kompakt `.note-card` stílus, nem a telefonkártya-stílus — kisebb padding, halványszínezett háttér a sürgősség szerint (ma = sárgás, e héten/nincs határidő = semleges), zöld bal szegély, ha nekem van kiosztva.
- **Mindhárom szekció** külön, fehér kártya-keretbe kerül (`.pult-section`), rendes méretű, félkövér címsorral és darabszám-jelvénnyel — ez adja meg a hiányzó vizuális tagolást.

---

## 1. Új CSS — `src/index.css`

A `.stk-card` szabály (186. sor) után szúrd be:
```css
.pult-section{background:#fff;border:1px solid #EEF0F2;border-radius:var(--radius-lg);box-shadow:var(--shadow-card);padding:20px;margin-bottom:20px}
.pult-section-head{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;color:#111827;margin-bottom:14px}
.pult-section-head .cnt{margin-left:auto;font-size:11.5px;font-weight:600;color:#9CA3AF;background:#F3F4F6;padding:2px 9px;border-radius:var(--radius-pill)}

.note-card{border-radius:14px;padding:13px 14px;background:#F9FAFB;border:1px solid #EEF0F2;display:flex;flex-direction:column;height:100%}
.note-card.due-today{background:var(--warning-soft);border-color:var(--warning-soft)}
.note-card.mine{border-left:3px solid var(--primary)}
.note-card.done{background:#F3F4F6;opacity:.7}
```

---

## 2. `src/tabs/PultTab.jsx` — teljes csere

```jsx
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
    </>
  );
}
```
(A `WaitingList.jsx` már saját `margin-bottom:24`-et ad magának — mivel most `.pult-section` paddingen belül van, ez a belső margó felesleges lett; a `WaitingList.jsx` 23. sorában cseréld `style={{ marginBottom: 24 }}` → `style={{ marginBottom: 0 }}`, hogy ne legyen dupla térköz a szekció alján.)

---

## 3. `src/components/NoteCard.jsx` — cetli-stílus, ne termékkártya-stílus

Cseréld a 7–33. sort:
```jsx
export default function NoteCard({ note, users, currentUserId, done, onComplete, onReopen, onDelete, onOpenLink }) {
  const authorName = users.find((u) => u.id === note.authorId)?.fullName || "?";
  const assignedName = note.assignedToId ? (users.find((u) => u.id === note.assignedToId)?.fullName || "?") : "Mindenkinek";
  const linkedType = note.linkedTicketId ? "ticket" : note.linkedProductId ? "product" : note.linkedPartId ? "part" : note.linkedCustomerId ? "customer" : note.linkedWarrantyId ? "warranty" : null;
  const linkedId = note.linkedTicketId || note.linkedProductId || note.linkedPartId || note.linkedCustomerId || note.linkedWarrantyId || null;
  const LinkIcon = linkedType ? TYPE_ICON[linkedType] : null;
  const mine = note.assignedToId && note.assignedToId === currentUserId;
  const cardCls = `note-card${done ? " done" : note.dueScope === "today" ? " due-today" : ""}${mine ? " mine" : ""}`;
  return (
    <div className={cardCls}>
      <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.4, textDecoration: done ? "line-through" : "none" }}>{note.body}</p>
      {linkedType && (
        <button type="button" className="chat-chip" style={{ marginBottom: 8 }} onClick={() => onOpenLink?.[linkedType]?.(linkedId)}>
          <LinkIcon width={11} height={11} /> megnyitás
        </button>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "#9CA3AF", marginTop: "auto" }}>
        <span>{authorName} · {assignedName}{note.dueScope ? ` · ${DUE_LABEL[note.dueScope]}` : ""}</span>
        {done ? (
          <button type="button" className="btn sec sm" onClick={onReopen}>Visszavon</button>
        ) : (
          <span style={{ display: "flex", gap: 6 }}>
            <button type="button" className="btn sec sm" onClick={onComplete}>Kész</button>
            <ConfirmDelete disabled={false} onConfirm={onDelete} />
          </span>
        )}
      </div>
    </div>
  );
}
```
(Csak a gyökér `<div>` osztálya és a `mine`/`cardCls` számítás új — a többi tartalom változatlan. A `marginTop: "auto"` a footer-sort mindig a kártya aljára tolja, hogy egyenlőtlen szöveghosszaknál is egy vonalban legyenek a "Kész" gombok.)

---

## 4. `src/App.jsx` — `currentUserId` átadása

Ellenőrizd, hogy a `<PultTab>` render (a `TASKS_PULT.md` 8c. pontja szerint) átadja-e a `currentUserId={user.id}`-t — ha eddig hiányzott, pótold, mert a fenti "mine" kiemelés erre épül.

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- A Pult oldalon 3, jól elkülönülő fehér kártya-panel van, mindegyiknek rendes méretű (nem mikroszkopikus) címsora és darabszám-jelvénye
- "Ma ígért munkák" ugyanúgy néz ki, mint a Szerviz Kanban kártyái (mert ugyanaz a `TicketCard` komponens)
- A cetlik kompaktak, nem tátong bennük üres hely; a "mára" határidejű cetli sárgás hátterű, a nekem kiosztott cetli bal oldalán zöld csík van
- Elintézett cetli halványabb, áthúzott szöveggel, "Elintézett cetlik" előzményben
- Más fülön (Telefonok, Szerviz stb.) semmi nem változott — a `.stk-card`/`.statcard` osztályokat ott nem piszkáltuk
- Nincs `git push`, csak lokális commit
