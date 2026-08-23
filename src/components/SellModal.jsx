import { useState } from "react";
import { CloseIcon } from "./icons";
import { PAYMENTS } from "../lib/utils";
import CustomerAutocomplete from "./CustomerAutocomplete";

export default function SellModal({ item, locName, customers = [], rewards = [], onClose, onSave, busy }) {
  const [f, setF] = useState({ price: item.salePrice || "", customerName: "", customerPhone: "", customerId: null, payment: "Készpénz", marketingConsent: false, smartbillInvoice: false });
  const selectedCustomer = f.customerId ? customers.find((c) => c.id === f.customerId) : null;
  const redeemableForCustomer = selectedCustomer
    ? rewards.filter((r) => r.active && r.pointCost <= (selectedCustomer.loyaltyPointsBalance || 0)).sort((a, b) => a.sortOrder - b.sortOrder)
    : [];
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [hasTradeIn, setHasTradeIn] = useState(false);
  const [tradeIn, setTradeIn] = useState({ brand: "", model: "", condition: "Refurbished", value: "" });
  const setTI = (k) => (e) => setTradeIn({ ...tradeIn, [k]: e.target.value });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value, ...(k === "customerName" ? { customerId: null } : {}) });
  const tradeInValid = !hasTradeIn || (tradeIn.brand.trim() && tradeIn.model.trim() && tradeIn.value !== "");
  const valid = f.customerPhone.trim().length > 0 && tradeInValid;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Eladás rögzítése <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        <div className="field"><label>Helyszín</label><input disabled value={locName(item.locationId)} /></div>
        <div className="field"><label>Termék</label><input disabled value={`${item.brand} ${item.model}`} /></div>
        <div className="field"><label>Garancia</label><input disabled value={item.warranty || "Nincs"} /></div>
        <div className="row2">
          <div className="field"><label>Vevő neve</label>
            <CustomerAutocomplete
              customers={customers}
              name={f.customerName}
              onChangeName={(name) => setF({ ...f, customerName: name, customerId: null })}
              onSelect={(c) => setF({ ...f, customerName: c.name, customerPhone: c.phone || f.customerPhone, customerId: c.id })}
            />
          </div>
          <div className="field">
            <label>Telefonszám *</label>
            <input
              value={f.customerPhone}
              onChange={set("customerPhone")}
              onBlur={() => setPhoneTouched(true)}
              placeholder="07xx xxx xxx"
              style={phoneTouched && !valid ? { borderColor: "#FCA5A5" } : undefined}
            />
          </div>
        </div>
        <div className="row2">
          <div className="field"><label>Eladási ár (Lei)</label><input type="number" value={f.price} onChange={set("price")} /></div>
          <div className="field"><label>Fizetés</label>
            <select value={f.payment} onChange={set("payment")}>
              {PAYMENTS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", fontWeight: 500, textTransform: "none", letterSpacing: 0, cursor: "pointer" }}>
            <input type="checkbox" className="chk" checked={f.marketingConsent} onChange={(e) => setF({ ...f, marketingConsent: e.target.checked })} />
            Hozzájárul, hogy akciókról/emlékeztetőkről SMS-ben értesítsük
          </label>
        </div>
        <div className="field">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", fontWeight: 500, textTransform: "none", letterSpacing: 0, cursor: "pointer" }}>
            <input type="checkbox" className="chk" checked={hasTradeIn} onChange={(e) => setHasTradeIn(e.target.checked)} />
            Beszámított régi telefon (a vevő egy másik telefonnal fizet be egy részt)
          </label>
        </div>
        <div className="field">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", fontWeight: 500, textTransform: "none", letterSpacing: 0, cursor: "pointer" }}>
            <input type="checkbox" className="chk" checked={f.smartbillInvoice} onChange={(e) => setF({ ...f, smartbillInvoice: e.target.checked })} />
            Számla kiállítása SmartBillben (ha a vevő kér számlát)
          </label>
        </div>
        {selectedCustomer && (selectedCustomer.loyaltyPointsBalance || 0) > 0 && (
          <div style={{ fontSize: 12, color: "var(--primary-ink)", background: "var(--primary-soft)", borderRadius: 9, padding: "8px 12px", marginBottom: 12 }}>
            Ennek az ügyfélnek {selectedCustomer.loyaltyPointsBalance} pontja van
            {redeemableForCustomer.length > 0 ? <> — beváltható: {redeemableForCustomer.map((r) => r.label).join(", ")} (a Kliens-lapon)</> : "."}
          </div>
        )}
        {hasTradeIn && (
          <div style={{ background: "#F9FAFB", border: "1px solid #EEF0F2", borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <div className="row2">
              <div className="field"><label>Beszámított márka</label><input value={tradeIn.brand} onChange={setTI("brand")} placeholder="Samsung" /></div>
              <div className="field"><label>Beszámított modell</label><input value={tradeIn.model} onChange={setTI("model")} placeholder="Galaxy A54" /></div>
            </div>
            <div className="row2">
              <div className="field"><label>Állapot</label>
                <select value={tradeIn.condition} onChange={setTI("condition")}>
                  <option value="Refurbished">Felújított</option>
                  <option value="New">Új</option>
                </select>
              </div>
              <div className="field"><label>Beszámított érték (Lei)</label><input type="number" value={tradeIn.value} onChange={setTI("value")} placeholder="0" /></div>
            </div>
            <div className="login-note" style={{ margin: 0, textAlign: "left" }}>
              A beszámított összeggel csökken a ténylegesen fizetendő készpénz, a régi telefon pedig felkerül a raktárba (Lefoglalt állapotban, hogy előbb átnézhesd/árazd, mielőtt a webshopban megjelenne).
            </div>
          </div>
        )}
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button
            className="btn"
            disabled={busy || !valid}
            onClick={() => onSave({
              type: "income",
              category: "Készlet",
              description: `${item.brand} ${item.model}`,
              amount: f.price,
              costPrice: item.costPrice,
              warranty: item.warranty || null,
              productId: item.id,
              customerName: f.customerName,
              customerPhone: f.customerPhone,
              customerId: f.customerId,
              payment: f.payment,
              marketingConsent: f.marketingConsent,
            }, item.locationId, hasTradeIn ? { ...tradeIn, value: Number(tradeIn.value) || 0 } : null, f.smartbillInvoice)}
          >
            {busy ? "Mentés..." : "Rögzítés"}
          </button>
        </div>
      </div>
    </div>
  );
}
