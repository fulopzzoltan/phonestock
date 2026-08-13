# TASKS — Garancia fül átépítése (szerkesztés, törlés, jobb oldali panel, nyomtatás, manuális felvétel, típus-szűrő)

**Kontextus:** a jelenlegi "Garanciális" fül (`src/App.jsx`, `activeWarranties` useMemo, ~690–704. sor, render ~1050–1093. sor) egy **levezetett** lista: nincs saját tábla mögötte, hanem a `transactions` (eladás, `category='Készlet'`) és a `service_tickets` (`sub_status='Átadva'`) sorokból áll össze minden alkalommal, ahol van kitöltött `warranty` mező és az még aktív.

Ez a feladat 5 dolgot vezet be:
1. A fül átnevezése **"Garancia"**-ra (a "Garanciális" helyett).
2. Szűrés **Mind / Telefon garancia / Szerviz garancia** között.
3. Sorra kattintva **jobb oldali detail panel** nyílik (a meglévő `DetailPanel.jsx`/`CustomerDetailPanel.jsx` minta szerint).
4. A panelból **szerkesztés**, **törlés** és **nyomtatás**.
5. **Manuális garancia-felvétel** — olyan garancia, ami nem egy eladáshoz vagy szerviz-munkalaphoz kötött (pl. utólag vállalt garancia, vagy egy régi/papíralapú eset utólagos rögzítése).

**Fontos architekturális döntés:** az eladáshoz/szervizhez **kötött** garanciák (`kind: "sale"` / `"service"`) NEM önálló rekordok — ezeknél a "szerkesztés" a mögöttes `transactions.warranty`/`service_tickets.warranty` mező módosítását jelenti, a "törlés" pedig **kizárólag a garancia mező törlését**, NEM magának az eladásnak/munkalapnak a törlését. Ez kritikus — a UI szövegezésben és a confirm dialógusban is egyértelművé kell tenni, nehogy valaki véletlenül egy egész eladást/munkalapot töröljön, mikor csak a garanciát akarja visszavonni.

A manuálisan felvitt garanciákhoz viszont kell egy önálló tábla (`warranties`), mert azoknak nincs mögöttes eladás/munkalap rekordja.

Ne pusholj / ne deployolj, csak lokális commit, amíg nem szólnak.

---

## 1. DB migráció — `warranties` tábla (csak a manuális tételekhez)

```sql
create table public.warranties (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('sale', 'service')), -- "Telefon garancia" vagy "Szerviz garancia" csoport
  customer_name text not null,
  customer_phone text,
  label text not null, -- pl. "iPhone 12 128GB" vagy "Kijelzőcsere"
  warranty text not null, -- WARRANTIES egyike, pl. "6 hó"
  from_date date not null,
  location_id uuid references public.locations(id),
  note text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

alter table public.warranties enable row level security;

create policy warranties_select on public.warranties for select to authenticated
  using (public."current_role"() = 'admin' or location_id = public.current_location_id());
create policy warranties_insert on public.warranties for insert to authenticated
  with check (public."current_role"() = 'admin' or location_id = public.current_location_id());
create policy warranties_update on public.warranties for update to authenticated
  using (public."current_role"() = 'admin' or location_id = public.current_location_id());
```

Használd `apply_migration`-t. Ez pontosan a meglévő location-scope mintát követi (ld. `products`/`transactions` RLS).

---

## 2. Mapper

**Fájl:** `src/lib/mappers.js`:
```js
export const warrantyFromApi = (r) => ({
  id: r.id, kind: r.kind, customerName: r.customer_name, customerPhone: r.customer_phone || "",
  label: r.label, warranty: r.warranty, fromDate: r.from_date, locationId: r.location_id,
  note: r.note || "", createdAt: r.created_at,
});
export const warrantyToApi = (w, locId) => ({
  kind: w.kind, customer_name: w.customerName, customer_phone: w.customerPhone || null,
  label: w.label, warranty: w.warranty, from_date: w.fromDate, location_id: locId, note: w.note || null,
});
```

---

## 3. Adatbetöltés + `activeWarranties` bővítése

**Fájl:** `src/App.jsx`.

3a. Új state + betöltés a meglévő `loadAll()`-ban, a többi tábla mintájára: `warranties` (csak `deleted_at is null` sorok).

3b. Bővítsd az `activeWarranties` useMemo-t (jelenleg ~690–704. sor) egy harmadik forrással:
```js
const activeWarranties = useMemo(() => {
  const saleItems = transactions
    .filter((t) => t.category === "Készlet" && t.warranty && isWarrantyActive(t.date, t.warranty))
    .map((t) => ({
      key: `sale-${t.id}`, kind: "sale", source: "linked", refId: t.id,
      customerName: t.customerName, customerPhone: t.customerPhone,
      label: t.description, warranty: t.warranty, from: t.date, expiry: warrantyExpiry(t.date, t.warranty), locationId: t.locationId,
    }));
  const serviceItems = tickets
    .filter((t) => t.subStatus === "Átadva" && t.warranty && isWarrantyActive(t.dateOut, t.warranty))
    .map((t) => ({
      key: `svc-${t.id}`, kind: "service", source: "linked", refId: t.id,
      customerName: t.customerName, customerPhone: t.customerPhone,
      label: [t.brand, t.model].filter(Boolean).join(" "), warranty: t.warranty, from: t.dateOut, expiry: warrantyExpiry(t.dateOut, t.warranty), locationId: t.locationId,
    }));
  const manualItems = warranties
    .filter((w) => isWarrantyActive(w.fromDate, w.warranty))
    .map((w) => ({
      key: `manual-${w.id}`, kind: w.kind, source: "manual", refId: w.id,
      customerName: w.customerName, customerPhone: w.customerPhone,
      label: w.label, warranty: w.warranty, from: w.fromDate, expiry: warrantyExpiry(w.fromDate, w.warranty), locationId: w.locationId,
      note: w.note,
    }));
  return [...saleItems, ...serviceItems, ...manualItems].sort((a, b) => (a.expiry || "").localeCompare(b.expiry || ""));
}, [transactions, tickets, warranties]);
```
A `source: "linked" | "manual"` mező mondja meg a UI-nak, hogy a szerkesztés/törlés melyik útvonalon menjen. A `kind: "sale" | "service"` mező (amit a manuális tételnél is fel kell venni létrehozáskor) szolgál a "Telefon garancia" / "Szerviz garancia" szűréshez — így a szűrő egységesen működik, függetlenül attól, hogy kötött vagy manuális a tétel.

---

## 4. CRUD függvények

**Fájl:** `src/App.jsx`, a többi CRUD függvény mellé:

```js
// Manuális garancia felvétele
async function addWarranty(data, locId) {
  await withBusy(async () => {
    const r = unwrap(await supabase.from("warranties").insert(warrantyToApi(data, locId)).select());
    setWarranties([...warranties, warrantyFromApi(r[0])]);
    setWarrantyModal(null);
  });
}
// Manuális garancia szerkesztése (minden mező)
async function editWarranty(id, data, locId) {
  await withBusy(async () => {
    const r = unwrap(await supabase.from("warranties").update(warrantyToApi(data, locId)).eq("id", id).select());
    setWarranties(warranties.map((w) => (w.id === id ? warrantyFromApi(r[0]) : w)));
    setWarrantyModal(null);
  });
}
// Manuális garancia törlése (soft delete, a meglévő minta szerint)
async function deleteWarranty(id) {
  await withBusy(async () => {
    unwrap(await supabase.from("warranties").update({ deleted_at: new Date().toISOString() }).eq("id", id));
    setWarranties(warranties.filter((w) => w.id !== id));
  });
}

// Kötött garancia (eladás/szerviz) szerkesztése — CSAK a warranty + from dátum mezőt módosítja,
// a mögöttes eladást/munkalapot semmi mást nem érinti.
async function editLinkedWarranty(kind, refId, warranty, fromDate) {
  await withBusy(async () => {
    if (kind === "sale") {
      unwrap(await supabase.from("transactions").update({ warranty, date: fromDate }).eq("id", refId));
      setTransactions(transactions.map((t) => (t.id === refId ? { ...t, warranty, date: fromDate } : t)));
    } else {
      unwrap(await supabase.from("service_tickets").update({ warranty, date_out: fromDate }).eq("id", refId));
      setTickets(tickets.map((t) => (t.id === refId ? { ...t, warranty, dateOut: fromDate } : t)));
    }
  });
}
// Kötött garancia törlése — CSAK a warranty mezőt üríti ki, a rekordot nem törli.
async function clearLinkedWarranty(kind, refId) {
  await withBusy(async () => {
    if (kind === "sale") {
      unwrap(await supabase.from("transactions").update({ warranty: null }).eq("id", refId));
      setTransactions(transactions.map((t) => (t.id === refId ? { ...t, warranty: null } : t)));
    } else {
      unwrap(await supabase.from("service_tickets").update({ warranty: null }).eq("id", refId));
      setTickets(tickets.map((t) => (t.id === refId ? { ...t, warranty: null } : t)));
    }
  });
}
```

**Figyelem:** ne a meglévő `editTransaction`/`saveTicketEdit` függvényeket használd ehhez — azok a teljes `txToApi`/`tToApi` mappert hívják, ami a teljes rekordot várja el, itt viszont szándékosan csak egyetlen mezőt (+ dátumot) módosítunk közvetlenül, hogy ne kelljen az egész eladás/munkalap objektumot újra összeállítani egy garancia-szerkesztéshez.

Új state-ek: `warranties` (lista), `warrantyModal` (null / "add" / a szerkesztett manuális objektum), `warrantyDetailKey` (a jobb panelhez, a `w.key` értékét tárolja), `warrantyFilter` ("all" / "sale" / "service").

---

## 5. Fül átnevezése + navigáció

**Fájl:** `src/App.jsx`.
- ~735. sor: `<button className={\`navbtn ${tab === "warranty" ? "active" : ""}\`} onClick={() => setTab("warranty")}><WarrantyIcon className="nav-ic" />Garanciális</button>` → cseréld **"Garancia"**-ra.
- ~1053. sor: `<div className="page-title">Garanciális</div>` → **"Garancia"**. A `page-sub` maradhat, vagy frissítsd: "Aktív garanciák — telefon és szerviz, kézzel is felvehető".

---

## 6. UI — típus-szűrő + "Garancia felvétele" gomb

**Fájl:** `src/App.jsx`, a `tab === "warranty"` blokk (~1050–1093. sor).

```jsx
<div className="topbar">
  <div><div className="page-title">Garancia</div><div className="page-sub">Aktív garanciák — telefon és szerviz, kézzel is felvehető</div></div>
  <button className="btn" disabled={busy} onClick={() => setWarrantyModal("add")}>+ Garancia felvétele</button>
</div>
<div className="statrow c1">
  <div className="statcard accent"><div className="lbl">Aktív garancia</div><div className="val">{activeWarranties.length} db</div></div>
</div>
<div style={{ display: "flex", gap: 8, margin: "0 0 14px 2px" }}>
  {[["all", "Mind"], ["sale", "Telefon garancia"], ["service", "Szerviz garancia"]].map(([key, label]) => (
    <button key={key} type="button"
      className={`btn sec sm${warrantyFilter === key ? " active" : ""}`}
      style={warrantyFilter === key ? { background: "#111827", color: "#fff", borderColor: "#111827" } : undefined}
      onClick={() => setWarrantyFilter(key)}>{label}</button>
  ))}
</div>
```

A táblázat forrása a szűrt lista legyen:
```js
const filteredWarranties = warrantyFilter === "all" ? activeWarranties : activeWarranties.filter((w) => w.kind === warrantyFilter);
```
(a `loadingData ? ... : filteredWarranties.length === 0 ? ... : ...` és a `.map` innentől `filteredWarranties`-t használja, nem `activeWarranties`-t).

A táblázat sorai kattinthatóvá válnak (`cursor: "pointer"`, `onClick={() => setWarrantyDetailKey(w.key)}`), a sorban lévő gombok (`CallLink`, "Emlékeztető SMS") pedig `onClick`-jében `e.stopPropagation()` kell, hogy ne nyissák meg a panelt kattintáskor.

---

## 7. Jobb oldali panel — `WarrantyDetailPanel.jsx`

**Új fájl:** `src/components/WarrantyDetailPanel.jsx`, a `DetailPanel.jsx`/`CustomerDetailPanel.jsx` pontos mintájára (`.detail-overlay` / `.detail-panel` / `.dp-head` / `.dp-body` / `.dp-section` / `.dp-actions`, `<Row k=... v=... />` a `DetailRow`-ból, `CallLink`, `ConfirmDelete`).

```jsx
import { useState } from "react";
import { WARRANTIES, warrantyExpiry, isWarrantyActive, today } from "../lib/utils";
import { CloseIcon } from "./icons";
import Row from "./DetailRow";
import CallLink from "./CallLink";
import ConfirmDelete from "./ConfirmDelete";

export default function WarrantyDetailPanel({ w, locName, onClose, onPrint, onEditLinked, onEditManual, onDeleteLinked, onDeleteManual, busy }) {
  const [editing, setEditing] = useState(false);
  const [warranty, setWarranty] = useState(w.warranty);
  const [fromDate, setFromDate] = useState(w.from);
  const daysLeft = w.expiry ? Math.ceil((new Date(w.expiry) - new Date(today())) / 86400000) : null;

  return (
    <div className="detail-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="detail-panel">
        <div className="dp-head">
          <div>
            <div className="dp-sn">{w.kind === "sale" ? "Telefon garancia" : "Szerviz garancia"}{w.source === "manual" ? " · kézi" : ""}</div>
            <div className="dp-name">{w.customerName} — {w.label}</div>
          </div>
          <button className="iconbtn" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="dp-body">
          <div className="dp-section">
            <div className="dp-section-title">Ügyfél</div>
            <Row k="Név" v={w.customerName || "—"} />
            <Row k="Telefonszám" v={w.customerPhone ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>{w.customerPhone}<CallLink phone={w.customerPhone} /></span>
            ) : "—"} />
            <Row k="Helyszín" v={locName(w.locationId)} />
          </div>
          <div className="dp-section">
            <div className="dp-section-title">Garancia</div>
            {!editing ? (
              <>
                <Row k="Termék / Eszköz" v={w.label} />
                <Row k="Garanciaidő" v={<span className="gar-pill">{w.warranty}</span>} />
                <Row k="Kezdete" v={w.from} />
                <Row k="Lejárat" v={<span style={{ fontWeight: 700, color: daysLeft != null && daysLeft <= 14 ? "#DC2626" : "#111827" }}>
                  {w.expiry} {daysLeft != null && <span style={{ fontWeight: 500, color: "#9CA3AF" }}>({daysLeft} nap)</span>}
                </span>} />
                {w.note && <Row k="Jegyzet" v={w.note} />}
              </>
            ) : (
              <div className="row2" style={{ alignItems: "flex-end" }}>
                <div className="field" style={{ margin: 0 }}>
                  <label>Garanciaidő</label>
                  <select value={warranty} onChange={(e) => setWarranty(e.target.value)}>
                    {WARRANTIES.map((wr) => <option key={wr} value={wr}>{wr}</option>)}
                  </select>
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>Kezdete</label>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="dp-actions">
          <button className="btn sec sm" onClick={() => onPrint(w)}>Nyomtatás</button>
          {editing ? (
            <>
              <button className="btn sm" disabled={busy} onClick={() => { onEditLinked(w.kind, w.refId, warranty, fromDate); setEditing(false); }}>Mentés</button>
              <button className="btn sec sm" onClick={() => setEditing(false)}>Mégse</button>
            </>
          ) : w.source === "manual" ? (
            <button className="btn sec sm" disabled={busy} onClick={() => onEditManual(w)}>Szerkesztés</button>
          ) : (
            <button className="btn sec sm" disabled={busy} onClick={() => setEditing(true)}>Szerkesztés</button>
          )}
          {w.source === "manual" ? (
            <ConfirmDelete variant="full" disabled={busy} onConfirm={() => onDeleteManual(w.refId)} />
          ) : (
            <ConfirmDelete variant="full" disabled={busy} onConfirm={() => onDeleteLinked(w.kind, w.refId)} />
          )}
        </div>
      </div>
    </div>
  );
}
```

**Fontos UX-részlet:** a kötött (`source === "linked"`) tételek törlés-gombjánál (`ConfirmDelete`) a megjelenő szövegnek egyértelműnek kell lennie, hogy csak a garanciát törli. Nézd meg a `ConfirmDelete.jsx`-t — ha van rá mód egyedi megerősítő szöveget adni, használd ("Biztosan törlöd a garanciát? Az eladás/munkalap megmarad."), ha nincs ilyen prop, adj hozzá egyet (`confirmLabel` vagy hasonló), mert ez a különbség a félreértés elkerülése miatt kritikus.

**Renderelés `App.jsx`-ben**, a warranty tab blokk után:
```jsx
{warrantyDetailKey && (() => {
  const w = activeWarranties.find((x) => x.key === warrantyDetailKey);
  if (!w) return null;
  return (
    <WarrantyDetailPanel
      w={w} locName={locName} busy={busy}
      onClose={() => setWarrantyDetailKey(null)}
      onPrint={(w) => printWarrantySlip(w)}
      onEditLinked={editLinkedWarranty}
      onEditManual={(w) => { setWarrantyModal(warranties.find((x) => x.id === w.refId)); setWarrantyDetailKey(null); }}
      onDeleteLinked={(kind, refId) => { clearLinkedWarranty(kind, refId); setWarrantyDetailKey(null); }}
      onDeleteManual={(id) => { deleteWarranty(id); setWarrantyDetailKey(null); }}
    />
  );
})()}
```

---

## 8. Manuális felvétel/szerkesztés modal — `WarrantyModal.jsx`

**Új fájl:** `src/components/WarrantyModal.jsx`, a meglévő modalok mintájára (pl. `PartModal.jsx` szerkezete: overlay + form + mezők + submit).

Mezők: `kind` (select: "Telefon garancia" `sale` / "Szerviz garancia" `service`), `customerName` (kötelező), `customerPhone`, `label` (kötelező, pl. "iPhone 12 128GB" vagy "Kijelzőcsere"), `warranty` (select `WARRANTIES`-ból, kötelező), `fromDate` (dátum input, alapérték `today()`), `locationId` (select `allowedLocations`-ból), `note` (textarea, opcionális).

Submitkor: ha `warrantyModal === "add"` → `addWarranty(data, locId)`; ha egy meglévő objektum (szerkesztés) → `editWarranty(warrantyModal.id, data, locId)`.

Renderelés `App.jsx`-ben, a többi modal mellé:
```jsx
{warrantyModal && (
  <WarrantyModal
    initial={warrantyModal === "add" ? null : warrantyModal}
    locations={allowedLocations} busy={busy}
    onClose={() => setWarrantyModal(null)}
    onSubmit={(data, locId) => warrantyModal === "add" ? addWarranty(data, locId) : editWarranty(warrantyModal.id, data, locId)}
  />
)}
```

---

## 9. Nyomtatás manuális tételekhez — `PrintWarrantySlip.jsx`

A kötött tételeknél a nyomtatás a **meglévő** mechanizmust használja: `kind === "sale"` → `printReceiptSlip(transactions.find(t => t.id === w.refId))`, `kind === "service"` → `printTicketSlip(tickets.find(t => t.id === w.refId))`. Ehhez semmi új nem kell.

Manuális tételekhez viszont nincs mögöttes eladás/munkalap, tehát kell egy harmadik nyomtatható sablon, **pontosan a `PrintReceiptSlip.jsx`/`PrintSlip.jsx` vizuális mintáját követve** (fejléc TELEFONOS logó + `location.phone`, táblázatos sorok, `SERVICE_WARRANTY_TERMS` a garanciaszöveghez — **ne találj ki új garanciaszöveget**, a meglévő `SERVICE_WARRANTY_TERMS`-t használd, ugyanúgy ahogy a `PrintSlip.jsx` teszi).

**Új fájl:** `src/components/PrintWarrantySlip.jsx`:
```jsx
import { warrantyExpiry, isWarrantyActive, SERVICE_WARRANTY_TERMS } from "../lib/utils";

export default function PrintWarrantySlip({ w, location }) {
  const expiry = warrantyExpiry(w.from, w.warranty);
  const active = isWarrantyActive(w.from, w.warranty);
  const row = (k, v) => (
    <tr>
      <td style={{ padding: "6px 0", fontWeight: 700, textAlign: "right", width: "38%", verticalAlign: "top" }}>{k}</td>
      <td style={{ padding: "6px 0 6px 14px", verticalAlign: "top" }}>{v}</td>
    </tr>
  );
  return (
    <div style={{ fontFamily: "Inter, sans-serif", color: "#111827", padding: "30px 36px", maxWidth: 760 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 26 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>TELEF<span style={{ color: "#22C55E" }}>O</span>NOS</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{location?.phone || ""}</div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, textAlign: "center" }}>Garancialevél</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#6B7280" }}>{w.kind === "sale" ? "Telefon garancia" : "Szerviz garancia"}</div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 24 }}>
        <tbody>
          {row("Ügyfél", w.customerName || "—")}
          {row("Elérhetőség", w.customerPhone || "—")}
          {row("Helyszín", location?.name || "—")}
          {row("Termék / Eszköz", w.label)}
          {row("Kezdete", w.from)}
          {row("Garanciaidő", `${w.warranty} (${active ? "érvényes" : "lejárt"} ${expiry}-ig)`)}
        </tbody>
      </table>
      <div style={{ fontSize: 10.5, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-line", borderTop: "1px solid #E5E7EB", paddingTop: 16 }}>
        {SERVICE_WARRANTY_TERMS}
      </div>
    </div>
  );
}
```

**`App.jsx` bekötés**, a meglévő print state-ek mellé (~89–107. sor):
```js
const [printWarranty, setPrintWarranty] = useState(null);
function printWarrantySlip(w) {
  if (w.source === "linked") {
    if (w.kind === "sale") { printReceiptSlip(transactions.find((t) => t.id === w.refId)); return; }
    printTicketSlip(tickets.find((t) => t.id === w.refId)); return;
  }
  setPrintWarranty(w);
  requestAnimationFrame(() => window.print());
}
```
És a `#print-slip-root` blokkban:
```jsx
<div id="print-slip-root">
  {printTicket && <PrintSlip ticket={printTicket} location={locations.find((l) => l.id === printTicket.locationId)} />}
  {printReceipt && <PrintReceiptSlip tx={printReceipt} location={locations.find((l) => l.id === printReceipt.locationId)} />}
  {printWarranty && <PrintWarrantySlip w={printWarranty} location={locations.find((l) => l.id === printWarranty.locationId)} />}
</div>
```

---

## Ellenőrzőlista implementálás után

- A nav-ban és az oldal fejlécében "Garancia" szerepel ("Garanciális" helyett)
- A Mind / Telefon garancia / Szerviz garancia szűrő helyesen szűr, és a kötött + kézi tételekre egyaránt vonatkozik
- "+ Garancia felvétele" gombbal fel lehet venni egy önálló, semmilyen eladáshoz/munkalaphoz nem kötött garanciát
- Sorra kattintva megnyílik a jobb oldali panel a helyes adatokkal
- Kötött (eladás/szerviz) tételnél a "Törlés" **csak a garancia mezőt üríti**, az eladás/munkalap a Bevételek/Szerviz fülön változatlanul megmarad
- Kötött tételnél a "Szerkesztés" elmenti az új garanciaidőt/kezdő dátumot, és ez a Bevételek/Szerviz fülön is látszik utána
- Manuális tételnél a "Szerkesztés" minden mezőt módosíthatóvá tesz, a "Törlés" pedig soft-delete (a `warranties` tábla sora `deleted_at`-tel jelölődik, nem tűnik el nyomtalanul)
- A Nyomtatás gomb kötött tételnél a meglévő bizonylat/munkalap nyomtatást hívja (ugyanaz, mint eddig a Bevételeknél/Szerviznél), manuális tételnél az új `PrintWarrantySlip`-et, és mindkettő a valódi `SERVICE_WARRANTY_TERMS` szöveget mutatja, nem kitaláltat
- RLS teszt: nem-admin employee csak a saját helyszínéhez tartozó manuális garanciákat lássa/vegye fel (próbáld meg a másik helyszín `location_id`-jével beküldeni — utasítsa el)
