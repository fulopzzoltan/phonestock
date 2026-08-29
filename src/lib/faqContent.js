// GYIK (Gyakran Ismételt Kérdések) tartalom — külön fájlban az i18n.js-től, mert az a rövid
// UI-stringekre való, ez pedig hosszabb, kategorizált tartalom-tömeg.
// A struktúra a flip.ro és a Back Market súgóközpontjának közös vázából indul ki, a mi valós
// funkcióinkra szabva (ld. TASKS_GYIK_OLDAL.md) — nem 1:1 másolat egyik oldalról sem.
// Az `icon` kulcsok a GyikPage.jsx ICON_MAP-jére mutatnak.

export const FAQ_CONTENT = {
  hu: [
    {
      key: "vasarlas",
      icon: "cart",
      title: "Vásárlás nálunk",
      questions: [
        { q: "Hogyan rendelhetek telefont?", a: "Kiválasztod a készletünkből, kosárba teszed, majd vagy személyesen átveszed valamelyik üzletünkben, vagy a megadott szállítási móddal kéred." },
        { q: "Kipróbálhatom a telefont, mielőtt fizetek?", a: "Igen — üzleti átvételnél kézbe veheted, megnézheted, mielőtt lezárul a vásárlás." },
        { q: "Változnak az árak és a készlet?", a: "Igen, folyamatosan frissülnek — a végleges ár mindig az üzletben/átvételkor dől el, ahogy az ÁSZF is jelzi." },
        { q: "Kaphatok számlát a vásárlásról?", a: "Igen, minden vásárláshoz jár bizonylat/garanciajegy, amit online is visszakereshetsz." },
      ],
    },
    {
      key: "allapot",
      icon: "phone",
      title: "Új, felújított és gombos telefonok",
      questions: [
        { q: "Mi a különbség az \"új\" és a \"felújított\" jelölés között?", a: "Az \"új\" készülék bontatlan vagy szinte használatlan, gyári tartozékokkal. A \"felújított\" készüléket átvizsgáltuk és teszteltük, mielőtt polcra került — kijelző, akkumulátor, kamerák és minden gomb/port ellenőrizve —, apró, futólag látható kopásnyomok lehetnek rajta." },
        { q: "Hogyan vizsgáljátok be a felújított telefonokat?", a: "Professzionális diagnosztikai rendszerrel funkcionálisan leteszteljük mindegyiket, az akkumulátor állapotát ellenőrizzük, szükség esetén cseréljük." },
        { q: "Mit jelent az akkumulátor-százalék a termékoldalon?", a: "A készülék akkumulátorának mért kapacitása az eredetihez képest — minél magasabb, annál jobb az állapota." },
        { q: "Van gombos (nem okos-) telefonotok is?", a: "Igen, a készletünkben rendszeresen van egyszerű, gombos telefon is, például idősebb hozzátartozónak vagy tartalék telefonnak." },
      ],
    },
    {
      key: "garancia",
      icon: "warranty",
      title: "Garancia",
      questions: [
        { q: "Mennyi garanciát kapok a telefonra?", a: "A termékoldalon feltüntetett időtartam (pl. 1 hó / 3 hó / 6 hó / 1 év) — ez az adott készülékre vonatkozik, az átvétel napjától számítva." },
        { q: "Mire vonatkozik a szerviz-garancia, ha nálatok javíttattam?", a: "A kicserélt alkatrész típusától függ: eredeti akkumulátor 12 hónap, utángyártott akkumulátor 6 hónap, eredeti kijelző 3 hónap, utángyártott kijelző 1 hónap, minden egyéb alkatrész/javítás 1 hónap." },
        { q: "Mire NEM vonatkozik a garancia?", a: "Mechanikai sérülésre (leesés, törés, karcolás), beázásra/nedvességre, illetéktelen beavatkozásra, valamint a normál elhasználódásra (pl. akkumulátor-kapacitás természetes csökkenése)." },
        { q: "Hogyan érvényesítem a garanciát?", a: "Hozd be a készüléket bármelyik üzletünkbe, vagy nézd meg a digitális garanciajegyed a kapott linken." },
      ],
    },
    {
      key: "visszakuldes",
      icon: "return",
      title: "Visszaküldés és elállás",
      questions: [
        { q: "Van-e elállási jogom, ha meggondolom magam?", a: "Igen, a termék átvételétől számított 14 naptári napon belül, indoklás nélkül." },
        { q: "Milyen állapotban kell visszaküldenem a terméket?", a: "Hiánytalan, sértetlen állapotban, lehetőség szerint az eredeti csomagolásban." },
        { q: "Mikor kapom vissza a pénzem?", a: "Az elállás elfogadását követően legkésőbb 14 napon belül, ugyanazon a fizetési módon, amivel fizettél." },
        { q: "Van, amit nem lehet visszaküldeni?", a: "Igen — pl. személyre szabott termékeket, vagy amit higiéniai/adatbiztonsági okokból nem fogadhatunk vissza felbontás után." },
      ],
    },
    {
      key: "eladas",
      icon: "buyback",
      title: "Eladom a telefonom",
      questions: [
        { q: "Hogyan működik a felvásárlás?", a: "Az \"Eladom\" oldalon pár kérdés (márka, modell, állapot) alapján azonnal kapsz egy becsült ajánlatot, amit üzletben tudsz véglegesíteni." },
        { q: "Mitől függ, mennyit ér a telefonom?", a: "A modelltől, a kortól és az állapottól (kijelző, akkumulátor, ház állapota, funkcionalitás)." },
        { q: "Kötelező eladnom, ha megkapom az ajánlatot?", a: "Nem, az online becslés nem kötelez semmire — csak akkor dől el végleg, ha üzletben átadod a készüléket." },
        { q: "Milyen formában fizettek a bevett telefonért?", a: "Készpénzben, üzletben, a végleges átvételkor." },
      ],
    },
    {
      key: "szerviz",
      icon: "service",
      title: "Szerviz",
      questions: [
        { q: "Milyen javításokat vállaltok?", a: "A leggyakoribbakat (kijelző, akkumulátor, töltőcsatlakozó, kamera és a további, a szerviz-becslőben listázott hibák) — a pontos árat az online árbecslőnkben azonnal látod." },
        { q: "Mennyi idő alatt készül el a javítás?", a: "Ha az alkatrész raktáron van, akár aznap, kb. fél óra alatt; ha rendelni kell, 2-3 munkanap." },
        { q: "Eredeti vagy utángyártott alkatrészt használtok?", a: "Mindkettő elérhető választható — az áruk és a rájuk vállalt garancia is eltér, ezt az árbecslőben mindig látod választás előtt." },
        { q: "Mi van, ha nem javítható a hiba, vagy nem sikerül elsőre?", a: "A garanciális hibát 10 munkanapon belül díjmentesen újra megpróbáljuk javítani; ha ez nem lehetséges, visszafizetjük a szervizdíjat." },
      ],
    },
    {
      key: "fizetes",
      icon: "payment",
      title: "Fizetés és biztonság",
      questions: [
        { q: "Milyen fizetési módok elérhetők?", a: "Készpénz vagy bankkártya személyes átvételkor, illetve utánvét." },
        { q: "Lehet online, kártyával fizetni?", a: "Hamarosan elérhető lesz az online bankkártyás fizetés (Visa, Mastercard) a Netopia biztonságos rendszerén keresztül." },
        { q: "Biztonságos a bankkártyám adatainak megadása?", a: "Igen — a weboldal SSL-titkosítással véd, az online fizetést pedig a Netopia 3D-Secure rendszere dolgozza fel, mi magunk sosem látjuk a kártyaadataidat." },
        { q: "Kapok számlát a vásárlásról?", a: "Igen, minden vásárláshoz." },
      ],
    },
    {
      key: "fiokom",
      icon: "location",
      title: "Fiókom, nyomonkövetés, üzleteink",
      questions: [
        { q: "Hogyan követhetem nyomon a szervizem vagy a rendelésem állapotát?", a: "A kapott linken (SMS-ben vagy a bizonylaton) bármikor megnézheted, vagy a Nyomonkövetés oldalon a munkalapszámmal/telefonszámmal is rákereshetsz." },
        { q: "Kell fiókot létrehoznom a vásárláshoz?", a: "Nem feltétlenül, de a fiókodban (Fiókom menüpont) látod a korábbi rendeléseidet és a kedvenceidet." },
        { q: "Hol vannak az üzleteitek?", a: null, locations: true },
        { q: "Mikor vagytok nyitva?", a: "Hétfőtől péntekig 9:00–17:00, szombaton 9:00–13:00, vasárnap zárva." },
        { q: "Hogyan tudlak elérni titeket, ha kérdésem van?", a: "Telefonon (0773 985 278), e-mailben (info@telefonos.ro), vagy közösségi médiában (Facebook/Instagram)." },
      ],
    },
  ],

  ro: [
    {
      key: "vasarlas",
      icon: "cart",
      title: "Cumpărături la noi",
      questions: [
        { q: "Cum pot comanda un telefon?", a: "Alegi din stocul nostru, îl adaugi în coș, apoi fie îl ridici personal dintr-unul din magazinele noastre, fie îl ceri prin modalitatea de livrare indicată." },
        { q: "Pot încerca telefonul înainte de a plăti?", a: "Da — la ridicarea din magazin îl poți ține în mână și verifica înainte ca achiziția să se finalizeze." },
        { q: "Se schimbă prețurile și stocul?", a: "Da, se actualizează constant — prețul final se stabilește mereu în magazin/la ridicare, așa cum indică și Termenii și Condițiile." },
        { q: "Primesc factură pentru achiziție?", a: "Da, fiecare achiziție are bon/certificat de garanție, pe care îl poți regăsi și online." },
      ],
    },
    {
      key: "allapot",
      icon: "phone",
      title: "Telefoane noi, recondiționate și cu taste",
      questions: [
        { q: "Care este diferența dintre eticheta \"nou\" și \"recondiționat\"?", a: "Dispozitivul \"nou\" este nedesfăcut sau aproape neutilizat, cu accesoriile originale. Dispozitivul \"recondiționat\" a fost verificat și testat înainte de a ajunge pe raft — ecran, baterie, camere și toate butoanele/porturile verificate —, poate avea mici urme de uzură vizibile la o privire atentă." },
        { q: "Cum verificați telefoanele recondiționate?", a: "Le testăm funcțional pe fiecare cu un sistem de diagnoză profesional, verificăm starea bateriei și o înlocuim dacă este necesar." },
        { q: "Ce înseamnă procentul bateriei afișat pe pagina produsului?", a: "Capacitatea măsurată a bateriei dispozitivului față de cea originală — cu cât e mai mare, cu atât starea e mai bună." },
        { q: "Aveți și telefoane cu taste (non-smartphone)?", a: "Da, în stocul nostru găsești constant și telefoane simple, cu taste — de exemplu pentru o rudă în vârstă sau ca telefon de rezervă." },
      ],
    },
    {
      key: "garancia",
      icon: "warranty",
      title: "Garanție",
      questions: [
        { q: "Cât timp de garanție primesc pentru telefon?", a: "Perioada indicată pe pagina produsului (de ex. 1 lună / 3 luni / 6 luni / 1 an) — se aplică dispozitivului respectiv, calculată de la data ridicării." },
        { q: "Ce acoperă garanția de service, dacă am reparat la voi?", a: "Depinde de tipul piesei înlocuite: baterie originală 12 luni, baterie neoriginală 6 luni, ecran original 3 luni, ecran neoriginal 1 lună, orice altă piesă/reparație 1 lună." },
        { q: "Ce NU acoperă garanția?", a: "Deteriorări mecanice (cădere, spargere, zgârieturi), pătrunderea lichidelor/umezelii, intervenții neautorizate, precum și uzura normală (de ex. scăderea naturală a capacității bateriei)." },
        { q: "Cum îmi valorific garanția?", a: "Adu dispozitivul în oricare dintre magazinele noastre, sau verifică certificatul digital de garanție pe link-ul primit." },
      ],
    },
    {
      key: "visszakuldes",
      icon: "return",
      title: "Retur și drept de renunțare",
      questions: [
        { q: "Am drept de renunțare, dacă mă răzgândesc?", a: "Da, în termen de 14 zile calendaristice de la primirea produsului, fără justificare." },
        { q: "În ce stare trebuie să returnez produsul?", a: "Complet, nedeteriorat, pe cât posibil în ambalajul original." },
        { q: "Când primesc banii înapoi?", a: "În cel mult 14 zile de la acceptarea renunțării, prin aceeași metodă de plată folosită la achiziție." },
        { q: "Există produse care nu pot fi returnate?", a: "Da — de exemplu produsele personalizate, sau cele care din motive de igienă/securitate a datelor nu pot fi primite înapoi după desfacere." },
      ],
    },
    {
      key: "eladas",
      icon: "buyback",
      title: "Vând telefonul meu",
      questions: [
        { q: "Cum funcționează achiziția telefoanelor vechi?", a: "Pe pagina \"Vând telefonul\", pe baza câtorva întrebări (marcă, model, stare) primești instant o ofertă estimativă, pe care o poți finaliza în magazin." },
        { q: "De ce depinde cât valorează telefonul meu?", a: "De model, vechime și stare (ecran, baterie, starea carcasei, funcționalitate)." },
        { q: "Sunt obligat să vând, dacă primesc oferta?", a: "Nu, estimarea online nu te obligă la nimic — se finalizează doar dacă predai dispozitivul în magazin." },
        { q: "În ce formă plătiți pentru telefonul preluat?", a: "În numerar, în magazin, la predarea finală." },
      ],
    },
    {
      key: "szerviz",
      icon: "service",
      title: "Service",
      questions: [
        { q: "Ce reparații efectuați?", a: "Cele mai frecvente (ecran, baterie, conector de încărcare, cameră și celelalte defecte listate în estimatorul de service) — prețul exact îl vezi imediat în estimatorul nostru online." },
        { q: "Cât durează o reparație?", a: "Dacă piesa e pe stoc, chiar și în aceeași zi, în circa jumătate de oră; dacă trebuie comandată, 2-3 zile lucrătoare." },
        { q: "Folosiți piese originale sau neoriginale?", a: "Ambele sunt disponibile, la alegere — prețul și garanția aferentă diferă, le vezi mereu în estimator înainte de a alege." },
        { q: "Ce se întâmplă dacă defectul nu poate fi reparat, sau nu reușește din prima?", a: "Defectul aflat în garanție îl reîncercăm gratuit în 10 zile lucrătoare; dacă nu e posibil, returnăm costul reparației." },
      ],
    },
    {
      key: "fizetes",
      icon: "payment",
      title: "Plată și securitate",
      questions: [
        { q: "Ce metode de plată sunt disponibile?", a: "Numerar sau card bancar la ridicarea personală, respectiv plată ramburs." },
        { q: "Se poate plăti online, cu cardul?", a: "În curând va fi disponibilă plata online cu cardul bancar (Visa, Mastercard) prin sistemul securizat Netopia." },
        { q: "Este sigură introducerea datelor cardului meu?", a: "Da — site-ul este protejat prin criptare SSL, iar plata online este procesată de sistemul 3D-Secure al Netopia, noi nu vedem niciodată datele cardului tău." },
        { q: "Primesc factură pentru achiziție?", a: "Da, pentru fiecare achiziție." },
      ],
    },
    {
      key: "fiokom",
      icon: "location",
      title: "Contul meu, urmărire, magazinele noastre",
      questions: [
        { q: "Cum pot urmări starea service-ului sau a comenzii mele?", a: "Pe link-ul primit (prin SMS sau pe bon) poți verifica oricând, sau pe pagina de Urmărire poți căuta și după numărul fișei/numărul de telefon." },
        { q: "Trebuie să îmi creez cont pentru a cumpăra?", a: "Nu neapărat, dar în contul tău (secțiunea Contul meu) vezi comenzile anterioare și produsele favorite." },
        { q: "Unde sunt magazinele voastre?", a: null, locations: true },
        { q: "Care este programul de lucru?", a: "Luni–vineri 9:00–17:00, sâmbătă 9:00–13:00, duminică închis." },
        { q: "Cum vă pot contacta, dacă am o întrebare?", a: "Telefonic (0773 985 278), pe e-mail (info@telefonos.ro), sau pe rețelele sociale (Facebook/Instagram)." },
      ],
    },
  ],
};
