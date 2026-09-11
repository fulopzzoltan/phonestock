import { useState } from "react";
import { CloseIcon, PlusIcon, MinusIcon, ArrowUpRightIcon, ArrowDownRightIcon } from "./icons";
import { CATEGORIES, INCOME_CATEGORIES, PAYMENTS } from "../lib/utils";

// Kosár/blokk-alapú gyors rögzítő — a QuickSaleButtons + TransactionQuickAdd párost váltja.
// Bevételnél tételenként gyűjt a kosárba (egy fizetési móddal zárva), kiadásnál egytételes
// gyors rögzítést is enged kosarazás nélkül. A helyszín kizárólag a sidebar-ból jön
// (defaultLocId) — nincs itt saját, második helyszín-választó, hogy ne legyen két hely,
// ahol ugyanazt kell eldönteni.
//
// A state egy hookban él (useBasketBar), mert a felső sáv (mód-váltó + gyorsgombok) a
// kártyán KÍVÜL, fölötte jelenik meg, a többi (szabad tétel form, kosár) pedig a kártyán
// belül — két külön DOM-helyen, de egy közös állapoton. Nincs külön "+ Egyéb tétel" nyitó
// gomb — maga a Bevétel/Kiadás mód-váltó egyben a szabad tétel mezőit is megnyitja.
export function useBasketBar({ defaultLocId, onCheckout }) {
  const [mode, setModeRaw] = useState("income"); // income | expense
  const [basketItems, setBasketItems] = useState([]);
  const [basketPayment, setBasketPayment] = useState("Készpénz");

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [category, setCategory] = useState("Készlet");
  const [stockKind, setStockKind] = useState("Egyéb"); // Telefon | Alkatrész | Egyéb
  const [err, setErr] = useState("");

  function resetFree() {
    setDescription(""); setAmount(""); setCostPrice(""); setStockKind("Egyéb");
  }

  function setMode(next) {
    setModeRaw(next);
    setCategory(next === "income" ? "Készlet" : "Egyéb");
    setBasketItems([]);
    resetFree();
  }

  function addQuickToBasket(item) {
    setBasketItems((items) => [...items, { label: item.label, amount: Number(item.amount) || 0, cost: Number(item.cost) || 0, category: "Tartozékok", kind: "income" }]);
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

  // Fontos: a kosarat/mezőket CSAK sikeres mentés után ürítjük ki. Ha a mentés hálózati
  // (vagy egyéb) hiba miatt elszáll, onCheckout `false`-t ad vissza — ilyenkor minden
  // beütött tétel a helyén marad, csak egy hibaüzenet jelzi, hogy próbáld újra.
  async function handleCheckout() {
    if (basketItems.length === 0 || !defaultLocId) return;
    setErr("");
    const ok = await onCheckout(basketItems, basketPayment, defaultLocId);
    if (ok) setBasketItems([]);
    else setErr("Nem sikerült rögzíteni (lehet, hogy elakadt a net) — a kosár tartalma megmaradt, próbáld újra.");
  }

  async function handleDirectExpense() {
    if (!description.trim() || !amount || !defaultLocId) { setErr(!defaultLocId ? "Válassz helyszínt a bal oldali sávban!" : "Leírás és összeg kötelező!"); return; }
    setErr("");
    const ok = await onCheckout([{
      label: description.trim(), amount: Number(amount) || 0, cost: 0, category, kind: "expense",
      stockKind: category === "Készlet" ? stockKind : undefined,
    }], basketPayment, defaultLocId);
    if (ok) resetFree();
    else setErr("Nem sikerült rögzíteni (lehet, hogy elakadt a net) — az adatok megmaradtak, próbáld újra.");
  }

  const total = basketItems.reduce((s, it) => s + (it.kind === "income" ? it.amount : -it.amount), 0);

  return {
    mode, setMode, basketItems, basketPayment, setBasketPayment,
    description, setDescription, amount, setAmount,
    costPrice, setCostPrice, category, setCategory, stockKind, setStockKind,
    err,
    resetFree, addQuickToBasket, addFreeToBasket, removeItem, handleCheckout, handleDirectExpense, total,
  };
}

// Felső sáv: mód-váltó (Kiadás | Bevétel, jobb felső sarokban a Bevétel) balra a
// gyorsgombokkal — ez a kártyán KÍVÜL, fölötte ül.
export function BasketTopBar({ bb, defaultLocId, busy, smartQuickItems, onImportPdf }) {
  if (!defaultLocId) {
    return <div style={{ fontSize: 12.5, color: "#B91C1C" }}>Válassz helyszínt a bal oldali sávban a rögzítéshez.</div>;
  }
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      <div className="quick-add-seg">
        {bb.mode === "income" && smartQuickItems.map((item) => (
          <button key={item.label} type="button" disabled={busy} onClick={() => bb.addQuickToBasket(item)}>
            {item.label} <span className="cnt">{item.amount} Lei</span>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {bb.mode === "expense" && onImportPdf && (
          <button type="button" className="btn sec sm" disabled={busy} onClick={onImportPdf}>+ PDF</button>
        )}
        <div className="mode-pills">
          <button type="button" className={`mode-pill expense${bb.mode === "expense" ? " active" : ""}`} onClick={() => bb.setMode("expense")}>
            <ArrowDownRightIcon width={14} height={14} /> Kiadás
          </button>
          <button type="button" className={`mode-pill income${bb.mode === "income" ? " active" : ""}`} onClick={() => bb.setMode("income")}>
            <ArrowUpRightIcon width={14} height={14} /> Bevétel
          </button>
        </div>
      </div>
    </div>
  );
}

// A form/kosár rész — a hívó a kártyán BELÜL helyezi el, közvetlenül a felső sáv alatt.
// A szabad tétel mezői mindig látszanak (nincs külön nyitó gomb): a Bevétel/Kiadás
// gomb már maga az "indítás".
export function BasketBody({ bb, defaultLocId, busy }) {
  if (!defaultLocId) return null;
  const { mode, basketItems, total } = bb;
  return (
    <div>
      {bb.err && <div className="errbar">{bb.err}</div>}

      <div style={{ display: "grid", gridTemplateColumns: mode === "income" ? "1.6fr .7fr .7fr 1fr auto" : "2fr .7fr 1fr auto", gap: 8, alignItems: "flex-end" }}>
        <div className="field" style={{ margin: 0 }}>
          <input value={bb.description} onChange={(e) => bb.setDescription(e.target.value)} placeholder="Leírás, pl. tok eladás, hirdetés..." />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <input type="number" value={bb.amount} onChange={(e) => bb.setAmount(e.target.value)} placeholder="Lei" />
        </div>
        {mode === "income" && (
          <div className="field" style={{ margin: 0 }}>
            <input type="number" value={bb.costPrice} onChange={(e) => bb.setCostPrice(e.target.value)} placeholder="Besz. ár" />
          </div>
        )}
        <div className="field" style={{ margin: 0 }}>
          <select value={bb.category} onChange={(e) => bb.setCategory(e.target.value)}>
            {mode === "income"
              ? INCOME_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)
              : CATEGORIES.map((c) => <option key={c} value={c}>{c === "Eszköz" ? "Eszköz (befektetés)" : c}</option>)}
          </select>
        </div>
        {mode === "income" && (
          <button type="button" className="btn sm income-btn icon-only" style={{ width: 37.5, height: 37.5, justifyContent: "center", borderRadius: 999 }} title="Rögzítés" onClick={bb.addFreeToBasket}>
            <PlusIcon width={16} height={16} />
          </button>
        )}
        {mode === "expense" && basketItems.length === 0 && (
          <button type="button" className="btn sm expense-btn icon-only" style={{ width: 37.5, height: 37.5, justifyContent: "center", borderRadius: 999 }} title="Rögzítés" disabled={busy} onClick={bb.handleDirectExpense}>
            <MinusIcon width={16} height={16} />
          </button>
        )}
      </div>

      {mode === "expense" && bb.category === "Készlet" && (
        <div className="field" style={{ margin: "10px 0 0" }}>
          <label>Mi érkezett?</label>
          <div className="seg">
            {["Telefon", "Alkatrész", "Egyéb"].map((k) => (
              <button key={k} type="button" className={bb.stockKind === k ? "active" : ""} onClick={() => bb.setStockKind(k)}>{k}</button>
            ))}
          </div>
        </div>
      )}

      {basketItems.length > 0 && (
        <>
          <div className="basket-items" style={{ marginTop: 12 }}>
            {basketItems.map((it, i) => (
              <div key={i} className="basket-item-row">
                <span>{it.label}{it.stockKind && it.stockKind !== "Egyéb" ? ` (${it.stockKind})` : ""}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="mono">{it.kind === "income" ? "+" : "-"}{it.amount} Lei</span>
                  <button type="button" className="basket-item-remove" onClick={() => bb.removeItem(i)}><CloseIcon width={12} height={12} /></button>
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginTop: 8 }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Fizetés</label>
              <div className="seg">
                {PAYMENTS.map((p) => (
                  <button key={p} type="button" className={bb.basketPayment === p ? "active" : ""} onClick={() => bb.setBasketPayment(p)}>{p}</button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, textAlign: "right", fontWeight: 700, fontSize: 13, color: total >= 0 ? "#15803D" : "#B91C1C" }}>
              Összesen: {total >= 0 ? "+" : ""}{total} Lei
            </div>
            <button type="button" className="btn" disabled={busy} onClick={bb.handleCheckout}>Blokk lezárása</button>
          </div>
        </>
      )}
    </div>
  );
}
