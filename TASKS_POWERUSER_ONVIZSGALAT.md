# Power-user önvizsgálat — PhoneStock (2026-09-01)

Nézőpont: 10 éve fut az üzlet, mindkét szerepben (kasszás + szerelő + felújító),
webshopot is visz, telefont is vesz be ügyféltől és bizományban is. Ez nem
biztonsági audit (az a `TASKS_BIZTONSAGI_AUDIT.md`-ben van), hanem napi
használat szempontjából: hol veszítek időt, hol kell duplán begépelnem valamit,
mi hiányzik ahhoz, hogy ez tényleg úgy működjön, ahogy egy 10 éve futó,
két helyszínes bolt igényelné.

Módszer: végigmentem a Pult/Kassza, Készlet, Szerviz, Alkatrész, Elszámolás,
Ügyfelek/Garancia, Felvásárlás és Számlázás fülek tényleges kódján (nem csak
a felületen), és megnéztem, mi VAN és mi NINCS a napi rutinhoz képest.

---

## 1. Nincs vonalkód/QR-olvasás sehol — mindent kézzel gépelsz be

Se a `StockModal`-ban (új telefon felvétele), se a `TicketFormModal`-ban
(szerviz-felvétel), se az Alkatrészeknél nincs semmi ami egy USB/Bluetooth
vonalkódolvasót vagy a telefon kameráját kihasználná. Az IMEI, a modell, minden
szabad szöveges mező, amit egyesével kell begépelni.

Ez a leginkább érezhető napi súrlódás egy 10 éve menő boltban: egy dobozból
kipakolt új telefonnál a doboz IMEI-matricáját le kellene tudni olvasni, nem
lekopizni 15 számjegyet. Egy USB vonalkódolvasó technikailag simán "billentyűzetként"
viselkedik — ha az IMEI mezőre fókuszálsz és beolvasod, működne is már MOST, csak
nincs erre kialakítva a UI (nincs "beolvasás" gomb, ami rögtön a mezőre ugorna és
jelezné, hogy megtörtént a beolvasás; mobilon meg nincs kamerás beolvasás opció).

**Javaslat:** rövid távon (0 kódmódosítás): próbáld ki, egy olcsó USB
vonalkódolvasó (kb. 50-100 Lej) simán működik-e az IMEI mezőn, mert lehet, hogy
ez már ma is megoldja a felét a problémának. Középtávon egy dedikált "IMEI
beolvasás" gomb (kamerás beolvasás mobilon, `getUserMedia` + egy vonalkód-lib)
nagy időmegtakarítás lenne a StockModal, TicketFormModal és a bizományos/felvásárlási
flow-ban egyaránt.

## 2. Nincs egységes keresés — 5 külön keresőmező, mindegyik csak a saját fülén lát

A Készlet, Szerviz, Alkatrészek, Kliensek, Garancia fülnek mind saját keresője
van, de mindegyik CSAK a saját listájában keres. Ha bejön valaki és csak annyit
mondasz magadnak "ez a Kovács Jánosnak a telefonja volt, vagy szervizeltük is,
vagy vett is tőlünk, nem tudom melyik" — 3 fület kell egyesével átkattintanod,
mindegyikbe be kell írnod a nevét.

Ehhez képest a `TicketFormModal`-ban MÁR VAN egy jó minta: ha beírod az IMEI-t,
automatikusan megkeresi, hogy volt-e ezzel a készülékkel korábban dolgunk (nálunk
vásárolt termék VAGY korábbi szerviz) — ez pontosan az az élmény, ami egy globális
keresőben is kellene, csak most csak ott van bekötve, egy helyen.

**Javaslat:** egy globális kereső a `ContentTopbar`-ba (ahol most a helyszín-
választó és a chat-gomb van), ami egyszerre keres ügyfél név/telefon, IMEI,
munkalapszám és termékszám szerint, és a találatot egyenesen a megfelelő
részletnézetre viszi. Ez a leggyakoribb "hol van már megint" napi keresést
oldaná meg egy lépésben.

## 3. Nincs duplikált IMEI elleni figyelmeztetés felvételkor

A `StockModal`-ban az IMEI szabad szöveg, nincs formátum-ellenőrzés (15 számjegy)
és nincs figyelmeztetés, ha egy már raktáron lévő (vagy eladott) IMEI-t viszel be
újra. A `TicketFormModal`-ban VAN IMEI-egyezés kereső ("ezzel a készülékkel már
dolgoztunk"), de ez csak a munkalap-felvételnél fut le, a termék-felvételnél nem.

10 év alatt ez pontosan az a hiba, ami egyszer előfordul: valaki elgépeli vagy
véletlenül duplán rögzít egy telefont, és utólag két külön "termék" lesz ugyanabból
a fizikai darabból a raktárban — készletegyenleg-eltérés, aminek utólag nehéz
utánamenni.

**Javaslat:** a `StockModal` mentés előtt fusson le ugyanaz az IMEI-egyezés-
kereső, ami a TicketFormModal-ban már megvan, és jelezzen (nem feltétlen kell
letiltania a mentést, elég egy sárga figyelmeztető sáv: "ez az IMEI már szerepel
egy másik raktári tételen").

## 4. A raktári "Lefoglalt" állapotnak nincs lejárata

Amikor egy ügyfél előleget ad és lefoglal egy telefont (`TicketFormModal` →
"A kliens telefont is lefoglal"), vagy amikor beszámítasz egy régi telefont
(`SellModal` → beszámított telefon), a termék "Lefoglalt" állapotba kerül —
és onnantól kézzel kell emlékezni rá, hogy vissza kell-e tenni polcra, ha az
ügyfél mégsem jön vissza. Nincs dátum hozzárendelve, nincs automatikus jelzés,
ha 2-3 hete "lefoglalt" egy darab anélkül, hogy bármi történt volna vele.

A Pult fülön van egy "Lefoglalt telefonok" panel, ami legalább listázza őket —
ez jó, de passzív: csak akkor veszed észre a problémát, ha ránézel, nincs
"ez már 21 napja lefoglalt, mi legyen vele?" jellegű proaktív jelzés, ahogy
a szerviz munkalapoknál a SLA-jelzés (`slaInfo`) már megvan.

**Javaslat:** tegyél egy `reserved_at` időbélyeget a foglaláshoz, és a Pult
"Lefoglalt telefonok" panelen jelenjen meg egy hasonló sárga/piros jelzés, mint
a szerviznél a határidő-lejáráskor (pl. 14+ nap után).

## 5. Fólia/kábel "mellékelt tartozék" nem valódi raktárkészlet

A `SellModal`-ban a fólia és a kábel eladáskor egy egyszerű pipa + szabadon
beírt ár — ez az összeg belekerül a beszerzési árba, de sehol nem csökken egy
"fólia raktáron: X db" számláló, mert ilyen nincs. Ugyanez a helyzet a
`TicketFormModal`-ban a fóliánál.

Ez azt jelenti, hogy soha nem fogod tudni megmondani a rendszerből, hány fólia/
kábel van még raktáron, vagy mennyi volt ezeken összesen a haszonkulcs külön a
telefonoktól — csak a bevétel oldalán jelenik meg, elmosva a telefon árában.

**Javaslat:** ha ezek elég gyakori tételek (valószínűleg azok, minden eladásnál
felajánljátok), érdemes lenne őket valódi `parts`-szerű tételként kezelni saját
kis raktárkészlettel — ugyanaz a minta működik már az alkatrészeknél
(`PartUsageModal` → felhasználás munkalaphoz/termékhez, automatikus
készletcsökkentés). Ha ritkán fogy el és nem éri meg a plusz adminisztráció,
ez maradhat így, de akkor legalább tudatosan döntött választás legyen, ne
vakfolt.

## 6. Szerelőknek nincs "az én munkáim" szűrő

A munkalapon van `assignedTo` (technikus hozzárendelése), de a Szerviz fülön
a szűrés csak státusz szerint működik (Átvett / Javítás alatt / Átadásra) —
nincs "csak az enyémek" nézet. Ha ketten-hárman szerelnek egyszerre, mindenki
végignézi az összes munkalapot, hogy megtalálja a sajátját.

**Javaslat:** egy egyszerű chip/dropdown "Technikus: Mind / Én" a Szerviz fül
szűrősorába — ez a `ServiceTab.jsx`-ben egy kis, olcsó módosítás lenne
(`activeTickets.filter(t => t.assignedTo === currentUserId)`), a mező már
létezik, csak nincs kihasználva a listázásnál.

## 7. Nincs semmilyen adatexport (CSV/Excel) a rendszerből

Végignéztem a Készlet, Szerviz, Ügyfelek, Tranzakciók, Alkatrészek füleket —
sehol nincs "Letöltés Excelbe/CSV-be" gomb. Ez konkrétan ebben a beszélgetésben
is előjött: a történeti adatok (Gyimes/Szentgyörgy havi bontás) betöltéséhez
Te magad exportáltál/küldtél CSV-ket, amiket nekem kellett kézzel feldolgoznom
Python-szkriptekkel — a rendszer maga nem tud semmit kiadni magából.

Ez azért fájó pont 10 év alatt, mert: (a) a könyvelőnek/adóbevallásnak oda kell
tudnod adni egy táblázatot anélkül, hogy valaki (én, vagy bárki más) kézzel
összeollózza a Supabase-ből; (b) ha valaha váltani akarnál rendszert, vagy csak
biztonsági mentést akarnál a saját adataidról a Supabase-en kívül is, jelenleg
nincs rá gomb.

**Javaslat:** egy egyszerű "Exportálás CSV-be" gomb a Tranzakciók, Készlet és
Ügyfelek listákon (kliens-oldali, a már betöltött adatból generált CSV, nem
kell hozzá szerver-oldali munka) — viszonylag olcsó fejlesztés, nagy napi
haszonnal a könyveléshez és a saját adat-tulajdonláshoz.

## 8. Nincs offline-tűrés — ha megáll a net a pultnál, megáll a kassza

Ez tisztán kliens-oldali app (Vite + React), ami minden művelethez azonnal a
Supabase-t hívja — nincs service worker, nincs offline-queue, nincs
`navigator.onLine` kezelés sehol a kódban. Ha a boltban (vidéki helyszín, nem
mindig acél-stabil net) éppen akkor esik ki a net, amikor valaki fizetne, az
eladás rögzítése simán elszáll, és nem lesz belőle semmilyen helyi mentés,
amit utólag újra be lehetne küldeni.

**Javaslat:** ez a legnagyobb falat a listán, szóval nem "csináld meg holnap"
szintű — de érdemes legalább egy minimális védőhálót építeni: ha egy
tranzakció-mentés hálózati hiba miatt elszáll, a UI mentse el helyi
`localStorage`-ba a beírt adatokat, és jelezze egyértelműen ("nem sikerült
menteni, próbáld újra, amíg nincs net, ne zárd be az ablakot") — ez nem teljes
offline-mód, csak annyi, hogy egy net-kimaradás ne nyeljen el egy valós eladást
nyomtalanul.

## 9. Elszámolás (kassza-zárás) helyszín-szintű, nem műszak/kasszás-szintű

A `CashSettlementTab` remekül megoldja a KÉT HELYSZÍN közti pénzmozgatást
(ki adjon át kinek mennyit) — ez jó, kifejezetten ügyes greedy-algoritmus van
mögötte. Amit viszont nem old meg: ha egy helyszínen egy nap többen is kasszáznak
egymás után, a rendszer nem tud különbséget tenni "ki volt a pulton, amikor
ez a tranzakció történt" — csak helyszín-szintű az összesítés, nem
alkalmazott-szintű.

Ha valaha egy konkrét kasszahiánynál ("kinél volt eltérés a fizikai számoláskor")
szeretnél visszakeresni, ki volt akkor szolgálatban, ma ehhez nincs támpont a
rendszerben — kívülről (pl. munkarend) kellene rekonstruálni.

**Javaslat:** ha ez most nem fáj (mert kevesen dolgoznak egyszerre egy pulton),
hagyd — de ha valaha bővül a csapat, érdemes lehet a tranzakciókhoz már most
elmenteni, ki rögzítette (ha ez még nincs meg — érdemes ellenőrizni, mert
`created_by`-szerű mező hasznos lenne itt is, nem csak a bizalom, hanem az
elszámoltathatóság miatt is).

## 10. Ügyfél-duplikátumok: nincs összevonó eszköz

A `CustomersTab` szépen mutatja a vásárlási/szerviz-előzményt egy ügyfélhez,
de nincs "két ügyfélkártya összevonása" funkció. 10 év alatt szinte biztos,
hogy lesz olyan eset, hogy ugyanaz az ember kétszer került fel (más
névírással, vagy mert a telefonszáma megváltozott) — ilyenkor az előzménye
kettészakad, és a hűségpont/vásárlási statisztika is torzul.

**Javaslat:** alacsony prioritás, ritkán előforduló probléma — de ha egyszer
gyűlik a duplikátum, egy admin-only "összevonás" gomb (átmozgatja a másik
kártyához tartozó tranzakciókat/munkalapokat egy főkártyára) sokat spórolna
egy manuális adatbázis-piszkálás helyett.

---

## Amit már jól csináltatok (nem akcióelem, csak megerősítés)

- A `TicketFormModal` IMEI-egyezés kereső ("ezzel a készülékkel már dolgoztunk")
  pontosan az az élmény, amit egy 10 éve futó szerviz igényel — csak ez a minta
  hiányzik még pár másik helyről (ld. #2, #3 fent).
- A Pult fül ("mai tennivalók" sáv) jó ötlet: webes rendelés, ígért munka és
  kész várakozás egy helyen — ez tényleg azt az agyi terhet veszi le rólad,
  hogy fejben tartsd, mi van ma soron.
- A kassza-zárás két-helyszínes elszámolása (ki adjon át kinek) kényelmes és jól
  átgondolt — ritkán lát ember ilyen letisztult megoldást egy kis üzletre.
- A bizományos (`consignment`) és saját vásárlás (`purchase`) beszerzési út
  külön van kezelve a StockModal-ban, a szükséges eladói adatokkal (CNP, cím,
  kifizetendő összeg) — ez jogilag is rendben van, nem csak UX-ileg.
- A felvásárlási flow (`BuybackFlow`) ügyfél-oldalon nagyon jó: népszerű
  modellek gyorsválasztó, 3 kifizetési mód (készpénz/kredit/bizomány),
  "vidd tovább" kereszt-ajánlat — ez kifejezetten Hormozi-szintű "csökkentsd a
  súrlódást, növeld az átlagos kosarat" gondolkodás.

---

## Ha csak 3-at csinálnál meg most

1. **Globális keresés** (#2) — ez a leggyakrabban érzett napi súrlódás, és a
   TicketFormModal-ban már megvan a minta hozzá, csak ki kell terjeszteni.
2. **CSV export** (#7) — közvetlenül megspórolja a könyveléssel/adóval
   kapcsolatos kézi meló egy részét, és véd, ha valaha adatot kéne kimenekíteni.
3. **Vonalkódolvasó teszt** (#1) — mielőtt bármit fejlesztetek, egyszerűen
   próbáljátok ki egy olcsó USB-olvasóval az IMEI mezőn, lehet hogy ingyen
   megoldja magát.
