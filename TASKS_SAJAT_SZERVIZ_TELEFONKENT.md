# TASKS — Saját készlet szerviz indítása telefonközpontúan

## A probléma

Jelenleg egy saját telefon előkészítését (vagy garanciális javítását) pontosan úgy kell felvinni, mint egy ügyfél-szervizt: Szerviz fül → "+ Új munkalap" → "Kinek?" legördülőben átváltani "Saját készlet"-re → utána IMEI/márka/modell alapján visszakeresni a már felvitt terméket a `products` táblából (`src/components/TicketFormModal.jsx` 44–118. sor). Ez két, egymástól független adatbeviteli lépés (előbb felvinni a telefont, aztán külön keresni egy szerviz-formon), tele olyan mezővel, ami saját készletnél irreleváns (ügyfél neve/telefonszáma, szervizgarancia-elfogadás, marketing hozzájárulás, SLA határidő). A vizuális alkatrész-választó (`PhonePartsPicker.jsx`, már él a munkalap részletnézetében) is csak azután érhető el, hogy végigmentél ezen.

**A cél:** a saját készlet előkészítése/garanciális javítása induljon magáról a telefon oldaláról (`ProductDetailPanel`), ne a szerviz-munkalap generikus formjáról. Ott azonnal elérhető legyen a vizuális alkatrész-címkézés és a belőle épülő anyagköltség — "mi kellett hozzá" egy helyen, a telefonnal együtt.

Az ügyfél-szerviz felvétele (Szerviz fül, "+ Új munkalap") **változatlan marad** — ezt nem bántjuk.

---

## 1. Melyik telefonnak van már nyitott saját munkája? (`src/App.jsx`)

Kell egy lookup, ami megmondja, egy adott terméknek van-e már nyitott (nem "Átadva") saját-készlet munkalapja:
```js
const activeServiceTicket = useMemo(() => {
  if (!detailProduct) return null;
  return tickets.find((t) => t.productId === detailProduct.id && t.ticketKind !== "Ügyfél" && t.subStatus !== "Átadva") || null;
}, [tickets, detailProduct]);
```
(A `detailProduct` már létezik az App.jsx-ben, a `ProductDetailPanel` ebből kapja a `product`-ot.)

Add tovább propként a `ProductDetailPanel`-nek: `activeServiceTicket={activeServiceTicket}`, illetve a hozzá tartozó felhasznált alkatrészeket: `usedParts={activeServiceTicket?.usedParts || []}`.

---

## 2. Új, könnyű indító modal: `src/components/OwnStockServiceModal.jsx`

Csak azt kérdezi, ami tényleg kell — nincs ügyfél mező, nincs SLA, nincs consent, nincs fólia, nincs árajánlat (az anyagköltség a majd hozzáadott alkatrészekből fog összeállni, nem előre beírt szám).

```jsx
import { useState } from "react";
import LocationField from "./LocationField";
import { CloseIcon } from "./icons";
import { PROBLEM_TAGS } from "../lib/utils";

export default function OwnStockServiceModal({ product, kind, locations, users = [], onClose, onSave, busy }) {
  const [tags, setTags] = useState([]);
  const [extra, setExtra] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [locId, setLocId] = useState(product.locationId || locations[0]?.id || "");
  const toggleTag = (tag) => setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
  const hasIssue = tags.length > 0 || extra.trim();

  function submit() {
    if (!hasIssue) return;
    const issue = [tags.join(","), extra.trim()].filter(Boolean).join(",");
    onSave({
      ticketKind: kind,
      productId: product.id,
      brand: product.brand,
      model: product.model,
      imei: product.imei || "",
      customerName: "Saját készlet",
      customerPhone: "",
      customerId: null,
      price: 0,
      matCost: 0,
      warranty: "",
      handoverDate: "",
      dueDate: "",
      folia: false,
      status: "Átvett",
      subStatus: null,
      assignedTo: assignedTo || null,
      consentAt: null,
      issue,
    }, locId);
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <h2>
          {kind === "Saját készlet - garanciális" ? "Garanciális javítás felvétele" : "Szerviz előkészítés indítása"}
          <button className="iconbtn" onClick={onClose}><CloseIcon /></button>
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid #E5E7EB", borderRadius: 8, marginBottom: 14, fontSize: 13.5, fontWeight: 600 }}>
          {product.brand} {product.model}{product.imei ? ` — IMEI ${product.imei}` : ""}
        </div>
        <LocationField locations={locations} value={locId} onChange={setLocId} />
        <div className="field" style={{ marginTop: 10 }}>
          <label>Mit kell csinálni? {!hasIssue && <span style={{ color: "#DC2626", fontWeight: 400, textTransform: "none" }}>— válassz egy tag-et vagy írj leírást</span>}</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {PROBLEM_TAGS.map((tag) => (
              <button key={tag} type="button" className={`prob-tag${tags.includes(tag) ? " active" : ""}`} onClick={() => toggleTag(tag)}>{tag}</button>
            ))}
          </div>
          <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Egyedi leírás (opcionális)" />
        </div>
        <div className="field">
          <label>Technikus</label>
          <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">— nincs hozzárendelve —</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.fullName || u.email}</option>)}
          </select>
        </div>
        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!hasIssue || busy} onClick={submit}>{busy ? "Mentés..." : "Indítás"}</button>
        </div>
      </div>
    </div>
  );
}
```

---

## 3. `ProductDetailPanel.jsx` — a telefon oldala mutassa a szervizt

**a) Új propok:** `activeServiceTicket, parts = [], onAddPart, onRemovePart, onStartService, onOpenTicket`.

**b) Vedd fel a `PhonePartsPicker` importot:** `import PhonePartsPicker from "./PhonePartsPicker";`

**c) Az "Termék adatok" szekció (jelenlegi 20–31. sor) és a "Pénzügyek" szekció közé** szúrd be:
```jsx
<div className="dp-section">
  <div className="dp-section-title">Előkészítés / szerviz</div>
  {activeServiceTicket ? (
    <>
      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 10 }}>
        {activeServiceTicket.ticketKind === "Saját készlet - garanciális" ? "Garanciális javítás folyamatban" : "Előkészítés folyamatban"}
        {activeServiceTicket.assignedTo && ` — ${users.find((u) => u.id === activeServiceTicket.assignedTo)?.fullName || ""}`}
      </div>
      <PhonePartsPicker
        usedParts={activeServiceTicket.usedParts || []}
        availableParts={parts.filter((p) => Number(p.quantity) > 0)}
        allParts={parts}
        onAdd={(part, qty) => onAddPart(activeServiceTicket.id, part, qty)}
        onRemove={(sp) => onRemovePart(activeServiceTicket.id, sp)}
        busy={busy}
      />
      <button type="button" className="btn sec sm" style={{ marginTop: 10 }} onClick={() => onOpenTicket(activeServiceTicket.id)}>Munkalap megnyitása (státusz, probléma)</button>
    </>
  ) : (
    <button type="button" className="btn sec sm" disabled={busy} onClick={() => onStartService(product)}>
      {isSold ? "Garanciális javítás felvétele" : "Szerviz előkészítés indítása"}
    </button>
  )}
</div>
```
Ehhez a `ProductDetailPanel` signature-jébe fel kell venni a `users` propot is (a technikus névhez).

---

## 4. `App.jsx` vezetékezés

**a) Új state:** `const [ownServiceModal, setOwnServiceModal] = useState(null); // { product, kind } | null`

**b) Handler:**
```js
function openOwnServiceModal(product) {
  const kind = product.status === "sold" ? "Saját készlet - garanciális" : "Saját készlet - előkészítés";
  setOwnServiceModal({ product, kind });
}
async function saveOwnServiceTicket(data, locId) {
  await addTicket(data, locId);
  setOwnServiceModal(null);
  // szándékosan NEM zárjuk be a ProductDetailPanel-t — a felhasználó rögtön lássa
  // a most létrejött "Előkészítés / szerviz" szekciót és kezdje címkézni az alkatrészeket.
}
```
Megjegyzés: az `addTicket` (726–754. sor) jelenleg a hívás végén `setTicketModal(null)`-t hív — ez a saját flow-nál irreleváns (mert nem `setTicketModal`-lal nyitottuk), de nem árt, mert az úgyis `null` már. Nem kell hozzányúlni.

**c) Render — a `ProductDetailPanel` hívásnál (kb. 1389–1400. sor) egészítsd ki:**
```jsx
{detailProduct && (
  <ProductDetailPanel
    product={detailProduct}
    saleTx={detailProduct.status === "sold" ? txByProductId.get(detailProduct.id) : null}
    locName={locName}
    busy={busy}
    users={users}
    parts={parts}
    activeServiceTicket={tickets.find((t) => t.productId === detailProduct.id && t.ticketKind !== "Ügyfél" && t.subStatus !== "Átadva") || null}
    onAddPart={addPartToTicket}
    onRemovePart={removePartFromTicket}
    onStartService={openOwnServiceModal}
    onOpenTicket={(id) => { setProductDetailId(null); setDetailId(id); }}
    onClose={() => setProductDetailId(null)}
    onSell={(p) => { setProductDetailId(null); setSellModal(p); }}
    onEdit={(p) => { setProductDetailId(null); setStockModal(p); }}
    onDelete={(id) => { deleteProduct(id); setProductDetailId(null); }}
  />
)}
{ownServiceModal && (
  <OwnStockServiceModal
    product={ownServiceModal.product}
    kind={ownServiceModal.kind}
    locations={locations}
    users={users}
    busy={busy}
    onClose={() => setOwnServiceModal(null)}
    onSave={saveOwnServiceTicket}
  />
)}
```
Import: `import OwnStockServiceModal from "./components/OwnStockServiceModal";`

---

## 5. "Kinek?" legördülő teljes eltávolítása a munkalap-formról

A `TicketFormModal.jsx`-en (`src/components/TicketFormModal.jsx`) a "Kinek?" választó (jelenleg 66–76. sor) **teljesen kikerül**. Ez a form mostantól kizárólag ügyfél-munkalapot hoz létre — a saját készlet indítása innentől kizárólag a telefon adatlapjáról megy (2–4. pont).

- Töröld a "Kinek?" `<div className="field">` blokkot (66–76. sor) teljesen.
- Az `f` kezdőállapotban (18. sor) a `ticketKind` maradjon `ticket?.ticketKind || "Ügyfél"` — ez fontos: **szerkesztésnél** (ha egy meglévő saját-készletes munkalapot nyitsz meg "Szerkesztés"-sel a `DetailPanel`-ből) a form továbbra is helyesen jeleníti meg a termék-mezőt ügyfél-mezők helyett (92–131. sor változatlan marad, az `isOwnStock` változó is marad), csak már nincs mód új ticketnél átváltani rá — mert újnál a `ticketKind` mindig `"Ügyfél"` lesz, hiszen a `onChange`-es váltógomb megszűnt.
- A `set("ticketKind")`-et használó `onChange` és a hozzá tartozó `<option>`-ök törlődnek a `<select>`-tel együtt — semmi más helyen nincs rá hivatkozás.
- Eredmény: a Szerviz fülön a "+ Új munkalap" gomb mostantól kizárólag ügyfél-munkalapot hoz létre; a saját készlet előkészítése/garanciális javítása kizárólag a Telefonok fülről, a termék adatlapjáról indítható (2–4. pont szerint).

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- Egy még nem eladott (raktáron lévő) telefon adatlapján megjelenik a "Szerviz előkészítés indítása" gomb, ha nincs neki nyitott saját munkája
- Rákattintva egy könnyű, csak a lényeget kérdező modal nyílik (probléma, technikus, helyszín) — nincs benne ügyfél mező, SLA, fólia, consent
- Létrehozás után a telefon adatlapján azonnal megjelenik a vizuális alkatrész-választó (`PhonePartsPicker`), alkatrész hozzáadásakor a telefon beszerzési ára (`costPrice`) frissül (ez a szinkron már működik)
- Egy eladott telefon adatlapján a gomb neve "Garanciális javítás felvétele", és `ticketKind = "Saját készlet - garanciális"` jön létre
- "Munkalap megnyitása" gombra a teljes munkalap-részletnézet nyílik meg (státuszváltás stb. onnan megy, ahogy eddig)
- A Szerviz fül "+ Új munkalap" gombja mostantól kizárólag ügyfél-munkalapot hoz létre, "Kinek?" választó nincs a formon
- Egy meglévő saját-készletes munkalap "Szerkesztés"-e a `DetailPanel`-ből még mindig helyesen jeleníti meg a termék-mezőt (nem tört el a szerkesztő nézet)
- Nincs `git push`, csak lokális commit
