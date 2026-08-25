# TASKS — Bevétel/Kiadás: naptár-nézet a korábbi napokhoz + havi archívum + alkalmazotti korlátozás

Kérés: "az előző napokat úgy képzeltem el, mint a naptáraknál, körök lennének a napok, lehet választani melyik nap, az alkalmazott 1 hónapra lát vissza, a többit csak az admin látja. A napokat el kéne menteni, de egy idő után csak a havi árulás/kiadás/árrés érdekel — 1 hónap múlva nem releváns, hogy aznap kábelt vettek."

## 0. Jelenlegi állapot (amit megnéztem)

A "Korábbi napok megtekintése" gomb (`FinanceTab.jsx` 185-194. sor) ma az `adaptivePeriodBucket()`-re épülő `TransactionsPeriodList`-et nyitja — ez egy összecsukható, "öregedő" csoportosítású lista (folyó hét: napi bontás, folyó hónap: heti, folyó év: havi, korábbi évek: évenkénti), de **nincs benne naptár-vizuál, és nincs se UI-, se adatbázis-szintű korlátozás arra, hogy egy alkalmazott mennyire láthat vissza**. Az RLS (`transactions_rw` policy) ma kizárólag helyszín szerint szűr (admin mindent lát, alkalmazott csak a saját helyszínét) — **dátum szerint semmit nem korlátoz**, vagyis egy alkalmazott technikailag ma is visszakérdezheti az összes régi tranzakciót, nemcsak amit a felület mutat neki.

## 1. Naptár-nézet a napi választáshoz

A "Korábbi napok megtekintése" gomb helyett/mellett egy hónap-naptár: fejlécben `‹ 2026. augusztus ›` lapozó, alatta a hét napjai (H K Sze Cs P Szo V), majd a napok kör alakú gombokként — pontosan, ahogy elképzelted.

**Napok vizuális állapota:**
- Van tranzakció aznap → kör szegélyezve (kontúros).
- Nincs tranzakció → halvány, szegély nélküli szám.
- `day_closes`-ban lezárva → kitöltött, halvány zöld kör (a meglévő zárás-adatot használva, amit már úgyis eltárolunk).
- Ma → accent-színű gyűrű.
- Kiválasztott nap → kitöltött accent háttér.
- Jövőbeli / tiltott nap (lásd 3. pont) → szürkített, nem kattintható.

Kattintásra az adott nap alatt megjelenik ugyanaz az itemezett tábla, amit ma a "Ma" doboz mutat (`TransactionRowsTable`, a meglévő komponens újrahasznosításával — semmi új listázó logika nem kell).

## 2. Havi archívum — csak admin, csak 4 szám, alapból nincs napi részletezés

Ez a válasz a "1 hónap múlva nem releváns, hogy kábelt vettek" megfigyelésre. A naptár a legutóbbi ~35 napot mutatja részletesen (napi bontásban, itemezve). Ami ennél régebbi, azt **alapból** csak összesítve látja bárki (illetve csak az admin, lásd 3. pont): egy lista, hónaponként egy sor, a mai "Ma" doboz 4 számával — Bevétel (készpénz), Bevétel (kártya), Kiadás, Árrés — **tétel szinten nem**.

```
2026. július    Bevétel: 12 450 Lei (kp) + 3 200 Lei (kártya)   Kiadás: 4 100 Lei   Árrés: 6 890 Lei   [napi bontás ▾]
2026. június    Bevétel: 10 980 Lei (kp) + 2 750 Lei (kártya)   Kiadás: 3 640 Lei   Árrés: 5 920 Lei   [napi bontás ▾]
```

A négy szám élő SQL/JS aggregálással számolódik a `transactions` táblából (dátum szerint hónapra csoportosítva) — **nincs szükség külön archívum-táblára**, az adatbázis mérete (jelenleg 18 MB) még évekig elbírja ezt élőben, nem éri meg előre optimalizálni. Ha valaha tényleg sokezer soros lenne és lassulna, akkor érdemes lesz materializálni — most még nem indokolt.

**"Napi bontás" gomb** minden hónap-soron: ha valakinek (auditálás, vevő-vita miatt) tényleg vissza kell nézni egy konkrét régi napot, ez kinyit egy ugyanolyan mini-naptárat, mint az 1. pontban, csak arra a hónapra szűkítve — vagyis **semmi nem vész el, semmit nem törlünk**, csak alapból nem ez van eléd tolva, mert a mindennapi használatban tényleg nem releváns.

## 3. Alkalmazott: 1 hónapra lát vissza — UI ÉS adatbázis szinten is

Két helyen kell megfogni, nem elég a felületen elrejteni (a jelenlegi biztonsági elv szerint máshol is mindenhol RLS-szel van megoldva, nem csak UI-tiltással):

**a) UI**: a naptárban a `‹` (előző hónap) gomb letiltva, ha az adott hónapban már nincs az utolsó 30 napon belüli, választható nap; az adott hónapon belül a 30 napnál régebbi napok szürkítve, nem kattinthatók. A "Korábbi hónapok" lista (2. pont) **egyáltalán nem jelenik meg** alkalmazottnak — `isAdmin` prop kell hozzá a `FinanceTab`-nak (ma nincs átadva, App.jsx 1941-1950. sor bővítendő `isAdmin={isAdmin}`-nal).

**b) RLS** — a `transactions_rw` policy ma egy darab `ALL` szabály (SELECT/INSERT/UPDATE/DELETE ugyanazzal a feltétellel: admin vagy saját helyszín). Ezt szét kell bontani, hogy a SELECT-hez dátum-korlátot lehessen tenni írási jog szűkítése nélkül:

```sql
drop policy transactions_rw on transactions;

create policy transactions_select on transactions for select using (
  current_role() = 'admin' or (
    location_id = current_location_id()
    and date >= (current_date - interval '31 days')
  )
);

create policy transactions_write on transactions for all using (
  current_role() = 'admin' or location_id = current_location_id()
) with check (
  current_role() = 'admin' or location_id = current_location_id()
);
```

(A `transactions_write` szándékosan marad dátum-korlát nélkül — ha egy alkalmazott pl. tegnapi tranzakciót javít, az írás-jogot nem akarjuk elvenni, csak a *böngészést* korlátozzuk a régi adatokban.)

## 4. Amit tisztázni kell

- **A "30/31 nap" pontos hossza** — naptári hónapot értettél ("egy hónapra"), vagy kerek 30 napot? A fentiekben 31 napos gördülő ablakot javaslok (mindig legalább egy teljes naptári hónapot lefed), de ha inkább naptári hónap-határhoz igazítva szeretnéd (pl. mindig az aktuális + előző naptári hónap), az is megoldható, csak szólj.
- **A havi archívum tényleg csak admin-e**, vagy szeretnéd, hogy az alkalmazott is lássa a régebbi hónapok 4 összesített számát (csak a napi részletezést ne)? A kérésedből ("a többit csak az admin látja") azt értem, hogy a teljes 1 hónapon túli rész admin-only, ezt vettem alapul — ha mégis jó lenne az alkalmazottnak is látni a puszta havi végösszegeket (anélkül, hogy tételeket böngészhetne), az egy külön, szűkebb RPC-t igényelne (csak az aggregált számokat adja vissza, sorokat nem) — szólj, ha ez kellene.
- **Nem törlünk, nem archiválunk fizikailag semmit** — a "napokat el kéne menteni" kérésedet úgy értelmeztem, hogy semmi ne vesszen el (ez már ma is így van, a `transactions` tábla mindent megőriz), csak a *nézet* legyen egyszerűbb régi adatoknál. Ha valójában arra gondoltál, hogy fizikailag archiváljuk/tömörítsük a régi sorokat egy külön táblába, az mást igényelne — de szerintem erre nincs is szükség, amíg élőben simán aggregálható.

---

## Ellenőrzőlista implementálás után

- A "Korábbi napok" gomb helyén hónap-naptár van, körökkel jelölt napokkal (nincs adat / van adat / lezárva / ma / kiválasztott állapotok vizuálisan elkülönítve)
- Napra kattintva a meglévő `TransactionRowsTable`-lel itemezett napi lista jelenik meg
- Admin alatt egy "Korábbi hónapok" lista is van, hónaponként 4 összesítő számmal, "Napi bontás" expanderrel
- Alkalmazottnak a naptár nem enged 30 napnál régebbre lapozni, és a "Korábbi hónapok" lista egyáltalán nem jelenik meg neki
- `transactions` RLS: külön SELECT (dátum-korlátos alkalmazottnak) és külön write policy, admin változatlanul mindent lát/ír
- `npm run build` hibamentes, migráció (RLS policy csere) lefut
- Nincs `git push`, csak lokális commit
