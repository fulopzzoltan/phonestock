# Biztonsági audit — PhoneStock (2026-09-26)

**Módszer:** Supabase security advisor; minden gyanús `SECURITY DEFINER` függvény
forráskódjának és `EXECUTE`-jogának közvetlen ellenőrzése (`has_function_privilege`);
az összes RLS-policy és storage-policy átnézése; a JWT nélkül hívható edge functionök
kódjának átolvasása; az auth-beállítások lekérdezése (`/auth/v1/settings`); az élő oldal
HTTP-fejlécei; frontend-grep (titkok, XSS-nyelők); `npm audit`.
Semmit nem próbáltam ki éles támadásként. Minden „kihasználható” állítás a
jogosultságok és a kód alapján bizonyított, nem feltételezés.

**Összkép:** az alapok jók: minden táblán van RLS, a webhook aláírás-ellenőrzött, a
jelszótár naplóz, az admin külön originen fut. Viszont **3 kritikus, ma is
kihasználható hiba** van, és mindhárom gyorsan javítható. A 2026-09-01-i audit kritikus
pontja (a `mark_web_order_paid`) javítva.

---

## KRITIKUS

### K1. A cron-titkok bejelentkezés nélkül kiolvashatók → SMS/WhatsApp küldés a bolt nevében

- `get_cron_lead_notify_secret()` és `get_cron_gmail_poll_secret()` `SECURITY DEFINER`,
  **semmilyen jogosultság-ellenőrzés nélkül** visszaadják a Vault-titkot, és az `anon`
  szerep hívhatja őket (`has_function_privilege('anon', ...) = true`).
- A `notify-lead` edge function (verify_jwt=false) csak ezt a titkot kéri, és utána
  tetszőleges `phone` + `device` + `price` értékkel WhatsApp-sablont vagy **ClickSend SMS-t
  küld a bolt fiókjáról**. A `device` szöveg bekerül az üzenetbe → adathalász link
  küldhető bárkinek a bolt nevében, a bolt SMS-költségére.
- A `gmail-poll` ugyanígy tetszőlegesen triggerelhető (kisebb kár).
- Összehasonlításul: a `get_cron_review_requests_secret` helyesen el van zárva, ez a kettő
  kimaradt.

**Javítás (azonnal):**
```sql
revoke execute on function public.get_cron_lead_notify_secret() from public, anon, authenticated;
revoke execute on function public.get_cron_gmail_poll_secret() from public, anon, authenticated;
```
Az edge functionök service role-lal hívják, azok továbbra is működnek. **Utána mindkét
titkot cseréld le a Vaultban** (és a pg_cron jobban), mert lehet, hogy már kiszivárgott.

### K2. Bárki „alkalmazott” lehet → minden ügyfélüzenet és csatolmány olvasható

- A regisztráció nyitott, és **nincs e-mail-megerősítés** (`disable_signup=false`,
  `mailer_autoconfirm=true`).
- A `handle_new_user` trigger minden nem-vásárlói regisztrációt `role='employee'`,
  `location_id=null` profillal hoz létre.
- A `chat_messages_select`, a `chat_messages_update`, valamint a storage `chat_media_staff_select`
  és `chat_media_staff_insert` szabályai csak azt nézik, hogy a `current_role()` értéke
  admin vagy employee-e, **a helyszínt nem**.
- Következmény: egy kitalált e-mail-címmel, `is_customer` jelölés nélküli regisztráció
  után azonnal olvasható és módosítható az összes WhatsApp/Messenger/e-mail beszélgetés,
  és letölthető minden ügyfél-kép és -dokumentum.

**Javítás:**
1. `handle_new_user`: nem-vásárlói regisztráció **ne kapjon** staff-profilt, csak az
   `invite-employee` által jelölt fiók (pl. `raw_app_meta_data->>'invited' = 'true'`,
   amit csak a service role tud beállítani). Az első-admin logika maradhat.
2. A chat-policy-kbe ugyanaz a feltétel kell, mint máshol:
   `current_role() = 'admin' or (current_role() = 'employee' and current_location_id() is not null)`.
3. Auth-beállítás: kapcsold be az e-mail-megerősítést (`mailer_autoconfirm` ki).
4. Ma (09-26) 4 staff-profil van: 3 admin és 1 employee (helyszínnel). Helyszín nélküli
   „betolakodó” employee-profil nincs, tehát eddig nem használták ki.

### K3. Webshop futáros rendelés: kliens által megadott szállítási díj + soha le nem járó foglalás

- A `create_web_order(... p_shipping_fee numeric)` a böngészőből kapott díjat
  **ellenőrzés nélkül** hozzáadja a végösszeghez (`v_total := v_total + coalesce(p_shipping_fee, 0)`),
  így **negatív díjjal a végösszeg a telefon ára alá csökkenthető**.
- Futáros rendelésnél a státusz azonnal `'fizetve'`, a `hold_expires_at` pedig `null`.
  A foglalás (`stock_status='lefoglalt'`) ezért soha nem jár le.
- Az egyetlen korlát „max. 3 aktív rendelés telefonszámonként”, ami minden rendelésnél új
  számmal megkerülhető. Így az egész webshop-készlet tartósan lefoglalható kamu
  rendelésekkel.

**Javítás:** a szállítási díjat a szerver számolja a szállítási módból (fix tarifa, a
`p_shipping_fee` paramétert figyelmen kívül hagyva, vagy `raise` ha eltér). A futáros
rendelés induljon `'uj'` (visszaigazolásra váró) állapotban lejárattal, és a személyzet
hagyja jóvá. Kellene egy IP-alapú rate limit is (edge functionön át, mint a
`status-phone-lookup`-nál).

---

## MAGAS

### M1. A telefonszámos lekérdezés védelme megkerülhető
A `status-phone-lookup` edge function IP- és számalapú rate limitet és névmaszkolást tesz
a `get_ticket_status_by_phone` és a `get_receipt_by_phone` elé. A kommentje szerint ezek
„már nem érhetők el közvetlenül anon-ként”, de **ma is elérhetők**
(`anon_exec = true`). Közvetlen hívással korlátlanul, teljes névvel kiolvasható bármely
telefonszám szerviz- és vásárlási előzménye (eszköz, hiba, ár, hűségpont, ajánlói kód).
```sql
revoke execute on function public.get_ticket_status_by_phone(text) from public, anon, authenticated;
revoke execute on function public.get_receipt_by_phone(text) from public, anon, authenticated;
```
(Ellenőrizve: a frontend sehol nem hívja közvetlenül ezeket, csak a `status-phone-lookup`-on át.)

### M2. Hűségpont-farmolás ajánlókóddal
Az auto-confirm miatt minden kitalált e-mailes vásárlói regisztráció `ref_code`-dal
azonnal 200 + 200 pontot ír jóvá (`handle_new_user`). Ez korlátlanul ismételhető, és a
pontok jutalomra válthatók. **Javítás:** az ajánlói bónusz csak az ajánlott első valódi
vásárlása vagy szervize után járjon (vagy legalább e-mail-megerősítés + napi limit).

### M3. Gmail OAuth callback: nincs `state` → a bolt e-mail-csatornája eltéríthető
A `gmail-oauth-callback` bármilyen `code`-ot elfogad, és az `id=1` fiókot felülírja vele.
Egy támadó a saját Google-hozzájárulásával „bekötheti” a saját Gmailjét: ettől kezdve a
`send-email` az ő fiókjáról küld, a `gmail-poll` az ő postaládáját húzza be. Emellett az
`?error=` paraméter és a hibaüzenetek escapelés nélkül kerülnek a HTML-be (reflected XSS a
functions-domainen). **Javítás:** aláírt/eltárolt `state` paraméter, a callback csak egyező
`state`-tel fogadjon el `code`-ot; HTML-escape minden kiírt értékre.

### M4. Az aláírás-tároló (`signatures`) publikus bucket
A select-policy staffra szűkít, de **publikus bucketnél a `/object/public/...` URL
policy nélkül is kiszolgál**. Az ügyfél-aláírások képe a link (path) ismeretében
bárkinek letölthető. **Javítás:** `update storage.buckets set public=false where id='signatures';`,
és az appban signed URL (`createSignedUrl`) a `getPublicUrl` helyett
(`src/components/DetailPanel.jsx:13`, `src/components/SaleReceiptPanel.jsx:9`). A kettőt
együtt kell kitolni, különben eltűnnek az aláírásképek.

### M5. Termékfotók: bármely bejelentkezett fiók (vásárló is) feltölthet és törölhet
A `product_photos_insert` és a `product_photos_delete` csak `auth.role()='authenticated'`
feltételt néz. **Javítás:** staff-feltétel (`current_role()` + helyszín), mint a többi
staff-policynél.

---

## KÖZEPES

| # | Probléma | Javítás |
|---|---|---|
| K-1 | `profiles_select`: `auth.uid() is not null` → a vásárlói fiókok látják a dolgozók nevét, e-mailjét, szerepkörét | staff-feltétel |
| K-2 | `upsert_customer`, `next_consignment_doc_no`, `next_purchase_doc_no` bármely bejelentkezett fióknak hívható (vásárlónak is): ügyfélkártya-szemetelés, dokumentumszám-lyukak | szerepkör-ellenőrzés a függvényben |
| K-3 | A régi `whatsapp-webhook` **aláírás-ellenőrzés nélkül** fogad POST-ot (a `chat-webhook` már kiváltotta) | a function törlése |
| K-4 | `check_rate_limit` anon-hívható → egy célzott kulcs (pl. `phone:<szám>`) kimerítésével valakinek a lekérdezése 15 percre letiltható | `revoke ... from anon, authenticated` (csak service role hívja) |
| K-5 | `auto_close_missed_days` anon-hívható (a hatása ugyanaz, mint a cronnál, de nem nyilvános funkció) | `revoke ... from anon, authenticated` |
| K-6 | Leaked Password Protection kikapcsolva | Auth → Password security → bekapcsolni |
| K-7 | `customer_account_exists(email)`: e-mail-cím létezése kideríthető | elfogadható, ha a UX-hez kell; különben rate limit |
| K-8 | Nincs Content-Security-Policy fejléc (a többi biztonsági fejléc rendben) | CSP report-only módban kezdve |

## ALACSONY

- `app_settings_select` publikus (cégadatok, SmartBill-sorozat, SMS-beállítások): nem titok, de nem kell publikusnak lennie.
- `pg_net` a `public` sémában (advisor WARN).
- `npm audit`: az éles függőségekben 0 sérülékenység; a fejlesztői eszközökben 2 (élesbe nem kerülnek).

## RENDBEN (megerősítve)

- RLS minden táblán, helyszín-szintű szabályokkal.
- `chat-webhook`: Meta HMAC-aláírás konstans idejű összehasonlítással, SSRF elleni host-allowlist.
- Jelszótár: `reveal_vault_credential` szerepkör- és helyszín-ellenőrzéssel, hozzáférési naplóval; a létrehozó, módosító és törlő függvények is ellenőriznek.
- `merge_customers`: csak admin; `mark_web_order_paid`: se anon, se authenticated nem hívhatja (a korábbi kritikus hiba javítva).
- `status-phone-lookup` edge function: jó minta (rate limit + névmaszkolás). Csak a nyers RPC-t kell elzárni (M1).
- A frontendben nincs service role kulcs, `eval` vagy `dangerouslySetInnerHTML`.
- HSTS (preload), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`; az admin külön originen fut.

## Javasolt sorrend

1. **Ma:** K1 (2 revoke + titokcsere), M1 (2 revoke). Pár soros SQL, kockázatmentes.
2. **Ma/holnap:** K2 (trigger + chat-policy + e-mail-megerősítés) és a staff-profilok átnézése.
3. **A webshop élesítése előtt:** K3 (szerveroldali szállítási díj, futáros rendelés lejárattal), M2.
4. **Utána:** M3, M4, M5, majd a közepes pontok.
