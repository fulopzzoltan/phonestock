# TASKS — GYIK (Gyakran Ismételt Kérdések) oldal

Kérés: "kikellene dolgozz egy faq oldalt a flip és backmarket alapján, csak azt akarom hogy nálunk a menük látszódjanak és a mi üzletünkre szabva, a mi eszközeinkhez kellenének a különböző topikok — ez egy elég nagy munka, dolgozd ki részletesen."

## 0. Amit megnéztem, mielőtt bármit kitaláltam volna

**Flip.ro GYIK-struktúrája** (`flip.ro/suport`, HubSpot-alapú súgóközpont, kategóriánként emoji-jelöléssel):
- Gyakran ismételt kérdések 🙋 (általános)
- Vásárlás 🛍️ (rendelés, dokumentumok, tartozékok)
- Eladás 💰 (felvásárlás)
- Hasznos tanácsok a vásárolt eszközökhöz 🩹 (troubleshooting)
- Garancia & Visszaküldés 👩‍🔧
- A felújított eszközökről 🌳 (mit jelent a "felújított", akkumulátor-jelölések)

**Back Market GYIK-struktúrája** (`backmarket.com/help`, kategória-rács + kereső):
About Back Market and refurbishing · Account · Choosing the right device · Payments · Shipping and delivery · Your orders · Device help and troubleshooting · Contact and support · Warranty and Protection Plans · Returns and refunds · Trade-in.

**A kettő közös vázából, a ti valós funkcióitokra szabva** (nem másoltam le 1:1 — kihagytam, ami nálatok nem releváns, pl. "Mobile plan partners", "Black Friday", és bevettem, ami nálatok van, de náluk nincs: szerviz mint önálló kategória, mert ti — ellentétben a flip/backmarket futár-alapú modelljével — fizikai boltban is szervizeltek).

**A kódbázisból amit felhasználtam, nem találtam ki**:
- `src/lib/utils.js` `SERVICE_WARRANTY_TERMS` — a valós szerviz-garancia szöveg (12 hó eredeti akku, 6 hó utángyártott akku, 3 hó eredeti kijelző, 1 hó utángyártott kijelző, kizárások) — ez szó szerint bekerül a Garancia kategóriába.
- `src/lib/i18n.js` `detailConditionNewDesc`/`detailConditionRefurbDesc` — a már meglévő új/felújított állapot-magyarázat, ugyanazt a szöveget viszem át.
- `LegalPage.jsx` `TERMS_CONTENT`/`RETURNS_CONTENT` — a visszaküldési/elállási szabályok, szó szerint hivatkozva, nem újraírva.
- A `get_public_locations` RPC (amit a `PublicFooter.jsx` is használ) — az üzletek listáját **innen**, élőben kérdezem le, nem hardkódolom a nevüket/számukat, mert ez változhat (most guglizva 2-3 helyszínt is találtam különböző forrásokban, nem akarok elavult adatot beégetni).

## 1. Az oldal koncepciója

Egyoldalas GYIK, **kategória-fül/chip a tetején** (mint a flip.ro emoji-kártyái), alatta **kategóriánként lenyíló kérdés-lista** (akkordion) — nem külön aloldal kategóriánként (az túl nagy munka lenne HubSpot-szerű CMS nélkül), hanem egy route, kliens-oldali szűréssel/lenyitással, ugyanabban a mintában, ahogy a `LegalPage.jsx` már ma is statikus, kódba írt tartalmat renderel.

## 2. Kategória-struktúra (8 kategória)

1. **Vásárlás nálunk** 🛍️
2. **Új, felújított és gombos telefonok** 🌳
3. **Garancia** 🛡️
4. **Visszaküldés és elállás** 👩‍🔧
5. **Eladom a telefonom** 💰
6. **Szerviz** 🔧
7. **Fizetés és biztonság** 💳
8. **Fiókom, nyomonkövetés, üzleteink** 📍

## 3. Tartalom-javaslat kategóriánként (valós adatokra építve)

### 1. Vásárlás nálunk
- **Hogyan rendelhetek telefont?** Kiválasztod a készletünkből, kosárba teszed, majd vagy személyesen átveszed valamelyik üzletünkben, vagy a megadott szállítási móddal kéred.
- **Kipróbálhatom a telefont, mielőtt fizetek?** Igen — üzleti átvételnél kézbe veheted, megnézheted, mielőtt lezárul a vásárlás.
- **Változnak az árak és a készlet?** Igen, folyamatosan frissülnek — a végleges ár mindig az üzletben/átvételkor dől el, ahogy az ÁSZF is jelzi.
- **Kaphatok számlát a vásárlásról?** Igen, minden vásárláshoz jár bizonylat/garanciajegy, amit online is visszakereshetsz (ld. 8. kategória).

### 2. Új, felújított és gombos telefonok
- **Mi a különbség az "új" és a "felújított" jelölés között?** *(a `detailConditionNewDesc`/`detailConditionRefurbDesc` meglévő szövegére építve)* Az "új" készülék bontatlan vagy szinte használatlan, gyári tartozékokkal. A "felújított" készüléket átvizsgáltuk és teszteltük, mielőtt polcra került — kijelző, akkumulátor, kamerák és minden gomb/port ellenőrizve —, apró, futólag látható kopásnyomok lehetnek rajta.
- **Hogyan vizsgáljátok be a felújított telefonokat?** Professzionális diagnosztikai rendszerrel funkcionálisan leteszteljük mindegyiket, az akkumulátor állapotát ellenőrizzük, szükség esetén cseréljük.
- **Mit jelent az akkumulátor-százalék a termékoldalon?** A készülék akkumulátorának mért kapacitása az eredetihez képest — minél magasabb, annál jobb az állapota.
- **Van gombos (nem okos-) telefonotok is?** Igen, a készletünkben rendszeresen van egyszerű, gombos telefon is, például idősebb hozzátartozónak vagy tartalék telefonnak.

### 3. Garancia
- **Mennyi garanciát kapok a telefonra?** A termékoldalon feltüntetett időtartam (pl. 1 hó / 3 hó / 6 hó / 1 év) — ez az adott készülékre vonatkozik, az átvétel napjától számítva.
- **Mire vonatkozik a szerviz-garancia, ha nálatok javíttattam?** *(szó szerint a `SERVICE_WARRANTY_TERMS`-ből)* A kicserélt alkatrész típusától függ: eredeti akkumulátor 12 hónap, utángyártott akkumulátor 6 hónap, eredeti kijelző 3 hónap, utángyártott kijelző 1 hónap, minden egyéb alkatrész/javítás 1 hónap.
- **Mire NEM vonatkozik a garancia?** Mechanikai sérülésre (leesés, törés, karcolás), beázásra/nedvességre, illetéktelen beavatkozásra, valamint a normál elhasználódásra (pl. akkumulátor-kapacitás természetes csökkenése).
- **Hogyan érvényesítem a garanciát?** Hozd be a készüléket bármelyik üzletünkbe, vagy nézd meg a digitális garanciajegyed a kapott linken (ld. 8. kategória).

### 4. Visszaküldés és elállás
- **Van-e elállási jogom, ha meggondolom magam?** Igen, a termék átvételétől számított 14 naptári napon belül, indoklás nélkül.
- **Milyen állapotban kell visszaküldenem a terméket?** Hiánytalan, sértetlen állapotban, lehetőség szerint az eredeti csomagolásban.
- **Mikor kapom vissza a pénzem?** Az elállás elfogadását követően legkésőbb 14 napon belül, ugyanazon a fizetési módon, amivel fizettél.
- **Van, amit nem lehet visszaküldeni?** Igen — pl. személyre szabott termékeket, vagy amit higiéniai/adatbiztonsági okokból nem fogadhatunk vissza felbontás után.

### 5. Eladom a telefonom
- **Hogyan működik a felvásárlás?** A "Eladom" oldalon pár kérdés (márka, modell, állapot) alapján azonnal kapsz egy becsült ajánlatot, amit üzletben tudsz véglegesíteni.
- **Mitől függ, mennyit ér a telefonom?** A modelltől, a kortól és az állapottól (kijelző, akkumulátor, ház állapota, funkcionalitás).
- **Kötelező eladnom, ha megkapom az ajánlatot?** Nem, az online becslés nem kötelez semmire — csak akkor dől el végleg, ha üzletben átadod a készüléket.
- **Milyen formában fizettek a bevett telefonért?** *(nyitott kérdés — ld. 6. pont: jelenleg készpénz, a kredit-alapú beszámítás egy tervezett, még nem élő funkció, ezt csak akkor írjuk be, ha tényleg elindul.)*

### 6. Szerviz
- **Milyen javításokat vállaltok?** A leggyakoribbakat (kijelző, akkumulátor, töltőcsatlakozó, kamera és a további, a szerviz-becslőben listázott hibák) — a pontos árat az online árbecslőnkben azonnal látod.
- **Mennyi idő alatt készül el a javítás?** Ha az alkatrész raktáron van, akár aznap, kb. fél óra alatt; ha rendelni kell, 2-3 munkanap.
- **Eredeti vagy utángyártott alkatrészt használtok?** Mindkettő elérhető választható — az áruk és a rájuk vállalt garancia is eltér, ezt az árbecslőben mindig látod választás előtt.
- **Mi van, ha nem javítható a hiba, vagy nem sikerül elsőre?** A garanciális hibát 10 munkanapon belül díjmentesen újra megpróbáljuk javítani; ha ez nem lehetséges, visszafizetjük a szervizdíjat.

### 7. Fizetés és biztonság
- **Milyen fizetési módok elérhetők?** Készpénz vagy bankkártya személyes átvételkor, illetve utánvét.
- **Lehet online, kártyával fizetni?** *(őszinte, jelen idejű állapot szerint — ha még nincs élesítve, ezt így fogalmazzuk)* Hamarosan elérhető lesz az online bankkártyás fizetés (Visa, Mastercard) a Netopia biztonságos rendszerén keresztül.
- **Biztonságos a bankkártyám adatainak megadása?** Igen — a weboldal SSL-titkosítással véd, az online fizetést pedig a Netopia 3D-Secure rendszere dolgozza fel, mi magunk sosem látjuk a kártyaadataidat.
- **Kapok számlát a vásárlásról?** Igen, minden vásárláshoz.

### 8. Fiókom, nyomonkövetés, üzleteink
- **Hogyan követhetem nyomon a szervizem vagy a rendelésem állapotát?** A kapott linken (SMS-ben vagy a bizonylaton) bármikor megnézheted, vagy a `/status` illetve `/receipt` oldalon a munkalapszámmal/telefonszámmal is rákereshetsz.
- **Kell fiókot létrehoznom a vásárláshoz?** Nem feltétlenül, de a fiókodban (Fiókom menüpont) látod a korábbi rendeléseidet és a kedvenceidet.
- **Hol vannak az üzleteitek?** *(dinamikusan, `get_public_locations`-ból töltve, nem hardkódolva)*
- **Hogyan tudlak elérni titeket, ha kérdésem van?** Telefonon (0773 985 278), e-mailben (info@telefonos.ro), vagy közösségi médiában (Facebook/Instagram).

## 4. UI/UX terv

- **Fejléc**: cím + rövid alcím ("Miben segíthetünk?"), esetleg egy kereső input (kliens-oldali, a kérdés-szövegben keres — nice-to-have, nem kritikus az első verzióhoz).
- **Kategória-sáv**: 8 kártya/chip, ikonnal + címmel (a `pub-sidebar-group`/`pub-check-row` vizuális nyelvét folytatva, nem újat kitalálva) — kattintásra az adott kategóriára görgetünk/szűrünk.
- **Kérdéslista**: kategóriánként akkordion — a kérdés mindig látszik, kattintásra nyílik ki a válasz (mint a `pub-problem-card`/`SidebarGroup` meglévő lenyíló mintája).
- **SEO**: `FAQPage` JSON-LD séma a `<Helmet>`-be (a `StockShowcase.jsx`-ben már bevett `ElectronicsStore` JSON-LD mintájára) — ez Google-ban közvetlenül megjelenítheti a kérdéseket a találatban, valódi organikus forgalom-előny.

## 5. Technikai terv

- **Új fájl**: `src/lib/faqContent.js` — exportálja a `FAQ_CONTENT = { hu: [...], ro: [...] }` szerkezetet (kategóriánként `{ key, icon, title, questions: [{ q, a }] }`), külön a nagy tartalom-tömeg miatt, nem az `i18n.js`-ben (az a rövid UI-stringekre való).
- **Új fájl**: `src/GyikPage.jsx` — a `LegalPage.jsx` vázát követi (`PublicHeader`/`PublicFooter`, Helmet SEO), de saját akkordion-state-tel (`openCategory`, `openQuestions`).
- **Route**: `/gyik` (hu), `/ro/intrebari-frecvente` (ro) — `main.jsx`-ben új regex-pár, lazy import, a `repairMatch`/`roRepairMatch` mintájára.
- **Footer-link**: bekerül a `PublicFooter.jsx` "Jogi" linksor mellé egy "GYIK" link.
- **Nincs új DB-tábla, nincs új RPC** (a helyszín-listát a meglévő `get_public_locations` adja) — tisztán frontend + statikus tartalom feature.

## 6. Amit tisztázni kell

- **Nyitvatartási idők** — nem találtam megbízható, aktuális adatot a kódban/DB-ben az üzletek nyitvatartására, ezt nem találom ki, ha szeretnéd a "Üzleteink" kategóriában feltüntetni, add meg.
- **Felvásárlás fizetési módja** — az 5. kategória utolsó kérdését csak akkor egészítjük ki a kredit-beszámítással, ha az a funkció (`TASKS_BEVALTAS_KREDIT_BONUSZ.md`) valóban elkészül; addig csak a mai, készpénzes valóságot írjuk.
- **Online fizetés szövege** — amint a Netopia élesedik, a "Fizetés és biztonság" kategória 2. kérdését "hamarosan"-ról jelen időre kell módosítani.
- **Kereső mező** — legyen benne az első verzióban, vagy elég a kategória-navigáció + akkordion egyelőre?

---

## Ellenőrzőlista implementálás után

- `faqContent.js` létrejön mindkét nyelven, valós (nem kitalált) tartalommal
- `GyikPage.jsx` — kategória-sáv + akkordion, mobilbarát
- `FAQPage` JSON-LD séma bekerül
- Route bekötve (hu + ro), lazy import
- Footer-link hozzáadva
- `npm run build` hibamentes
- Nincs `git push`, csak lokális commit
