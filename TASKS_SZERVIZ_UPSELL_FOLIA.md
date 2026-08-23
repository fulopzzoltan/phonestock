# TASKS — Fólia-upsell a nyomonkövető oldalon (akciós ár, automatikus hozzáadás a szerviz árához)

Kérés: "a nyomonkovetes oldalon, amikor valaki szervizt ad be legyen egy kis reklam szeruseg hogy olyankor a vedfolia felhelyezese csak 30 leibe kerul 49 helyett és betudná ő pipálni vagy leokézni és ha keri akkor a szerviznel jelenjen meg a folia és automatikusan adodjon a szerviz arahoz"

## 0. Amit megnéztem — jó hír, van mire építeni

A `service_tickets` táblán **már létezik egy `folia boolean` mező** (adatbázisban ellenőrizve), amit ma a `TicketFormModal.jsx` 175. során egy checkbox állít ("Fólia felhelyezve"), a `DetailPanel.jsx` 115. során jelenik meg ("Fólia: ✓ Igen / Nem"), a `TicketCard.jsx` 57. során pedig egy kis "✓ Fólia" jelvényként. **Ma ez tisztán staff-oldali, kézi checkbox, semmilyen automatikus árhatása nincs** — a `price` mezőt a dolgozó külön, kézzel írja be.

Az upsell-mechanizmus erre az already-meglévő mezőre épül rá (nem cserél le semmit, csak új utat ad hozzá, ahonnan bekapcsolódhat), plusz 3 új mező kell hozzá, hogy megkülönböztessük "a dolgozó pipálta be, mert úgy alakult" (ma is így megy) vs. "az ügyfél maga kérte online, akciós áron" (ez az új eset):

```sql
alter table service_tickets add column folia_upsell_requested boolean not null default false;
alter table service_tickets add column folia_upsell_price numeric;          -- a megrendeléskor érvényes akciós ár, "befagyasztva"
alter table service_tickets add column folia_upsell_requested_at timestamptz;
```

A `folia_upsell_price` **mentése azért fontos**, mert ha holnap 30-ról 35-re változtatod az akciós árat, a tegnap már megrendelt tételek ára ne változzon meg utólag.

## 1. A publikus nyomonkövető RPC bővítése

A `get_ticket_status_by_token` (adatbázisban ellenőrizve, jelenlegi definíció) ma ezt adja vissza: `ticket_no, customer_name, customer_phone, brand, model, issue, status, sub_status, price, warranty, handover_date, date_in, date_out, location_name, location_phone`. Bővül:

```sql
create or replace function get_ticket_status_by_token(p_token uuid)
returns table(
  ticket_no bigint, customer_name text, customer_phone text, brand text, model text, issue text,
  status text, sub_status text, price numeric, warranty text, handover_date date, date_in date, date_out date,
  location_name text, location_phone text,
  ticket_kind text, folia boolean, folia_upsell_requested boolean, folia_upsell_price numeric  -- ÚJ
)
language sql stable security definer set search_path to 'public'
as $$
  select t.ticket_no, t.customer_name, t.customer_phone, t.brand, t.model, t.issue, t.status, t.sub_status,
    t.price, t.warranty, t.handover_date, t.date_in, t.date_out, l.name, l.phone,
    t.ticket_kind, t.folia, t.folia_upsell_requested, t.folia_upsell_price
  from public.service_tickets t
  left join public.locations l on l.id = t.location_id
  where t.public_token = p_token
$$;
```
(Ugyanezt a 4 új oszlopot érdemes hozzáadni a `get_ticket_status_by_short_code`/`get_ticket_status_by_phone` változatokhoz is, konzisztencia miatt — bár a megrendelés-gomb, lásd 3. pont, kezdetben csak a token-linkes nézetben jelenik meg.)

## 2. Új RPC — a megrendelés rögzítése, token-alapon

```sql
create or replace function request_folia_upsell_by_token(p_token uuid)
returns table(success boolean, message text)
language plpgsql security definer set search_path = public
as $$
declare
  t service_tickets%rowtype;
  v_price numeric := 30;  -- akciós ár — később app_settings-be tehető, ha gyakran változtatnád
begin
  select * into t from service_tickets where public_token = p_token and deleted_at is null;
  if not found then
    return query select false, 'Érvénytelen link.'; return;
  end if;
  if t.ticket_kind <> 'Ügyfél' then
    return query select false, 'Ehhez a munkalaphoz nem elérhető az ajánlat.'; return;
  end if;
  if t.status = 'Átadva' then
    return query select false, 'A gépet már átvetted, az ajánlat már nem elérhető.'; return;
  end if;
  if t.folia_upsell_requested then
    return query select false, 'Már megrendelted — köszönjük!'; return;
  end if;
  update service_tickets set
    folia = true, folia_upsell_requested = true, folia_upsell_price = v_price,
    folia_upsell_requested_at = now(), price = coalesce(price, 0) + v_price
  where id = t.id;
  return query select true, 'Rendben, átadáskor felhelyezzük!';
end;
$$;
grant execute on function request_folia_upsell_by_token(uuid) to anon;
```

Ez pontosan azt csinálja, amit kértél: `folia = true` (megjelenik a szervizen), `price` automatikusan +30 (rááadódik a szerviz árához) — **egy lépésben, atomikusan**, dupla megrendelést a `folia_upsell_requested` már-igaz ellenőrzés zár ki.

## 3. UI — a nyomonkövető oldal átdolgozása (`src/StatusLookup.jsx`) — mockup alapján

Kaptam egy kidolgozott mockupot/brief-et erről (angol nyelvű task-leírás + kép) — ez jó irány, de **két ponton nem illik a mi kódunkra**, ezt korrigáltam, mielőtt átvettem:
- A brief Tailwind CSS-t és egy `/szerviz/[id]` útvonalat feltételez — nálunk **nincs Tailwind** (`CLAUDE.md`: kézzel írt CSS, nincs UI-lib), és az útvonal ténylegesen `/status/:token` (`StatusLookup.jsx`). A lenti terv a meglévő `--primary`/`--primary-soft` stb. CSS-tokenekkel és a meglévő `.dp-section`/`.dp-row`/`.login-card` osztályokkal dolgozik, nem Tailwind-osztályokkal.
- A brief checkbox nélküli, egy-kattintásos CTA-t kér — ez **felülírja** a korábbi tervem tudatos "checkbox + külön gomb" súrlódását. Elfogadom ezt a változtatást: egy fix, jól látható, előre kiírt áras ajánlatnál (30 Lei, nincs mennyiség-választás, nincs rejtett feltétel) az extra megerősítő lépés inkább csak konverziót visz el, nem éri meg — **egy gombra rövidítjük**, lásd 3.3.

### 3.1. Adat-sorok ikonokkal

A ticket-nézet (111-136. sor) `dp-row`-jai elé kis ikon kerül — mind **már létező** ikon a `src/components/icons.jsx`-ben, nem kell újat rajzolni:

| Sor | Ikon |
|---|---|
| Ügyfél | `UserIcon` |
| Eszköz (márka+modell) | `PhoneCaseIcon` |
| Bejelentett hiba | `ServiceIcon` |
| Javítási költség | `FinanceIcon` |
| Átvéve / Átadva dátum | `CalendarIcon` |

```jsx
<div className="dp-row"><span className="dp-key"><UserIcon width={14} height={14} style={{ marginRight: 6, verticalAlign: -2, color: "#9CA3AF" }} />Ügyfél</span><span className="dp-val">{result.customer_name}</span></div>
```
(Ugyanez a minta mindegyik sornál — csak az ikon és a `dp-key` szövege cserélődik.)

### 3.2. Lépcsős folyamatsáv (státusz-tracker)

A jelenlegi egyetlen `st` jelvény (137-141. sor) **kiegészül** (nem cserélődik le — a jelvény marad, mert a `sub_status` (pl. "Garanciális", "Sikertelen") ott pontosabb infót ad, mint egy 4-lépéses sáv) egy vizuális lépés-sávval fölötte. A valós `STATUSES` (`utils.js`) 4 értéke: `Átvett`, `Javítás alatt`, `Minőségellenőrzés`, `Átadásra` (+ az `Átadásra` egyik `sub_status`-a a tényleges `Átadva`) — a vevőnek ezt egyszerűsítve, 4 barátságos lépésben mutatjuk:

```
Bejelentve  →  Szerviz alatt  →  Kész  →  Átvéve
```
Leképezés: `Átvett` → *Bejelentve*; `Javítás alatt` **és** `Minőségellenőrzés` → *Szerviz alatt* (a vevőnek nem kell tudnia, hogy belső tesztelési fázisban van, ugyanaz neki: "dolgoznak rajta"); `Átadásra` (sub_status ≠ `Átadva`) → *Kész*; `Átadásra` + sub_status `Átadva` → *Átvéve*.

```jsx
const STEP_MAP = { "Átvett": 0, "Javítás alatt": 1, "Minőségellenőrzés": 1, "Átadásra": handedOver ? 3 : 2 };
const activeStep = STEP_MAP[result.status] ?? 0;
const STEPS = [
  { label: "Bejelentve", icon: UserPlusIcon },
  { label: "Szerviz alatt", icon: ServiceIcon },
  { label: "Kész", icon: CheckIcon },
  { label: "Átvéve", icon: LockIcon },
];
```
`CheckIcon`/`LockIcon`/`UserPlusIcon` **nincs még** a `icons.jsx`-ben — ezeket 3 kis új ikonként kell felvenni, a meglévők stílusát követve (`viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"`). A vizuális sáv: 4 kör + köztük vonal, az aktív és korábbi lépések `--primary` színnel kitöltve, a jövőbeliek szürkével — hasonlóan a mockupon látott mintához, de a projekt saját CSS-tokenjeivel (`--primary`, nem a mockup `#10B981`-je — a kettő valószínűleg közel esik, de a sajátunkat használjuk, ne új színt vezessünk be).

### 3.3. Az upsell-doboz — a fő elem

```jsx
{isTicket && result.ticket_kind === "Ügyfél" && result.status !== "Átadásra" /* és nem Átadva sub_status */ && !result.folia_upsell_requested && (
  <FoliaUpsellBanner token={token} deviceLabel={[result.brand, result.model].filter(Boolean).join(" ")} onDone={() => setResult({ ...result, folia: true, folia_upsell_requested: true, folia_upsell_price: 30 })} />
)}
{isTicket && result.folia_upsell_requested && (
  <div style={{ fontSize: 12, color: "#15803D", background: "#F0FDF4", borderRadius: 10, padding: "8px 12px", marginBottom: 14 }}>
    ✓ Védőfólia megrendelve (+{money(result.folia_upsell_price)}) — átadáskor felhelyezzük.
  </div>
)}
```

**Megjegyzés az időzítéshez a mockup alapján**: a képen a doboz "Szerviz alatt" állapotban jelenik meg — ez összhangban van az eredeti kéréseddel ("amíg nálunk van a géped"), tehát a feltétel finomítva: `status !== "Átadásra"` VAGY `(status === "Átadásra" && sub_status !== "Átadva")` — lényegében bármikor, amíg a gép fizikailag nálunk van, nem csak rögtön a bejelentéskor.

Új komponens, `src/components/FoliaUpsellBanner.jsx`:
- **Cím**: "Szuper hír a gépedről! ⚡"
- **Szöveg, személyre szabva a készülékkel**: *"Mivel a {deviceLabel}-ed most nálunk van szervizelés alatt, egyetlen kattintással kérhetsz rá egy védőfóliát is, felhelyezéssel."* (a mockup "Prémium öngyógyuló hidrogél fólia" konkrét termékmegnevezését csak akkor írjuk bele szó szerint, ha tényleg ilyen fóliát használtok — ha egyszerű sima védőfólia, ne ígérjünk hidrogélt/öngyógyulót, amit nem szállítotok; jelezd, melyik igaz.)
- **Ár, kiemelve**: "Kedvezményes ár: **30 Lei** (a helyszíni 49 Lei helyett)" — a 30 Lei nagyobb, félkövér, a 49 Lei áthúzva vagy halványabb mellette.
- **Kép/illusztráció bal oldalt**: a mockup egy telefon+fólia terméket mutat — **ehhez valódi termékfotó/illusztráció kell tőled**, nincs ilyen a rendszerben; amíg nincs kép, egy egyszerű ikon (pl. `PhoneCaseIcon` nagyban, a meglévő stílusban) helyettesítheti, hogy ne találjunk ki/generáljunk terméket ábrázoló képet, ami nem a valós fóliátokat mutatja.
- **Egy gomb, teljes szélességben, elsődleges (zöld) stílus**: "IGEN, KÉREM A FÓLIÁZÁST 30 LEI-ÉRT" — **nincs külön checkbox**, a gomb maga a megerősítés (lásd a 3. pont eleji indoklást).
- Kattintásra: gomb azonnal `disabled` + "Feldolgozás..." felirat/kis spinner → `supabase.rpc("request_folia_upsell_by_token", { p_token: token })` → siker esetén a doboz helyén megjelenik a zöld "✓ Megrendelve" visszaigazolás (lásd fent, a `folia_upsell_requested` ág) → hiba esetén a gomb visszaáll, alatta piros hibaszöveg (`message`).
- Stílus: `--primary-soft` háttér, `--primary` szegély/ékezet (nem `--danger`), lekerekített sarkok, lágy árnyék — a meglévő `.tw`/`.login-card` vizuális nyelvhez illesztve, nem új dizájn-rendszer.

**Csak a közvetlen token-linken (`/status/:token`) jelenik meg** — a telefonszám-kereséses nézetben (több találat / anonim keresés) egyelőre nem, mert ahhoz a `get_ticket_status_by_phone` nem ad vissza `public_token`-t (szándékosan, hogy ne lehessen tömegesen tokeneket "kibányászni" telefonszám-találgatással). Ha szeretnéd, hogy ott is működjön, egy külön, telefonszám+ticket_no-alapú változat kell a 2. pont RPC-jéből — jelezd, ha ez fontos, most nem terveztem bele.

## 4. Staff-oldali megjelenés

- **`DetailPanel.jsx`** 115. sor — a "Fólia" sor kap egy kis kiegészítést, ha `folia_upsell_requested`:
  ```jsx
  <Row k="Fólia" v={
    ticket.folia
      ? <span style={{ color: "#22C55E", fontWeight: 700 }}>
          ✓ Igen{ticket.foliaUpsellRequested ? ` (ügyfél kérte online, +${money(ticket.foliaUpsellPrice)})` : ""}
        </span>
      : "Nem"
  } />
  ```
- **`TicketCard.jsx`** 57. sor — az "✓ Fólia" jelvény maradhat, ahogy van; ha megkülönböztethetőnek szeretnéd (pl. más színnel jelezni, hogy ügyfél-kérés), az egy apró CSS-only kiegészítés, jelezd, ha kell.
- **`TicketFormModal.jsx`** — a "Fólia felhelyezve" checkbox (175. sor) marad kézzel is állíthatónak (pl. ha a dolgozó a helyszínen ajánlja fel, nem online). **Ha egy ügyfél-kérésű fóliát utólag kipipálnátok** (meggondolta magát), a mentéskor ellenőrizni kell: ha `folia` `true`-ról `false`-ra vált **és** `ticket.foliaUpsellRequested` igaz, a `price` mezőből automatikusan vonjuk le a `folia_upsell_price` értékét (és állítsuk vissza `folia_upsell_requested = false`-ra), hogy az ár konzisztens maradjon — ezt a `saveTicketEdit`/`onSave` logikába kell beépíteni (App.jsx-ben, a `service_tickets` update mellé).

## 5. Eldöntött kérdések

- **Az akciós ár (30 Lei) kódba írva marad** — nem kerül `app_settings`-be, a 2. pontban lévő RPC `v_price numeric := 30` sora a forrás. Ha később mégis változtatnátok rajta, az egy migráció (`create or replace function`), nem admin-felületi beállítás.
- **Csak "Ügyfél" típusú munkalapokon jelenik meg** — saját készleten lévő telefonok szervizén nem, ahogy a 3. pontban már szerepelt (`result.ticket_kind === "Ügyfél"` feltétel).

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- `service_tickets` új oszlopai migrálva, `get_ticket_status_by_token` bővítve, `request_folia_upsell_by_token` létrehozva és `anon`-nak grantelve
- A `/status/:token` oldalon, nyitott ("Ügyfél" típusú, nem "Átadva") munkalapnál megjelenik az akciós doboz, egy gombnyomásra (nincs külön checkbox) a `price` automatikusan +30-cal nő, `folia = true` lesz
- Duplán nem lehet megrendelni (a doboz eltűnik / "Már megrendelted" üzenet)
- A ticket-adatok ikonokkal jelennek meg, a 4-lépéses folyamatsáv a valós `STATUSES`-ből helyesen számolódik (a "Minőségellenőrzés" a "Szerviz alatt" lépésbe olvad)
- Nincs Tailwind-osztály és nincs kitalált termékfotó a kódban — a projekt saját CSS-tokenjei és egy egyszerű ikon-helyettesítő van, amíg valódi termékkép nem érkezik
- A `DetailPanel.jsx`-en látszik, hogy ez ügyfél-kérésű, akciós tétel volt
- Ha a fólia-checkboxot staff utólag kiveszi egy ügyfél-kérésű tételről, az ár automatikusan korrigálódik
- Nincs `git push`, csak lokális commit
