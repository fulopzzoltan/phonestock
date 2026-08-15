# TASKS — Telefon-eladás garancia: szöveg + nyomtatás

Ez egy végrehajtható feladatlista a kódoló agentnek (Claude Code).

**Fontos, mielőtt bármihez hozzányúlsz:** a lenti garanciaszöveg a tulajdonos valódi üzleti feltétele — **ne módosítsd, ne rövidítsd, ne fogalmazd át**, karakterre pontosan ezt tedd be, ugyanúgy, ahogy a meglévő `SERVICE_WARRANTY_TERMS` konstans is szó szerint van átvéve (ld. `src/lib/utils.js` 171. sor, és a projekt `CLAUDE.md`-jének idevágó szabálya).

**Ne pusholj / ne deployolj**, csak lokális commit, amíg nem szólnak.

---

## Amit már megnéztem — a jelenlegi állapot (hogy ne kelljen újra kideríteni)

- Amikor egy telefont eladsz (`SellModal.jsx`), a termék `warranty` mezője (amit az intake-nél állítasz be, pl. "1 év") **már most is** átkerül a tranzakcióba (`tx.warranty`), és emiatt a Garancia fülön **automatikusan megjelenik** minden eladott, garanciás telefon — ez már működik, ehhez nem kell semmit építeni.
- Amit viszont most találtam: **sehol nincs ténylegesen kiírva a garanciaszöveg egy eladott telefonnál.**
  - `src/components/PrintReceiptSlip.jsx` (ez nyomtatódik ki eladáskor) — nincs benne semmilyen garanciaszöveg.
  - `src/ReceiptLookup.jsx` (publikus `/receipt` oldal, ahol az ügyfél a bizonylatszám+telefonszám alapján megnézheti) — szintén nincs benne.
  - `src/components/PrintWarrantySlip.jsx` (az önálló "Garancialevél" dokumentum, amit a Garancia fülről lehet nyomtatni) — ez **már megkülönbözteti** `w.kind === "sale"` esetén a címet ("Telefon garancia" vs "Szerviz garancia"), **de a szöveg-blokk alul mindig `SERVICE_WARRANTY_TERMS`-t írja ki**, sale esetén is — ez egy konkrét hiba, 33. sor.
- `src/components/ProductDetailPanel.jsx` (ahova az Eladott telefonok listában rákattintva jutsz) — jelenleg **nincs benne se garancia-állapot (lejár/lejárt), se Nyomtatás gomb**. A szerviz-oldali megfelelője (`DetailPanel.jsx`) már rég óta tud ilyet, ez csak nem lett átvezetve a telefon-eladás oldalra.
- Nyomtatás-infrastruktúra már megvan és működik (`printReceiptSlip(tx)` App.jsx-ben, `#print-slip-root` + `window.print()` trükk) — csak be kell kötni a `ProductDetailPanel`-re.

---

## 1. Az új garanciaszöveg konstans

**Fájl:** `src/lib/utils.js`, közvetlenül a `SERVICE_WARRANTY_TERMS` (171–201. sor) alá

```js
export const SALE_WARRANTY_TERMS = `Garanciális Feltételek és a Javítás Menete

1. A garanciális ügyintézés menete (A 3 lépcsős folyamat)
Adatbiztonság: A telefon behozatala előtt a kliens köteles lementeni a személyes adatait. Az adatok esetleges elvesztéséért felelősséget nem vállalunk.

1. lépcső (Javítás): Vállaljuk, hogy a jogos garanciális hibát a telefon beadásától számított 10 munkanapon belül megpróbáljuk szakszerűen megcsinálni, kiváló minőségű vagy felújított alkatrészekkel.
2. lépcső (Csere): Ha a telefont 10 munkanap alatt nem lehet megjavítani, a kliensnek egy ugyanolyan paraméterekkel rendelkező cserekészüléket adunk.
3. lépcső (Pénzvisszafizetés): Ha a csere nem megoldható (pl. nincs készleten), vagy a hiba a javítás után is visszatér, a vásárló visszakérheti a pénzét. Kisebb esztétikai vagy programhibák miatt a vételár nem kérhető vissza.

2. A garancia NEM érvényes az alábbi esetekre:
Nem rendeltetésszerű használat: Helytelen kezelés vagy nem engedélyezett programok (pl. rootolás, béta rendszerek, nem hivatalos applikációk) telepítése.
Mechanikai sérülések: Leesésből, ütődésből, repedésből vagy egyéb fizikai behatásból eredő károk a házon vagy a képernyőn.
Külső tényezők: Folyadék, pára, nedvesség, por vagy egyéb idegen anyag okozta meghibásodások (beázás, oxidáció).
Illetéktelen beavatkozás: Bármely más szerviz vagy magánszemély által végzett javítás, szétszerelés vagy módosítás.
Szoftveres hibák: A vásárlás utáni frissítések vagy szoftveres módosítások miatt fellépő hibák.
Természetes elhasználódás: A telefon normál használatából eredő kopása (pl. karcolások, képernyő beégése, gombok vagy csatlakozók kopása).
Rossz tartozékok: Nem gyári, vagy gyenge minőségű töltők, kábelek és kiegészítők használatából adódó hibák.

3. Speciális szabályok az AKKUMULÁTORRA
Normál elhasználódás (Nem garanciális): Az akku fogyóeszköz. Kapacitásának természetes csökkenése (pl. ha a napi használat során az életereje 80% alá esik) nem számít garanciális hibának.
Garanciális csere (Kizárólag gyári hiba esetén): Az akkut csak igazolt gyári vagy technikai hiba esetén cseréljük (pl. ha megdagadt/felfúvódott, belső zárlatos, vagy a telefon váratlanul kikapcsol 30-40%-os töltöttségnél).

4. Speciális szabályok a fiókokra (iCloud / Google blokkolás)
Fiók- és jelszó problémák: A garancia csak a telefon gyári és hardveres működésére érvényes. Nem vállalunk garanciát arra, ha a kliens az első beállítás vagy az iCloud / Google-fiók regisztráció során elfelejti a jelszavait, rosszul állítja be a fiókját, és emiatt a telefon blokkolja magát (Activation Lock / FRP). Ezek a felhasználói szoftverhibák nem tartoznak a garanciába, így csere vagy pénzvisszafizetés sem kérhető értük.`;
```

Ellenőrzés: `diff` a fenti szöveget a feladatban kapott eredetivel — egy karakternek sem szabad eltérnie (ékezet, írásjel, sortörés).

---

## 2. `PrintWarrantySlip.jsx` — a hibás mindig-service szöveg javítása

**Fájl:** `src/components/PrintWarrantySlip.jsx`

- Import bővítése: `SALE_WARRANTY_TERMS` is jöjjön a `../lib/utils`-ból.
- 32–34. sor:
```jsx
<div style={{ fontSize: 10.5, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-line", borderTop: "1px solid #E5E7EB", paddingTop: 16 }}>
  {w.kind === "sale" ? SALE_WARRANTY_TERMS : SERVICE_WARRANTY_TERMS}
</div>
```

---

## 3. `PrintReceiptSlip.jsx` — a ténylegesen kinyomtatott bizonylat kapjon garanciaszöveget

**Fájl:** `src/components/PrintReceiptSlip.jsx`

- Import bővítése: `SALE_WARRANTY_TERMS` a `../lib/utils`-ból.
- A táblázat (25–36. sor) alá, csak ha `tx.warranty` létezik, tegyél egy ugyanolyan blokkot, mint a `PrintWarrantySlip.jsx`-ben:
```jsx
{tx.warranty && (
  <div style={{ fontSize: 10.5, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-line", borderTop: "1px solid #E5E7EB", paddingTop: 16, marginTop: 16 }}>
    {SALE_WARRANTY_TERMS}
  </div>
)}
```

---

## 4. `ReceiptLookup.jsx` — publikus `/receipt` oldal ugyanígy

**Fájl:** `src/ReceiptLookup.jsx`

- Import bővítése: `SALE_WARRANTY_TERMS` a `./lib/utils`-ból.
- Kövesd pontosan a `src/StatusLookup.jsx` 109–111. sorában lévő mintát (ugyanolyan szürke doboz, `whiteSpace:"pre-line"`), tedd be a `dp-section` (76–93. sor) alá, csak ha `result.warranty` létezik:
```jsx
{result.warranty && (
  <div style={{ background: "#F9FAFB", border: "1px solid #EEF0F2", borderRadius: 12, padding: 14, fontSize: 11, color: "#6B7280", lineHeight: 1.6, whiteSpace: "pre-line", marginTop: 14 }}>
    {SALE_WARRANTY_TERMS}
  </div>
)}
```

---

## 5. `ProductDetailPanel.jsx` — garancia-állapot + Nyomtatás gomb eladott telefonnál

**Fájl:** `src/components/ProductDetailPanel.jsx`

- Import bővítése: `warrantyExpiry, isWarrantyActive` a `../lib/utils`-ból (a `money, phoneCode` mellé, 1. sor).
- Vedd fel a `onPrint` propot a komponens argumentumai közé (7. sor: `... onDelete, busy, onPrint`).
- A "Termék adatok" szekció `Garancia` sorát (32. sor) cseréld le, hogy `isSold` esetén a `saleTx.date`-hez viszonyított tényleges státuszt mutassa, nem csak a nyers `product.warranty` szöveget:
```jsx
<Row k="Garancia" v={product.warranty ? (
  isSold && saleTx ? (
    <span className={`st ${isWarrantyActive(saleTx.date, product.warranty) ? "st-kesz" : "st-kiadva"}`}>
      {product.warranty} — {isWarrantyActive(saleTx.date, product.warranty) ? "érvényes" : "lejárt"} {warrantyExpiry(saleTx.date, product.warranty)}-ig
    </span>
  ) : <span className="gar-pill">{product.warranty}</span>
) : null} />
```
- A `dp-actions` blokkban (51–55. sor), a "Szerkesztés" gomb elé, csak ha `isSold && saleTx && product.warranty`:
```jsx
{isSold && saleTx && product.warranty && (
  <button className="btn sec sm" disabled={busy} onClick={() => onPrint(saleTx)}>Nyomtatás</button>
)}
```

**Fájl:** `src/App.jsx`, a `<ProductDetailPanel ... />` hívás (kb. 1272–1281. sor) — adj hozzá egy sort:
```jsx
onPrint={printReceiptSlip}
```
(a `printReceiptSlip` függvény már létezik és működik, ugyanígy van bekötve a `SaleReceiptPanel`-nél is, 1309. sor körül — ugyanaz a minta.)

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- Adj el (teszt-adattal) egy garanciás telefont, nyomtasd ki a bizonylatot — a garanciaszöveg alul megjelenik, szó szerint egyezik a kapott szöveggel
- Az Eladott telefonok listában kattints rá a most eladott darabra — látod a garancia-állapotot (érvényes / lejárt, dátummal) és egy Nyomtatás gombot, ami ugyanazt a bizonylatot nyomtatja ki
- A Garancia fülön a most eladott telefon automatikusan megjelenik (ez már eddig is működött, csak ellenőrizd)
- A publikus `/receipt` oldalon egy garanciás bizonylat lekeresésekor lent megjelenik a szöveg
- A Garancia fülön egy **kézzel felvett** (manuális) telefon-garanciánál is a helyes, telefonos szöveg nyomtatódik ki, nem a szerviz-szöveg
- Nincs `git push`, csak lokális commit
