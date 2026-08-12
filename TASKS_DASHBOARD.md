# TASKS — Havi trend a Dashboardon (monthly_summaries vizualizálása)

**Kontextus:** a `public.monthly_summaries` táblában (2026-08-12-én létrehozva) most már megvan a historikus havi bevétel/margin/kiadás/profit adat helyszínenként (Gyimes 2024-11 – 2025-12, Szentgyörgy 2025-09 – 2025-12, néhány friss hónapnál kiadás/profit még hiányzik). Ez önmagában nem hasznos, amíg nincs kirakva a Dashboardra — a cél egy olyan nézet, ami **döntéshozatalra** jó: nem csak "mennyi volt", hanem "ez jobb vagy rosszabb, mint korábban, és melyik helyszín húz".

Ne pusholj / ne deployolj, csak lokális commit, amíg nem szólnak.

---

## 1. Adatbetöltés

**Fájl:** `src/App.jsx` — a meglévő adatbetöltő `useEffect` mellé (ahol `stock`, `transactions`, `tickets`, `parts` töltődik, kb. 90–100. sor) adj hozzá egy `monthlySummaries` state-et:
```js
const [monthlySummaries, setMonthlySummaries] = useState([]);
// ...
supabase.from("monthly_summaries").select("*").order("year").order("month"),
```
majd `setMonthlySummaries(r.map(monthlySummaryFromApi))`.

**Fájl:** `src/lib/mappers.js` — adj hozzá:
```js
export const monthlySummaryFromApi = (r) => ({
  id: r.id,
  locationId: r.location_id,
  year: r.year,
  month: r.month,
  revenue: Number(r.revenue) || 0,
  margin: Number(r.margin) || 0,
  daysOpen: r.days_open,
  expenses: r.expenses != null ? Number(r.expenses) : null,
  profit: r.profit != null ? Number(r.profit) : null,
  phonesButton: r.phones_button,
  phonesRefurbished: r.phones_refurbished,
  phonesNew: r.phones_new,
});
```

---

## 2. A folyó hónap élő adata (hogy a trend ne szakadjon meg a jelennél)

A `monthly_summaries` csak lezárt hónapokat tartalmaz. A dashboardon a **jelenlegi, még nyitott hónapot** is meg kell mutatni, hogy lásd, hogy áll eddig a korábbiakhoz képest — ezt viszont ne kézzel vigyék be, hanem számold ki élőben a már betöltött `transactions`-ból.

**Fájl:** `src/App.jsx`, a többi `useMemo` mellé (pl. `svcStats`, `txStats` közelében):
```js
const currentMonthLive = useMemo(() => {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1;
  const inMonth = (t) => {
    const d = new Date(t.date + "T00:00:00");
    return d.getFullYear() === y && d.getMonth() + 1 === m;
  };
  const rows = filteredTransactions.filter(inMonth);
  const revenue = rows.filter((t) => t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const expenses = rows.filter((t) => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const margin = rows.filter((t) => t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0) - (Number(t.costPrice) || 0), 0);
  return { year: y, month: m, revenue, expenses, margin, profit: revenue - expenses, isLive: true };
}, [filteredTransactions]);
```

---

## 3. Új komponens: `MonthlyTrendChart.jsx`

**Új fájl:** `src/components/MonthlyTrendChart.jsx` — kövesd a projektben már meglévő `StockValueChart.jsx` stílusát (saját kézzel írt SVG, nincs chart-library importálva, `viewBox` + reszponzív `width: 100%`), ne vegyél be új dependency-t.

Kért viselkedés:

- **Oszlopdiagram** (nem vonaldiagram), x tengelyen az utolsó 12 hónap (`ÉÉÉÉ.HH` vagy "aug." formátumban), y tengelyen a bevétel.
- Ha a Dashboard helyszín-szűrője **"Mindkettő"**, minden hónapnál **két egymás melletti oszlop** (Gyimes + Szentgyörgy, más-más szín), hogy azonnal látszódjon, melyik helyszín húzza jobban a szekeret. Ha egy konkrét helyszín van kiválasztva, csak az az oszlop.
- A **folyó, még nyitott hónap** oszlopa vizuálisan halványabb/csíkozott legyen, és kapjon egy "folyamatban" feliratot — ne keveredjen össze a lezárt hónapokkal.
- Hover/tooltip egy oszlopon: hónap neve, bevétel, margin, kiadás (ha van), profit (ha van), %profit, és ha van telefontípus-bontás (`phonesButton`/`phonesRefurbished`/`phonesNew`), az is.
- Minden oszlop tetején (vagy a tooltipben) egy kis másodlagos szám: **margin %** (`margin / revenue`) — ez az árrés-trend, amit a sima bevétel-oszlop elrejt.

Props-javaslat:
```js
<MonthlyTrendChart
  summaries={monthlySummaries}           // lezárt hónapok
  liveMonth={currentMonthLive}            // folyó hónap élő adata
  locations={locations}
  locFilter={effectiveLocFilter}          // "all" | location id
  locName={locName}
/>
```

---

## 4. Összegző fejléc a chart fölé — ez a leghasznosabb rész

A számolt táblázat/chart fölé egy rövid, szöveges összegzés, ami kimondja a trendet, nem csak mutatja:

> "Ez a hónap eddig: **42 473 Lei** — 8 nap alatt. Múlt hónap ilyenkor (8. napon): 31 200 Lei volt → **+36%**."

Ehhez az kell, hogy a `currentMonthLive`-ot **ugyanannyi nyitvatartási napra** vetítve hasonlítsd össze az előző hónap `monthly_summaries` sorával (ne a teljes előző hónapot vesd össze egy félig lezajlott hónappal, mert az mindig rosszabbul fog kinézni és félrevezető). Egyszerű becslés: `előző_hónap.revenue / előző_hónap.days_open * (mai nap sorszáma a hónapban)`.

Helyezd el ezt a szöveget közvetlenül a "💰 Bevételek & Kiadások" statcard-sor fölé, `src/App.jsx` kb. 666. sor elé.

---

## 5. Elhelyezés a Dashboardon

**Fájl:** `src/App.jsx`, a `tab === "dashboard"` blokkban (640–689. sor) — a `StockValueChart` (654. sor) az abszolút készletértékről szól, ez egy másik dolog. A `MonthlyTrendChart`-ot tedd a "💰 Bevételek & Kiadások" statcard-sor (667–672. sor) **fölé**, az összegző szöveggel együtt, mert ez a hely, ahol most már van kontextus a bevétel-számokhoz (nem csak egy pillanatfelvétel, hanem "ehhez képest").

Ne rendezd át a többi szekciót (Telefonok / Szerviz / Alkatrészek / Kliensek) — csak ez az egy blokk kerül be újként.

---

## Ellenőrzőlista implementálás után

- A grafikon helyesen jeleníti meg mind a 18 meglévő `monthly_summaries` sort (14 Gyimes, 4 Szentgyörgy)
- Helyszín-szűrő váltásra (Gyimes / Szentgyörgy / Mindkettő) a chart helyesen reagál
- A folyó hónap oszlopa vizuálisan megkülönböztethető, és az adat egyezik a "💰 Bevételek & Kiadások" statcard-sorral (ugyanabból a `filteredTransactions`-ból számolva, nem térhet el)
- Az összegző mondat (ez a hónap eddig vs. múlt hónap ilyenkor) helyes %-ot mutat egy kézzel átszámolt teszteset alapján
- Olyan hónapoknál, ahol `expenses`/`profit` `null` (a legutóbbi 2 hónap mindkét helyszínen), a tooltip nem dob hibát, hanem "—"-t vagy "nincs adat"-ot ír ki
- Mobil/keskeny nézetben (ha van ilyen teszt) a chart nem törik el — kövesd a `StockValueChart` reszponzív mintáját
