# TASKS — Telefon-kártyák redesignja (Figma-minta alapján)

## Forrás

Figma: `phonestock` fájl, `iphone-product-card` keret (node `5:5`). A minta egy tágas, letisztult e-commerce-stílusú termékkártya: márka-ikon + kódjelvény felül, nagy cím, két szürke "spec" pill (állapot + tárhely), külön szín-sor, nagy ár + mindig látható "hányadik napja a polcon" jelvény naptár-ikonnal, elválasztó vonal, majd egy műveletsor (bal: szerkesztés/törlés ikon-gombok, jobb: kitöltött "Eladás" pill-gomb).

**A minta színeit nem vesszük át szó szerint** (ott feketék a gombok/jelvények) — a saját palettánk marad (`var(--primary)` zöld a fő gombon, `var(--warning-soft)`/`--warning-ink` a figyelmeztető jelvényen), csak a *mintázatot* (elrendezés, tipográfia-hierarchia, térköz, pill-formák) vesszük át. Ez kizárólag a **Telefonok fül rács- (grid-) nézetét** érinti (`src/tabs/StockTab.jsx` 147–174. sor) — a lista-nézet és más fülek kártyái nem változnak.

---

## 1. Új ikon — `src/components/icons.jsx`

A napok-jelvényhez kell egy naptár ikon, a meglévő `ClockIcon` stílusát követve (a `ClockIcon` (98–102. sor) mellé):
```jsx
export const CalendarIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" />
  </svg>
);
```

---

## 2. `src/components/Thumb.jsx` — nagyobb méret-variáns

Jelenleg csak `sm` variáns van a `stk-thumb` mellett a lista-nézethez. A kártyán nagyobb (48px) márka-ikon kell. Cseréld a 11. sort:
```jsx
<div className={`stk-thumb${size === "sm" ? " sm" : size === "lg" ? " lg" : ""}`} style={{ background: brandColor(brand) }}>
```

---

## 3. `src/components/ConfirmDelete.jsx` — `className` passthrough

Kell, hogy a törlés-gombot egyedi (piros hátterű) stílussal lehessen ellátni a kártyán, anélkül hogy az `.iconbtn` globális stílusát megváltoztatnánk (azt sok más helyen is használjuk). Egészítsd ki a propokat és a 24. sort:
```jsx
export default function ConfirmDelete({ onConfirm, disabled, variant = "icon", label = "Törlés", confirmLabel = "Biztos?", className = "" }) {
  ...
  return (
    <button type="button" className={`iconbtn ${className}`} disabled={disabled} onClick={(e) => { stop(e); setConfirming(true); }}><TrashIcon /></button>
  );
}
```

---

## 4. CSS — `src/index.css`

Cseréld le a jelenlegi `.stk-thumb`, `.stk-card`, `.stk-card-top`, `.stk-card-name`, `.stk-card-price`, `.stk-card-cost`, `.stk-card-actions` szabályokat (kb. 175–194. sor) erre — a `.stk-thumb.sm` és a `.stk-badges`/`.stk-card-sub` szabályok maradnak változatlanul, csak kiegészülnek:
```css
.stk-thumb.lg{width:48px;height:48px;border-radius:14px;font-size:16px}
.stk-thumb.lg svg{width:22px;height:22px}

.stk-card{background:#fff;border-radius:20px;border:1px solid #EEF0F2;box-shadow:var(--shadow-card);padding:22px;cursor:pointer;transition:transform .12s,box-shadow .12s,border-color .12s}
.stk-card:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(16,24,40,.09);border-color:#E5E7EB}
.stk-card-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
.stk-card-code{background:#F1F2F6;color:#4B5563;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:11.5px;padding:6px 12px;border-radius:var(--radius-pill)}
.stk-card-name{font-weight:800;font-size:17px;color:#111827;line-height:1.3;margin-bottom:12px}
.stk-card-specs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
.spec-pill{background:#F1F2F6;color:#4B5563;font-size:11.5px;font-weight:600;padding:5px 11px;border-radius:var(--radius-pill)}
.stk-card-color{font-size:12px;color:#9CA3AF;margin-bottom:14px}
.stk-card-price-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
.stk-card-price{font-family:'JetBrains Mono',monospace;font-weight:800;font-size:18px;color:#111827}
.stk-card-days{display:inline-flex;align-items:center;gap:5px;background:#F1F2F6;color:#6B7280;font-size:11.5px;font-weight:700;padding:5px 10px;border-radius:var(--radius-pill);white-space:nowrap}
.stk-card-days.warn{background:var(--warning-soft);color:var(--warning-ink)}
.stk-card-cost{font-size:10.5px;color:#9CA3AF;margin-top:4px}
.stk-card-actions{display:flex;align-items:center;justify-content:space-between;margin-top:16px;padding-top:16px;border-top:1px solid #F3F4F6}
.stk-card-icons{display:flex;gap:8px}
.stk-card-iconbtn{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center}
.stk-card-iconbtn.edit{background:#F1F2F6;color:#4B5563}
.stk-card-iconbtn.delete{background:var(--danger-soft);color:var(--danger-ink)}
.btn.pill{border-radius:var(--radius-pill)}
```
(A `.stk-card-sub` szabály maradhat érintetlenül a fájlban — a lista-nézet táblázata más osztályt használ, `.stk-sub`-ot, azt nem érinti ez a módosítás. A kártyán ezután nem `.stk-card-sub`-ot használunk, hanem a lenti új szerkezetet.)

Megjegyzés a "napok a polcon" jelvényről: a mintában ez mindig látszik (nem csak figyelmeztetésként) — ezt átvesszük (mindig kiírjuk a napok számát), de a színét megtartjuk: semleges szürke normál esetben, és csak akkor vált a már meglévő `isSlowMoving()` figyelmeztető sárgára (`.warn` osztály), ha tényleg lassan mozgó a termék — így nem vesztjük el a jelenlegi figyelmeztető logikát, csak mindig látható lesz az infó.

---

## 5. `src/tabs/StockTab.jsx` — a grid-kártya JSX cseréje

Importáld a `CalendarIcon`-t a `../components/icons`-ból. Cseréld a 148–174. sort:
```jsx
<div className="stk-grid">
  {items.map((i) => {
    const slow = isSlowMoving(i, reserveLocId);
    return (
      <div key={i.id} className="stk-card" onClick={() => setProductDetailId(i.id)}>
        <div className="stk-card-top">
          <Thumb brand={i.brand} size="lg" />
          <span className="stk-card-code">{phoneCode(i.productNo)}</span>
        </div>
        <div className="stk-card-name">
          {displayName(i.brand, i.model)}
          {i.stockStatus === "javitando" && <span className="tag" style={{ marginLeft: 6, background: "var(--danger-soft)", color: "var(--danger-ink)", fontWeight: 700 }}>Javítandó</span>}
          {i.stockStatus === "lefoglalt" && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "#9CA3AF", background: "#F1F2F6", borderRadius: 999, padding: "2px 7px" }}>{stockStatusLabel(i.stockStatus)}</span>}
        </div>
        <div className="stk-card-specs">
          <span className="spec-pill">{i.condition === "New" ? "Új" : `Felújított${i.grade ? " " + i.grade : ""}`}</span>
          {i.storage && <span className="spec-pill">{i.storage}</span>}
          {i.warranty && <span className="spec-pill">{i.warranty} gar.</span>}
        </div>
        {i.color && <div className="stk-card-color">{i.color}</div>}
        <div className="stk-card-price-row">
          <div className="stk-card-price">{money(i.salePrice)}</div>
          <div className={`stk-card-days${slow ? " warn" : ""}`}><CalendarIcon width={13} height={13} />{daysOnShelf(i.dateAdded)}</div>
        </div>
        <div className="stk-card-cost">besz. {money(i.costPrice)}</div>
        <div className="stk-card-actions">
          <div className="stk-card-icons" onClick={(e) => e.stopPropagation()}>
            <button className="iconbtn stk-card-iconbtn edit" disabled={busy} onClick={() => setStockModal(i)}><EditIcon /></button>
            <ConfirmDelete disabled={busy} className="stk-card-iconbtn delete" onConfirm={() => deleteProduct(i.id)} />
          </div>
          <button className="btn sm pill" disabled={busy} onClick={(e) => { e.stopPropagation(); setSellModal(i); }}>Eladás</button>
        </div>
      </div>
    );
  })}
</div>
```
Megjegyzés: a beszerzési ár (`besz. {money(i.costPrice)}`) a Figma-mintában nincs feltüntetve — az egy általános e-commerce-referencia, nem a mi belső, beszerzési-árat is mutató admin nézetünk. Ezt szándékosan megtartottam, mert nektek ez fontos, csak a napok-jelvény miatt lejjebb csúszott.

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- Telefonok fül → rács-nézet: nagyobb, tágasabb kártyák, márka-ikon + T-kód jelvény felül, nagy cím, két szürke spec-pill (állapot, tárhely), külön szín-sor, ár + mindig látható napok-jelvény, elválasztó vonal, majd bal oldalt szerkesztés/törlés ikon-gombok, jobb oldalt zöld "Eladás" pill-gomb
- A lassan mozgó termékek napok-jelvénye sárgára vált, a többinél szürke marad
- A "Javítandó" / "Lefoglalt" állapot-jelzők továbbra is megjelennek a néven
- Lista-nézet és a "Eladott telefonok" (`HistorySection`) táblázata változatlan
- Más fülön semmi nem változott
- Nincs `git push`, csak lokális commit
