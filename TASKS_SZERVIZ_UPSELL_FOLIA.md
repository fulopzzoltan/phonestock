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

## 3. UI — a nyomonkövető oldal (`src/StatusLookup.jsx`)

A ticket-nézetben (111-152. sor), a `SERVICE_WARRANTY_TERMS` doboz **elé** kerül egy feltűnő, de nem tolakodó akciós sáv — csak akkor, ha `result.ticket_kind === "Ügyfél" && result.status !== "Átadva" && !result.folia_upsell_requested`:

```jsx
{isTicket && result.ticket_kind === "Ügyfél" && result.status !== "Átadva" && !result.folia_upsell_requested && (
  <FoliaUpsellBanner token={token} onDone={(msg) => setResult({ ...result, folia: true, folia_upsell_requested: true, folia_upsell_price: 30 })} />
)}
{isTicket && result.folia_upsell_requested && (
  <div style={{ fontSize: 12, color: "#15803D", background: "#F0FDF4", borderRadius: 10, padding: "8px 12px", marginBottom: 14 }}>
    ✓ Védőfólia megrendelve (+{money(result.folia_upsell_price)}) — átadáskor felhelyezzük.
  </div>
)}
```

Új kis komponens, `src/components/FoliaUpsellBanner.jsx`:
- Szöveg: *"Amíg nálunk van a géped: védőfólia felhelyezése most csak **30 Lei** a szokásos 49 Lei helyett!"*
- Checkbox ("Kérem") + külön "Megrendelem" gomb (szándékosan nem elég csak bepipálni, kelljen egy második, tudatos kattintás is, mert ez tényleg hozzáadódik a fizetendő árhoz — ne legyen véletlen tap).
- Gombnyomásra `supabase.rpc("request_folia_upsell_by_token", { p_token: token })`; siker esetén hívja az `onDone`-t (a fenti optimista state-frissítéshez), hiba esetén a `message`-t mutatja.
- Vizuálisan barátságos, "ajánlat" jellegű (pl. `--primary-soft` háttér, nem `--danger`), nem tolakodó mérettel — a `login-card` szélességéhez illesztve.

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

## 5. Amit tisztázni kell

1. **Az akciós ár (30 Lei) hardkódolva legyen-e, vagy tegyük be az `app_settings`-be szerkeszthetőnek?** A tervben most hardkódolt az RPC-ben — ha gyakran szeretnéd változtatni az akciót (pl. szezonálisan), érdemesebb egy `app_settings.folia_upsell_price` mezőbe tenni, amit a Beállítások fülön írhatsz át kód nélkül. Jelezd, ha ezt szeretnéd, egyszerű kiegészítés.
2. **Csak "Ügyfél" munkalapokon jelenjen meg** (nem saját készleten lévő telefonok szervizén) — ez logikusnak tűnt, mert csak ott van tényleges, a linket nyomon követő végfelhasználó, akinek felajánlhatod. Szólj, ha mégis kell a saját-készletes eseteknél is (ott gyakorlatilag te magadnak ajánlanád fel, nem lenne sok értelme).

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- `service_tickets` új oszlopai migrálva, `get_ticket_status_by_token` bővítve, `request_folia_upsell_by_token` létrehozva és `anon`-nak grantelve
- A `/status/:token` oldalon, nyitott ("Ügyfél" típusú, nem "Átadva") munkalapnál megjelenik az akciós sáv, "Megrendelem" gombra a `price` automatikusan +30-cal nő, `folia = true` lesz
- Duplán nem lehet megrendelni (a gomb eltűnik / "Már megrendelted" üzenet)
- A `DetailPanel.jsx`-en látszik, hogy ez ügyfél-kérésű, akciós tétel volt
- Ha a fólia-checkboxot staff utólag kiveszi egy ügyfél-kérésű tételről, az ár automatikusan korrigálódik
- Nincs `git push`, csak lokális commit
