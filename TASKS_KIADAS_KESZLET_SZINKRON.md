# TASKS — Kiadás → automatikus készlet-felvétel

Ez egy végrehajtható feladatlista a kódoló agentnek (Claude Code). Kontextus: a Bevételek & Kiadások átalakításánál felmerült egy konkrét, azonnal hasznos ötlet — amikor egy **kiadást** rögzítünk, ami egy **telefon** vagy **alkatrész** beszerzése volt, ne kelljen még egyszer, külön felvinni ugyanazt a Telefonok/Alkatrészek fülön — a kiadás rögzítése után nyíljon meg rögtön az adott felvételi form, előtöltve az árral és a helyszínnel.

**Kifejezetten nem kell** (a tulajdonos szava szerint): nagy numerikus billentyűzet, teljes raktárkövetés a tartozékokra (tok/kábel/fólia) — azok maradnak sima, kategorizálás nélküli kiadás/bevétel tételek, mint most.

**Ne pusholj / ne deployolj**, csak lokális commit, amíg nem szólnak.

---

## Amit már megnéztem — a jelenlegi állapot

- `CATEGORIES` (`src/lib/utils.js`): `["Fix", "Készlet", "Marketing", "Eszköz", "Szerviz", "Egyéb"]` — ez már lefedi, amit a tulajdonos kért: **Marketing** ✓, **Fix** ✓ (könyvelő/áram-jellegű), **Készlet** ✓ (telefon/alkatrész beszerzés), és **Eszköz** ✓ már most is a "befektetés jellegű, üzletet bővítő" kiadás (pl. új gép) — **nem kell új kategóriát bevezetni**, csak a "Készlet" kategóriához kell az új, okosabb viselkedés.
- `src/components/StockModal.jsx` (6–26. sor): `product` prop alapján dönt edit/add között (`isEdit = !!product`), `costPrice`/`locId` a `product`-ból vagy `defaultLocId`-ból jön.
- `src/components/PartModal.jsx` (5–19. sor): ugyanez a minta, `part` prop, `costPrice`/`quantity` mezők.
- `src/App.jsx` (1256–1270. sor körül): `<StockModal product={stockModal !== "add" ? stockModal : null} ... onSave={(data, locId) => (stockModal !== "add" ? editProduct(...) : addProduct(...))} />` és ugyanez mintára `PartModal`-nál `partModal`-lal. A `stockModal`/`partModal` state `null | "add" | (edit-objektum)`.
- `src/components/TransactionQuickAdd.jsx` — a jelenlegi gyors kiadás/bevétel form, ahol a `category` select van (49–54. sor).
- Már bevett minta a kódban, hogy egy tab megkapja a `setStockModal`/`setPartModal`-t közvetlenül propként (`StockTab` és `PartsTab` már így működik) — ugyanezt a mintát követjük itt is.

---

## 1. "Mi érkezett?" alkategória a kiadás-formon

**Fájl:** `src/components/TransactionQuickAdd.jsx`

- Vezess be egy új helyi state-et: `const [stockKind, setStockKind] = useState("Egyéb");` (`"Telefon" | "Alkatrész" | "Egyéb"`).
- Csak akkor jelenjen meg (a `category` select alatt/mellett, kis segmented-gombokkal, a `.seg`/`.segbtn` meglévő mintáját követve), ha `type === "expense" && category === "Készlet"`:
```jsx
{type === "expense" && category === "Készlet" && (
  <div className="field" style={{ margin: 0 }}>
    <label>Mi érkezett?</label>
    <div className="seg">
      {["Telefon", "Alkatrész", "Egyéb"].map((k) => (
        <button key={k} type="button" className={stockKind === k ? "active" : ""} onClick={() => setStockKind(k)}>{k}</button>
      ))}
    </div>
  </div>
)}
```
- Alapértelmezett `"Egyéb"` — így ha valaki nem nyúl hozzá, a viselkedés pontosan a mai marad (egyszerű kiadás tétel, semmi extra).

---

## 2. A `submit()` bővítése — a kiadás mentése után nyíljon a megfelelő form

**Fájl:** `src/components/TransactionQuickAdd.jsx`

- Vedd fel az új propokat: `openStockModal, openPartModal` (App.jsx-ből a `setStockModal`/`setPartModal` fog ide érkezni).
- A `submit()` függvényben, a sikeres `onAdd(...)` hívás UTÁN, csak kiadásnál és Készlet kategóriánál:
```js
function submit() {
  if (!description.trim() || !amount) { setErr("Leírás és összeg kötelező!"); return; }
  setErr("");
  onAdd({ type, description: description.trim(), amount, costPrice: type === "income" ? (costPrice || 0) : 0, category, payment, locationId: locId }, locId);

  if (type === "expense" && category === "Készlet") {
    if (stockKind === "Telefon") openStockModal({ costPrice: Number(amount) || 0, locationId: locId });
    if (stockKind === "Alkatrész") openPartModal({ costPrice: Number(amount) || 0, source: description.trim() || undefined });
  }

  setDescription(""); setAmount(""); setCostPrice(""); setStockKind("Egyéb");
}
```
Megjegyzés: itt szándékosan egy **sima objektumot** adunk át (nincs `id` mező rajta) — ez különbözteti meg a "prefill új tételtől" az "edit meglévő tételtől" a 3. pontban.

---

## 3. `StockModal`/`PartModal` — prefill támogatás új tételnél

**Fájl:** `src/components/StockModal.jsx`

- A `costPrice` kezdőérték-számítást egészítsd ki egy `prefill` prop olvasásával:
```jsx
export default function StockModal({ product, prefill, locations, onClose, onSave, busy, defaultLocId }) {
  const isEdit = !!product;
  const [f, setF] = useState({
    ...
    costPrice: product?.costPrice ?? prefill?.costPrice ?? "",
    ...
  });
  const [locId, setLocId] = useState(product?.locationId || prefill?.locationId || defaultLocId || locations[0]?.id || "");
```

**Fájl:** `src/components/PartModal.jsx` — ugyanígy:
```jsx
export default function PartModal({ part, prefill, onClose, onSave, busy }) {
  const isEdit = !!part;
  const [f, setF] = useState({
    ...
    costPrice: part?.costPrice ?? prefill?.costPrice ?? "",
    source: part?.source || prefill?.source || "",
    ...
  });
```

---

## 4. App.jsx — a `stockModal`/`partModal` state most már 3 dolog lehet

**Fájl:** `src/App.jsx`

A jelenlegi `null | "add" | edit-objektum` bővül `null | "add" | edit-objektum (van id-je) | prefill-objektum (nincs id-je)`-re. A render-hívásoknál (1256–1270. sor körül) különböztesd meg `id` alapján:

```jsx
{stockModal && (
  <StockModal
    product={typeof stockModal === "object" && stockModal?.id ? stockModal : null}
    prefill={typeof stockModal === "object" && !stockModal?.id ? stockModal : null}
    locations={stockLocations}
    onClose={() => setStockModal(null)}
    busy={busy}
    defaultLocId={defaultStockLocId}
    onSave={(data, locId) => (typeof stockModal === "object" && stockModal?.id ? editProduct(stockModal.id, data, locId) : addProduct(data, locId))}
  />
)}
```
Ugyanígy a `PartModal`-nál `partModal`/`part`/`editPart`-tal.

Kösd be a `FinanceTab`-nak az új propokat (App.jsx-ben, a `<FinanceTab ... />` hívásnál): `setStockModal={setStockModal} setPartModal={setPartModal}`.

**Fájl:** `src/tabs/FinanceTab.jsx` — vedd át `setStockModal, setPartModal`-t propként, add tovább a `TransactionQuickAdd`-nak `openStockModal={setStockModal} openPartModal={setPartModal}` néven (ez felel meg a 2. pontban használt névnek).

---

## 5. Kis egyértelműsítés az "Eszköz" kategórián (opcionális, olcsó)

**Fájl:** ahol a `CATEGORIES`-t select-ként rendered (`TransactionQuickAdd.jsx`, `TransactionModal.jsx`) — ha könnyen megoldható `<option>` szinten egyedi label-lel az érték megtartásával, jelenítsd meg "Eszköz (befektetés)"-ként, hogy egyértelmű legyen a jelentése anélkül, hogy az adatbázisban tárolt `"Eszköz"` értéket megváltoztatnád (ne migrálj adatot emiatt).

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- Rögzíts egy kiadást: Kiadás / Készlet / Telefon / 800 Lei — a kiadás bekerül a listába, ÉS azonnal megnyílik az "Új termék" form, a Beszerzési ár mezőben már 800, a helyszín a kiadáséval egyezik
- Ugyanez Alkatrész-szel — az "Új alkatrész" form nyílik, előtöltött beszerzési árral
- Kiadás / Készlet / Egyéb (vagy sima Marketing/Fix/Eszköz kiadás) — semmi extra nem nyílik, a mai viselkedés változatlan
- A Telefonok fülön a Szerkesztés (meglévő termék módosítása) továbbra is jól működik, nem keveredik össze az új prefill-logikával
- Nincs `git push`, csak lokális commit
