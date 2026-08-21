# TASKS — Kliensek (CustomersTab) vizuális letisztítás

Kód alapján pontosítva (`src/tabs/CustomersTab.jsx`, `src/index.css`). **Előzetes ellenőrzés**: a "KPI kártyák törlése (Ügyfelek, Összes bevétel, Átlag/Ügyfél)" pont már nincs a kódban — nincs teendő. Az alábbi 4 pont a ténylegesen hátralévő munka.

## 1. Keresőmező placeholder törlése — 43. sor

```jsx
<div className="searchbar"><SearchIcon /><input value={custSearch} onChange={(e) => setCustSearch(e.target.value)} /></div>
```

## 2. Monogram karikák törlése

Vedd ki a `<Thumb brand={c.name || "?"} />`-t mindkét helyről: a desktop táblázat `.stk-row`-jából (64. sor) és a mobil kártya fejlécéből (81. sor) — csak a név maradjon, ikon-kör nélkül:
```jsx
<td><div className="stk-name">{c.name || "Névtelen"}</div></td>
```
```jsx
<div className="mob-row-main"><span>{c.name || "Névtelen"}</span></div>
```

## 3. Típus-jelvények (Új/Visszatérő) letisztítása

**Konkrét ok, amiért ez most tényleg zavaró**: megnéztem a CSS-t (`src/index.css` 172-173. sor) — a `.badge-loc` ("Új") és a `.badge-income` ("Visszatérő") **mindkettő zöld** (`#15803D`/`#DCFCE7` háttér), tehát a jelenlegi színkódolás semmit nem különböztet meg, csak feleslegesen zöld mindkét címke. Új, semleges osztály kell:

```css
.badge-neutral{display:inline-flex;padding:2px 8px;border-radius:999px;font-size:10.5px;font-weight:600;background:#F3F4F6;color:#4B5563;border:1px solid #E5E7EB}
```
`CustomersTab.jsx` 69. és 82. sor:
```jsx
{c.isNew ? <span className="badge-neutral">Új</span> : <span className="badge-neutral" style={{ fontWeight: 500 }}>Visszatérő</span>}
```
(mindkettő szürke, csak az "Új" marad kicsit hangsúlyosabb — `fontWeight: 600` vs `500` —, nem a szín különbözteti meg őket)

## 4. Nullás értékek (`0 db · 0 Lei`) halványítása

A `Vásárlások`/`Szerviz` cellákban (70-71. sor desktop, 86-87. sor mobil), ha nincs tényleges aktivitás, halványabb szürke legyen, hogy a valódi forgalmú ügyfelek azonnal kiugorjanak:

```jsx
<td>
  <span style={c.purchases.length === 0 ? { color: "#C1C5CB" } : undefined}>
    {c.purchases.length} db · <span className="mono">{money(c.purchaseTotal)}</span>
  </span>
</td>
<td>
  <span style={c.tickets.length === 0 ? { color: "#C1C5CB" } : undefined}>
    {c.tickets.length} db · <span className="mono">{money(c.ticketTotal)}</span>
  </span>
</td>
```
Ugyanez a minta a mobil-kártya `mob-row-sub` két span-jén is (86-87. sor).

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- Keresőmezőben nincs placeholder
- Nincs monogram-kör a nevek előtt (sem desktop, sem mobil nézetben)
- "Új"/"Visszatérő" szürke, semleges jelvény, nem zöld
- 0 db · 0 Lei sorok láthatóan halványabbak, mint a valós forgalmú ügyfelek adatai
- Nincs `git push`, csak lokális commit
