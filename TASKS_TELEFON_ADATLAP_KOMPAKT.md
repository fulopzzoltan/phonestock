# TASKS — Telefon modul eszköz-adatlap (ProductDetailPanel) kompaktabbá tétele + átrendezés

Kód alapján pontosítva (`src/components/ProductDetailPanel.jsx`, `src/components/DetailRow.jsx`, `src/index.css`).

## 1. Kompaktabb sorköz — `src/index.css`

A `.dp-row`/`.dp-section`/`.dp-section-title` osztályok **közösek** a Szerviz munkalap adatlapjával (`DetailPanel.jsx`) is, mert mindkettő ugyanazt a `Row`/`dp-*` mintát használja. A user kifejezetten a Telefon-modult kérte kompaktabbra, de mivel az osztályok megosztottak, a legegyszerűbb (és vizuálisan konzisztens) megoldás **globálisan** szűkíteni őket — ha ezt nem szeretnéd (pl. a szerviz adatlap maradjon a mostani lazább sorközzel), szólj, és scope-olt `.dp-body.compact .dp-row` variánst csinálok csak a Telefon-modulhoz.

Jelenlegi (292-298. sor) → javasolt:
```css
.dp-body{padding:20px 22px;flex:1}                 /* marad */
.dp-section{margin-bottom:14px}                     /* 20px → 14px */
.dp-section-title{font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}  /* margin 10px → 6px */
.dp-row{display:flex;align-items:flex-start;justify-content:space-between;padding:4px 0;border-bottom:1px solid #F9FAFB;gap:12px}  /* padding 7px 0 → 4px 0 */
.dp-row:last-child{border-bottom:none}
.dp-key{font-size:12px;color:#6B7280;font-weight:500;flex-shrink:0}
.dp-val{font-size:12.5px;color:#111827;font-weight:600;text-align:right}
```

## 2. IMEI másolás — `ProductDetailPanel.jsx` 34. sor

A `DetailPanel.jsx`-ben már van egy kész vágólap-minta (`copyStatusLink()`, 30-34. sor: `navigator.clipboard.writeText` + 1.5 mp-es "másolva" visszajelzés) — ugyanezt vedd át:

```jsx
const [imeiCopied, setImeiCopied] = useState(false);
function copyImei() {
  navigator.clipboard.writeText(product.imei);
  setImeiCopied(true);
  setTimeout(() => setImeiCopied(false), 1500);
}
```
```jsx
<Row k="IMEI" v={product.imei ? (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
    <span className="mono">{product.imei}</span>
    <button type="button" className="iconbtn xs" onClick={copyImei} title="Másolás">
      {imeiCopied ? "✓" : <CopyIcon width={13} height={13} />}
    </button>
  </span>
) : null} />
```
Új ikon kell: `CopyIcon` a `src/components/icons.jsx`-be (a meglévő ikonok mintájára — pl. két egymást átfedő lekerekített négyzet, `stroke="currentColor"`).

## 3. Akkuállapot színkódolása

Új segédfüggvény a `src/lib/utils.js`-be:
```js
export function batteryHealthColor(pct) {
  if (pct == null) return null;
  if (pct >= 85) return "#22C55E";   // zöld
  if (pct >= 80) return "#F59E0B";   // sárga/narancs
  return "#EF4444";                   // piros
}
```
`ProductDetailPanel.jsx` 38. sor:
```jsx
{product.condition === "Refurbished" && (
  <Row k="Akkuállapot" v={product.batteryHealth != null ? (
    <span style={{ color: batteryHealthColor(product.batteryHealth), fontWeight: 700 }}>{product.batteryHealth}%</span>
  ) : null} />
)}
```

## 4. Fotó blokk áthelyezése alulra

Jelenleg (25. sor) `<ProductPhotos productId={product.id} />` a `.dp-body` legelején van. A user kérése: "a Pénzügyek szekció alá" — vagyis mozgasd a Pénzügyek szekció (67-72. sor) **után**, közvetlenül. A "Eladás adatai" feltételes blokk (73-93. sor, csak eladott terméknél jelenik meg) utána marad — a fotók így mindig közvetlenül a Pénzügyek alatt vannak, eladott/nem eladott terméktől függetlenül konzisztens helyen.

## 5. Alsó gombsáv átrendezése — `ProductDetailPanel.jsx` 95-99. sor

Jelenlegi:
```jsx
<div className="dp-actions">
  {!isSold && <button className="btn sm" disabled={busy} onClick={() => onSell(product)}>Eladva</button>}
  <button className="btn sec sm" disabled={busy} onClick={() => onEdit(product)}>Szerkesztés</button>
  <ConfirmDelete variant="full" disabled={busy} onConfirm={() => onDelete(product.id)} />
</div>
```
Új:
```jsx
<div className="dp-actions">
  {activeServiceTicket ? (
    <button className="btn sec sm" disabled={busy} onClick={() => onOpenTicket(activeServiceTicket.id)}>Munkalap megnyitása</button>
  ) : (
    <button className="btn sec sm" disabled={busy} onClick={() => onStartService(product)}>
      {isSold ? "Garanciális javítás felvétele" : "Szerviz előkészítés indítása"}
    </button>
  )}
  <button className="btn sec sm" disabled={busy} onClick={() => onEdit(product)}>Szerkesztés</button>
  <div style={{ marginLeft: "auto" }}>
    <ConfirmDelete variant="full" disabled={busy} onConfirm={() => onDelete(product.id)} />
  </div>
</div>
```
- **"Eladva" gomb törölve** — a user szerint a külső (StockTab kártya) nézetben elérhető, itt felesleges duplikáció.
- **Szerviz-gomb az alsó sávba került**, a "Előkészítés / szerviz" dp-section-ből (43-66. sor) törölendő az eredeti inline gomb (59. és 62-64. sor) — a szekcióban csak a leíró szöveg és a `PhonePartsPicker` marad (ha van aktív munkalap), a CTA-gomb mostantól kizárólag az alsó sávban van, nincs duplikáció.
- **Törlés jobbra igazítva** (`.dp-actions` már `display:flex`, a `margin-left:auto` a wrappelő div-en a flexbox miatt magától a jobb szélre tolja) — vizuálisan elkülönül a Szerkesztés/Szerviz gomboktól, kevésbé valószínű a véletlen kattintás.

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- Adatlap érezhetően kompaktabb (kisebb sorköz, kisebb szekció-margó)
- IMEI mellett működik a másolás ikon, rövid "✓" visszajelzéssel
- Akkuállapot 85%+ zöld, 80-84% sárga, 80% alatt piros
- Fotó blokk a Pénzügyek szekció alatt jelenik meg, nem a tetején
- Alsó sávban nincs "Eladva" gomb, van Szerviz-gomb (kontextusfüggő felirattal) + Szerkesztés + jobbra igazított Törlés
- Nincs `git push`, csak lokális commit
