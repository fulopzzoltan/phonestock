# TASKS — Checkout UX (Shopify-minta alapján) + fizetés "mintha kész lenne" (teszt-mód)

Ez a `/penztar` oldal (a `TASKS_WEBSHOP_FLIP_BSGMAG_STIL.md` 6. pontjában, a `TASKS_WEBSHOP_ONLINE_FIZETES.md`-ben leírt kosár/rendelés/Netopia-architektúrára épülő) UX-részletterve, kutatás alapján. **Nem duplikálja** az adatbázis/Edge Function architektúrát — az a két korábbi fájlban van, ez csak a felület.

## 0. Amit megnéztem

A Shopify checkoutja (és a mögötte álló, jól dokumentált kutatás — Baymard Institute, valamint egy 2026-os, 30 pontos Shopify checkout UX playbook) alapján néhány kőkemény, számokkal alátámasztott tény:

- Egyoldalas checkout ~20%-kal csökkenti az elhagyást, az egyszerűsített checkout 25-35%-kal javítja a konverziót.
- A vásárlók **19%-a** azért hagyja ott a kosarat, mert nem bízik meg az oldalban a kártyaadatokkal — a fizetés-gomb mellé tett bizalmi jelvények (nem banner, hanem apró, inline ikonok) 12-17%-kal javítják a befejezési arányt.
- A **#1 ok** az elhagyásra: meglepetés a végösszegben. Minden tételt (részösszeg, kedvezmény, végösszeg) sorban kell mutatni, nem csak a végén egy nagy számot.
- Fiók-létrehozást **fizetés UTÁN** kell felajánlani, nem előtte — ez 3-5×-ös konverziót hoz a kényszerített előzetes regisztrációhoz képest.

## 1. Oldal-struktúra

Egyoldalas, egy-oszlopos form (nem több lépéses wizard, nem több oszlopos táblázat) — a meglévő `.pub-shop`/`.login-card` vizuális nyelvet követve (`StockShowcase.jsx`/`PhoneDetail.jsx` mintájára), `PublicHeader`/`PublicFooter` újrahasznosítva.

Sorrend fentről lefelé (a vásárló gondolkodásmódját követve, nem az adatbázis-mezők sorrendjét):
1. **Kapcsolat** — email + telefonszám (ha be van jelentkezve `/fiok`-on, előre kitöltve és nem szerkeszthető)
2. **Átvétel** — helyszín-választó (Gyimes / Szentgyörgy), ha csak egy darab van csak az egyik boltban raktáron, automatikusan az legyen kiválasztva választás nélkül (ld. 5. pont)
3. **Fizetés** — Netopia (ld. 7. pont)

Desktopon jobb oldali sáv: **rendelés-összegző**, mindig látható, sticky (`position: sticky`, nem kell JS). Mobilon: az összegző a form **tetejére** kerül, alapból összecsukva egy sorba ("Rendelés összegzése ▼ 1.899 Lei"), tap-re nyílik ki.

## 2. Form-design

- **Egy oszlop**, felülről lefelé, nincs kétoszlopos elrendezés (Z-mintázatú pásztázást okoz, lassítja a kitöltést).
- **Címkék a mező felett**, nem placeholderként a mezőben — a placeholder eltűnik gépeléskor, és áttekintéskor csapdává válik.
- **`autocomplete` attribútum minden mezőn**: `autocomplete="email"`, `autocomplete="name"`, `autocomplete="tel"` — enélkül a mobil-autofill nem működik.
- **Inline validáció blur-re**, ne a submit gombra vártan — hiba a mező mellett jelenjen meg, abban a pillanatban, amikor még javítható, ne a végén, egy újra-átolvasásra kényszerítve.
- **Csak az opcionális mezőket jelöld** ("(nem kötelező)"), ne a kötelezőket csillaggal — a legtöbb mező úgyis kötelező, a csillagozás felesleges vizuális zaj.
- **Ne kérdezz duplán** — nincs "email megerősítése" mező, nincs cím-megerősítés (nincs is cím, csak helyszín-választás).
- Telefonszám mezőn `inputMode="tel"`, hogy mobilon numerikus billentyűzet jöjjön fel.

## 3. Rendelés-összegző

Tételenként: kép (bélyegkép, a `TASKS_FOTO_OPTIMALIZALAS.md` szerinti `thumb` méret), modell neve, állapot/fokozat (ha felújított), ár. Alatta **sorbontásban**: Részösszeg → (Kedvezmény, ha van) → **Végösszeg** — soha ne csak egy nagy végösszeg jelenjen meg meglepetésként, minden komponens látszódjon. Mivel nincs szállítási díj/adó-bonyodalom (a `sale_price` már ma is ÁFÁ-s bruttó ár, ahogy a boltban), ez a szakasz nálunk egyszerűbb, mint egy tipikus Shopify-boltnál — pontosan ez az egyszerűség az erősségünk, ne bonyolítsd túl.

## 4. Bizalmi elemek — pontosan annyi, amennyi hiteles

- **Fizetés-gomb mellett, apró, inline jelvények** (nem félelemkeltő "100% BIZTONSÁGOS" banner): kártyatípus-ikonok (Visa/Mastercard) + "Biztonságos fizetés — Netopia" felirat, kis betűvel.
- **Konkrét, számszerű átvételi ígéret**, nem homályos szöveg: pl. "Fizetés után azonnal foglaljuk, X napig tartjuk a boltban" vagy "Előkészítjük, SMS-ben szólunk, ha átvehető {helyszín}-en" — ne "gyors átvétel"-t írj, mondj konkrétumot.
- **Garancia/elállási jog szövege jól látható**, konkrét (a `TASKS_WEBSHOP_ONLINE_FIZETES.md` 4. pontjában már megvan a vázlat, jogilag pontosítandó).
- **Valódi testimonial, ha van rá anyagod** (egy tényleges vásárló neve + értékelése, pl. Google-ről) — kitalált/stock-fotós "vélemény" rontja a bizalmat, ne találjunk ki ilyet. Ha nincs még gyűjtött vélemény, hagyd ki ezt a blokkot, ne pótold hamisítvánnyal.
- **Ne tegyél be hamis sürgetést** ("3 ember nézi most" / visszaszámláló-időzítő, ha nincs mögötte valódi adat) — ez a kutatás szerint is inkább kétségbeesettnek hat, mint meggyőzőnek, és nem is stílusa ennek a boltnak.

## 5. Alapértelmezések — ne kérdezz olyat, ami nem valódi döntés

- Ha a kosárban lévő darab csak **egy** helyszínen van készleten, ne mutass helyszín-választót, csak egy sort: "Átvehető: {helyszín}".
- Ha a vásárló be van jelentkezve, és korábban már vásárolt egy adott helyszínen, azt legyen az alapértelmezett (előre kiválasztott) opció.
- Ha csak egyetlen fizetési mód érhető el (jelen esetben csak kártya, Netopián keresztül — nincs utánvét/átutalás opció tervezve), **ne mutass választógombot**, csak a kártyás fizetés induljon egyenesen.

## 6. Mobil-specifikus részletek

- Rendelés-összegző: sticky, összecsukva alapból (ld. 1. pont).
- **Fő CTA-gomb ("Fizetés" / összeg) alul rögzítve** (`position: sticky; bottom: 0`), mindig elérhető scroll közben, ne fent lebegjen a billentyűzet fölött rossz helyen.
- **Érintési célpontok min. 44×44px** — gombok, checkbox-ok, rádiógombok.
- Numerikus billentyűzet a telefonszám mezőn (ld. 2. pont).

## 7. "Mintha kész lenne" — teszt-módú fizetés-szimuláció

Mivel a valódi Netopia-kulcsok még nincsenek meg (a `TASKS_WEBSHOP_ONLINE_FIZETES.md` 1. pontja szerint ez a te teendőd), de a teljes élményt szeretnéd most, működőképesen látni: a `create-netopia-payment` Edge Function **mock módban** fusson, amíg nincs éles kulcs.

- Egy `NETOPIA_MODE` env-változó (`mock` / `live`) dönti el, melyik ágon fut az Edge Function.
- **`mock` módban**: nincs valódi Netopia-hívás — a checkout gomb megnyomására egy saját, egyértelműen **"TESZT FIZETŐOLDAL"**-nak jelölt komponensre navigál (nagy, feltűnő felirat: "Ez egy teszt-fizetés, nem történik valódi terhelés"), ahol egy kártya-forma-utánzat van (bármilyen bevitel elfogadva, **nincs valódi kártyaadat-kezelés, nincs mögötte adatbázis-mentés kártyaszámra**), egy "Fizetés szimulálása — sikeres" és egy "Fizetés szimulálása — sikertelen" gomb. Ez pontosan ugyanazt az állapotgépet futtatja le (`web_orders.status` átmenetek, `products.status` zárolás/felszabadítás), mint amit az éles IPN tenne — **csak a Netopia-hívás van kicserélve egy azonnali, kliens-oldali szimulációra**.
- **`live` módba váltás** — a `TASKS_WEBSHOP_ONLINE_FIZETES.md`-ben leírtak szerint, csak a te kifejezett jóváhagyásoddal, miután a valódi Netopia-fiók/kulcsok megvannak és a sandbox-tesztek lefutottak. A UI-n **semmi nem változik**, csak a mock helyett a valódi Netopia-hívás fut.
- **Nagyon fontos, hogy ez a teszt-jelleg mindig egyértelműen látszódjon** (fejléc-sáv, feltűnő szín) — nem szabad, hogy bárki azt higgye, valódi fizetés történt, amíg `mock` módban vagyunk.

## 8. Sikeres fizetés utáni oldal (`/rendeles/:token`)

Ez a legmagasabb figyelmű felület az egész folyamatban — ne pazarold el egy sima "Köszönjük!" szövegre:
- Rendelés-összefoglaló (mit vásárolt, mennyiért, hol veheti át).
- **Fiók-létrehozás felajánlása MOST, nem korábban** — "Mentsd el ezt a rendelést — hozz létre fiókot 10 másodperc alatt" gomb, a checkout-nál megadott email/telefonszám előre kitöltve, egy kattintásra köti össze a `TASKS_UGYFEL_FIOK.md` szerinti `/fiok` fiókkal (jelszó megadása az egyetlen extra lépés).
- Ha vendégként marad, a rendelés a `public_token`-en keresztül bármikor visszakereshető ugyanezen az oldalon.

## 9. Akadálymentesség — rövid checklist

- Ne nyomd el CSS-sel a böngésző alap fókusz-gyűrűjét (`outline`) — kattintható elemeken látszódnia kell, hol jár a billentyűzetes fókusz.
- Szöveg-kontraszt minimum 4.5:1 (halványszürke placeholder/hibaszöveg gyakori hiba, kerüld).
- Hibaüzenetek `aria-live="polite"` régióban jelenjenek meg, hogy képernyőolvasóval is érzékelhetők legyenek.

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- Checkout egy oldalon, egy oszlopban, a leírt mezősorrenddel
- Rendelés-összegző mobilon összecsukható/sticky, desktopon mindig látható, sorbontott árakkal
- Bizalmi jelvények inline, nem banner-szerűek; nincs hamis sürgetés/számláló
- `mock`/`live` Netopia-mód kapcsolható env-változóval, `mock`-ban egyértelműen jelölt teszt-fizetőoldal fut, ugyanazt az állapotgépet futtatva, mint az élesben futna
- Sikeres fizetés után fiók-létrehozás felajánlása, nem kényszerített regisztráció a checkout előtt
- Nincs `git push`, csak lokális commit
