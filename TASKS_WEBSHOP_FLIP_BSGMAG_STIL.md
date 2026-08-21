# TASKS — Webshop (StockShowcase/PhoneDetail) átalakítása flip.ro / bsgmag.ro mintára

## 0. Amit megnéztem

Élőben végignéztem a **flip.ro/telefoane** listaoldalt, egy **flip.ro** terméklapot, a **bsgmag.ro/telefoane** listaoldalt és egy **bsgmag.ro** terméklapot. Mindkettő használt/felújított telefon webshop, tehát pont a mi profilunk — nem véletlen, hogy a felépítésük ilyen jól bejáratott.

**Fontos, korlátozó felfedezés:** mindkettő **valódi webshop kosárral/fizetéssel/szállítással** (flip: kosár, kártya, rateok, futár; bsgmag: kosár, rateok, futár). A mi jelenlegi `StockShowcase.jsx`/`PhoneDetail.jsx`-ünk **nem webshop, hanem katalógus+"hívj minket" modell** — nincs kosár, nincs online fizetés, a CTA egy `tel:` link. Ez tudatos, a bolt fizikai/helyi jellegéből adódik (két üzlet, személyes átvétel). **A tervben ezért a vizuális/strukturális mintákat vesszük át, a kosár/fizetés-specifikus elemeket NEM** (ld. 6. pont — ott van egy döntést igénylő rész).

## 1. Ami már most is jó nálunk, ezt megtartjuk

- Valódi termékfotók (`photo_paths`), galéria a terméklapon (`pub-detail-gallery`, thumbnail sáv) — pontosan az van, amit flip/bsgmag is kiemel ("Poze reale ale produsului").
- Akku-egészség % sáv (`pub-battery-row`) — megvan, ahogy a bsgmag "Sănătate baterie: 83%"-je.
- Garancia-cimke (`pub-warranty-tag`) — megvan.
- Ár-horgony + megtakarítás (`pub-anchor`, "Economisești X Lei") — megvan.
- Utolsó darab / szűkösség jelzés (`pub-scarcity-pill`) — ez a flip/bsgmag "Ultimul în stoc"/"Stoc limitat" mintája, nálunk már megvan.
- Márka-chipek, keresés, rendezés — alapszinten megvan, ezt bővítjük.

## 2. Listaoldal (`StockShowcase.jsx`) — konkrét változtatások

1. **Szűrő-sáv bővítése kártyás nézet felett** (nem teljes bal oldali sidebar, mert a mi készletünk nem 363/938 tételes, hanem tucatnyi-néhány tucat darabos — egy nagy sidebar túlméretezett lenne): a jelenlegi `pub-chip-row`-okhoz (márka, állapot) adj egy harmadik sort **tárhely-szűrővel** (64/128/256/512 GB chipek, csak azokból a méretekből, amik ténylegesen szerepelnek a készletben — ahogy a `brands` már most is dinamikusan épül).
2. **Aktív szűrők száma + "Szűrők törlése"** gomb, ha bármelyik chip nem `"all"` — flip/bsgmag mindkettő mutatja ezt ("Sterge toate filtrele").
3. **Kártya-tetején lévő állapot-pill finomítása**: ha bevezetjük a 3. pontban leírt esztétikai fokozatot, a `pub-cond-pill` szövege ne csak "Új"/"Felújított" legyen, hanem felújítottnál a konkrét fokozat (pl. "Kiváló", "Nagyon jó") — pontosan ahogy a flip/bsgmag kártyáin "Ca nou"/"Excelent"/"Foarte bun"/"Bun" szerepel a cím részeként.
4. **Eredmény-szám + oldalszámozás/lapozás finomítása** — most van `pub-results-count`, ez jó; ha a lista 24-nél hosszabb, érdemes egyszerű "Több betöltése" gombot tenni alulra (nem klasszikus lapozó, mert a mi tételszámunk ehhez kicsi — ez egyszerűbb, mint a flip/bsgmag számozott lapozója, és jobban illik a méretünkhöz).

## 3. Esztétikai fokozat (aspect/condition grade) — döntést igénylő, de ajánlott bővítés

Mind a flip.ro, mind a bsgmag.ro **4 fokozatú esztétikai skálát** használ minden felújított terméknél, ez az egyik legerősebb bizalmi elemük:

| Flip/BSGmag (RO) | Jelentés | Magyar megfelelő (javaslat) |
|---|---|---|
| Ca nou | nyoma sincs használatnak | Mint új |
| Excelent | alig észrevehető, apró nyomok | Kiváló |
| Foarte bun | felületes kopásnyomok | Nagyon jó |
| Bun | látható karcok | Jó |

**Jelenleg nálunk a `products.condition` mező csak `New`/`Refurbished` bináris.** Javaslat: új, nullázható `products.aesthetic_grade` oszlop (`text`, csak `Refurbished` státusznál releváns, `New`-nál üres), enum-szerű ellenőrzéssel a 4 fenti magyar értékre. Az admin oldali `StockModal`/`ProductDetailPanel`-ben egy legördülő kerül be ("Esztétikai állapot"), a publikus oldalon pedig ez jelenik meg a `pub-cond-pill`-en és a terméklap címében, a bsgmag mintájára ("Telefon Apple iPhone 14 128GB, Midnight - Foarte bun" → nálunk pl. "iPhone 14 128GB, Midnight — Nagyon jó").

**Ez az egyetlen igazi döntési pont ebben a tervben** — ha nem akarsz ehhez adatbázis-mezőt/admin-UI-t hozzáadni, a jelenlegi bináris Új/Felújított is maradhat, csak akkor a kártyák/terméklap vizuálisan kevésbé fognak hasonlítani a mintákra (mert a "Kiváló/Nagyon jó/Jó" cimkék adják a flip/bsgmag terméklapjainak azt a jellegzetes, azonnal-bizalmat-keltő kinézetét). Alapértelmezésben ezt build-eljük be, szólj ha inkább maradjunk a binárisnál.

## 4. Terméklap (`PhoneDetail.jsx`) — konkrét változtatások

1. **Morzsamenü (breadcrumb)** a vissza-link helyett/mellett: "Telefonok / {Márka} / {Modell}" — ezt mind a flip, mind a bsgmag terméklapja elöl mutatja, SEO szempontból is hasznos, és a jelenlegi `pub-back-link`-et egészíti ki, nem váltja le.
2. **"Amit minden telefonnál ellenőrzünk" bizalmi blokk** a specifikáció alatt — statikus (nem darabonkénti) checklist, ikonokkal (a meglévő ikon-készletből, `src/components/icons.jsx`, bővítve ha kell): Kijelző, Akkumulátor-egészség, Gombok, Kamerák, Csatlakozók, Vízkár-ellenőrzés, IMEI-egyeztetés, Eredetiség. Ez a flip "67 teszt"/bsgmag "94 teszt" mintájának könnyített, valósághű változata — **nem állítunk be darabonkénti teszt-adatbázist**, csak egy őszinte, egyszeri leírást arról, hogy mit nézünk át minden bejövő telefonnál (ha ez a valóságban is így van — ezt neked kell megerősítened, hogy pontosan mit ellenőriztek, mielőtt ez élesedik, mert ez konkrét ígéret a vásárló felé).
3. **Termékkód megjelenítése** a cím alatt — a már meglévő `phoneCode()` rövid kód (`src/lib/utils.js`) publikus megjelenítése, ahogy a bsgmag "Cod produs E-26-3156"-t mutatja — hasznos referencia telefonos érdeklődésnél ("a #1234-es telefonról érdeklődnék").
4. **"Hasonló telefonok" szekció** a terméklap alján — a `get_public_stock()` már betöltött adatból kliens-oldalon szűrve (azonos márka, más darab), kártyás elrendezésben a `pub-grid`/`pub-card` stílus újrahasznosításával — ne építs új CSS-t, csak a listaoldali kártyakomponens-mintát reprodukáld itt.
5. **Ragadós (sticky) CTA-sáv**: ha a felhasználó lejjebb görget a terméklapon, egy vékony, fix sáv jelenjen meg alul/felül az árral és a CTA-gombbal (mobilon különösen fontos, flip/bsgmag is így csinálja) — CSS `position: sticky`, nem kell hozzá JS-scroll-listener.

## 5. Vizuális nyelv — a saját színpalettát tartjuk

**Ne vedd át a flip.ro/bsgmag.ro tényleges színeit** (flip: kék/lila akcentek, bsgmag: piros/narancs) — a `src/index.css` gyökér-tokenjeit használd (`--primary`, `--primary-soft`, `--warning`, `--danger` stb.), pontosan ahogy a korábbi Figma-alapú telefonkártya-redesignnál is történt (`TASKS_TELEFON_KARTYA_REDESIGN.md`). Amit átveszünk, az a **elrendezés, információs hierarchia és bizalmi elemek típusa**, nem a márkaszínek.

## 6. Kosár + valódi rendelés (nem foglalás) — a user pontosítása szerint

**Korrekció:** nem foglalási/érdeklődési flow kell, hanem valódi "Megveszem" — a vásárló ténylegesen leadja a rendelést, ahogy flip.ro/bsgmag.ro-n. Ez a webshop gerince, ezért részletesen:

### a) Kosár
"Kosárba" gomb minden kártyán/terméklapon (a jelenlegi `tel:` gomb helyett/mellett) → egyszerű kliens-oldali kosár-állapot (React context vagy `localStorage`), mivel minden telefon **egyedi, darabra egyszeri tétel** (nem raktárkészlet-SKU), a kosár inkább "kiválasztott egyedi darabok listája", nem mennyiség-alapú.

### b) Checkout
Külön oldal (`/penztar` vagy a kosár-oldal maga): név, telefonszám, email (opcionális, de kell számlához/visszaigazoláshoz), **átvételi helyszín** (Gyimes vagy Szentgyörgy — nincs házhozszállítás, hacsak nem szeretnéd bevezetni), majd rendelés leadása.

### c) Fizetés — ez az egyetlen igazi döntési pont, kérlek válaszolj rá

Két alapvetően más irány, más build-mérettel:

1. **Fizetés átvételkor** (készpénz/kártya a boltban) — a webshop csak "lefoglalja és leveszi a listáról" a darabot, a pénz mozgás a boltban történik, ahogy eddig is. Ez **napok alatt megépíthető**, nincs online fizetési szolgáltató, nincs PCI/kártyaadat-kezelési felelősség, nincs internetes távértékesítési (OUG 34/2014) visszaküldési-jog bonyodalom, mert a fizetés/átadás személyesen történik.
2. **Valódi online bankkártyás fizetés** (pl. Netopia/EuPlătesc/Stripe integráció) — ez már **hetes nagyságrendű munka**: fizetési szolgáltató szerződés+integráció, webhook-fogadó (Supabase Edge Function kell hozzá, mert most nincs backend szerverünk), számlázás automatizálása, és a román táv-értékesítési jog miatt kötelező 14 napos elállási jog kezelése egy fizikai, egyedi darabos terméknél (ami bonyolultabb, mint egy raktárkészletes shopnál).

**Amíg nem válaszolsz, az 1-es (fizetés átvételkor) az alapértelmezett irány ebben a specben** — ez adja a leggyorsabb utat egy valódi "rendelést leadok" élményhez, online fizetés nélkül. Ha a 2-est akarod, szólj és külön specbe kerül (nagyobb, saját döntési kör: melyik fizetési szolgáltató, kinek a nevén megy a szerződés stb.).

### d) Készlet-zárolás — kritikus, egyedi darabok miatt

Mivel minden telefon egyedi (nem darabszám-alapú SKU), a rendelés pillanatában **azonnal** el kell tűnnie a nyilvános listáról, különben két vásárló is megrendelheti ugyanazt a fizikai darabot. Megoldás: a rendelés leadásakor egy DB-tranzakción belül `products.status` (vagy egy új, erre dedikált mező) `'rendelve'`-re vált, és a `get_public_stock()` RPC ezt kiszűri — ugyanaz a minta, mint ma a `soldStock` kezelése, csak a "eladva" állapot előtt egy új "rendelve, fizetésre/átvételre vár" köztes állapot kerül be.

### e) Rendelések — staff oldal

Új `web_orders` (+ `web_order_items`, ha egyszerre több telefont is rendelhet) tábla, állapot-workflow: **Új rendelés → Visszaigazolva → Átvéve/Lezárva** (+ **Lemondva**, ha a vásárló nem jön el vagy staff törli). Ez a Pulton kap egy saját `.pult-section`-t ("Webes rendelések"), és a rendelés elfogadásakor/lezárásakor a meglévő eladási flow-ba (transactions/`category='Készlet'`) fut bele, ugyanúgy, mint egy helyben leadott eladás — nem külön logika, csak más a belépési pont.

### f) Vendég-rendelés + bejelentkezett vásárló

Nem kötelező fiókot nyitni a vásárláshoz (ez rontaná a konverziót) — vendégként is rendelhet (email+telefonszám alapján), de ha az imént spec'olt `TASKS_UGYFEL_FIOK.md` szerinti fiókkal jelentkezik be, a rendelés `customer_profile_id`-vel is összekötésre kerül, és megjelenik a "Vásárlásaim" nézetében. Vendég-rendelés követéséhez a meglévő `/status`/`/receipt` minta szerint egy `/rendeles/:token` publikus lekérdező oldal kell (rendelésszám + telefonszám alapján, RPC-n keresztül, nem nyílt táblahozzáféréssel).

## 7. Új (bontatlan) telefonok — a fő eltérés flip/bsgmag-tól, külön kell kezelni

Sem a flip.ro, sem a bsgmag.ro nem árul bontatlan, gyári új telefont — kizárólag felújítottat. Nálunk viszont van `condition = 'New'` tétel is, ezt a fenti pontok egyikét sem szabad rá ráerőltetni:

1. **3. pont (esztétikai fokozat) — Újnál nincs értelmezve.** A `pub-cond-pill`/cím ne mutasson "Kiváló"/"Nagyon jó"-t Újnál, csak simán "Új" / "Bontatlan" jelzőt, ahogy ma is. A `aesthetic_grade` mező (ha bevezetjük) `New`-nál mindig `null`, és az admin UI-ban is inaktív/rejtett Új státuszú terméknél.
2. **4.2 pont (bizalmi checklist) — két külön verzió kell.** Felújítottnál a "mit ellenőrzünk" lista (kijelző, akku-egészség, gombok, vízkár, IMEI stb.) van értelmezve. Újnál ez félrevezető lenne ("ellenőriztük a vízkárt" egy bontatlan dobozon értelmetlen) — helyette egy másik, rövid checklist: **Bontatlan, gyári fólia**, **Eredeti tartozékok**, **Gyártói/forgalmazói garancia**, **Számla/blokk**. Két konstans tömb (`NEW_TRUST_POINTS`, `REFURB_TRUST_POINTS`) a `condition` alapján választva.
3. **6. pont (Kosár/rendelés) — mindkettőnél érvényes**, nincs különbség: mindkét típus ugyanúgy kosárba tehető és megrendelhető.
4. **Listaoldal tetején Új/Használt megkülönböztetés hangsúlyosabbá tétele**: a jelenlegi `pub-chip-row`-beli "Új"/"Felújított" chip marad a szűrő-mechanizmus, de érdemes vizuálisan kicsit kiemelni (pl. nagyobb, tab-szerű megjelenés a keresősáv alatt, nem egyenrangú a többi apró chippel) — mert ez nálunk alapvetőbb vásárlói elágazás (más árszint, más elvárás), mint a flip/bsgmag-nál, ahol ez a kérdés fel sem merül.
5. **Terméklap címe**: Refurbished-nél a cím végén ott a fokozat (pl. "iPhone 14 128GB, Midnight — Nagyon jó", ld. 3. pont), Újnál nincs ilyen utótag, helyette egy jól látható "Bontatlan, gyári garancia" alcím jelenjen meg a cím alatt.

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- Listaoldal: tárhely-szűrő működik, aktív szűrők törölhetők, kártya-pill mutatja az esztétikai fokozatot (ha bevezetted a 3. pontot)
- Terméklap: morzsamenü, bizalmi-checklist, termékkód, hasonló telefonok, sticky CTA mind megjelenik
- A saját színpaletta maradt, semmi flip-kék/bsgmag-piros nem került be
- Kosár → checkout → rendelés-leadás végigmegy, a megrendelt darab azonnal eltűnik a nyilvános listáról (nincs dupla-rendelés kockázat)
- Staff látja a Pulton az új webes rendeléseket ("Webes rendelések" szekció), tudja léptetni az állapotukat, és lezáráskor a meglévő eladási flow-ba fut
- Vendégként is lehet rendelni, `/rendeles/:token` oldalon nyomon követhető
- RO oldal (`/ro/telefoane`, `/ro/telefon/:id`) ugyanezeket a változtatásokat tükrözi
- Új (bontatlan) tételeknél nincs esztétikai fokozat, saját (nem felújított-jellegű) bizalmi checklist jelenik meg
- Nincs `git push`, csak lokális commit
