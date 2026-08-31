import { useState } from "react";
import LocationField from "./LocationField";
import { CATEGORIES, PAYMENTS } from "../lib/utils";

export default function TransactionQuickAdd({ locations, defaultLocId, onAdd, busy, openStockModal, openPartModal }) {
  const [type, setType] = useState("income");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [category, setCategory] = useState("Készlet");
  const [payment, setPayment] = useState("Készpénz");
  const [cashAmount, setCashAmount] = useState("");
  const [cardAmount, setCardAmount] = useState("");
  const [locId, setLocId] = useState(defaultLocId || locations[0]?.id || "");
  const [stockKind, setStockKind] = useState("Egyéb"); // "Telefon" | "Alkatrész" | "Egyéb"
  const [err, setErr] = useState("");

  const splitSum = (Number(cashAmount) || 0) + (Number(cardAmount) || 0);
  const splitValid = payment !== "Vegyes" || (cashAmount !== "" && cardAmount !== "" && splitSum === (Number(amount) || 0));

  function submit() {
    if (!description.trim() || !amount) { setErr("Leírás és összeg kötelező!"); return; }
    if (payment === "Vegyes" && !splitValid) { setErr(`A készpénz + kártya résznek ki kell adnia az összeget (jelenleg ${splitSum} / ${amount} Lei).`); return; }
    setErr("");
    onAdd({
      type, description: description.trim(), amount, costPrice: type === "income" ? (costPrice || 0) : 0, category, payment, locationId: locId,
      paymentCashAmount: payment === "Vegyes" ? cashAmount : null,
      paymentCardAmount: payment === "Vegyes" ? cardAmount : null,
    }, locId);

    if (type === "expense" && category === "Készlet") {
      if (stockKind === "Telefon") openStockModal({ costPrice: Number(amount) || 0, locationId: locId });
      if (stockKind === "Alkatrész") openPartModal({ costPrice: Number(amount) || 0, source: description.trim() || undefined });
    }

    setDescription("");
    setAmount("");
    setCostPrice("");
    setStockKind("Egyéb");
    setCashAmount("");
    setCardAmount("");
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>+ Gyors rögzítés</div>
        <div className="seg">
          <button type="button" className={type === "income" ? "active" : ""} onClick={() => setType("income")}>Bevétel</button>
          <button type="button" className={type === "expense" ? "active" : ""} onClick={() => setType("expense")}>Kiadás</button>
        </div>
      </div>
      {err && <div className="errbar">{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: type === "income" ? "1.6fr 1fr 1fr 1fr 1fr 1fr auto" : "2fr 1fr 1fr 1fr 1fr auto", gap: 8, alignItems: "flex-end" }}>
        <div className="field" style={{ margin: 0 }}>
          <label>Leírás</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="pl. bérleti díj, tok eladás, hirdetés..." />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Összeg (Lei)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </div>
        {type === "income" && (
          <div className="field" style={{ margin: 0 }}>
            <label>Besz. ár (Lei)</label>
            <input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="0" />
          </div>
        )}
        <div className="field" style={{ margin: 0 }}>
          <label>Kategória</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c === "Eszköz" ? "Eszköz (befektetés)" : c}</option>)}
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Fizetés</label>
          <select value={payment} onChange={(e) => setPayment(e.target.value)}>
            {PAYMENTS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        {locations.length > 1 ? (
          <div className="field" style={{ margin: 0 }}>
            <label>Helyszín</label>
            <select value={locId} onChange={(e) => setLocId(e.target.value)}>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        ) : <div />}
        <button className="btn" disabled={busy} onClick={submit} style={{ whiteSpace: "nowrap" }}>Rögzít</button>
      </div>
      {payment === "Vegyes" && (
        <div className="row2" style={{ margin: "10px 0 0" }}>
          <div className="field" style={{ margin: 0 }}>
            <label>ebből készpénz (Lei)</label>
            <input type="number" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} placeholder="0" />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>ebből kártya (Lei)</label>
            <input type="number" value={cardAmount} onChange={(e) => setCardAmount(e.target.value)} placeholder="0" />
          </div>
        </div>
      )}
      {type === "expense" && category === "Készlet" && (
        <div className="field" style={{ margin: "10px 0 0" }}>
          <label>Mi érkezett?</label>
          <div className="seg">
            {["Telefon", "Alkatrész", "Egyéb"].map((k) => (
              <button key={k} type="button" className={stockKind === k ? "active" : ""} onClick={() => setStockKind(k)}>{k}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
