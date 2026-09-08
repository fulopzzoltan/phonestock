# Javaslat — QR/vonalkód szkennelés + hőnyomtató

**Cél:** amikor felviszünk egy új szervizt / telefont / alkatrészt, tudjunk hozzá nyomtatni egy
címkét, amit utána a telefon kamerájával vissza tudunk olvasni (munkalap száma, telefon saját
rendszerbeli száma, alkatrész száma) — gyorsabb pult-munka, nincs elgépelt szám.

Ez egy kutatás + megoldási javaslat, még nincs kódolva. 3 részre bontva: mit nyomtassunk rá,
mivel olvassuk vissza telefonnal, milyen nyomtatóval.

## 1. Mit kódoljunk a kódba

Két kód fér ki egy kis címkére, érdemes mindkettőt rátenni:

- **QR kód** — a garanciajegy/nyomonkövetés linkje (`nyomonkovetes.telefonos.ro/status/<token>`
  vagy `/receipt/<token>`, amit már úgyis generálunk minden munkalaphoz/eladáshoz). Ennek az az
  előnye, hogy **bármelyik ügyfél simán beolvassa a natív kamera-appjával** is, nem csak a mi
  rendszerünk — rögtön kidobja neki az állapotot/garanciajegyet. Ezt már ki is tudjuk nyomtatni
  ma is, csak QR-ré kell alakítani a linket (nincs adatbázis-változás hozzá).
- **Vonalkód (Code128)** — a saját belső azonosító nyers formában: `T-2451` (munkalapszám),
  `TF-118` (telefon saját sorszáma a `products` táblából), `AR-77` (alkatrész). Ez azért kell
  külön, mert ez rövidebb/sűrűbb, gyorsabban olvasható be pörgős pulti munkánál (nem kell
  internet, nem kell feloldani egy URL-t, csak visszaadja a szöveget), és ez az, amit **a mi
  saját szkennerünk** fog beolvasni, amikor pl. keresünk egy munkalapot vagy kivesszük az
  alkatrészt a raktárból.

Tehát: a címke tetején egy kis QR (ügyfélnek/garanciának), alatta egy Code128 sáv + olvasható
szöveg (nekünk, gyors belső keresésre). Mindkettő ugyanabból a `ticket_no`/`receipt_no` vagy
termék/alkatrész azonosítóból generálódik nyomtatáskor, nincs új adatbázis-mező hozzá.

## 2. Szkennelés a telefon kamerájával (böngészőből)

A böngésző natív `BarcodeDetector` API-ja ma már elég jól támogatott (Chrome/Edge Androidon és
desktopon, és terjed Safari felé is) — ez a leggyorsabb, nem kell hozzá külső JS-motor. A régen
népszerű `html5-qrcode` könyvtár viszont **karbantartás nélkül áll** 2026-ban, azt NEM
javaslom új projektbe.

Helyette: **`barcode-detector`** npm csomag (aktívan karbantartott, ZXing WebAssembly alapú
polyfill) — ha a böngészőben natívan létezik a `BarcodeDetector`, azt használja (gyors), ha
nem, ugyanazt az API-t adja vissza WASM-mal a háttérben. Így egy kódbázis, minden böngészőn
(iOS Safari PWA-ban is) működik, camera streamből (`getUserMedia`) folyamatosan tudja olvasni
a QR-t és a Code128-at is, ugyanazzal a hívással.

Gyakorlatilag egy "Szkennelés" gomb bárhol a pulton/munkalap-keresőn: megnyit egy kamera-nézetet,
talál egy kódot → beírja a keresőmezőbe / megnyitja a munkalapot-alkatrészt-terméket. Ugyanaz a
komponens újrahasználható mindhárom helyen (szerviz keresés, telefon keresés, alkatrész
raktárkivét).

## 3. Nyomtató

A címkéket a webes appból, sima `window.print()`-tel tudjuk kinyomtatni — **pontosan úgy, ahogy
ma is megy a `PrintSlip.jsx`/`PrintReceiptSlip.jsx`** (`#print-slip-root` + `@media print`
trükk), csak a `@page` méretét kell átállítani a címke méretére (pl. 40×30mm vagy 50×30mm) egy
külön nyomtatási módra. Nincs szükség driverhez/SDK-hoz írt egyedi kódra, **ha olyan
címkenyomtatót veszünk, ami sima Windows/Mac nyomtatóként települ** — akkor a böngésző
nyomtatási párbeszédablaka simán ráküldi.

Két opciót néztem meg (mai eMAG árak, 2026 szeptember):

- **Xprinter XP-420B** — USB + Bluetooth, 203 dpi, kifejezetten címkenyomtatásra, ~**1.142 Lei**.
  Ez a "rendes" opció: driveres, stabil, ipari kategóriájú kis nyomtató, ilyet használnak boltok
  tömegesen. Ha mindkét helyszínen (Gyimes + Szentgyörgy) akarunk egyet-egyet, az kb.
  2×1.142 Lei.
- **Olcsóbb Bluetooth címkenyomtató** (pl. "VITTALIST 100×150mm AWB", Windows/Mac/iOS/Android
  kompatibilis, 203 dpi) — ~**529 Lei**. Jóval olcsóbb, de ezeknél mindig meg kell nézni
  konkrétan **van-e Windows nyomtató-driverük** (van olyan modell, ami csak saját telefon-app-on
  keresztül nyomtat Bluetooth-tal, azt a böngészős `window.print()` NEM éri el) — vásárlás előtt
  ezt a leírásban/eladónál rá kell kérdezni.

**Javaslat:** ha ez üzletileg megéri (gyorsabb pult, kevesebb elgépelés), a Xprinter XP-420B a
biztosabb választás, mert driveres — nem kell app-integráció, egyből megy a mostani
nyomtatási mintával. A címke mérete 40×30mm elég QR+vonalkód+szöveghez, azt kell nézni, hogy az
adott nyomtatóhoz kapható-e ilyen méretű tekercs (a fentiek 40-58mm szélességig mennek, bőven
elég).

## Megvalósítási sorrend (ha mész vele tovább)

1. QR-generálás a meglévő `PrintSlip.jsx`/`PrintReceiptSlip.jsx`-be (kliens-oldali JS lib, pl.
   `qrcode` npm csomag) + Code128 (pl. `jsbarcode`) — új `@media print` szakasz címke-méretben.
2. Egy nyomtató beszerzése, kipróbálás: tényleg megy-e rá a böngésző nyomtatási
   párbeszédablakából driverként.
3. "Szkennelés" komponens (`barcode-detector` csomaggal) + gomb a Pult/Szerviz/Alkatrészek
   keresőmezők mellé.

Nincs `git push`, ez a fájl egyelőre csak helyi jegyzet.
