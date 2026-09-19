# SameDay házhozszállítás + csomagautomata — mit kell még beállítanod

A kód, az adatbázis és a két SameDay-integrációs function el van készítve és élesítve.
Két dolog maradt, amit csak te tudsz megadni (a SameDay bejelentkezési adataidat és a
felvételi pontjaid azonosítóját) — ezekhez nekem nincs/nem is kellene hozzáférésem.

## Hogy működik most

- A pénztárban három választható mód van: **bolti átvétel** (ingyenes, ahogy eddig),
  **házhozszállítás** és **csomagautomata** (mindkettő SameDay, **20 Lej**, **1000 Lej
  fölött ingyenes** — ahogy megbeszéltük).
- Mivel az online bankkártyás fizetés (Netopia) még nincs élesítve, a futáros rendelések
  **utánvéttel** mennek — a vevő a futárnak fizet átvételkor, nem előre.
- A rendelés leadásakor MÉG NEM jön létre valódi SameDay szállítólevél (AWB) — ez
  szándékos, hogy ne generálódjon költség minden rendelésnél automatikusan. A
  **Pult** fülön, a webes rendelések között, miután "Előkészítve"-re állítottad, egy
  **"SameDay AWB generálása"** gomb jelenik meg futáros rendeléseknél — ott indítod el
  ténylegesen a szállítást, amikor tényleg mehet a csomag.
- A csomagautomata-keresőhöz egy saját táblában (`sameday_lockers`) tároljuk a SameDay
  hálózatát, amit egy napi cron frissít (`sameday-lockers-sync` function, minden nap
  4:00 UTC-kor) — ez már be van ütemezve, nem kell hozzá tenned semmit.

## 1. SameDay bejelentkezési adatok (kötelező, e nélkül semmi nem működik)

Supabase Dashboard → **Edge Functions** → **Manage secrets** (ez NEM a Vault, egy külön,
egyszerűbb hely az Edge Function-öknek szóló titkos adatoknak) → vedd fel ezt a kettőt:

- `SAMEDAY_USERNAME` — a SameDay fiókod felhasználóneve
- `SAMEDAY_PASSWORD` — a SameDay fiókod jelszava

Ezek mindkét functionnek (`sameday-lockers-sync`, `sameday-create-awb`) kellenek.

## 2. Felvételi pont ID-k helyszínenként (kötelező az AWB-generáláshoz)

A SameDay fiókodban (webes felület) nézd meg a két boltod felvételi pont ("pickup point")
azonosítóját, majd Admin → **Beállítások → SameDay szállítás** fülön írd be mindkettőhöz
(Gyimes, Szentgyörgy). Amíg egy helyszínnek nincs beállítva, azon a helyszínen induló
futáros rendelésnél az AWB-generálás hibát fog dobni (nem csendben hibázik, hanem
világosan megmondja, melyik helyszínt kell még összekötni).

## 3. (Opcionális) A napi lockers-sync lezárása egy titkos kulccsal

Jelenleg a `sameday-lockers-sync` function bárki által meghívható kívülről (csak a
SameDay hálózatot tölti be, nem érzékeny adat, de érdemes lezárni, hogy más ne
pazarolja a SameDay API-hívásaidat). Ha akarod:

- Edge Function secretek közé vegyél fel egy `CRON_SAMEDAY_SECRET` értéket (bármilyen
  hosszú véletlen string).
- Szólj, és a cron-hívásba (SQL Editor, `cron.schedule` módosítása) beteszem ugyanazt a
  kulcsot `x-cron-secret` headerként — enélkül a function most fut, csak nem védett.

## 4. Amit érdemes tesztelni élesítés előtt

- Egy próba-rendelés házhozszállítással (saját címedre) — nézd meg, hogy a Pult fülön
  megjelenik-e a cím, majd az "SameDay AWB generálása" gomb valódi AWB-t hoz-e létre.
- Egy próba-rendelés csomagautomatával — előbb ellenőrizd, hogy a `sameday_lockers`
  tábla már fel van töltve (a cron csak éjjel 4-kor fut elsőre, ha most rögtön akarod
  tesztelni, szólj és lefuttatom kézzel).
- A szolgáltatás-kiválasztás (házhoz vs. easybox) most automatikusan próbálja
  megtalálni a megfelelő SameDay szolgáltatást a nevében szereplő "Easybox" szó
  alapján — ha nálad más néven fut ez a szolgáltatás a fiókodban, szólj, és a function
  logikáját pontosítom a valódi szolgáltatás-ID-ra.

---

*Technikai jegyzet a fejlesztőnek: `sameday-lockers-sync` (napi cron, verify_jwt=false,
`SAMEDAY_USERNAME`/`SAMEDAY_PASSWORD`/`CRON_SAMEDAY_SECRET` env-ekből), `sameday-create-awb`
(staff hívja bejelentkezve, verify_jwt=true, `{orderId}` body). A `web_orders` tábla új
mezői: `delivery_method`, `delivery_city/county/address/postal_code`, `locker_id/name`,
`shipping_fee`, `sameday_awb_number/status`. A `create_web_order` és `get_web_order_by_token`
RPC-k bővítve ezekkel, visszafelé kompatibilisek (defaultok miatt a régi hívás is működne,
de a Checkout.jsx már az új paraméterekkel hívja).*
