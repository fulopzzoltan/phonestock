# Felújítás modul — saját telefonok javítás-menedzsmentje

Új, önálló fül (**Felújítás**, a Napi munka csoportban, Telefonok/Alkatrészek mellett) —
szándékosan külön az ügyfél-szerviztől, ahogy kérted.

## Hogyan kerül be egy telefon ide

A Telefonok fülön a szerkesztésnél állítsd a "Raktár állapot"-ot **Javítandó**-ra — ez már
eddig is létező mező volt, csak eddig nem volt hozzá saját felület. Onnantól automatikusan
megjelenik a Felújítás fülön.

## Mit tud a fül

- **Rangsorolás** — minden kártyán fel/le nyíllal állíthatod, melyiket csináljátok meg előbb
  (kézi sorrend, nincs automatika).
- **Feladatlista** ("mihez mire van szükség") — minden telefonhoz szabadon felvehetsz
  feladatokat leírással + becsült árral (pl. "Kijelző — 250 Lei"), és három állapot közt
  mozgathatod: Kell → Beszerzés alatt → Kész. A kártya tetején összesíti, mennyi a nyitott
  becsült költség.
- **Alkatrész-raktár** — ha a szükséges alkatrész már megvan a raktáron, a kártyáról nyitható
  "Szerviz előkészítés" munkalapon (ugyanaz a rendszer, ami eddig is működött a saját
  készlethez) hozzárendelheted, és az automatikusan levonja a raktárkészletből — pont úgy,
  mint eddig.
- **Tesztelés / kategorizálás** — a "Tesztelés" gombra kattintva egy kérdőív fut le
  (bekapcsol-e, kijelző/hátlap kozmetikai állapota, akkuegészség, kamera, gombok, biometria,
  hálózatfüggetlenség). A válaszokból a rendszer javasol egy minőségi kategóriát (Újszerű/
  Nagyon jó/Jó) és garanciát, amit egy kattintással elfogadhatsz vagy felülírhatsz. Ha a
  válaszok súlyos hibát jeleznek (repedt kijelző, sérült hátlap, nem kapcsol be, kamera/gomb
  hiba), a rendszer nem enged kategorizálni — előbb javítani kell.
- **"Kész — mehet a polcra"** gomb a tesztelés végén — ez visszaállítja a telefont "Polcon"
  állapotba (eladásra kész, megjelenik a vitrinen is), és lekerül a Felújítás listáról.

## Amit szándékosan NEM csináltam

Nem hoztam létre külön "bejövő telefon" felvételi folyamatot — a meglévő Telefonok-felvitelt
használod, csak "Javítandó" állapottal. Ha ez a gyakorlatban kényelmetlen (pl. IMEI/forrás
adatok külön kellenének, mielőtt még "igazi" készlet-tétel lenne), szólj, és külön felvételi
lépést is kidolgozok.

Nincs `git push`, ez is csak lokális commit, amíg nem szólsz.
