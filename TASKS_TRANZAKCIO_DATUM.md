# TASKS — Dátum-mező + Éves bontás a Bevétel/Kiadás fülön

**Kontextus:** 2026-08-13-án egy régi (2024 Q4, Gyimes indulás) napi eladási naplót kellett visszamenőleg beimportálni a Bevétel/Kiadás fülre. Kiderült, hogy erre jelenleg **nincs mód a felületen**: a `transactions.date` oszlop `default CURRENT_DATE`, a `TransactionModal.jsx` űrlapon nincs dátum-mező, és a `txToApi` mapper (`src/lib/mappers.js`) nem is küld `date`-et — minden új tranzakció automatikusan a mai dátumot kapja, visszamenőleg soha nem rögzíthető semmi a UI-n keresztül. (A most beimportált 28 sort emiatt közvetlenül az adatbázisba kellett beírni, nem a UI-n keresztül.)

Ez a feladat pótolja ezt — hogy legközelebb ne kelljen ismét adatbázis-szinten piszkálni, ha valaki utólag akar rögzíteni egy tranzakciót (pl. elfelejtett napi zárás, késve kapott számla, vagy egy újabb régi papíralapú napló bevitele).

Ne pusholj / ne deployolj, csak lokális commit, amíg nem szólnak.

---

## 1. Mapper

**Fájl:** `src/lib/mappers.js` — `txFromApi` már tartalmazza a `date: r.date`-et (ez már megvan), de a `txToApi` NEM küldi vissza. Egészítsd ki:
```js
export const txToApi = (t, locId) => ({
  type: t.type,
  description: t.description,
  amount: Number(t.amount) || 0,
  category: t.category,
  payment: t.payment || null,
  product_id: t.productId || null,
  cost_price: Number(t.costPrice) || 0,
  warranty: t.warranty || null,
  customer_name: t.customerName || null,
  customer_phone: t.customerPhone || null,
  location_id: locId,
  date: t.date || undefined, // undefined esetén a DB CURRENT_DATE default-ja érvényesül (új tranzakciónál ez a kívánt viselkedés)
});
```
**Figyelem:** ha `t.date` üres string (`""`) lenne, ne azt küldd — a `date: t.date || undefined` sor pont ezt kezeli (üres string is "falsy", tehát undefined lesz belőle, és a Supabase kliens undefined mezőt nem küld el, a DB default átveszi).

---

## 2. UI — `TransactionModal.jsx`

**Fájl:** `src/components/TransactionModal.jsx`. Adj egy `date` mezőt az állapothoz, alapértéke szerkesztésnél a meglévő dátum, új tranzakciónál a mai nap:
```js
import { today } from "../lib/utils"; // ha még nincs importálva
...
const [f, setF] = useState({
  type: tx.type,
  description: tx.description || "",
  amount: tx.amount ?? "",
  category: tx.category || "Egyéb",
  payment: tx.payment || "Készpénz",
  customerName: tx.customerName || "",
  customerPhone: tx.customerPhone || "",
  costPrice: tx.costPrice ?? "",
  date: tx.date || today(),
});
```
A JSX-ben, a "Típus"/"Kategória" sor mellé vagy egy új sorba (pl. az "Összeg"/"Fizetés" sor mellé, `row3`-ként átalakítva, vagy külön `row2`):
```jsx
<div className="row2">
  <div className="field"><label>Dátum</label><input type="date" value={f.date} onChange={set("date")} /></div>
  <div className="field"><label>Fizetés</label>
    <select value={f.payment} onChange={set("payment")}>
      {PAYMENTS.map((p) => <option key={p}>{p}</option>)}
    </select>
  </div>
</div>
```
(a jelenlegi "Összeg"/"Fizetés" sort igazítsd át úgy, hogy a Dátum beleférjen — pl. legyen egy `row3`: Összeg / Fizetés / Dátum, vagy egy külön sor. A cél csak az, hogy a mező látszódjon és szerkeszthető legyen, a pontos elrendezés rád van bízva.)

A mentés gombnál (`onSave` hívás) a `date` már benne lesz az `f` objektumban, nem kell külön kezelni — a `txToApi` (1. pont) automatikusan felveszi.

---

## 3. Éves bontás a Bevétel/Kiadás listán

Jelenleg a Bevétel/Kiadás fülön (`src/tabs/FinanceTab.jsx`) csak Napi/Heti/Havi bontás van (`period` state, `.seg` gombsor, ~13–17. sor). Adj hozzá egy negyedik "Éves" opciót — ez most különösen hasznos, mert a Q4 2024-es történeti adat behozatalával már több éves adat is van a rendszerben.

**Fájl:** `src/lib/utils.js` — bővítsd a `periodKey`/`periodLabel` függvényeket (~192–210. sor):
```js
export function periodKey(dateStr, period) {
  if (period === "day") return dateStr;
  if (period === "week") return startOfWeek(dateStr);
  if (period === "year") return dateStr.slice(0, 4); // év YYYY
  return dateStr.slice(0, 7); // month YYYY-MM
}
export function periodLabel(key, period) {
  if (period === "year") return key; // "2024", "2025" — nem kell bonyolítani
  if (period === "month") {
    const d = new Date(key + "-01T00:00:00");
    return d.toLocaleDateString("hu-HU", { year: "numeric", month: "long" });
  }
  if (period === "week") {
    const start = new Date(key + "T00:00:00");
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString("hu-HU", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("hu-HU", { month: "short", day: "numeric" })}`;
  }
  const d = new Date(key + "T00:00:00");
  return d.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
}
```

**Fájl:** `src/tabs/FinanceTab.jsx` — a `.seg` gombsorba (~13–17. sor) egy negyedik gomb:
```jsx
<div className="seg">
  <button type="button" className={period === "day" ? "active" : ""} onClick={() => setPeriod("day")}>Napi</button>
  <button type="button" className={period === "week" ? "active" : ""} onClick={() => setPeriod("week")}>Heti</button>
  <button type="button" className={period === "month" ? "active" : ""} onClick={() => setPeriod("month")}>Havi</button>
  <button type="button" className={period === "year" ? "active" : ""} onClick={() => setPeriod("year")}>Éves</button>
</div>
```
A `TransactionsPeriodList.jsx`-hez nem kell nyúlni — az teljesen generikusan a `periodKey`/`periodLabel`-re épül, automatikusan működik majd az új "year" period-del is.

---

## 4. Ellenőrzés

- Új tranzakció felvételekor a dátum mező alapból a mai napot mutatja, de átírható — visszamenőleges rögzítés működik
- Tranzakció szerkesztésekor a meglévő dátum jelenik meg, és módosítható
- Ha valaki nem nyúl a dátum mezőhöz új tranzakciónál, pontosan úgy viselkedik, mint eddig (mai dátum)
- A Bevétel/Kiadás lista helyesen rendezve/szűrve jelenik meg a visszamenőlegesen rögzített dátumú tételekkel is (pl. hónap-szűrő, ha van ilyen a listán)
- Az "Éves" gomb helyesen csoportosít évenként (pl. a most beimportált 2024-es Q4 adatok egy külön "2024" csoportba kerülnek, elkülönítve 2025-től)
