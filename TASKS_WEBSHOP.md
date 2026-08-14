# TASKS — Publikus vitrin (/keszlet) webshop-szintre húzása

**Kontextus:** 2026-08-13-án élőben átnéztem a Flip.ro katalógus- és termékoldalát (Backmarket nem engedett be, geoblokk/bot-védelem). A legerősebb konverziós elemek, amik nálunk hiányoznak:
1. **Horgony-ár** — "Új korban 2.250 Lei → most 1.379 Lei, spórolsz 870 Lei". Ez pszichológiailag a legerősebb elem az oldalukon (anchoring/loss-aversion), és nálunk teljesen hiányzik.
2. **Saját termék-részletoldal** kattintható kártyából — nagyobb fotógaléria, teljes infó.
3. **Szűkösség-jelzés** — nálunk ez különösen hiteles, mert minden darab egyedi fizikai készülék (nem konfigurálható variáns, mint a Flip-nél), tehát ha egy adott márka+modell+tárhely kombóból csak 1 db van készleten, azt tényszerűen ki lehet emelni.

A jelenlegi `/keszlet` (`src/StockShowcase.jsx`) már szolid alap: keresés, márka/állapot szűrő, rendezés, akkumulátor%, garancia-cimke, ár, "Érdekel" CTA. Ezt bővítjük, nem cseréljük le.

**Már megtörtént (DB-szinten, közvetlenül alkalmazva):**
- `products.new_price numeric` oszlop hozzáadva (opcionális, admin tölti ki — becsült új kori ár).
- `get_public_stock()` RPC frissítve, most `new_price`-t is visszaadja.

**FONTOS — olvasd el a `TASKS_SEO_GEO.md`-t is EZ ELŐTT, ha még nem tetted.** A `PhoneDetail.jsx` (4. pont, lent) egy még meg nem írt fájl — ha a `TASKS_SEO_GEO.md` már készen van, azt a fájlt eleve `lang` prop + `src/lib/i18n.js` szótár mintára írd meg, ne hardkódolt magyar szöveggel, mert utólag dupla munka lenne kétnyelvűsíteni.

Ne pusholj / ne deployolj, csak lokális commit, amíg nem szólnak.

---

## 1. Mapperek

**Fájl:** `src/lib/mappers.js` — `pFromApi`/`pToApi` bővítése (a `warranty`/`salePrice` mezők mintájára):
```js
export const pFromApi = (r) => ({
  // ...meglévő mezők...
  newPrice: r.new_price,
});
export const pToApi = (p, locId) => ({
  // ...meglévő mezők...
  new_price: p.newPrice === "" || p.newPrice == null ? null : Number(p.newPrice),
});
```

---

## 2. Admin — "Becsült új kori ár" mező

**Fájl:** `src/components/StockModal.jsx`. Adj egy `newPrice` state mezőt (`product?.newPrice ?? ""`), és egy mezőt az "Eladási ár" mellé (~57–59. sor, a `row2` blokkba, esetleg új sorba, mert most 2 mező van egy sorban):
```jsx
<div className="row2">
  <div className="field"><label>Besz. ár (Lei)</label><input type="number" value={f.costPrice} onChange={set("costPrice")} placeholder="0" /></div>
  <div className="field"><label>Eladási ár (Lei)</label><input type="number" value={f.salePrice} onChange={set("salePrice")} placeholder="0" /></div>
</div>
<div className="field">
  <label>Becsült új kori ár (Lei) <span style={{ color: "#9CA3AF", fontWeight: 400 }}>— opcionális, a vitrinen áthúzva jelenik meg</span></label>
  <input type="number" value={f.newPrice} onChange={set("newPrice")} placeholder="pl. 2500" />
</div>
```
Ne kötelező mező — sok régebbi/ismeretlen modellnél nem lesz kitöltve, ilyenkor a vitrinen egyszerűen nem jelenik meg a horgony-ár blokk (nincs kitalált szám).

---

## 3. `StockShowcase.jsx` — kártya bővítése

**Fájl:** `src/StockShowcase.jsx`.

### 3a. Horgony-ár a kártya alján
A `pub-card-foot` blokkban (~137–140. sor) egészítsd ki:
```jsx
<div className="pub-card-foot">
  <div>
    {p.new_price && Number(p.new_price) > Number(p.sale_price) && (
      <div className="pub-anchor">
        <span className="pub-anchor-old">{Number(p.new_price).toLocaleString("hu-HU")} Lei</span>
        <span className="pub-anchor-save">Spórolsz {Math.round(p.new_price - p.sale_price).toLocaleString("hu-HU")} Lei</span>
      </div>
    )}
    <div className="pub-price mono">{Number(p.sale_price).toLocaleString("hu-HU")}<span className="pub-cur">Lei</span></div>
  </div>
  <a className="pub-ask-btn" href="tel:0773985278" onClick={(e) => e.stopPropagation()}>Érdekel</a>
</div>
```
(A `stopPropagation` azért kell, mert 3c-ben a teljes kártya kattinthatóvá válik — a hívógomb ne navigáljon el.)

### 3b. Szűkösség-jelzés
Számítsd ki a filtered/phones listából, hogy egy adott márka+modell+tárhely kombóból hány darab van készleten összesen (nem csak a szűrt listában — a teljes `phones` tömbből, hogy konzisztens legyen a szűréstől függetlenül):
```js
const stockCounts = useMemo(() => {
  const counts = {};
  phones.forEach((p) => {
    const key = `${p.brand}|${p.model}|${p.storage || ""}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}, [phones]);
```
A kártya tetején (`pub-card-top`, ~112–114. sor), az állapot-pill mellé:
```jsx
<div className="pub-card-top">
  <span className={`pub-cond-pill ${p.condition === "New" ? "new" : "refurb"}`}>{p.condition === "New" ? "Új" : "Felújított"}</span>
  {stockCounts[`${p.brand}|${p.model}|${p.storage || ""}`] === 1 && (
    <span className="pub-scarcity-pill">Utolsó darab</span>
  )}
</div>
```

### 3c. Kártya → részletoldal link
A `pub-card` div (~111. sor) burkold be egy `<a>`-ba, vagy tedd az egészet linkké `display:flex` stílussal, hogy a teljes kártya kattintható legyen:
```jsx
<a key={p.id} href={`/telefon/${p.id}`} className="pub-card">
  {/* ...meglévő tartalom... */}
</a>
```
(A `div` → `a` váltás miatt nézd át, hogy semmilyen benne lévő elem ne törjön el vizuálisan — a CSS-ben a `.pub-card` már flex+column, ez `<a>`-n is működik, csak `text-decoration:none;color:inherit` kell hozzá.)

---

## 4. Új publikus oldal — `PhoneDetail.jsx`

**Új fájl:** `src/PhoneDetail.jsx` — a `StockShowcase.jsx` fejléc/footer mintáját követi (ugyanaz a `pub-header`/`pub-footer`), de a fő tartalom egyetlen telefon részletes bemutatása.

```jsx
import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";

function photoUrl(path) {
  return supabase.storage.from("product-photos").getPublicUrl(path).data.publicUrl;
}

export default function PhoneDetail({ id }) {
  const [phone, setPhone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_public_stock");
      setPhone((data || []).find((p) => p.id === id) || null);
      setLoading(false);
    })();
  }, [id]);

  // fejléc/footer: másold a StockShowcase.jsx <header className="pub-header">...</header>
  // és <footer className="pub-footer">...</footer> blokkjait változtatás nélkül,
  // a kereső/chip sorok nélkül (itt nem kell szűrő).

  if (loading) return <div className="pub-shop"><div className="pub-empty">Betöltés...</div></div>;
  if (!phone) return (
    <div className="pub-shop">
      {/* header ide */}
      <div className="pub-empty">Ez a darab már elkelt, vagy nem található.<br /><a href="/" className="pub-ask-btn" style={{ marginTop: 12 }}>Vissza a készlethez</a></div>
      {/* footer ide */}
    </div>
  );

  const photos = phone.photo_paths || [];

  return (
    <div className="pub-shop">
      {/* header ide, ua. mint StockShowcase-ben */}
      <main className="pub-detail-main">
        <a href="/" className="pub-back-link">← Vissza a készlethez</a>
        <div className="pub-detail-grid">
          <div className="pub-detail-gallery">
            <div className="pub-detail-photo-main">
              {photos.length > 0 ? <img src={photoUrl(photos[activePhoto])} alt={`${phone.brand} ${phone.model}`} /> : <div className="pub-device-art" style={{ height: 320 }} />}
            </div>
            {photos.length > 1 && (
              <div className="pub-detail-thumbs">
                {photos.map((ph, i) => (
                  <button key={i} type="button" className={`pub-detail-thumb${i === activePhoto ? " active" : ""}`} onClick={() => setActivePhoto(i)}>
                    <img src={photoUrl(ph)} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="pub-detail-info">
            <span className={`pub-cond-pill ${phone.condition === "New" ? "new" : "refurb"}`}>{phone.condition === "New" ? "Új" : "Felújított"}</span>
            <h1 className="pub-detail-title">{phone.brand} {phone.model}</h1>
            <div className="pub-detail-specs">
              {phone.storage && <div><b>Tárhely</b> {phone.storage}</div>}
              {phone.color && <div><b>Szín</b> {phone.color}</div>}
              {phone.battery_health != null && <div><b>Akkumulátor</b> {phone.battery_health}%</div>}
              {phone.warranty && <div><b>Garancia</b> {phone.warranty}</div>}
            </div>
            {phone.new_price && Number(phone.new_price) > Number(phone.sale_price) && (
              <div className="pub-anchor" style={{ fontSize: 14 }}>
                <span className="pub-anchor-old">{Number(phone.new_price).toLocaleString("hu-HU")} Lei</span>
                <span className="pub-anchor-save">Spórolsz {Math.round(phone.new_price - phone.sale_price).toLocaleString("hu-HU")} Lei</span>
              </div>
            )}
            <div className="pub-detail-price mono">{Number(phone.sale_price).toLocaleString("hu-HU")}<span className="pub-cur">Lei</span></div>
            <a className="pub-ask-btn" style={{ padding: "13px 22px", fontSize: 14 }} href="tel:0773985278">Érdekel — hívj minket</a>
            <div className="pub-detail-note">Az ár és a készlet folyamatosan frissül, végleges adásvétel az üzletben történik.</div>
          </div>
        </div>
      </main>
      {/* footer ide */}
    </div>
  );
}
```

**Figyelem:** a fenti kódvázlatban a header/footer helyére másold be szó szerint a `StockShowcase.jsx`-ben már meglévő `<header className="pub-header">...</header>` és `<footer className="pub-footer">...</footer>` JSX blokkokat (esetleg emeld ki egy közös `PublicHeader.jsx`/`PublicFooter.jsx` komponensbe, hogy ne legyen duplikált kód a két fájlban — ez a tisztább megoldás, ha nem sokkal több munka).

---

## 5. Routing

**Fájl:** `src/main.jsx`. Adj egy új regex-et és ágat, a `/status/:token` minta szerint:
```js
const phoneDetailMatch = window.location.pathname.match(/^\/telefon\/([0-9a-f-]{36})\/?$/i);
```
```jsx
if (phoneDetailMatch) return <PhoneDetail id={phoneDetailMatch[1]} />;
```
(a `stockMatch`-csal egy sorrendben, mielőtt a `stockMatch` ág lefutna), és importáld: `import PhoneDetail from "./PhoneDetail.jsx";`.

---

## 6. CSS — `src/index.css`

A meglévő `--pub-*` változókra és a `.pub-*` osztályokra építve (ne definiálj új színpalettát):

```css
.pub-scarcity-pill{font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:999px;background:#FEE2E2;color:#DC2626}
.pub-anchor{display:flex;align-items:baseline;gap:8px;margin-bottom:2px}
.pub-anchor-old{font-size:12px;color:var(--pub-ink-soft);text-decoration:line-through}
.pub-anchor-save{font-size:11px;font-weight:700;color:var(--pub-accent-ink);background:var(--pub-accent-soft);padding:2px 7px;border-radius:6px}

.pub-detail-main{max-width:1000px;margin:0 auto;padding:24px}
.pub-back-link{display:inline-block;margin-bottom:16px;font-size:13px;color:var(--pub-ink-soft);text-decoration:none}
.pub-back-link:hover{color:var(--pub-ink)}
.pub-detail-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:40px}
@media (max-width:760px){.pub-detail-grid{grid-template-columns:1fr}}
.pub-detail-photo-main{background:var(--pub-paper-raised);border:1px solid var(--pub-line);border-radius:16px;height:380px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.pub-detail-photo-main img{max-width:100%;max-height:100%;object-fit:contain}
.pub-detail-thumbs{display:flex;gap:8px;margin-top:10px}
.pub-detail-thumb{width:56px;height:56px;border-radius:9px;border:1px solid var(--pub-line);overflow:hidden;padding:0;cursor:pointer;background:var(--pub-paper-raised)}
.pub-detail-thumb.active{border-color:var(--pub-accent)}
.pub-detail-thumb img{width:100%;height:100%;object-fit:cover}
.pub-detail-title{font-size:26px;font-weight:800;margin:10px 0 14px}
.pub-detail-specs{display:flex;flex-direction:column;gap:6px;font-size:13.5px;color:var(--pub-ink-soft);margin-bottom:16px}
.pub-detail-specs b{color:var(--pub-ink);font-weight:600;margin-right:6px}
.pub-detail-price{font-size:30px;font-weight:800;margin:6px 0 16px}
.pub-detail-note{font-size:12px;color:var(--pub-ink-soft);margin-top:12px}
```

`.pub-card` legyen `<a>` elemként is ugyanúgy néz ki — ha kell, egészítsd ki:
```css
a.pub-card{text-decoration:none;color:inherit}
```

---

## Ellenőrzőlista implementálás után

- Admin fel tud tölteni egy "becsült új kori ár"-at egy telefonhoz, és az mentődik
- A vitrin kártyáin, ahol van kitöltött új kori ár és az nagyobb az eladási árnál, megjelenik az áthúzott ár + "Spórolsz X Lei" — ahol nincs kitöltve, nem jelenik meg semmi extra (nincs kitalált szám)
- Ahol egy márka+modell+tárhely kombóból csak 1 db van készleten, megjelenik az "Utolsó darab" jelzés
- Kártyára kattintva a `/telefon/:id` oldal nyílik meg, helyes adatokkal, több fotóval (ha van), és van "Vissza a készlethez" link
- Ha valaki egy már eladott/törölt telefon linkjét nyitja meg, nem hibaüzenetet lát, hanem egy barátságos "ez a darab már elkelt" szöveget + vissza-linket
- Mobilon (keskeny nézet) a részletoldal egy oszlopba rendeződik, nem törik el
