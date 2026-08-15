import { useEffect, useState } from "react";
import { CloseIcon } from "./icons";
import { CATEGORIES, PAYMENTS } from "../lib/utils";

// Kosár/blokk-alapú gyors rögzítő — a QuickSaleButtons + TransactionQuickAdd párost váltja.
// Bevételnél tételenként gyűjt a kosárba (egy fizetési móddal zárva), kiadásnál egytételes
// gyors rögzítést is enged kosarazás nélkül.
export default function BasketBar({ locations, defaultLocId, busy, smartQuickItems, onCheckout }) {
  const [mode, setMode] = useState("income"); // income | expense
  const [basketItems, setBasketItems] = useState([]);
  const [basketPayment, setBasketPayment] = useState("Készpénz");
  const [locId, setLocId] = useState(defaultLocId || locations[0]?.id || "");

  const [freeOpen, setFreeOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [category, setCategory] = useState("Készlet");
  const [stockKind, setStockKind] = useState("Egyéb"); // Telefon | Alkatrész | Egyéb
  const [err, setErr] = useState("");

  useEffect(() => {
    setCategory(mode === "income" ? "Készlet" : "Egyéb");
  }, [mode]);

  function resetFree() {
    setDescription(""); setAmount(""); setCostPrice(""); setStockKind("Egyéb"); setFreeOpen(false);
  }

  function addQuickToBasket(item) {
    setBasketItems((items) => [...items, { label: item.label, amount: Number(item.amount) || 0, cost: Number(item.cost) || 0, category: "Készlet", kind: "income" }]);
  }

  function addFreeToBasket() {
    if (!description.trim() || !amount) { setErr("Leírás és összeg kötelező!"); return; }
    setErr("");
    setBasketItems((items) => [...items, {
      label: description.trim(), amount: Number(amount) || 0, cost: mode === "income" ? (Number(costPrice) || 0) : 0,
      category, kind: mode, stockKind: mode === "expense" && category === "Készlet" ? stockKind : undefined,
    }]);
    resetFree();
  }

  function removeItem(idx) {
    setBasketItems((items) => items.filter((_, i) => i !== idx));
  }

  function handleCheckout() {
    if (basketItems.length === 0) return;
    onCheckout(basketItems, basketPayment, locId);
    setBasketItems([]);
  }

  function handleDirectExpense() {
    if (!description.trim() || !amount) { setErr("Leírás és összeg kötelező!"); return; }
    setErr("");
    onCheckout([{
      label: description.trim(), amount: Number(amount) || 0, cost: 0, category, kind: "expense",
      stockKind: category === "Készlet" ? stockKind : undefined,
    }], basketPayment, locId);
    resetFree();
  }

  const total = basketItems.reduce((s, it) => s + (it.kind === "income" ? it.amount : -it.amount), 0);

  return (
    <div className="basket-bar">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>+ Gyors rögzítés</div>
        <div className="seg">
          <button type="button" className={mode === "income" ? "active" : ""} onClick={() => { setMode("income"); setBasketItems([]); resetFree(); }}>Bevétel</button>
          <button type="button" className={mode === "expense" ? "active" : ""} onClick={() => { setMode("expense"); setBasketItems([]); resetFree(); }}>Kiadás</button>
        </div>
      </div>

      {err && <div className="errbar">{err}</div>}

      {mode === "income" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: freeOpen ? 10 : 0 }}>
          {smartQuickItems.map((item) => (
            <button key={item.label} type="button" className="quick-sale-btn" disabled={busy} onClick={() => addQuickToBasket(item)}>
              {item.label} · {item.amount} Lei
            </button>
          ))}
          {!freeOpen && <button type="button" className="quick-sale-btn" onClick={() => setFreeOpen(true)}>+ Szabad tétel</button>}
        </div>
      )}
      {mode === "expense" && !freeOpen && (
        <button type="button" className="quick-sale-btn" onClick={() => setFreeOpen(true)}>+ Kiadás felvétele</button>
      )}

      {freeOpen && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: mode === "income" ? "1.6fr 1fr 1fr 1fr" : "2fr 1fr 1fr", gap: 8, alignItems: "flex-end", marginTop: mode === "income" ? 10 : 0 }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Leírás</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="pl. tok eladás, hirdetés..." autoFocus />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Összeg (Lei)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
            {mode === "income" && (
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
          </div>

          {mode === "expense" && category === "Készlet" && (
            <div className="field" style={{ margin: "10px 0 0" }}>
              <label>Mi érkezett?</label>
              <div className="seg">
                {["Telefon", "Alkatrész", "Egyéb"].map((k) => (
                  <button key={k} type="button" className={stockKind === k ? "active" : ""} onClick={() => setStockKind(k)}>{k}</button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" className="btn sec sm" onClick={resetFree}>Mégse</button>
            <button type="button" className="btn sec sm" onClick={addFreeToBasket}>Hozzáadás a kosárhoz</button>
            {mode === "expense" && basketItems.length === 0 && (
              <button type="button" className="btn sm" disabled={busy} onClick={handleDirectExpense}>Rögzítés</button>
            )}
          </div>
        </>
      )}

      {basketItems.length > 0 && (
        <>
          <div className="basket-items" style={{ marginTop: freeOpen ? 12 : 10 }}>
            {basketItems.map((it, i) => (
              <div key={i} className="basket-item-row">
                <span>{it.label}{it.stockKind && it.stockKind !== "Egyéb" ? ` (${it.stockKind})` : ""}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="mono">{it.kind === "income" ? "+" : "-"}{it.amount} Lei</span>
                  <button type="button" className="basket-item-remove" onClick={() => removeItem(i)}><CloseIcon width={12} height={12} /></button>
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginTop: 8 }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Fizetés</label>
              <div className="seg">
                {PAYMENTS.map((p) => (
                  <button key={p} type="button" className={basketPayment === p ? "active" : ""} onClick={() => setBasketPayment(p)}>{p}</button>
                ))}
              </div>
            </div>
            {locations.length > 1 && (
              <div className="field" style={{ margin: 0 }}>
                <label>Helyszín</label>
                <select className="filter-sel" value={locId} onChange={(e) => setLocId(e.target.value)}>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            )}
            <div style={{ flex: 1, textAlign: "right", fontWeight: 700, fontSize: 13, color: total >= 0 ? "#15803D" : "#B91C1C" }}>
              Összesen: {total >= 0 ? "+" : ""}{total} Lei
            </div>
            <button type="button" className="btn" disabled={busy} onClick={handleCheckout}>Blokk lezárása</button>
          </div>
        </>
      )}
    </div>
  );
}
