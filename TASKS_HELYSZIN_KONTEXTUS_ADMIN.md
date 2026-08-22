# TASKS — Bevétel/Kiadás (és minden helyszín-függő rögzítés) ne "találgassa" a helyszínt admin esetén

Kérés: "a bevetel kiadas es annak a fugvenyeben kell valtozzon hogy gyimesben vagy szentgyorgyon vagyunk nem irhatunk egy helyre... szamitson az adminnak is hogy jelenleg melyik uzletben van"

## 0. A talált bug — konkrétan, kód szerint

Végignéztem, hogy jelenleg honnan jön a helyszín-alapérték új bevétel/kiadás rögzítésekor. `src/App.jsx` 436. sor:

```js
const defaultLocId = isAdmin ? (locFilter !== "all" ? locFilter : allowedLocations[0]?.id) : myLocationId;
```

Ha admin a "Mind" nézetben van (`locFilter === "all"` — ez az **alapértelmezett** állapot induláskor, mivel a `locFilter` state `useState("all")`-lal indul, ld. `App.jsx`), akkor `defaultLocId` **csendben** az `allowedLocations` tömb **első** elemére esik — vagyis mindig ugyanarra a helyszínre (gyakorlatilag mindig Gyimes, mert az van elöl a tömbben), **függetlenül attól, hogy az admin ténylegesen melyik boltban van**.

Ez a `defaultLocId` 4 helyre megy tovább propon keresztül, és mind a 4 helyen **ugyanez a minta ismétlődik** — a komponens saját `useState`-je is továbbesik ugyanerre a hallgatólagos alapértékre, ha a `defaultLocId` üres/hiányzik:

| Komponens | Sor | Minta |
|---|---|---|
| `src/components/BasketBar.jsx` (Bevétel/Kiadás gyors rögzítés) | 12. sor | `useState(defaultLocId \|\| locations[0]?.id \|\| "")` |
| `src/components/TransactionModal.jsx` (tranzakció szerkesztése/felvétele) | 18. sor | `useState(tx.locationId \|\| defaultLocId \|\| locations[0]?.id \|\| "")` |
| `src/components/TicketFormModal.jsx` (szerviz munkalap felvétele) | 41. sor | `useState(ticket?.locationId \|\| defaultLocId \|\| locations[0]?.id \|\| "")` |
| `src/components/PdfOrderImportModal.jsx` (alkatrész-rendelés import) | 12. sor | `useState(defaultLocId \|\| locations[0]?.id \|\| "")` |

Mind a négy a közös `src/components/LocationField.jsx`-et használja a legördülőhöz — ami **jelenleg mindig előre kitöltve, "helyesnek kinéző" értékkel indul**, tehát egy siető admin könnyen nem veszi észre, hogy rossz boltra van állítva egy új bevétel/kiadás, mielőtt lement.

**Ez tehát valódi, ma is fennálló hiba** — nem csak a leendő SmartBill-integráció miatt fontos (bár amiatt is: a `TASKS_SMARTBILL_INTEGRACIO.md`-ben tervezett, helyszínenként külön SmartBill-hitelesítő adat / pénztárgép csak akkor működik helyesen, ha a mögötte lévő tranzakció `location_id`-ja is helyes — ez a fájl ennek az előfeltétele).

## 1. A cél

- **"Mind" nézet csak megtekintésre való** (riportok, összesítők) — sose legyen az az érték, amivel egy ÚJ bevétel/kiadás/munkalap/rendelés csendben elmentődik.
- **Az adminnak mindig legyen egy "jelenleg ebben az üzletben vagyok" kontextusa** — ne kelljen minden egyes űrlapnál újra kiválasztania, de az alapérték soha ne legyen egy találgatott/fix bolt, hanem a ténylegesen utoljára beállított/választott helyszín — és ha ez még sosem lett beállítva (első bejelentkezés), akkor kifejezetten kérje be, ne találgassa.

## 2. Megoldás — `App.jsx`

### 2a. A `locFilter` maradjon meg nézeti szűrőnek, de legyen perzisztens és legyen egy külön "utolsó ismert helyszín" állapot

```js
// jelenleg:
const [locFilter, setLocFilter] = useState("all");

// helyette:
const [locFilter, setLocFilterRaw] = useState(() => localStorage.getItem("phonestock_loc_filter") || "all");
const [lastActiveLocationId, setLastActiveLocationId] = useState(() => localStorage.getItem("phonestock_last_location") || null);

function setLocFilter(val) {
  setLocFilterRaw(val);
  localStorage.setItem("phonestock_loc_filter", val);
  if (val !== "all") {
    setLastActiveLocationId(val);
    localStorage.setItem("phonestock_last_location", val);
  }
}
```

(A `setLocFilter` már most is a `Sidebar`-nak van átadva propként — a fenti wrapper mindenhol ugyanúgy hívható, nem kell a Sidebar-t módosítani emiatt.)

### 2b. `defaultLocId` — a hallgatólagos `allowedLocations[0]` helyett `lastActiveLocationId`, és ha az sincs, `null`

```js
// jelenleg (436. sor):
const defaultLocId = isAdmin ? (locFilter !== "all" ? locFilter : allowedLocations[0]?.id) : myLocationId;

// helyette:
const defaultLocId = isAdmin ? (locFilter !== "all" ? locFilter : lastActiveLocationId) : myLocationId;
```

Fontos: ha az admin **még sosem** választott konkrét helyszínt (vadonatúj admin, `lastActiveLocationId === null`), akkor `defaultLocId` most `null` lesz — ez **szándékos**, ez kényszeríti ki a 3. pontban leírt kötelező választást, ahelyett hogy csendben Gyimesre esne.

A `defaultStockLocId` (438. sor, `reserveLocId`-ra esik vissza "Mind" esetén) **szándékosan marad változatlan** — a "Tartalék" egy semleges, nem-valós-bolt gyűjtőhely új telefonok raktárba vételéhez, ott a jelenlegi viselkedés nem téveszt meg senkit egy konkrét boltba.

## 3. Megoldás — `LocationField.jsx`: ne legyen hallgatólagosan előre kitöltve

```jsx
// jelenleg:
export default function LocationField({ locations, value, onChange, label = "Helyszín" }) {
  if (locations.length <= 1) {
    return (
      <div className="field"><label>{label}</label><input disabled value={locations[0]?.name || "—"} /></div>
    );
  }
  return (
    <div className="field"><label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
    </div>
  );
}

// helyette — ha value üres, egy kötelező, feltűnő placeholder jelenik meg, nem egy csendben kiválasztott bolt:
export default function LocationField({ locations, value, onChange, label = "Helyszín" }) {
  if (locations.length <= 1) {
    return (
      <div className="field"><label>{label}</label><input disabled value={locations[0]?.name || "—"} /></div>
    );
  }
  return (
    <div className="field">
      <label>{label}</label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={!value ? { borderColor: "#EF4444", color: "#EF4444" } : undefined}
      >
        <option value="" disabled>— Válaszd ki, melyik üzlet —</option>
        {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
    </div>
  );
}
```

## 4. A 4 érintett komponens — a saját `locations[0]?.id` hallgatólagos tartalék-értéküket is ki kell venni

Mind a négy helyen (`BasketBar.jsx`, `TransactionModal.jsx`, `TicketFormModal.jsx`, `PdfOrderImportModal.jsx`) ugyanaz a módosítás: a `locations[0]?.id` végső tartalék-ág törlendő, hogy ne írja hallgatólagosan felül a 2-3. pontban leírt "üres = válassz" állapotot **több mint 1 helyszín esetén** — 1 helyszín esetén (alkalmazott, akinek csak egy boltja van) továbbra is biztonságos automatikusan kitölteni, mert nincs választási lehetőség/kétértelműség:

```js
// minta (BasketBar.jsx 12. sor, ugyanez a többi helyen is):
// jelenleg:
const [locId, setLocId] = useState(defaultLocId || locations[0]?.id || "");
// helyette:
const [locId, setLocId] = useState(defaultLocId || (locations.length === 1 ? locations[0]?.id : ""));
```

A `TransactionModal.jsx` és `TicketFormModal.jsx` mentés-gombja már ma is ellenőrzi, hogy `locId` ki van-e töltve (`valid` változóban benne van a `locId`) — tehát ott a fenti módosítás önmagában elég, a mentés automatikusan le lesz tiltva, amíg nincs kiválasztva helyszín. A `BasketBar.jsx`-nál és a `PdfOrderImportModal.jsx`-nál is ellenőrizni/hozzáadni kell ugyanezt a `locId`-t a gomb `disabled` feltételéhez, ha még nincs benne (nézd át a `handleCheckout`/`handleDirectExpense`/`onImport` gombok jelenlegi `disabled={...}` feltételét, és egészítsd ki `|| !locId`-vel, ha a `locations.length > 1`).

## 5. Első bejelentkezés / "melyik boltban vagy most" — ne csak passzívan várjon

Ha `isAdmin && lastActiveLocationId === null` (vadonatúj admin, vagy még sosem választott konkrét boltot, csak "Mind"-ban nézelődött), a `Sidebar.jsx`-ben a `loc-sw` (62-68. sor) fölé/mellé kerüljön egy rövid, feltűnő, de nem tolakodó jelzés:

```jsx
{isAdmin && !lastActiveLocationId && (
  <div className="loc-nudge" style={{ fontSize: 11.5, color: "#B91C1C", marginBottom: 4 }}>
    Válaszd ki, melyik üzletben vagy most ↓
  </div>
)}
```

Ez eltűnik, amint az admin először rákattint egy konkrét (nem "Mind") helyszín-gombra — onnantól a `lastActiveLocationId` a `localStorage`-ban megmarad, tehát legközelebbi bejelentkezéskor már nem kérdezi újra, csak akkor, ha az admin explicit "Mind"-ra vált és úgy próbál új tranzakciót rögzíteni anélkül, hogy előtte konkrét helyszínt választott volna (ez az igazán ritka, valóban kétértelmű eset — ott jogos, hogy a 3. pont szerinti kötelező mező megállítsa).

## 6. Kapcsolat a SmartBill-specifikációval

A `TASKS_SMARTBILL_INTEGRACIO.md` 5. és 8. pontja már felvetette, hogy a két bolthoz (Gyimes, Szentgyörgy) esetleg **külön SmartBill-hitelesítő adat / pénztárgép** kell, és hogy a bon/számla-kiállításnak mindig egy **konkrét, valós helyszínhez** kell kötődnie, sosem "Mind"-hoz. Ez a jelen fájl pontosan ezt az előfeltételt javítja meg az alapoknál — miután ez megvan, a SmartBill Edge Function bátran támaszkodhat arra, hogy minden `transactions`/`smartbill_documents` sor `location_id`-ja **mindig egy admin által ténylegesen, tudatosan választott, valós bolt**, sosem egy hallgatólagos találgatás.

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- Admin "Mind" nézetben, ha még sosem választott konkrét boltot: új bevétel/kiadás/munkalap/alkatrész-rendelés mentése **le van tiltva**, amíg nem választ helyszínt — nincs hallgatólagos alapérték
- Miután egyszer konkrét boltot választott (akár a sidebar-gombbal, akár egy űrlap helyszín-mezőjével), ez megjegyződik (`localStorage`), és legközelebb már azt ajánlja fel alapértékként
- `locFilter` és `lastActiveLocationId` túléli az oldal-újratöltést (`localStorage`)
- Alkalmazottaknál (egy helyszín, nincs választási lehetőség) semmi nem változik — ott továbbra is automatikus, kérdés nélkül
- Nincs `git push`, csak lokális commit
