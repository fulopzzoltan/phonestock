# TASKS — Telefon-választó segítő (guided selling quiz)

Kérés: "nem tudják az emberek, hogy milyen telefont vegyenek — kellene egy választás segítő, ami pár kérdéssel beloszi mi érdekli (új/felújított, ár, tárhely, márka) és a végén ad 2-3 ajánlott telefont a készletből, hasonló logikával/kinézettel mint az eladás (BuybackFlow) és szerviz (RepairEstimator) — legyen konverziónövelő."

## 0. Amit megnéztem, mielőtt bármit kitaláltam volna

**A wizard-mintát a kódban** — `RepairEstimator.jsx` és `BuybackFlow.jsx` már pontosan ezt csinálják: lépésenkénti `step` state, `pub-steps` progress-pöttyök, `bb-card`/`bb-h1` kártya-keret, gomb-rács választáshoz (`pub-option-card`/`pub-problem-card`), `PublicHeader`/`PublicFooter` közös váz. Ezt a mintát viszem tovább, nem találok ki újat.

**Az adatforrást** — a `StockShowcase.jsx` a `get_public_stock` RPC-vel tölti be a teljes élő készletet (márka, model, condition, storage, sale_price, photo_paths, battery_health, warranty, location_name — minden mező megvan, ami a szűréshez/pontozáshoz kell). **Nincs szükség új RPC-re vagy DB-táblára** — a segítő ugyanezt az RPC-t hívja, és kliens oldalon pontoz/szűr, pont úgy, ahogy a `StockShowcase` szűrői is kliens oldalon dolgoznak a betöltött listán.

**Konverziós kutatás (guided selling / product finder quiz, ecommerce)**:
- Interaktív termék-kereső kvízt használó márkák 25-40%-os konverziót mérnek kvíz-kitöltőknél, ~2.75x-öt az átlag bolt-konverzióhoz képest (a sima böngészés jellemzően 2-3% körül konvertál).
- Az eredmény-oldal személyre szabása (a válaszok alapján más szöveg) 40-60%-kal növeli a konverziót a generikus eredményoldalhoz képest.
- **Optimális kérdésszám: 3-5**, ez tartja a legjobban a kitöltési arányt — minden plusz kérdés a 8. után kb. 15%-kal rontja a befejezési arányt. Ez pont egyezik azzal, amit te is felsoroltál (condition, ár, tárhely, márka = 4 kérdés).
- Progress-indikátor (amit a `RepairEstimator`-ból is ismerünk, `pub-steps` pöttyök) +24% befejezési arányt hoz.
- **Az eredményoldalon 1-3 találat** a javasolt maximum — pont ezt kérted te is.

Forrás: [Digioh — Product Recommendation Quiz Examples](https://www.digioh.com/product-recommendation-quiz-examples), [RevenueHunt — 2026 benchmark report](https://revenuehunt.com/state-of-product-recommendation-quizzes/), [Interact — How many questions](https://help.tryinteract.com/en/articles/10752954-how-many-questions-should-my-quiz-have-to-maximize-conversions)

## 1. Miért ez, Hormozi/Patel-szemmel

Ez klasszikus **decision paralysis** eset — 100 telefon egy rácsban, a vevő nem tudja, hol kezdje, és inkább elmegy, mint hogy 20 kártyát végigböngésszen. A guided selling nem "extra funkció", hanem **súrlódás-csökkentés a vásárlás előtt** — pont az ellentéte annak, amit a promó-kártyáknál most javítottunk (ott a súrlódást a *kimenő* linkeknél csökkentettük, itt a *bejövő* döntésnél). Ráadásul ez egy már meglévő RPC-re épül, tehát **backend-munka gyakorlatilag nulla** — csak frontend logika, ez a leggyorsabb megtérülésű darab a mostani listából.

## 2. A kérdésfolyam — 4 kérdés, pontosan a te listád

Sorrend (a legkeményebb szűrőtől a leglazábbig, hogy korán szűküljön a kör, de a végén még legyen manőverezési tér az ajánló-algoritmusnak):

1. **Állapot** — chip-választás: `Új` / `Felújított` / `Mindegy` (egyszeres választás, `Mindegy` alapértelmezett/kiemelt, mert a készlet nagy része felújított, és nem akarjuk feleslegesen szűkíteni).
2. **Ár** — chip-sávok, a valós készlet-eloszlásból származtatva (a korábbi piackutatásból tudjuk: medián ~600-700 Lej): `1000 Lej alatt` / `1000-2000 Lej` / `2000 Lej felett` / `Mindegy`. (Ez direkt összeköthető a pozicionálási stratégiával — az "1000 Lej alatt" már ott is szerepelt mint javasolt gyorsszűrő.)
3. **Tárhely** — chipek a készletben ténylegesen előforduló értékekből (dinamikusan generálva, mint a `StockShowcase` szűrőjénél) + `Mindegy`.
4. **Márka** — multi-select chipek a készletben lévő márkákból (dinamikusan, gyakoriság szerint rendezve, mint a `StockShowcase`-ben) + `Mindegy` (ha semmit sem választ, az is "mindegy").

Minden lépésnél **progress-pöttyök** (`pub-steps`, már létező CSS) + **vissza gomb** (`pub-back-link`, már létező). Egy kérdés = egy `bb-card`, chip-gombok `pub-option-card` stílusban (nagy, könnyen érinthető, mobilon egy oszlopban/rácsban — ez már megvan a `RepairEstimator`-ból).

## 3. Az ajánló-algoritmus — sose legyen 0 találat

Kis készlet (kb. 100 darab, 2 helyszín) mellett a szigorú AND-szűrés könnyen 0 találatra fut — ez konverziógyilkos. Ezért **fokozatosan lazító pontozás**, nem kemény szűrés:

```
function scorePhone(phone, answers) {
  let score = 100;
  // Állapot: kemény preferencia, de nem kizáró
  if (answers.condition !== "Mindegy" && phone.condition !== answers.condition) score -= 40;
  // Ár: sávon belül nagy pont, sávon kívül távolság-arányos levonás (sose nulláz le)
  if (answers.budget !== "Mindegy") {
    const dist = distanceFromBudgetRange(phone.sale_price, answers.budget);
    score -= Math.min(50, dist / 20); // minél messzebb a sávtól, annál nagyobb (de korlátos) levonás
  }
  // Tárhely: puha preferencia
  if (answers.storage !== "Mindegy" && phone.storage !== answers.storage) score -= 15;
  // Márka: puha preferencia, több márka is választható
  if (answers.brands.length > 0 && !answers.brands.includes(phone.brand)) score -= 20;
  return score;
}
```

Rendezés `score` szerint csökkenőleg, **top 3 kiválasztása**. Mivel semmi sem "kizáró" (csak pontlevonás), garantáltan lesz találat, amíg van készleten telefon — nincs "nincs találat" üresjárat, ami elküldené a vevőt.

## 4. Eredmény-oldal

- 1-3 találat, **ugyanolyan kártya-kinézettel, mint a `StockShowcase.jsx` `pub-card`-ja** (fotó, márka+modell, storage/szín chip, battery/warranty jelzés, ár, "Kosárba" gomb) — ez direkt a te kérésed ("hasonló kinézettel és logikával, mint... a szerviz jellegű dolog" — itt konkrétan a *termékkártya* mintáját visszük át, a *wizard-keretet* pedig a szerviz/eladás mintából).
- Minden kártya kattintható a `PhoneDetail` oldalra (`/telefon/:id`), és van rajta "Kosárba" gomb közvetlenül (a meglévő `addToCart` hívással) — **nincs extra lépés, nincs "kérek ajánlatot" súrlódás**, a cél az azonnali konverzió, nem egy újabb lead-form.
- Fejléc az eredmény felett, ami a válaszokra reagál (nem statikus szöveg) — ez az a **40-60%-os konverziónövelő "személyre szabott eredmény-cím"**, pl.: *"3 telefon, ami illik hozzád: [Új/Felújított] · [ártartomány] · [márka(k)]"*. Ha semmit sem talált a szigorú sávban és a pontozás lazított, ezt jelezzük finoman: *"A pontos igényed szerint nem volt találat, de ezek állnak hozzá legközelebb:"* — őszinte, nem hazudja be, hogy pontos találat.
- "Újrapróbálom más válaszokkal" gomb, ami visszaviszi az 1. kérdéshez.

## 5. Technikai terv

- **Új fájl**: `src/PhoneFinder.jsx` — a `RepairEstimator.jsx` szerkezetét követi (step-state, `PublicHeader`/`PublicFooter`, Helmet SEO).
- **Adat**: `supabase.rpc("get_public_stock")` — ugyanaz, amit a `StockShowcase` már hív. Betöltéskor egyszer, a wizard teljes életciklusára.
- **Nincs új DB-tábla, nincs új RPC, nincs migráció** — tisztán frontend feature.
- **Route**: `/segito` (hu), `/ro/asistent` (ro) — a `main.jsx`-ben egy új `finderMatch`/`roFinderMatch` regex, ugyanolyan mintára, mint a `repairMatch`/`roRepairMatch`. (A route-nevet nyitva hagyom megerősítésre, ld. 8. pont.)
- **i18n**: minden kérdés/chip/eredmény-szöveg a `lib/i18n.js`-be kerül, hu+ro blokkban, a meglévő `promoRepair*`-mintát követve elnevezésben (`finderQ1Title`, `finderConditionNew` stb.).
- **Lazy import** a `main.jsx`-ben, mint a többi publikus route.

## 6. Belépési pontok a site-on

Ez a legjobban megtérülő új darab, szerintem **nem elég** csak a random promó-kártya rotációba tenni (ott csak minden 18. termék után jönne elő, ~3 kártyás rotációval) — egy ilyen "hook" funkciónak látszania kell azoknak is, akik nem görgetnek végig:

1. **Elsődleges**: egy kiemelt sáv/gomb a keresősáv/szűrők közelében, a termékrács teteje fölött, mindig látható — pl. *"Nem tudod, melyik illik hozzád? → 4 kérdés, 2-3 ajánlat"*.
2. **Másodlagos**: bekerül a meglévő `PROMO_CARDS` rotációba is (4. elemként), azoknak, akik lejjebb görgetnek és nem vették észre az elsődleges sávot.

Ha csak az egyiket akarod most, szólj — a rácsba-ágyazott promó-kártya önmagában is elég olcsó és gyors implementálni, a fejléc-sáv egy kicsit több layout-munka.

## 7. Amit tisztázni kell, mielőtt megépítjük

- **Route-név megerősítése**: `/segito` jó, vagy legyen konkrétabb (pl. `/melyiket-vegyek`)? RO névre is kell egy döntés (`/ro/asistent` vs. valami más).
- **Belépési pont**: mindkettő (fejléc-sáv + promó-kártya), vagy elég csak az egyik most induláshoz?
- **Ártartomány-sávok pontos határai** — 1000/2000 Lejt javaslok kiindulásnak (illik a pozicionáláshoz), de ha van jobb megérzésed a saját készleted eloszlásáról, szólj.
- **Nyomon követés** — érdemes lenne-e naplózni (akár csak egy egyszerű `finder_sessions` táblába), hogy milyen válasz-kombinációkat adnak az emberek és hány találatot kapnak, hogy 1-2 hónap után lásd, hol van "lyuk" a készletedben (pl. sokan keresnek 500 Lej alatti újat, de nincs ilyen)? Ez **nem szükséges az első verzióhoz**, de olcsó plusz, ha egyszer már építjük — jelezd, ha kelljen bele az elsőbe, vagy hagyjuk később.

---

## Ellenőrzőlista implementálás után

- `PhoneFinder.jsx` létrejön, 4 lépéses wizard, progress-pöttyökkel
- Ajánló-algoritmus sose ad 0 találatot, top 1-3 eredmény
- Eredmény-kártyák `pub-card` stílusban, közvetlen "Kosárba" + link a részletekhez
- Route bekötve `main.jsx`-be (hu + ro), lazy import
- i18n kulcsok hu+ro blokkban
- Belépési pont(ok) a `StockShowcase`-en (a 6. pontban eldöntött módon)
- `npm run build` hibamentes
- Nincs `git push`, csak lokális commit
