# TASKS — Bevétel/Kiadás letisztítás: csak a "Ma" legyen zajos-mentes, napi zárás gomb, szerkeszthető tételek az Elszámolásban

Kérés: "tul zajos az azelotti napi infoktol... minden nap tisztan akarom latni hogy aznap mi tortent... nap vegen kellene egy zaras gomb szeruseg... az atkerulne az elszamolasba... az elszamolasban is kellene latni az eddigket mint peldaul az eladott telefonok de szerkesztheto is kellene legyen"

## 0. Amit megnéztem — a jelenlegi állapot, pontosan

`src/tabs/FinanceTab.jsx` ma csak két dolgot rak egymás alá: a `BasketBar` gyorsrögzítőt, majd a `TransactionsPeriodList`-et. Ez utóbbi (`src/components/TransactionsPeriodList.jsx`) már ma is **adaptív csoportosítást** csinál (`adaptivePeriodBucket` a `utils.js`-ben, 318-327. sor): a folyó hét napjai külön-külön napi bontásban, az idei hónap többi része heti, az idei év többi hónapja havi, korábbi évek évenkénti csoportban — és csak a **mai** csoport van alapból kinyitva (`useState(() => new Set([currentKey]))`, 59. sor), a többi össze van csukva.

Tehát a csoportosítás technikailag már létezik, csak **ez a fajta "összecsukva, de a fejléc sora ott van egymás alatt"** megjelenés az, ami zajos marad — a folyó hét minden napja (akár 5-7 sor), plusz az "Egyéb kategóriás kiadások" szűrő-chip, mind a `BasketBar` alatt tornyosul, mielőtt egyáltalán a mai adatig érnél. Ez pontosan az, amit zavarónak jelöltél.

A `src/tabs/CashSettlementTab.jsx` ma csak **összesítő** számokat mutat (`statcard`-ok: Készpénz/Kártya/Átutalás/Egyéb kiadás/Profit) plusz a "kinél mennyi készpénz van" űrlapot és a korábbi elszámolások **összesítő** táblázatát — **egyetlen tétel-szintű sor sincs benne**, nincs mit szerkeszteni rajta. A `saveCashSettlement` (App.jsx 780. sor) egyszerűen beszúr egy `cash_settlements` sort a számolt összegekkel — ez a tényleges "zárás", ez már működik, ezt nem bántjuk.

## 1. A terv dióhéjban

1. **`FinanceTab`**: a "Ma" mindig fent, nyitva, önállóan — nem az akkordeon egyik csukható sora, hanem a lap fő tartalma. Alatta egy csendes, alapból **becsukva** lévő "Korábbi napok" kapcsoló, ami a jelenlegi `TransactionsPeriodList`-et nyitja meg (mai nap nélkül).
2. **"Nap zárása" gomb** a mai szakasz alján — megerősítő összesítővel ("ma ennyi volt: +X bevétel, -Y kiadás"), utána a nap "lezártnak" jelölődik (egy könnyű, nem-blokkoló státusz-jelzés, nem törli/mozgatja az adatot — ezt lásd a 3. pontban, miért).
3. **`CashSettlementTab`**: az aktuális (még nem zárt) időszakra betesszük a tétel-szintű, szerkeszthető listát — újrahasznosítva a már meglévő `TransactionsPeriodList`-et (nincs új komponens, ugyanaz a szerkesztés/törlés/bizonylat-megnyitás, ami a Bevétel/Kiadás fülön is megy) —, plusz egy kis "mely napok vannak lezárva ebben az időszakban" áttekintőt.

## 2. Adatmodell — `day_closes` tábla

```sql
create table day_closes (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  location_id uuid not null references locations(id),
  closed_by uuid references auth.users(id),
  closed_at timestamptz not null default now(),
  reopened_at timestamptz,
  reopened_by uuid references auth.users(id),
  unique (date, location_id)
);
```

Helyszínenként külön sor, mert a phonestock adatmodellje mindenhol helyszín-alapú (a tranzakciók, a `TASKS_HELYSZIN_KONTEXTUS_ADMIN.md`-ben most javított admin-kontextus is helyszín-alapú) — Gyimes és Szentgyörgy külön-külön zárja a saját napját, a saját dolgozói jelentik be, hogy "kész, ez volt ma nálunk". Az **Elszámolás viszont cégszinten összesít** (a `CashSettlementTab`-nak jelenleg a teljes, szűretlen `transactions` megy át, nem helyszűrt) — ott mindkét helyszín zárás-állapota megjelenik egymás mellett, tájékoztató jelleggel (lásd 5. pont).

**Fontos, amit tisztázni kell**: a "zárás" itt **nem zárolja, nem tiltja le utólag a szerkesztést** — csak egy jelzés/pipa, hogy "ezt a napot már átnézték". Ha valaki utólag mégis módosít egy tranzakciót egy már lezárt napon, a nap **nem esik vissza automatikusan "nyitott"-ra** — ez tudatos egyszerűsítés, hogy ne kelljen egy bonyolult újranyitás-workflow-t építeni egy apró javításhoz. Ha ez így nem elég szigorú (pl. azt szeretnéd, hogy utólagos módosításkor a nap automatikusan "módosítva lezárás után" jelzést kapjon), szólj, ez egy külön, kis kiegészítés lenne.

RLS: staff a saját `location_id`-jához tartozó napokat zárhatja/nézheti, admin mindkettőt.

## 3. `FinanceTab.jsx` — új elrendezés

```jsx
export default function FinanceTab({
  effectiveLocFilter, locName, allowedLocations, defaultLocId, busy,
  loadingData, filteredTransactions, setTxModal, deleteTransaction, setReceiptTxId,
  smartQuickItems, checkoutBasket,
  todayClose, closeDay, reopenDay, // ÚJ propok
}) {
  const todayStr = today();
  const todayTx = filteredTransactions.filter((t) => t.date === todayStr);
  const historyTx = filteredTransactions.filter((t) => t.date !== todayStr);
  const [showHistory, setShowHistory] = useState(false);

  const todayIncome = todayTx.filter((t) => t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const todayExpense = todayTx.filter((t) => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);

  return (
    <>
      <div className="topbar"><div><div className="page-title">Bevételek &amp; Kiadások</div></div></div>
      <BasketBar locations={allowedLocations} defaultLocId={defaultLocId} busy={busy} smartQuickItems={smartQuickItems} onCheckout={checkoutBasket} />

      <div className="tw" style={{ padding: 16, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Ma</div>
          {todayClose ? (
            <span className="badge-loc" style={{ color: "#15803D" }}>
              ✓ Lezárva {new Date(todayClose.closedAt).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}-kor
            </span>
          ) : (
            <span style={{ fontSize: 12, color: "#6B7280" }}>+{money(todayIncome)} / -{money(todayExpense)}</span>
          )}
        </div>
        {/* a mai napi tételek — ugyanaz a táblázat/mob-card réteg, ami ma a TransactionsPeriodList
            egy kinyitott csoportjában van, csak ITT mindig nyitva, cím/nyíl nélkül */}
        <TodayTransactionsTable transactions={todayTx} locName={locName} onEdit={setTxModal} onDelete={deleteTransaction} onOpenReceipt={setReceiptTxId} busy={busy} />

        {!todayClose && todayTx.length > 0 && (
          <button
            type="button"
            className="btn"
            style={{ marginTop: 14 }}
            onClick={() => {
              if (confirm(`Mai nap lezárása: +${money(todayIncome)} bevétel, -${money(todayExpense)} kiadás. Ezután is szerkeszthető marad, csak jelezve lesz, hogy átnézted. Mehet?`)) closeDay(todayStr);
            }}
          >
            Nap zárása
          </button>
        )}
        {todayClose && (
          <span className="toggle-link" style={{ marginTop: 10, display: "inline-block" }} onClick={() => reopenDay(todayClose.id)}>
            Visszavonás
          </span>
        )}
      </div>

      <span className="toggle-link" style={{ marginTop: 18, display: "inline-block" }} onClick={() => setShowHistory((v) => !v)}>
        {showHistory ? "Korábbi napok elrejtése" : "Korábbi napok megtekintése"}
      </span>
      {showHistory && (
        loadingData ? <div className="tw"><LoadingState /></div> : (
          <div style={{ marginTop: 12 }}>
            <TransactionsPeriodList transactions={historyTx} locName={locName} onEdit={setTxModal} onDelete={deleteTransaction} onOpenReceipt={setReceiptTxId} busy={busy} />
          </div>
        )
      )}
    </>
  );
}
```

A `TodayTransactionsTable` egy kis kivonat a `TransactionsPeriodList.jsx`-ből — pontosan az `isOpen && (...)` ág belseje (137-175. sor, a `<table>` + `buildBasketEntries` logika), kiemelve egy saját, önálló komponensbe, hogy a "Ma" szekció és a `TransactionsPeriodList` mindkettő ugyanazt a sor-renderelést használja (ne legyen kód-duplikáció) — a `SmartBillBadge` és `buildBasketEntries` segédfüggvények is átköltöznek egy közös helyre (pl. `src/lib/txRowHelpers.js` vagy maradnak a `TransactionsPeriodList.jsx`-ben exportálva, és a `TodayTransactionsTable` importálja onnan).

**A cél**: amikor a Bevétel/Kiadás fülre lépsz, az első képernyőn a `BasketBar` (gyorsrögzítő) + a "Ma" tiszta, önálló doboza legyen — nincs alatta 5-7 összecsukott napi sor, nincs "Egyéb kiadás" szűrő-chip zavarva bele, amíg te magad rá nem kattintasz a "Korábbi napok megtekintése"-re.

## 4. App.jsx — vezetékezés

Új state + betöltés (a többi tábla mintájára):
```js
const [dayCloses, setDayCloses] = useState([]);
// betöltő useEffect-ben:
supabase.from("day_closes").select("*").order("date", { ascending: false }),
```

Két új függvény:
```js
async function closeDay(date) {
  await withBusy(async () => {
    const r = unwrap(await supabase.from("day_closes").insert({ date, location_id: defaultLocId, closed_by: user.id }).select());
    setDayCloses([dayCloseFromApi(r[0]), ...dayCloses]);
  });
}
async function reopenDay(id) {
  await withBusy(async () => {
    unwrap(await supabase.from("day_closes").update({ reopened_at: new Date().toISOString(), reopened_by: user.id }).eq("id", id));
    setDayCloses(dayCloses.filter((d) => d.id !== id));
  });
}
```

(`dayCloseFromApi` mapper a `mappers.js`-be, a többi minta szerint.)

A `FinanceTab` hívásba (App.jsx, ~1729-1736. sor) bekerül:
```jsx
todayClose={dayCloses.find((d) => d.date === today() && d.locationId === defaultLocId)}
closeDay={closeDay} reopenDay={reopenDay}
```

**Megjegyzés admin/"Mind" esetére**: a `defaultLocId` a `TASKS_HELYSZIN_KONTEXTUS_ADMIN.md` javítás után sosem lesz hallgatólagosan rossz helyszín — ha admin "Mind"-ban van és még nem választott konkrét boltot, a "Nap zárása" gomb ne engedje lezárni (mert nem egyértelmű, melyik boltra vonatkozna), inkább jelenjen meg egy rövid "válassz helyszínt a záráshoz" felirat a gomb helyén.

## 5. `CashSettlementTab.jsx` — tétel-szintű, szerkeszthető lista + napi zárás-állapot

Két új szakasz kerül a meglévő KPI-kártyák és a "kinél mennyi készpénz van" űrlap közé:

### 5a. Napi zárás-állapot csík

```jsx
<div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
  {eachDateInPeriod(periodStart, periodEnd).map((d) => {
    const closesForDay = dayCloses.filter((c) => c.date === d);
    return (
      <span key={d} className="badge-loc" style={{ color: closesForDay.length === allowedLocations.length ? "#15803D" : "#B91C1C" }}>
        {d}: {closesForDay.length}/{allowedLocations.length} zárva
      </span>
    );
  })}
</div>
```
(Csak tájékoztató — **nem blokkolja** az "Elszámolás rögzítése" gombot, ha van nyitott nap; a végső döntés az adminé, hátha pont azért nyitja most az elszámolást, mert észrevette, hogy valaki elfelejtett zárni, és most menet közben át akarja nézni.)

### 5b. Tétel-szintű, szerkeszthető lista — a `TransactionsPeriodList` újrahasznosításával

```jsx
<div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", margin: "22px 0 8px 2px" }}>
  Ebben az időszakban történt ({periodTx.length} tétel)
</div>
<TransactionsPeriodList
  transactions={periodTx}
  locName={locName}
  onEdit={setTxModal}
  onDelete={deleteTransaction}
  onOpenReceipt={setReceiptTxId}
  busy={busy}
/>
```

Ez a lista **pontosan ugyanaz**, mint a Bevétel/Kiadás fülön — eladott telefonok (a `t.type === "income" && t.category === "Készlet"` sorok, amikre kattintva a bizonylat nyílik meg, ahogy ma is), szerviz-bevételek, kiadások, mind szerkeszthetők/törölhetők ugyanazokkal a gombokkal, amik már ma is működnek a `TransactionsPeriodList`-ben — **nem kell új szerkesztő UI-t építeni, csak a meglévőt idehozni.**

Ehhez a `CashSettlementTab` hívásnak (App.jsx, ~1743-1748. sor) bővülnie kell:
```jsx
<CashSettlementTab
  busy={busy} transactions={transactions} cashHolders={cashHolders} cashSettlements={cashSettlements}
  saveCashSettlement={saveCashSettlement} users={users}
  setTxModal={setTxModal} deleteTransaction={deleteTransaction} setReceiptTxId={setReceiptTxId}
  dayCloses={dayCloses} allowedLocations={allowedLocations} locName={locName}
/>
```

### 5c. Korábbi (már lezárt) elszámolások — opcionális, később

A "Korábbi elszámolások" táblázat sorai (123-153. sor) egyelőre összesítő-only maradnak — ha szeretnéd, hogy egy már lezárt elszámolás sorára kattintva is kinyíljon a hozzá tartozó tétel-lista (ugyanígy a `TransactionsPeriodList`-tel, csak `transactions.filter(t => t.date >= s.periodStart && t.date <= s.periodEnd)`-del szűrve), az egy apró, gyors kiegészítés — jelezd, ha kell, most nem terveztem bele, hogy ne dagadjon túl a lista minden korábbi periódusra egyszerre.

## 6. Amit tisztázni kell

1. **Zárás után is szerkeszthető marad-e a nap, vagy inkább zárolja teljesen?** A tervben most az első (nem blokkol, csak jelez) — ha inkább azt szeretnéd, hogy lezárás után csak admin tudjon módosítani, vagy hogy a módosítás automatikusan "újranyissa" a napot, szólj.
2. **"Nap zárása" gomb helyszín-független cégeknél**: ha egy nap mindkét boltban lezárult, semmi extra nem történik automatikusan (nincs "mindkettő zárva → automatikus elszámolás-javaslat") — ez szándékosan egyszerű most; ha szeretnéd, hogy ez valamit kiváltson (pl. egy értesítést az adminnak), az egy külön kis kiegészítés.

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- Bevétel/Kiadás fülre lépve first-paint: `BasketBar` + tiszta "Ma" doboz, **nincs** alatta összecsukott napi/heti/havi sor-lista, amíg nem kattintasz a "Korábbi napok megtekintése"-re
- "Nap zárása" gomb működik, megerősítő összesítővel, utána zöld "Lezárva" jelzés jelenik meg, "Visszavonás" göngyölíthető
- Az Elszámolás fülön az aktuális (még nyitott) időszak alatt megjelenik a tétel-szintű, szerkeszthető/törölhető lista — ugyanazokkal a gombokkal, mint a Bevétel/Kiadás fülön
- Az Elszámolás fülön látszik, mely napok vannak lezárva a két helyszínen (tájékoztató jelleggel, nem blokkol)
- A meglévő "Elszámolás rögzítése" gomb és a `cash_settlements` logika változatlan
- Nincs `git push`, csak lokális commit
