import { useState, useRef, useEffect } from "react";
import { EmptyState } from "./EmptyState";
import { PartsIcon, UserIcon, EditIcon, CheckIcon, CloseIcon } from "./icons";

const STATUS_LABEL = { megrendelve: "Megrendelve", megerkezett: "Megérkezett", ertesitve: "Értesítve", lezarva: "Lezárva" };
const STATUS_COLOR = { megrendelve: "blue", megerkezett: "purple", ertesitve: "green", lezarva: "grey" };
const STATUS_ORDER = ["megrendelve", "megerkezett", "ertesitve", "lezarva"];

function ChevronIcon(props) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m6 9 6 6 6-6" /></svg>;
}

// Egy kattintható státusz-pirula (pötty + szöveg + nyílhegy) a régi jelvény+"előreléptető
// gomb" páros helyett — a jelenlegi állapotot mutatja, kattintásra bármelyik másik státuszra
// közvetlenül átválthat, nem csak a soron következőre.
function StatusPill({ status, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="wl-status-wrap" ref={ref}>
      <button type="button" className={`wl-status-pill ${STATUS_COLOR[status]}`} disabled={disabled} onClick={() => setOpen((v) => !v)}>
        <span className="dot" />{STATUS_LABEL[status]}
        <ChevronIcon width={12} height={12} />
      </button>
      {open && (
        <div className="wl-status-menu">
          {STATUS_ORDER.map((s) => (
            <div
              key={s}
              className={`wl-status-opt${s === status ? " current" : ""}`}
              onClick={() => { setOpen(false); if (s !== status) onChange(s); }}
            >
              <span className="dot" style={{ background: `var(--wl-${STATUS_COLOR[s]}-dot)` }} />{STATUS_LABEL[s]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Kis kattintható jelvény a megrendelő nevének/telefonszámának megnézésére —
// csak akkor jelenik meg, ha a tételhez van rögzítve ilyen adat.
function CustomerInfo({ name, phone }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="wl-cust-wrap" ref={ref}>
      <button type="button" className="wl-cust-btn" onClick={() => setOpen((v) => !v)} title="Megrendelő">
        <UserIcon width={13} height={13} />
      </button>
      {open && (
        <div className="wl-cust-pop">
          {name && <div className="wl-cust-name">{name}</div>}
          {phone && <div className="wl-cust-phone">{phone}</div>}
        </div>
      )}
    </div>
  );
}

function ClosedPopover({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="wl-closed-wrap" ref={ref}>
      <button type="button" className="wl-kebab" title="Lezárt rendelések" onClick={() => setOpen((v) => !v)}>
        <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
      </button>
      {open && (
        <div className="wl-closed-pop">
          <div className="h">Lezárt rendelések</div>
          {items.length === 0 ? (
            <div className="wl-closed-empty">Nincs még lezárt tétel.</div>
          ) : items.map((w) => (
            <div key={w.id} className="wl-closed-row">
              <span>{w.description}</span>
              <span>{w.supplier || "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WaitingRow({ w, onAdvance, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(w.description);
  const [supplier, setSupplier] = useState(w.supplier || "");
  const [customerName, setCustomerName] = useState(w.customerName || "");
  const [customerPhone, setCustomerPhone] = useState(w.customerPhone || "");

  function startEdit() {
    setDesc(w.description); setSupplier(w.supplier || "");
    setCustomerName(w.customerName || ""); setCustomerPhone(w.customerPhone || "");
    setEditing(true);
  }
  function save() {
    const trimmed = desc.trim();
    if (trimmed) onUpdate?.(w.id, { description: trimmed, supplier: supplier.trim(), customerName: customerName.trim(), customerPhone: customerPhone.trim() });
    setEditing(false);
  }
  function cancel() {
    setDesc(w.description); setSupplier(w.supplier || "");
    setCustomerName(w.customerName || ""); setCustomerPhone(w.customerPhone || "");
    setEditing(false);
  }
  const onEnterKey = (e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); };

  if (editing) {
    return (
      <div className="wl-row wl-row-edit">
        <div className="wl-edit-fields">
          <input className="wl-edit-input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Mit várunk" autoFocus onKeyDown={onEnterKey} />
          <div className="wl-edit-line2">
            <input className="wl-edit-input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Kinek (név)" onKeyDown={onEnterKey} />
            <input className="wl-edit-input" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Telefonszám" onKeyDown={onEnterKey} />
            <input className="wl-edit-input wl-edit-supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Forrás" onKeyDown={onEnterKey} />
          </div>
        </div>
        <div className="wl-edit-actions">
          <button type="button" className="wl-row-btn" title="Mentés" onClick={save}><CheckIcon width={13} height={13} strokeWidth={2.4} /></button>
          <button type="button" className="wl-row-btn" title="Mégse" onClick={cancel}><CloseIcon width={13} height={13} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="wl-row">
      <span className="wl-text">
        {w.description}{w.supplier ? <span className="wl-supplier"> ({w.supplier})</span> : ""}
      </span>
      {onUpdate && <button type="button" className="wl-row-btn" title="Szerkesztés" onClick={startEdit}><EditIcon width={12} height={12} /></button>}
      {(w.customerName || w.customerPhone) && <CustomerInfo name={w.customerName} phone={w.customerPhone} />}
      <StatusPill status={w.status} onChange={(s) => onAdvance(w.id, s)} disabled={false} />
    </div>
  );
}

export default function WaitingList({ items, closedItems = [], onAdd, onAdvance, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [supplier, setSupplier] = useState("");

  function submit() {
    if (!description.trim()) return;
    onAdd({
      description: description.trim(),
      customerName: null,
      customerPhone: customerPhone.trim() || null,
      customerId: null,
      supplier: supplier.trim() || null,
    });
    setDescription(""); setCustomerPhone(""); setSupplier(""); setOpen(false);
  }

  return (
    <div style={{ marginBottom: 0 }}>
      {items.length === 0 && !open ? <EmptyState icon={PartsIcon}>Nincs, amire várnánk.</EmptyState> : (
        <div className="wl-list" style={{ marginBottom: 10 }}>
          {items.map((w) => (
            <WaitingRow key={w.id} w={w} onAdvance={onAdvance} onUpdate={onUpdate} />
          ))}
        </div>
      )}
      {open ? (
        <div>
          <div className="field" style={{ margin: "0 0 10px" }}><label>Mit várunk</label><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Pl. roz tok Xiaomi Poco C65-höz" autoFocus /></div>
          <div className="row2">
            <div className="field" style={{ margin: 0 }}><label>Telefonszám</label><input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="07xx xxx xxx" /></div>
            <div className="field" style={{ margin: 0 }}><label>Forrás</label><input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="GSMnet, SEP..." /></div>
          </div>
          {customerPhone.trim() && (
            <div className="login-note" style={{ margin: "8px 0 0", textAlign: "left" }}>
              Ha ez a telefonszám még nincs a Kliensek közt, felvételre kerül.
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn sec sm" onClick={() => setOpen(false)}>Mégse</button>
            <button type="button" className="btn sm" onClick={submit}>Rendelés</button>
          </div>
        </div>
      ) : (
        <div className="wl-foot">
          <ClosedPopover items={closedItems} />
          <button type="button" className="btn sm" onClick={() => setOpen(true)}>+ Rendelés</button>
        </div>
      )}
    </div>
  );
}
