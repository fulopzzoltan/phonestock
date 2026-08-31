import { useState } from "react";
import { CloseIcon } from "./icons";
import { PAYMENTS } from "../lib/utils";
import CustomerAutocomplete from "./CustomerAutocomplete";
import BrandField from "./BrandField";

export default function SellModal({ item, locName, customers = [], rewards = [], onClose, onSave, busy }) {
  const [f, setF] = useState({ price: item.salePrice || "", customerName: "", customerPhone: "", customerId: null, payment: "Készpénz", marketingConsent: false, smartbillInvoice: false });
  const selectedCustomer = f.customerId ? customers.find((c) => c.id === f.customerId) : null;
  const redeemableForCustomer = selectedCustomer
    ? rewards.filter((r) => r.active && r.pointCost <= (selectedCustomer.loyaltyPointsBalance || 0)).sort((a, b) => a.sortOrder - b.sortOrder)
    : [];
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [hasFolia, setHasFolia] = useState(false);
  const [foliaAr, setFoliaAr] = useState(10);
  const [hasKabel, setHasKabel] = useState(false);
  const [kabelAr, setKabelAr] = useState(5);
  const [hasTradeIn, setHasTradeIn] = useState(false);
  const emptyTradeIn = () => ({ brand: "", model: "", condition: "Refurbished", value: "" });
  const [tradeIns, setTradeIns] = useState([emptyTradeIn()]);
  const setTI = (idx, k) => (e) => setTradeIns(tradeIns.map((t, i) => (i === idx ? { ...t, [k]: e.target.value } : t)));
  const setTIVal = (idx, k) => (v) => setTradeIns(tradeIns.map((t, i) => (i === idx ? { ...t, [k]: v } : t)));
  const addTradeIn = () => setTradeIns([...tradeIns, emptyTradeIn()]);
  const removeTradeIn = (idx) => setTradeIns(tradeIns.filter((_, i) => i !== idx));
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value, ...(k === "customerName" ? { customerId: null } : {}) });
  const tradeInValid = !hasTradeIn || tradeIns.every((t) => t.brand.trim() && t.model.trim() && t.value !== "");
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
            <input type="checkbox" className="chk" checked={hasFolia} onChange={(e) => setHasFolia(e.target.checked)} />
            Fólia is ment vele
            {hasFolia && (
              <input
                type="number" value={foliaAr} onChange={(e) => setFoliaAr(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{ width: 70, marginLeft: "auto" }} placeholder="Ár"
              />
            )}
          </label>
        </div>
        <div className="field">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", fontWeight: 500, textTransform: "none", letterSpacing: 0, cursor: "pointer" }}>
            <input type="checkbox" className="chk" checked={hasKabel} onChange={(e) => setHasKabel(e.target.checked)} />
            Kábel is ment vele
            {hasKabel && (
              <input
                type="number" value={kabelAr} onChange={(e) => setKabelAr(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{ width: 70, marginLeft: "auto" }} placeholder="Ár"
              />
            )}
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
            {tradeIns.map((tradeIn, idx) => (
              <div key={idx} style={idx > 0 ? { marginTop: 12, paddingTop: 12, borderTop: "1px solid #EEF0F2" } : undefined}>
                {tradeIns.length > 1 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#6B7280" }}>{idx + 1}. telefon</span>
                    <button type="button" className="iconbtn" onClick={() => removeTradeIn(idx)} title="Eltávolítás">
                      <CloseIcon />
                    </button>
                  </div>
                )}
                <div className="row2">
                  <BrandField label="Beszámított márka" value={tradeIn.brand} onChange={setTIVal(idx, "brand")} />
                  <div className="field"><label>Beszámított modell</label><input value={tradeIn.model} onChange={setTI(idx, "model")} placeholder="Galaxy A54" /></div>
                </div>
                <div className="row2">
                  <div className="field"><label>Állapot</label>
                    <select value={tradeIn.condition} onChange={setTI(idx, "condition")}>
                      <option value="Refurbished">Felújított</option>
                      <option value="New">Új</option>
                    </select>
                  </div>
                  <div className="field"><label>Beszámított érték (Lei)</label><input type="number" value={tradeIn.value} onChange={setTI(idx, "value")} placeholder="0" /></div>
                </div>
              </div>
            ))}
            <button type="button" className="btn sec" style={{ marginTop: 4 }} onClick={addTradeIn}>+ Újabb beszámított telefon</button>
            <div className="login-note" style={{ margin: "10px 0 0", textAlign: "left" }}>
              A beszámított összeggel csökken a ténylegesen fizetendő készpénz, a régi telefon(ok) pedig felkerül(nek) a raktárba (Lefoglalt állapotban, hogy előbb átnézhesd/árazd, mielőtt a webshopban megjelenne).
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
              costPrice: (Number(item.costPrice) || 0) + (hasFolia ? Number(foliaAr) || 0 : 0) + (hasKabel ? Number(kabelAr) || 0 : 0),
              warranty: item.warranty || null,
              productId: item.id,
              customerName: f.customerName,
              customerPhone: f.customerPhone,
              customerId: f.customerId,
              payment: f.payment,
              marketingConsent: f.marketingConsent,
            }, item.locationId, hasTradeIn ? tradeIns.map((t) => ({ ...t, value: Number(t.value) || 0 })) : null, f.smartbillInvoice)}
          >
            {busy ? "Mentés..." : "Rögzítés"}
          </button>
        </div>
      </div>
    </div>
  );
}
