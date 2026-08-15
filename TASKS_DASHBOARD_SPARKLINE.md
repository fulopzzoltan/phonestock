# TASKS — Mini trend-grafikonok (sparkline) a Dashboard stat-kártyáin

Ez egy végrehajtható feladatlista a kódoló agentnek (Claude Code). Ihlet: a "Venus Dashboard" Figma community sablon (`figma.com/design/avmp6USF3QKzAdNwCSJmvH`, "Dashboard 1" keret) — a stat-kártyáiba be van építve egy apró trend-vonal/oszlopdiagram, ettől a szám azonnal kontextust kap ("nem csak ennyi van, hanem így alakult mostanában"). **Csak a Dashboard (Áttekintés) oldalt érinti**, más fület ne bántsunk. A színpaletta marad a sajátunk (`var(--primary)` zöld, a design-egységesítésnél bevezetett tokenek) — a Figma-referenciából kizárólag a mintázatot vesszük át, nem a színeit.

**Ne pusholj / ne deployolj**, csak lokális commit, amíg nem szólnak.

---

## Amit már megnéztem

- `src/components/StockValueChart.jsx` — a projektben **nincs chart-library** (nincs recharts/chart.js a `package.json`-ban), a meglévő grafikon kézzel írt SVG `<path>`-okkal. Ugyanezt a megközelítést kövesd, ne vezess be új dependency-t.
- Apró, de idevágó találat: a `StockValueChart.jsx`-ben (100–102. sor) a zöld szín még mindig hardcode-olt `#22C55E`, nem `var(--primary)` — ez lemaradt a korábbi design-egységesítésnél. Ha már ebben a fájlban dolgozol, javítsd ki ezt a 3 helyet is (`fill="#22C55E"` → `fill="var(--primary)"`, ugyanígy a `stroke`-nál és a colnál).
- `src/tabs/DashboardTab.jsx` jelenlegi stat-kártyái (`.statcard`) csak label+szám párost mutatnak, nincs bennük semmilyen mini-grafikon.
- Van már napi bontású adat, amiből valódi (nem kitalált) trendet lehet húzni:
  - `stockHistory` ([{date, value}], App.jsx-ben már betöltve, ezt használja a `StockValueChart` is) — ebből a farok (utolsó ~14 pont) egy az egyben felhasználható a Telefonok "Készlet értéke" kártyához.
  - `filteredTransactions` (App.jsx) — ebből egy új, kis `useMemo`-val ki lehet számolni az utolsó 14 nap napi bevétel/nettó összegét a Bevételek szekció kártyáihoz.

---

## 1. Új komponens: `Sparkline.jsx`

**Fájl:** új `src/components/Sparkline.jsx`

```jsx
export default function Sparkline({ data, variant = "line", color = "var(--primary)", height = 28 }) {
  if (!data || data.length < 2) return null;
  const W = 100, H = height;
  const max = Math.max(...data, 0);
  const min = Math.min(...data, 0);
  const range = Math.max(1, max - min);

  if (variant === "bars") {
    const bw = W / data.length;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
        {data.map((v, i) => {
          const h = Math.max(2, ((v - min) / range) * (H - 2));
          const isLast = i === data.length - 1;
          return (
            <rect key={i} x={i * bw + bw * 0.2} y={H - h} width={bw * 0.6} height={h} rx={1.5}
              fill={isLast ? color : "var(--border-strong)"} opacity={isLast ? 1 : 0.6} />
          );
        })}
      </svg>
    );
  }

  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((v - min) / range) * (H - 4) - 2,
  }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${W},${H} L0,${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      <path d={areaPath} fill={color} opacity="0.12" stroke="none" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2.2" fill={color} />
    </svg>
  );
}
```

Tudatosan **nincs** benne tengely, rács, felirat vagy hover — díszítő, kontextusadó mini-grafikon, nem elemző eszköz (ahogy a Figma-mintában is).

---

## 2. Adatok előkészítése (`App.jsx`)

- **Készlet-sparkline:** nem kell új számítás, a meglévő `stockHistory`-ból vedd az utolsó 14 elem `value`-ját: `stockHistory.slice(-14).map((h) => h.value)`. Add tovább propként a `DashboardTab`-nak: `stockSparkline={stockHistory.slice(-14).map((h) => h.value)}`.
- **Bevétel-trend:** új `useMemo`, `filteredTransactions`-ból, az utolsó 14 naptári nap napi bevétel-összege (0 is legyen egy napra, ha nincs tranzakció aznapra — a sparkline így folytonos marad):
```js
const dailyIncomeTrend = useMemo(() => {
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days.map((d) => filteredTransactions.filter((t) => t.date === d && t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0));
}, [filteredTransactions]);
```
Add tovább: `dailyIncomeTrend={dailyIncomeTrend}` a `DashboardTab`-nak.

---

## 3. Beépítés a `DashboardTab.jsx`-be

- Importáld: `import Sparkline from "../components/Sparkline";`
- Vedd fel a két új propot: `stockSparkline, dailyIncomeTrend`.
- A "Készlet értéke" statcard (63. sor) alá tegyél egy sparkline-t:
```jsx
<div className="statcard">
  <div className="lbl">Készlet értéke</div>
  <div className="val">{money(stockStats.value)}</div>
  {stockSparkline.length > 1 && <div style={{ marginTop: 8 }}><Sparkline data={stockSparkline} variant="line" /></div>}
</div>
```
- A Bevételek szekció "Bevétel" statcard-jánál (132. sor) hasonlóan, `variant="bars"`-szal (ez illik jobban a napi, ugrásszerűbb bevétel-adathoz, mint egy sima vonal):
```jsx
<div className="statcard">
  <div className="lbl">Bevétel</div>
  <div className="val" style={{ color: "#15803D" }}>{money(txStats.income)}</div>
  {dailyIncomeTrend.length > 1 && <div style={{ marginTop: 8 }}><Sparkline data={dailyIncomeTrend} variant="bars" /></div>}
</div>
```
- Ne tegyél sparkline-t minden kártyára — a "Raktáron (db)", "Tranzakciók (db)", "Ügyfelek (db)" jellegű darabszám-kártyáknál nincs értelme (nincs mögöttük folytonos trend, amit érdemes lenne mutatni). Csak a pénzben kifejezett, ténylegesen trendelő mutatóknál (Készlet értéke, Bevétel) — ha jól működik, utána eldönthető, kell-e még helyre.

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- Az Áttekintés oldalon a "Készlet értéke" kártya alatt egy apró zöld vonal-grafikon látszik, a "Bevétel" kártya alatt apró oszlopok
- Színben semmi nem tér el a többi kártyától (ugyanaz a zöld, mint mindenhol)
- A `StockValueChart.jsx` nagy grafikonja is `var(--primary)`-t használ hardcode-olt hex helyett
- Más fülön (Szerviz, Telefonok stb.) semmi nem változott
- Nincs `git push`, csak lokális commit
