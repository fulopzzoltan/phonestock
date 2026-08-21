# TASKS — Alkatrész raktár (PartsTab) letisztítás + lista/rács nézetváltó

Kód alapján pontosítva (`src/tabs/PartsTab.jsx`). **Előzetes ellenőrzés**: a "KPI kártyák törlése (Tételek, Készlet érték)" pont már nincs a kódban — ezt korábban már megoldotta a másik session, itt nincs teendő. Az alábbi 4 pont az, ami ténylegesen még hátravan.

## 1. Keresőmező placeholder törlése — 51. sor

```jsx
<div className="searchbar"><SearchIcon /><input value={partSearch} onChange={(e) => setPartSearch(e.target.value)} /></div>
```
(a `placeholder="Keresés név, márka, kategória, forrás szerint..."` attribútum törlődik)

## 2. Lista/Rács nézetváltó

Új state: `const [viewMode, setViewMode] = useState("list");` — a `.filter-row` jobb szélére (a `select` mellé, `margin-left:auto` wrapperben, ahogy a Telefon-adatlap Törlés-gombjánál is tettük) kerüljön egy toggle:
```jsx
<div className="seg" style={{ marginLeft: "auto" }}>
  <button type="button" className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")} title="Lista"><ListViewIcon width={15} height={15} /></button>
  <button type="button" className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")} title="Rács"><GridViewIcon width={15} height={15} /></button>
</div>
```
`ListViewIcon`/`GridViewIcon` **már léteznek** a `src/components/icons.jsx`-ben (142. és 149. sor), csak importálni kell.

A kategóriánkénti blokkokon belül (69-105. sor) a `viewMode === "list"` esetén marad a mostani `<table>`, `viewMode === "grid"` esetén egy kártya-rács jelenjen meg ugyanazokból az `items`-ekből — minimál kártya-tartalom: alkatrész neve + kód, márka/illik (ha van), készlet mennyiség, beérkezési ár, forrás. Vizuálisan a már meglévő `.stk-card` mintát kövesd (a `TASKS_TELEFON_KARTYA_REDESIGN.md` szerinti Figma-alapú kártya-stílus), hogy konzisztens legyen a Telefonok fül rácsnézetével — ne találj ki új vizuális nyelvet.

## 3. Ikonkörök eltávolítása a táblázatos nézetből

A 83-89. sor `.stk-row`-jából vedd ki a `<Thumb brand={p.category || p.name} />` sort — a lista-nézetben csak szöveg maradjon (alkatrész neve + kód), ikon-kör nélkül. (A rács-nézetben, ha a `.stk-card` minta kéri, ott maradhat egy kép/ikon — a "karika eltávolítás" kifejezetten a táblázatos sorokra vonatkozik.)

## 4. "Alkatrész" + "Márka/Illik" oszlopok összevonása

Jelenlegi fejléc (78. sor): `Alkatrész | Márka/Illik | Készlet | Beérk. ár | Forrás | (akciók)` — 6 oszlop, két oszlopban részben átfedő infó (a `p.name` gyakran már tartalmazza a márkát/modellt, pl. "iPhone 13 kijelző", a "Márka/Illik" oszlop pedig újra kiírja).

Új, összevont szerkezet — a "Márka/Illik" saját oszlopa megszűnik, a tartalma az Alkatrész-cellán belülre kerül, kisebb, halványabb második sorként (ugyanaz a minta, mint a `stk-sub` a kód alatt):
```jsx
<td>
  <div>
    <div className="stk-name">{p.name}</div>
    <div className="stk-sub">
      {partCode(p.partNo) || "—"}
      {(p.brand || p.modelFit) && ` · ${[p.brand, p.modelFit].filter(Boolean).join(" · ")}`}
    </div>
  </div>
</td>
```
Fejléc 5 oszlopra csökken: `Alkatrész | Készlet | Beérk. ár | Forrás | (akciók)` — szellősebb, kevesebb duplikált infó, jobban olvasható sortördelés.

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- Keresőmezőben nincs placeholder
- Lista/Rács váltógomb működik, mindkét nézet ugyanazt az adatot mutatja
- Táblázatos nézetben nincs ikon-kör a sorok elején
- Egy oszlop (Alkatrész) tartalmazza a nevet + kódot + márka/illik infót, nincs külön duplikált oszlop
- Nincs `git push`, csak lokális commit
