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

## 3. Nyomtató — már van GK420D, nem kell újat venni

Van már **Zebra GK420D** (203 dpi, direkt termál, USB) — ez pont jó erre, nem kell másikat
venni. Zebra már nem gyártja/árulja újonnan (2024 óta kivezetett modell), de a meglévő darab
teljesen jól működik, a szoftveroldal is támogatott. Két útja van a webes appból való
nyomtatásnak, sorrendben ajánlva:

- **A) Egyszerű út — sima `window.print()`, ugyanaz a minta mint a `PrintSlip.jsx`-nél.**
  A GK420D-hez telepített Windows/Mac nyomtató-driver (Zebra Setup Utilities /
  ZebraDesigner driver) simán rendes rendszer-nyomtatóként jelenik meg, tehát a böngésző
  nyomtatási párbeszédablaka minden extra nélkül ráküldi. Csak egy új `@media print` szakasz
  kell címke-méretre állított `@page`-dzsel (pl. 50×30mm — nézd meg, milyen tekercs van/lesz
  betöltve). Ez a gyorsabb, kevesebb munkával járó megoldás, de böngészőnként/OS-enként lehet
  1-2mm-es margó-eltérés, mert a nyomtatási párbeszédablak skálázza a HTML-t.
- **B) Pontosabb út — Zebra Browser Print (ingyenes Zebra-szoftver) + ZPL.**
  Ez egy kis háttérben futó program (telepíteni kell a pult-gépre), ami helyi HTTP-n keresztül
  engedi, hogy a weblapból közvetlenül, pixel-pontosan (nyomtatási dialógus és
  böngésző-skálázás nélkül) küldjünk nyers ZPL-parancsot a nyomtatóra. Ez a "rendes",
  professzionális módszer — ezt használják boltok/futárcégek is GK420D-vel. Cserébe kell
  hozzá egy pár sornyi ZPL-sablon (QR + vonalkód + szöveg pozicionálva), és a Browser Print
  appot fel kell telepíteni minden gépre, ahonnan nyomtatni akarunk.

**Javaslat:** kezdjük A)-val (nulla extra telepítés, gyorsan kipróbálható), és ha az élesben
zavaró a margó-pontatlanság vagy lassú a böngésző nyomtatási dialógusa a pultnál, ugorjunk
B)-re.

Ha a másik helyszínen (Szentgyörgy vagy Csíkmadaras) nincs másik GK420D, azt a franchise-
partnerrel/helyszínnel kell tisztázni — vagy oda is kell egy nyomtató (ugyanaz vagy egy olcsóbb
modell is jó, ha driveres), vagy egyelőre csak ott tesztelitek a szkennelést papíralapú
munkalapon lévő kóddal, nyomtatás nélkül.

## Megvalósítási sorrend (ha mész vele tovább)

1. QR-generálás a meglévő `PrintSlip.jsx`/`PrintReceiptSlip.jsx`-be (kliens-oldali JS lib, pl.
   `qrcode` npm csomag) + Code128 (pl. `jsbarcode`) — új `@media print` szakasz címke-méretben,
   A) út szerint, a meglévő GK420D-re tesztelve.
2. Ha kell a pontosabb nyomtatás: Zebra Browser Print telepítése a pult-gépre + ZPL-sablon
   elkészítése (B) út.
3. "Szkennelés" komponens (`barcode-detector` csomaggal) + gomb a Pult/Szerviz/Alkatrészek
   keresőmezők mellé.

Nincs `git push`, ez a fájl egyelőre csak helyi jegyzet.
