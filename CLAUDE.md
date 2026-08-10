# PhoneStock

Telefonos üzlet (két helyszín: Gyimes, Szentgyörgy) kezelő alkalmazása — készlet, szerviz, alkatrészek, bevételek/kiadások, ügyfelek.

## Stack

- **Frontend**: Vite + React (plain JS/JSX, no TypeScript), kézzel írt CSS (`src/index.css`, nincs Tailwind/UI-lib)
- **Backend**: Supabase (Postgres + Auth + RLS), a React app közvetlenül a Supabase JS klienssel beszél — nincs külön backend/API szerver
- **Hosting**: Netlify (site: `phonestock-manager`, https://phonestock-manager.netlify.app)
- **Supabase project**: `aaiyyhskvxjqfhrgoulh` (region eu-west-1)

## Helyi fejlesztés

```bash
npm install
npm run dev
```

`.env` fájl kell a gyökérbe (gitignore-olva, nincs a repóban):
```
VITE_SUPABASE_URL=https://aaiyyhskvxjqfhrgoulh.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key — kérd el a projekt tulajdonosától vagy nézd meg a netlify.toml-t, ott is szerepel, mert publikus>
```

## Architektúra / adatmodell

- **`profiles`**: `role` (`admin`/`employee`), `location_id`. Admin mindent lát mindkét helyszínen; employee csak a sajátjához rendelt helyszín adatait (RLS). Az első valaha regisztrált user automatikusan admin lesz (`handle_new_user` trigger). Nincs publikus regisztráció-tiltás — bárki regisztrálhat, de employee-ként `location_id = null`-lal indul, admin rendeli hozzá helyszínhez a **Felhasználók** fülön.
- **`products`** (Telefonok): egyedi telefon tételek, `warranty` mező (opcionális, "1 hó"/"3 hó"/"6 hó"/"1 év").
- **`transactions`** (Bevételek & Kiadások): egységes bevétel/kiadás napló. Telefon-eladás is ide kerül (`category='Készlet'`), és a szerviz-átadás is (`category='Szerviz'`, automatikusan, ld. lent). `receipt_no` + `public_token` a garanciajegy linkhez.
- **`service_tickets`** (Szerviz): 3 fő státusz (`Átvett` / `Javítás alatt` / `Átadásra`) + `sub_status` cimke (pl. Garanciális, Alkatrészre vár, Sikertelen, Átadva) — lásd `src/lib/utils.js` `STATUSES`/`SUB_STATUSES`. `ticket_no` + `public_token` a garanciajegy linkhez. `sub_status = 'Átadva'`-ra váltáskor automatikusan (a) `date_out` mai dátumra áll, (b) a munkalap ára bekerül a Bevételekbe.
- **`service_parts`**: alkatrész-felhasználás munkalaponként — a munkalap részletpaneljéről rendelhető hozzá, automatikusan csökkenti az `parts` raktárkészletet és növeli a munkalap árát/anyagköltségét.
- **`parts`** (Alkatrészek): közös raktár mindkét helyszínnek, nincs helyszín-korlátozás rajta.
- **`locations`**: `name`, `phone` (a nyomtatott/digitális garanciajegyek fejlécén jelenik meg).

## Publikus (bejelentkezés nélküli) oldalak

- `/status/:token` — szerviz munkalap állapota + digitális garanciajegy a vevőnek (garancia a `sub_status='Átadva'` dátumától számolva). Token nélkül `/status` egy munkalapszám+telefonszám kereső űrlapot mutat.
- `/receipt/:token` — telefon-vásárlás bizonylat + garancia. Token nélkül `/receipt` bizonylatszám+telefonszám kereső.
- Mindkettő szűk RPC függvényeken keresztül fér hozzá az adatokhoz (`get_ticket_status(_by_token)`, `get_receipt(_by_token)`) — **nincs** nyílt `anon` SELECT hozzáférés a táblákhoz, csak ezeken a security-definer RPC-ken keresztül, hogy ne lehessen az összes ügyfél adatát végigböngészni.
- Routing kézzel van megoldva `src/main.jsx`-ben (regex a `window.location.pathname`-en), nincs react-router.

## Nyomtatás

`#print-slip-root` + `@media print` CSS trükk (`src/index.css` vége) — a `PrintSlip.jsx` / `PrintReceiptSlip.jsx` mindig a DOM-ban van, csak nyomtatáskor látszik. `window.print()` hívja ki.

## Fontos szokások / megkötések

- **Ne deployolj (se `git push`, se Netlify) a felhasználó kifejezett kérése nélkül.** Csak lokálisan commitolj, amíg nem szólnak, hogy toljad ki. (Ha a Netlify↔GitHub auto-deploy be van kötve, egy sima `git push` is éles deployt indít — dupla ok az óvatosságra.)
- Jelszót / auth fiókot ne kezelj a felhasználó nevében — ha teszteléshez bejelentkezés kell, hozz létre eldobható SQL-alapú teszt usert (`crypt()`/`gen_salt('bf')` az `auth.users`-be), majd töröld a teszt végén.
- A garancia szövegek (`SERVICE_WARRANTY_TERMS` a `src/lib/utils.js`-ben) a tulajdonos valódi üzleti feltételei — ne módosítsd a tartalmukat kitalálva, csak amit ő ad meg.
