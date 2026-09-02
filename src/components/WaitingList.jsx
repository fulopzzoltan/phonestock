import { useState } from "react";
import { EmptyState } from "./EmptyState";
import { PartsIcon } from "./icons";
import CustomerAutocomplete from "./CustomerAutocomplete";

const STATUS_LABEL = { megrendelve: "Megrendelve", megerkezett: "Megérkezett", ertesitve: "Értesítve", lezarva: "Lezárva" };
const NEXT = { megrendelve: "megerkezett", megerkezett: "ertesitve", ertesitve: "lezarva" };
const NEXT_LABEL = { megrendelve: "Megérkezett", megerkezett: "Értesítettük", ertesitve: "Átadva / lezárva" };
const STATUS_CLS = { megrendelve: "st-alkatresz", megerkezett: "st-garancialis", ertesitve: "st-kesz" };

export default function WaitingList({ items, customers = [], onAdd, onAdvance, onDelete }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerId, setCustomerId] = useState(null);
  const [supplier, setSupplier] = useState("");

  function submit() {
    if (!description.trim()) return;
    onAdd({
      description: description.trim(),
      customerName: customerName.trim() || null,
      customerPhone: customerPhone.trim() || null,
      customerId,
      supplier: supplier.trim() || null,
    });
    setDescription(""); setCustomerName(""); setCustomerPhone(""); setCustomerId(null); setSupplier(""); setOpen(false);
  }

  return (
    <div style={{ marginBottom: 0 }}>
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
        <div>
          <div className="field" style={{ margin: "0 0 10px" }}><label>Mit várunk</label><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Pl. roz tok Xiaomi Poco C65-höz" autoFocus /></div>
          <div className="row3" style={{ alignItems: "flex-end" }}>
            <div className="field" style={{ margin: 0 }}><label>Kinek (ha ügyfélnek)</label>
              <CustomerAutocomplete
                customers={customers}
                name={customerName}
                onChangeName={(name) => { setCustomerName(name); setCustomerId(null); }}
                onSelect={(c) => { setCustomerName(c.name); setCustomerPhone(c.phone || customerPhone); setCustomerId(c.id); }}
                placeholder="Opcionális"
              />
            </div>
            <div className="field" style={{ margin: 0 }}><label>Telefonszám</label><input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="07xx xxx xxx" /></div>
            <div className="field" style={{ margin: 0 }}><label>Forrás</label><input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="GSMnet, SEP..." /></div>
          </div>
          {customerPhone.trim() && (
            <div className="login-note" style={{ margin: "8px 0 0", textAlign: "left" }}>
              Ha ez a telefonszám még nincs a Kliensek közt, felvételre kerül.
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" className="btn sm" onClick={submit}>Felvétel</button>
            <button type="button" className="btn sec sm" onClick={() => setOpen(false)}>Mégse</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn sec sm" onClick={() => setOpen(true)}>+ Várakozás felvétele</button>
      )}
    </div>
  );
}
