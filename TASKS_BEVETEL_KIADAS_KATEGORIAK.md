# TASKS — Bevétel/Kiadás kategóriák újragondolása (statisztika-alapú)

Kérés: "a kiadas es bevetel kategoriakat atkellene gondoljuk, amiket szeretnek nezni az kulon szerviz, kulon uj es felujtitott telefon, kulon ha marketingre koltunk, kulon ha befektetunk pl kamera, eszkozok, akkor vannak a kiadasok pl aram, konyvelo, fizetes, es kikellene dolgozd hogy miket erdemes kulon merni mert ebbol szeretnek statisztikat"

## 0. A jelenlegi állapot — amit a kódban és az élő adatban találtam

`src/lib/utils.js`: `CATEGORIES = ["Fix", "Készlet", "Marketing", "Eszköz", "Szerviz", "Egyéb"]` — **egyetlen, közös lista Bevételre ÉS Kiadásra is** (`TransactionModal.jsx`, `TransactionQuickAdd.jsx` ugyanazt a listát ajánlja fel típustól függetlenül — ma technikailag kiválasztható "Szerviz" kiadásként vagy "Fix" bevételként is, aminek nincs értelme).

Emellett van egy **rejtett, kódban létező, de a listában nem szereplő kategória**: `"Bizomány"` — a `sellProduct`/`addProduct` automatikusan ezt írja be bizományos tételeknél, de a `CATEGORIES` konstansban nincs benne, tehát kézzel senki nem tudná kiválasztani, csak a rendszer rakja rá automatikusan.

**Élő adatból lekérdezve** (`transactions` tábla, `deleted_at is null`):

| type | category | db | összeg |
|---|---|---|---|
| income | Készlet | 110 | 88 941 Lei |
| income | Szerviz | 20 | 4 150 Lei |
| expense | Készlet | 32 | 4 457 Lei |
| expense | Eszköz | 2 | 1 638 Lei |
| expense | Egyéb | 11 | 1 158 Lei |

A legfontosabb felismerés: a 110 "Készlet" bevételből **csak 12 kapcsolódik tényleges `product_id`-hoz** (vagyis konkrét telefon-eladáshoz) — **98 tétel termékhez nem kötött**, ezek túlnyomó többsége tartozék-eladás (`QuickSaleButtons.jsx` — tok/fólia/kábel gyorsgombok szintén `category: "Készlet"`-et írnak). Vagyis a mai "Készlet" bevétel-kategória valójában **három különböző dolgot kever**: új telefon eladás, felújított telefon eladás, és tartozék-eladás — ez utóbbi a *számosságban domináns*, nem a mellékes tétel.

## 1. Javasolt kategória-szétválasztás

### 1.1 Elv

Bevétel és Kiadás **külön listát** kapjon (a `TransactionModal`/`TransactionQuickAdd` már ismeri a `type`-ot, csak a kategória-select opciói legyenek `type`-függők). A kategóriák három csoportra bomlanak, mert három különböző üzleti kérdésre válaszolnak:

- **Miből jön a bevétel, milyen arányban?** (telefon vs tartozék vs szerviz — más árrés-szerkezetük van, más döntést igényelnek)
- **Mi a kontrollálható/változó költség?** (beszerzés, marketing — ezekkel nap mint nap lehet reagálni)
- **Mi a fix rezsi, és mi a befektetés?** (bér/bérleti díj/könyvelés adja a havi töréspontot — ezt minimum ki kell termelni, mielőtt nyereség lenne; az "Eszköz" viszont NEM havi ráfordítás, hanem vagyonnövelés, félrevezető lenne egy hónap eredményébe beleszámolni)

### 1.2 Bevétel kategóriák

```js
export const INCOME_CATEGORIES = [
  "Új telefon eladás",
  "Felújított telefon eladás",
  "Tartozék eladás",   // tok, fólia, kábel, töltő stb. — QuickSaleButtons ide kerül
  "Szerviz",
  "Bizomány",           // jutalék — eddig is létezett, csak nem volt látható/választható
  "Egyéb bevétel",
];
```

### 1.3 Kiadás kategóriák

```js
export const EXPENSE_CATEGORIES = [
  "Telefon-beszerzés",
  "Alkatrész-beszerzés",  // a most átalakított egyedi-tétel alkatrész-rendszerrel különösen fontos
  "Bizomány kifizetés",
  "Marketing",
  "Eszköz / befektetés",  // kamera, szerszám, bútor, gép — NEM havi költség
  "Bérleti díj",
  "Rezsi",                 // áram, víz, internet, telefon-előfizetés
  "Könyvelés",
  "Bér / fizetés",
  "Egyéb kiadás",
];
```

## 2. Automatikus kategória-kitöltés — ne terheljük a pultost

A cél, hogy ott, ahol a rendszer MÁR ismeri az adatot, ne kelljen kézzel választani:

- **`SellModal.jsx`** (telefon-eladás): ma `category: "Készlet"` hardcode-olva — mostantól `product.condition === "New" ? "Új telefon eladás" : "Felújított telefon eladás"`, automatikusan, a már ismert `product` objektumból.
- **`QuickSaleButtons.jsx`** (tok/fólia/kábel gyorsgombok): `category: "Tartozék eladás"`.
- **`addProduct`/`sellProduct`** bizományos ág: már ma is automatikusan `"Bizomány"`-t ír — csak a névnek kell igazodnia (`"Bizomány kifizetés"` kiadásra, `"Bizomány"` bevételre a jutalék-résznél — ellenőrizni kell a pontos szóhasználatot a két helyen).
- **`addTicket`/szerviz-átadás**: marad `"Szerviz"`.
- **`importPdfOrder`** (a `TASKS_KESZLET_KONYVELES_OSSZEHANGOLASA.md` szerint már úgyis átalakul): a "part" sorok `"Alkatrész-beszerzés"`-t, a "phone" sorok `"Telefon-beszerzés"`-t kapják automatikusan a sor `kind`-je alapján.
- **Kézi/gyors-kiadás bejegyzés** (`TransactionQuickAdd.jsx`, `TransactionModal.jsx`): itt marad a kézi választás — ez az egyetlen hely, ahol tényleg a pultos/te dönt (pl. mikor fizetitek ki a bérleti díjat, a könyvelőt, a bért).

## 3. Meglévő adatok migrálása

A ma élő, `category='Készlet'` sorokat egyszeri SQL-lel szétosztanánk:

```sql
-- income: termékhez kötött → condition alapján
update transactions t set category = case p.condition when 'New' then 'Új telefon eladás' else 'Felújított telefon eladás' end
from products p where t.product_id = p.id and t.type = 'income' and t.category = 'Készlet';

-- income: termékhez NEM kötött → tartozék-eladás (a mai adatok alapján ez a 98 sor túlnyomó többsége)
update transactions set category = 'Tartozék eladás'
where type = 'income' and category = 'Készlet' and product_id is null;

-- expense: a beszerzési oldalon egyelőre mind "Telefon-beszerzés" lesz — ha volt köztük alkatrész is
-- ami a régi, kevert rendszerben nem különült el a terméktől, azt kézzel érdemes átnézni utólag
update transactions set category = 'Telefon-beszerzés' where type = 'expense' and category = 'Készlet';
```

Az utolsó lépést (kiadás-oldal) érdemes lenne, mielőtt lefuttatjuk, veled átnézni — 32 sor van benne, nem sok, gyorsan átnézhető, hogy tényleg mind telefon-beszerzés volt-e, vagy volt köztük alkatrész is, amit inkább "Alkatrész-beszerzés"-re kellene tenni.

## 4. Amit MÉG nem építek bele — statisztika/riport felület

A kérésed vége ("ebből szeretnék statisztikát") egy **külön, nagyobb feature**: kategóriánkénti bontás, havi trend, arányok — ma a `FinanceTab.jsx`/`DashboardTab.jsx` sehol nem használja a kategóriát riportáláshoz, csak sima listázásra. Ez a spec **csak a kategória-taxonómiát** tisztázza — a tényleges statisztika-nézet (pl. "Bevétel-megoszlás kategóriák szerint" kördiagram, "Havi fix költség vs árrés" — a break-even-hez) egy következő lépés, miután a kategóriák stabilak. Szólj, ha ezt is szeretnéd most rögtön megtervezni, vagy előbb fusson be pár hét valós adat az új kategóriákkal, és utána nézzük meg, mit érdemes kimutatni.

## 5. Amit tisztázni kell

- **Kiadás-oldali új/felújított szétválasztás**: kérted, de az EXPENSE_CATEGORIES-ben nem bontottam szét "Telefon-beszerzés"-t új/felújított szerint — mert beszerzéskor ez inkább a `product.condition` mezőn már úgyis látszik (ott tudod filterezni, ha kell), és a Kiadás-oldalon a döntési kérdés inkább az, hogy "mennyi megy összesen telefon-beszerzésre" vs "mennyi alkatrészre" — ha mégis fontos neked a beszerzési oldalon is az új/felújított bontás, jelezd, könnyen hozzáadható.
- **"Tartozék eladás" néven rendben van, vagy legyen inkább "Kiegészítők"?** — csak elnevezés kérdése.
- **A 32 mai "Készlet" kiadás-sor kézi átnézése** (3. pont vége) — szeretnéd, hogy én nézzem át és javasoljak besorolást soronként, vagy te nézed át?

---

## Ellenőrzőlista implementálás után

- `INCOME_CATEGORIES`/`EXPENSE_CATEGORIES` külön listaként létezik, a `type` szerint helyes lista jelenik meg minden kategória-választóban
- `SellModal`/`QuickSaleButtons`/`addTicket`/bizomány-ág automatikusan a helyes kategóriát írja, kézi választás nélkül
- Meglévő adatok migrálva, a kiadás-oldali 32 sor kézzel ellenőrizve
- `npm run build` hibamentes
- Nincs `git push`, csak lokális commit
