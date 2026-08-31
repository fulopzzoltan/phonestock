import { useState } from "react";
import { CloseIcon } from "./icons";
import { WARRANTIES, today } from "../lib/utils";
import CustomerAutocomplete from "./CustomerAutocomplete";

export default function WarrantyModal({ initial, locations, customers = [], onClose, onSubmit, busy }) {
  const isEdit = !!initial;
  const [f, setF] = useState({
    kind: initial?.kind || "sale",
    customerName: initial?.customerName || "",
    customerPhone: initial?.customerPhone || "",
    customerId: initial?.customerId || null,
    label: initial?.label || "",
    warranty: initial?.warranty || WARRANTIES[0],
    fromDate: initial?.fromDate || today(),
    note: initial?.note || "",
  });
  const [locId, setLocId] = useState(initial?.locationId || locations[0]?.id || "");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.customerName.trim() && f.label.trim() && f.warranty && f.fromDate && locId;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? "Garancia szerkesztése" : "Garancia felvétele"} <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        <div className="row2">
          <div className="field"><label>Típus</label>
            <select value={f.kind} onChange={set("kind")}>
              <option value="sale">Telefon garancia</option>
              <option value="service">Szerviz garancia</option>
            </select>
          </div>
          <div className="field"><label>Helyszín</label>
            <select value={locId} onChange={(e) => setLocId(e.target.value)}>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>
        <div className="row2">
          <div className="field"><label>Ügyfél neve</label>
            <CustomerAutocomplete
              customers={customers}
              name={f.customerName}
              onChangeName={(name) => setF({ ...f, customerName: name, customerId: null })}
              onSelect={(c) => setF({ ...f, customerName: c.name, customerPhone: c.phone || f.customerPhone, customerId: c.id })}
            />
          </div>
          <div className="field"><label>Telefonszám</label><input value={f.customerPhone} onChange={(e) => setF({ ...f, customerPhone: e.target.value, customerId: null })} placeholder="07xx xxx xxx" /></div>
        </div>
        <div className="field"><label>Termék / Eszköz</label><input value={f.label} onChange={set("label")} placeholder="iPhone 12 128GB / Kijelzőcsere" /></div>
        <div className="row2">
          <div className="field"><label>Garanciaidő</label>
            <select value={f.warranty} onChange={set("warranty")}>
              {WARRANTIES.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div className="field"><label>Kezdete</label><input type="date" value={f.fromDate} onChange={set("fromDate")} /></div>
        </div>
        <div className="field"><label>Jegyzet</label>
          <textarea
            value={f.note}
            onChange={(e) => setF({ ...f, note: e.target.value })}
            placeholder="Opcionális — pl. korábbi/papíralapú eset utólagos rögzítése"
            style={{ width: "100%", minHeight: 64, background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 9, padding: "9px 10px", fontFamily: "inherit", fontSize: 13, resize: "vertical" }}
          />
        </div>
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!valid || busy} onClick={() => valid && onSubmit(f, locId)}>{busy ? "Mentés..." : isEdit ? "Mentés" : "Felvétel"}</button>
        </div>
      </div>
    </div>
  );
}
