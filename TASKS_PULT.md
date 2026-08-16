# TASKS — "Pult": napi teendők / csapat-koordinációs kezdőoldal

## 0. Koncepció

Az **Áttekintés** (Dashboard) fül KPI-kat és pénzügyi döntéshozatali adatokat mutat — az visszamenőleg elemez. Ez a fül ("**Pult**") ezzel szemben **előre néz és a csapat közti koordinációt szolgálja**: mi van ma ígérve, mit kell egymásnak üzenni, mire várunk még valahonnan. Ez legyen a **belépéskor induló kezdőoldal** mindenkinek (admin és alkalmazott is), az Áttekintés külön fül marad, ugyanúgy elérhető, mint eddig.

A "Pult" név szándékosan a fizikai boltpultra utal — az a hely, ahol reggel/napközben minden csapat-egyeztetés ténylegesen elhangzik. (Alternatívák, ha nem tetszik: "Napi teendők", "Munkatér" — de a lenti terv a "Pult" nevet használja mindenhol, könnyen átnevezhető.)

Három rész egy oldalon:
1. **Ma ígért munkák** — automatikusan a meglévő munkalap-adatokból (nincs kézi felvitel, csak megjelenítés)
2. **Cetlik** — szabad szöveges üzenő-fal egymásnak, sticky-note stílusban, # hivatkozással munkalapra/telefonra/alkatrészre/ügyfélre/garanciára (ugyanaz a rendszer, mint a csapat-chatben)
3. **Várakozik valamire** — mire várunk kívülről (rendelt alkatrész/tok/telefon), és kit kell értesíteni, ha megjön — ez a nemrég megbeszélt PDF-rendelés-felvétellel is összekötve

Mockupot mutattam korábban a beszélgetésben — kártyás "Ma ígért munkák" sor, színes cetli-rács "Kész" gombbal, és egy állapot-jelvényes "Várakozik valamire" lista. A lenti terv ezt valós adatra és a projekt konvencióira ülteti át.

**Ne pusholj / ne deployolj**, csak lokális commit, amíg nem szólnak.

---

## 1. Adatbázis migráció

Két új tábla, az `internal_messages` mintáját követve (linked_* oszlopok, RLS-policy) — ellenőriztem élesben, az `internal_messages` policy-ja mindenkinek (adminnak, vagy bármely helyszínhez rendelt alkalmazottnak) teljes hozzáférést ad, nincs helyszín-szűrés rajta (csapat-szintű megosztott adat). Ugyanezt a mintát kövesd:

```sql
create table board_notes (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  author_id uuid references profiles(id),
  assigned_to_id uuid references profiles(id), -- null = mindenkinek
  due_scope text check (due_scope in ('today','week')), -- null = nincs határidő
  status text not null default 'open' check (status in ('open','done')),
  done_at timestamptz,
  done_by uuid references profiles(id),
  linked_ticket_id uuid references service_tickets(id),
  linked_product_id uuid references products(id),
  linked_part_id uuid references parts(id),
  linked_customer_id uuid references customers(id),
  linked_warranty_id uuid references warranties(id),
  created_at timestamptz not null default now()
);
alter table board_notes enable row level security;
create policy board_notes_rw on board_notes for all
  using (current_role() = 'admin' or exists (select 1 from profiles pr where pr.id = auth.uid() and pr.location_id is not null))
  with check (current_role() = 'admin' or exists (select 1 from profiles pr where pr.id = auth.uid() and pr.location_id is not null));

create table waiting_items (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  customer_name text,
  customer_phone text,
  supplier text,
  status text not null default 'megrendelve' check (status in ('megrendelve','megerkezett','ertesitve','lezarva')),
  location_id uuid references locations(id),
  linked_part_id uuid references parts(id),
  linked_product_id uuid references products(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table waiting_items enable row level security;
create policy waiting_items_rw on waiting_items for all
  using (current_role() = 'admin' or exists (select 1 from profiles pr where pr.id = auth.uid() and pr.location_id is not null))
  with check (current_role() = 'admin' or exists (select 1 from profiles pr where pr.id = auth.uid() and pr.location_id is not null));
```

Nincs `deleted_at`/Kuka-integráció egyik táblán sem — ezek rövid életű, operatív bejegyzések, nem üzleti alaprekordok (mint a munkalap/telefon/tranzakció), ezért törléskor egyszerűen törlődnek, nem kerülnek a Kukába. Ha ez mégis kellene, külön kérésre bővíthető.

---

## 2. Megosztott #-mention kereső kiemelése

A `TeamChatPanel.jsx`-ben (40–69. sor) már működik egy # alapú kereső munkalapra/telefonra/alkatrészre/ügyfélre/garanciára — ezt a Cetlik komponens is újra fogja használni, ezért emeld ki megosztott függvénybe, ne másold be még egyszer.

**Új fájl: `src/lib/mentions.js`**
```js
import { ticketCode, phoneCode, partCode } from "./utils";

export function searchMentions(query, { tickets, stock, parts, customersTable, warranties, locName }) {
  const q = query.toLowerCase();
  const ticketMatches = tickets
    .filter((t) => ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))?.toLowerCase().includes(q) || String(t.ticketNo).startsWith(q))
    .slice(0, 5)
    .map((t) => ({ type: "ticket", id: t.id, label: `${ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))} — ${[t.brand, t.model].filter(Boolean).join(" ")}` }));
  const productMatches = stock
    .filter((p) => phoneCode(p.productNo)?.toLowerCase().includes(q) || (p.imei || "").toLowerCase().includes(q) || [p.brand, p.model].join(" ").toLowerCase().includes(q))
    .slice(0, 5)
    .map((p) => ({ type: "product", id: p.id, label: `${phoneCode(p.productNo)} — ${[p.brand, p.model].filter(Boolean).join(" ")}` }));
  const partMatches = parts
    .filter((pt) => partCode(pt.partNo)?.toLowerCase().includes(q) || (pt.name || "").toLowerCase().includes(q))
    .slice(0, 5)
    .map((pt) => ({ type: "part", id: pt.id, label: `${partCode(pt.partNo)} — ${pt.name}` }));
  const customerMatches = customersTable
    .filter((c) => (c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q))
    .slice(0, 5)
    .map((c) => ({ type: "customer", id: c.id, label: `${c.name || "Névtelen"}${c.phone ? " — " + c.phone : ""}` }));
  const warrantyMatches = warranties
    .filter((w) => (w.customerName || "").toLowerCase().includes(q) || (w.label || "").toLowerCase().includes(q))
    .slice(0, 5)
    .map((w) => ({ type: "warranty", id: w.id, label: `Garancia — ${w.customerName || "?"} (${w.label || "?"})` }));
  return [...ticketMatches, ...productMatches, ...partMatches, ...customerMatches, ...warrantyMatches];
}
```

**`src/components/TeamChatPanel.jsx`** — cseréld a 45–69. sor `mentionMatches` blokkját erre (viselkedés nem változik, csak a kód forrása):
```js
const mentionMatches = useMemo(
  () => (mentionQuery ? searchMentions(mentionQuery, { tickets, stock, parts, customersTable, warranties, locName }) : []),
  [mentionQuery, tickets, stock, parts, customersTable, warranties, locName]
);
```
Import: `import { searchMentions } from "../lib/mentions";`

---

## 3. Belépés / navigáció

**`src/App.jsx` — 70. sor**, a kezdő fül mindenkinél a Pult legyen:
```js
const [tab, setTab] = useState("pult");
```

**`src/components/Sidebar.jsx`** — új gomb a "Napi munka" szekció **elejére** (13–14. sor elé), mindenkinek látható (nincs `isAdmin` feltétel rajta, ahogy a Szerviz/Telefonok sincs):
```jsx
<div className="nav-lbl">Napi munka</div>
<button className={`navbtn ${tab === "pult" ? "active" : ""}`} onClick={() => setTab("pult")}><BoardIcon className="nav-ic" />Pult</button>
<div className="navrow">
  <button className={`navbtn ${tab === "service" ? "active" : ""}`} onClick={() => setTab("service")}><ServiceIcon className="nav-ic" />Szerviz</button>
  ...
```

**`src/components/icons.jsx`** — új `BoardIcon` (a `ClockIcon` mellé, ugyanazt a stroke-stílust követve), egy egyszerű kártya/pin ikon:
```jsx
export const BoardIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 4v4M16 4v4M3 11h18" />
  </svg>
);
```

---

## 4. Új fő komponens: `src/tabs/PultTab.jsx`

Három szekció. A meglévő `effectiveLocFilter`-t használja (ugyanúgy, mint minden más fül), nem kell rá külön helyszín-váltó — az admin sidebar alján lévő Mind/Gyimes/Szentgyörgy vezérli.

```jsx
import { useMemo, useState } from "react";
import { today, ticketCode, statusCls, subStatusLabel, displayName } from "../lib/utils";
import { ClockIcon, NoteIcon, PartsIcon, ServiceIcon } from "../components/icons"; // NoteIcon: új, ld. lent
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
```

Új ikon: `NoteIcon` (`icons.jsx`, cetli-ikon):
```jsx
export const NoteIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 4h13l3 3v13H4z" /><path d="M17 4v3h3" /><path d="M8 11h8M8 15h5" />
  </svg>
);
```

---

## 5. `src/components/NoteCard.jsx` — egy cetli

```jsx
import { CloseIcon, ServiceIcon, PhoneCaseIcon, PartsIcon, CustomersIcon, WarrantyIcon } from "./icons";
import ConfirmDelete from "./ConfirmDelete";

const TYPE_ICON = { ticket: ServiceIcon, product: PhoneCaseIcon, part: PartsIcon, customer: CustomersIcon, warranty: WarrantyIcon };
const DUE_LABEL = { today: "Ma", week: "E héten" };

export default function NoteCard({ note, users, done, onComplete, onReopen, onDelete, onOpenLink }) {
  const authorName = users.find((u) => u.id === note.authorId)?.fullName || "?";
  const assignedName = note.assignedToId ? (users.find((u) => u.id === note.assignedToId)?.fullName || "?") : "Mindenkinek";
  const linkedType = note.linkedTicketId ? "ticket" : note.linkedProductId ? "product" : note.linkedPartId ? "part" : note.linkedCustomerId ? "customer" : note.linkedWarrantyId ? "warranty" : null;
  const linkedId = note.linkedTicketId || note.linkedProductId || note.linkedPartId || note.linkedCustomerId || note.linkedWarrantyId || null;
  const LinkIcon = linkedType ? TYPE_ICON[linkedType] : null;
  return (
    <div className="stk-card" style={{ cursor: "default", opacity: done ? 0.6 : 1 }}>
      <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.4, textDecoration: done ? "line-through" : "none" }}>{note.body}</p>
      {linkedType && (
        <button type="button" className="chat-chip" style={{ marginBottom: 8 }} onClick={() => onOpenLink?.[linkedType]?.(linkedId)}>
          <LinkIcon width={11} height={11} /> megnyitás
        </button>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "#9CA3AF" }}>
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

---

## 6. `src/components/NoteComposer.jsx` — új cetli felvétele, # hivatkozással

Ugyanaz a #-trigger minta, mint a `TeamChatPanel.jsx`-ben (71–74. sor `pickMention`, `mentionQuery` regex `text.match(/#(\S*)$/)`), csak itt van hozzá "Kinek" és "Mikorra" választó is:

```jsx
import { useState, useMemo } from "react";
import { searchMentions } from "../lib/mentions";
import { ServiceIcon, PhoneCaseIcon, PartsIcon, CustomersIcon, WarrantyIcon, CloseIcon } from "./icons";

const TYPE_ICON = { ticket: ServiceIcon, product: PhoneCaseIcon, part: PartsIcon, customer: CustomersIcon, warranty: WarrantyIcon };

export default function NoteComposer({ users, tickets, stock, parts, customersTable, warranties, locName, onSave }) {
  const [text, setText] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueScope, setDueScope] = useState("today");
  const [link, setLink] = useState(null);

  const mentionQuery = useMemo(() => { const m = text.match(/#(\S*)$/); return m ? m[1] : null; }, [text]);
  const mentionMatches = useMemo(
    () => (mentionQuery ? searchMentions(mentionQuery, { tickets, stock, parts, customersTable, warranties, locName }) : []),
    [mentionQuery, tickets, stock, parts, customersTable, warranties, locName]
  );
  function pickMention(m) { setText((t) => t.replace(/#(\S*)$/, "")); setLink({ type: m.type, id: m.id, label: m.label }); }

  function submit() {
    if (!text.trim()) return;
    onSave(text.trim(), { assignedTo: assignedTo || null, dueScope: dueScope || null, link });
    setText(""); setAssignedTo(""); setDueScope("today"); setLink(null);
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #EEF0F2", borderRadius: 14, padding: 12, marginBottom: 14 }}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Pl. hozz át 2 kijelzőt Szentgyörgyről... (# a munkalap/telefon/alkatrész/ügyfél/garancia hivatkozáshoz)"
        style={{ width: "100%", minHeight: 48, resize: "vertical", border: "none", outline: "none", fontFamily: "inherit", fontSize: 13 }} />
      {link && (() => { const LinkIcon = TYPE_ICON[link.type]; return (
        <div className="chat-link-preview"><LinkIcon width={12} height={12} /> {link.label}<button type="button" onClick={() => setLink(null)}><CloseIcon width={12} height={12} /></button></div>
      ); })()}
      {mentionMatches.length > 0 && (
        <div className="chat-mentions">
          {mentionMatches.map((m) => { const MIcon = TYPE_ICON[m.type]; return (
            <div key={m.type + m.id} className="chat-mention-item" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={() => pickMention(m)}>
              <MIcon width={12} height={12} /> {m.label}
            </div>
          ); })}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} style={{ fontSize: 12 }}>
          <option value="">Mindenkinek</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.fullName || u.email}</option>)}
        </select>
        <div className="seg">
          <button type="button" className={dueScope === "today" ? "active" : ""} onClick={() => setDueScope("today")}>Ma</button>
          <button type="button" className={dueScope === "week" ? "active" : ""} onClick={() => setDueScope("week")}>E héten</button>
          <button type="button" className={dueScope === "" ? "active" : ""} onClick={() => setDueScope("")}>Nincs határidő</button>
        </div>
        <button type="button" className="btn sm" style={{ marginLeft: "auto" }} onClick={submit}>Felírás</button>
      </div>
    </div>
  );
}
```

---

## 7. `src/components/WaitingList.jsx` — "Várakozik valamire"

Egyszerű állapot-lista, minden sor egy "→ következő állapot" gombbal lép tovább (`megrendelve → megerkezett → ertesitve → lezarva`):

```jsx
import { useState } from "react";
import { EmptyState } from "./EmptyState";
import { PartsIcon } from "./icons";

const STATUS_LABEL = { megrendelve: "Megrendelve", megerkezett: "Megérkezett", ertesitve: "Értesítve", lezarva: "Lezárva" };
const NEXT = { megrendelve: "megerkezett", megerkezett: "ertesitve", ertesitve: "lezarva" };
const NEXT_LABEL = { megrendelve: "Megérkezett", megerkezett: "Értesítettük", ertesitve: "Átadva / lezárva" };
const STATUS_CLS = { megrendelve: "st-alkatresz", megerkezett: "st-garancialis", ertesitve: "st-kesz" };

export default function WaitingList({ items, onAdd, onAdvance, onDelete }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [supplier, setSupplier] = useState("");

  function submit() {
    if (!description.trim()) return;
    onAdd({ description: description.trim(), customerName: customerName.trim() || null, supplier: supplier.trim() || null });
    setDescription(""); setCustomerName(""); setSupplier(""); setOpen(false);
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {items.length === 0 && !open ? <EmptyState icon={PartsIcon}>Nincs, amire várnánk.</EmptyState> : (
        <div className="tw" style={{ marginBottom: 10 }}>
          {items.map((w) => (
            <div key={w.id} className="dp-row" style={{ padding: "10px 14px" }}>
              <span className="dp-key">
                <span className={`st ${STATUS_CLS[w.status]}`} style={{ marginRight: 8 }}>{STATUS_LABEL[w.status]}</span>
                {w.description}{w.customerName ? ` — ${w.customerName}` : ""}{w.supplier ? ` (${w.supplier})` : ""}
              </span>
              <span style={{ display: "flex", gap: 6 }}>
                {NEXT[w.status] && <button type="button" className="btn sec sm" onClick={() => onAdvance(w.id, NEXT[w.status])}>{NEXT_LABEL[w.status]}</button>}
                <button type="button" className="iconbtn" onClick={() => onDelete(w.id)}>×</button>
              </span>
            </div>
          ))}
        </div>
      )}
      {open ? (
        <div className="row3" style={{ alignItems: "flex-end" }}>
          <div className="field" style={{ margin: 0 }}><label>Mit várunk</label><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Pl. roz tok Xiaomi Poco C65-höz" /></div>
          <div className="field" style={{ margin: 0 }}><label>Kinek (ha ügyfélnek)</label><input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Opcionális" /></div>
          <div className="field" style={{ margin: 0 }}><label>Forrás</label><input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="GSMnet, SEP..." /></div>
          <button type="button" className="btn sm" onClick={submit}>Felvétel</button>
          <button type="button" className="btn sec sm" onClick={() => setOpen(false)}>Mégse</button>
        </div>
      ) : (
        <button type="button" className="btn sec sm" onClick={() => setOpen(true)}>+ Várakozás felvétele</button>
      )}
    </div>
  );
}
```

---

## 8. `src/App.jsx` — state, adatbetöltés, CRUD

**a) Adatbetöltés** — a nagy `Promise.all` fetch-blokkba (kb. 160–178. sor) vedd fel a két új táblát:
```js
supabase.from("board_notes").select("*").order("created_at", { ascending: false }),
supabase.from("waiting_items").select("*").order("created_at", { ascending: false }),
```
majd a feldolgozásnál (kb. 179–204. sor) állítsd be az új state-eket (a mapper-fájlba is kell `noteFromApi`/`noteToApi`, `waitingFromApi`/`waitingToApi`, a meglévők mintájára — pl. `linked_ticket_id` → `linkedTicketId`, stb., ugyanúgy mint `internal_messages`-nél).

**b) CRUD handlerek:**
```js
async function addNote(body, { assignedTo, dueScope, link }) {
  await withBusy(async () => {
    const r = unwrap(await supabase.from("board_notes").insert({
      body, author_id: user.id, assigned_to_id: assignedTo, due_scope: dueScope || null,
      linked_ticket_id: link?.type === "ticket" ? link.id : null,
      linked_product_id: link?.type === "product" ? link.id : null,
      linked_part_id: link?.type === "part" ? link.id : null,
      linked_customer_id: link?.type === "customer" ? link.id : null,
      linked_warranty_id: link?.type === "warranty" ? link.id : null,
    }).select());
    setNotes([noteFromApi(r[0]), ...notes]);
  });
}
async function completeNote(id) {
  await withBusy(async () => {
    const r = unwrap(await supabase.from("board_notes").update({ status: "done", done_at: new Date().toISOString(), done_by: user.id }).eq("id", id).select());
    setNotes(notes.map((n) => (n.id === id ? noteFromApi(r[0]) : n)));
  });
}
async function reopenNote(id) {
  await withBusy(async () => {
    const r = unwrap(await supabase.from("board_notes").update({ status: "open", done_at: null, done_by: null }).eq("id", id).select());
    setNotes(notes.map((n) => (n.id === id ? noteFromApi(r[0]) : n)));
  });
}
async function deleteNote(id) {
  await withBusy(async () => { unwrap(await supabase.from("board_notes").delete().eq("id", id)); setNotes(notes.filter((n) => n.id !== id)); });
}

async function addWaitingItem(data) {
  await withBusy(async () => {
    const r = unwrap(await supabase.from("waiting_items").insert({
      description: data.description, customer_name: data.customerName, supplier: data.supplier,
      location_id: defaultLocId, created_by: user.id,
    }).select());
    setWaitingItems([waitingFromApi(r[0]), ...waitingItems]);
  });
}
async function advanceWaiting(id, nextStatus) {
  await withBusy(async () => {
    const r = unwrap(await supabase.from("waiting_items").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", id).select());
    setWaitingItems(waitingItems.map((w) => (w.id === id ? waitingFromApi(r[0]) : w)));
  });
}
async function deleteWaitingItem(id) {
  await withBusy(async () => { unwrap(await supabase.from("waiting_items").delete().eq("id", id)); setWaitingItems(waitingItems.filter((w) => w.id !== id)); });
}
```

**c) Render** — a `tab === "pult"` esetén a `<PultTab>`-ot rendereld, minden szükséges propot átadva (lásd 4. pont signature-je) — a `filteredTickets`, `stock`, `parts`, `customersTable`, `warranties`, `users`, `locName` mind már léteznek az App.jsx-ben, csak át kell adni.

---

## 9. Összekötés a PDF-rendelés-felvétellel

**`src/components/PdfOrderImportModal.jsx`** (a nemrég megbeszélt `TASKS_ALKATRESZ_PDF_RENDELES.md` specből) — minden sorhoz vegyél fel egy opcionális "Kinek várjuk" mezőt:
```jsx
<td><input value={r.waitingFor || ""} onChange={(e) => updateRow(i, { waitingFor: e.target.value })} placeholder="Ha ügyfélnek várjuk" style={{ width: 90, fontSize: 11 }} /></td>
```
(Új oszlop a táblázatban, a "Sor össz." mellé.)

**`src/App.jsx` — `importPdfOrder`**: ha egy sornak van `waitingFor` értéke, a tétel felvétele után hozz létre hozzá egy `waiting_items` sort is, rögtön `megerkezett` státusszal (a PDF-import maga a "megérkezett" esemény — a rendelés-felvétel pillanatában a csomag már megvan):
```js
if (row.waitingFor) {
  await addWaitingItemAt("megerkezett", { description: row.name, customerName: row.waitingFor, supplier, location_id: locId });
}
```
(`addWaitingItemAt` egy kis variánsa a 8b. pont `addWaitingItem`-jének, ami state-et is kap paraméterként — vagy egyszerűbben: bővítsd magát az `addWaitingItem`-et egy opcionális `status` paraméterrel, alapból `"megrendelve"`.)

Ezzel a "Várakozik valamire" lista rögtön "Megérkezett" jelvénnyel mutatja majd, hogy X ügyfelet értesíteni kell — pontosan ez a kapocs, amit kértél a PDF-rendelés és a Pult között.

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes, migráció lefut
- Bejelentkezés után mindenki (admin és alkalmazott is) a Pult fülre érkezik
- "Ma ígért munkák" a mai `dueDate`/`handoverDate`-tel rendelkező, még nem átadott munkalapokat mutatja, kattintásra megnyílik a munkalap
- Cetli felvehető, # hivatkozással kereshető munkalapra/telefonra/alkatrészre/ügyfélre/garanciára, "Kész"-re kattintva eltűnik a nyitottak közül, de megjelenik az "Elintézett cetlik" előzményben, "Visszavon"-nal visszanyitható
- "Várakozik valamire" tétel felvehető kézzel, "→" gombbal léptethető Megrendelve → Megérkezett → Értesítve → Lezárva között, a lezártak az előzménybe kerülnek
- PDF-rendelés felvételekor, ha egy sorhoz "Kinek várjuk" van megadva, a Rögzítés után a Pulton azonnal megjelenik egy "Megérkezett" állapotú várakozás-tétel
- Más fülön semmi nem változott, a TeamChatPanel mention-keresése ugyanúgy működik, mint eddig (csak a kód forrása lett közös)
- Nincs `git push`, csak lokális commit
