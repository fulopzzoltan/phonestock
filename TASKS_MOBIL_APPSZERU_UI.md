# TASKS — Telefonbarát, "applikáció-szerű" belső admin felület

Kérés: "dolgozd ki az egész rendszer telefonbarát használatát, akár alul lehetnek gombok mintha applikáció lenne... nézd meg az iparági sztenderdeket, minden almenüt tesztelj, ne legyen gördülékenytelen, ne lógjon ki semmi a nézetből, legyen mobilbarát reszponzív a belső rendszer"

## 0. Mit csináltam, hogy ez ne csak "szerintem jó lenne" legyen

**Iparági kutatás** (linkek a végén): 3-5 elemű alsó tab-bar, ikon+felirat, min. 44×44pt (iOS) / 48×48dp (Android) érintési célméret, a legfontosabb funkciók hüvelykujj-távolságban lent, aktív elem vizuálisan kiemelve, "safe area" a home-indikátor sávnak.

**Automatizált teszt**: felállítottam Playwright-ot a sandboxban (headless Chrome, hiányzó rendszerkönyvtárat is pótoltam, hogy egyáltalán elinduljon), létrehoztam egy eldobható admin teszt-usert (`mobiltest-qa@phonestock.local`, a teszt végén törölve), és megpróbáltam automatikusan bejárni mind a 15 fület 390px-es (iPhone-szerű) nézetben, minden fülről screenshotot és túlcsordulás-mérést készítve. A tényleges bejelentkezés (Supabase-hívás) a sandbox hálózati proxy-ján elakadt (407-es hiba), ezt nem tudtam feloldani ésszerű időn belül — **ez a rész nem futott le automatán**. Emiatt a lenti hibalistát **teljes forráskód-átvizsgálással** állítottam össze (minden fül, minden komponens, a CSS összes media query-je átnézve) — ez ugyanolyan alapos, csak nem képernyőképpel, hanem kóddal bizonyított. Javaslom, hogy implementálás után egy gyors, valódi telefonos átnézést tegyetek rá, mert a pixel-pontos vizuális visszaigazolás így maradt ki.

## 1. A fő hiányosság: nincs alsó navigáció, csak hamburger-menü

Ma (`Sidebar.jsx`, `index.css` 427-433. sor) mobilon a teljes navigáció egy hamburger-gomb mögé van rejtve — minden fülváltáshoz ki kell nyitni egy teljes képernyős lenyíló menüt. Ez **nem** applikáció-szerű; egy natív appban a leggyakoribb funkciók mindig láthatók lent.

**16 nav-elem van** ma (Pult, Szerviz, Telefonok, Alkatrészek, Kliensek, Garancia, Bevételek&Kiadások, Elszámolás, Számlák, Szabadság, Áttekintés, Felhasználók, Kuka, Felvásárlás, Szerviz árbecslő, Beállítások) — ennyi **nem fér ki** egy alsó sávba (a sztenderd max. 5 elem). A megoldás minden nagyobb appban ugyanaz: **4 fix + 1 "Több" gomb**, ami egy alulról felcsúszó listát nyit a többi funkcióval.

**Javaslat a 4 fixre** (a "Napi munka" csoport + a pénzügy, mert ezekbe nyúltok bele nap mint nap): **Pult · Szerviz · Telefonok · Bevételek&Kiadások**, +5. gomb **"Több"**. Ha úgy érzed, mást használtok gyakrabban, szólj, ez az egy sor könnyen cserélhető.

```
[Pult] [Szerviz] [Telefonok] [Bevétel] [Több ⋯]
```

Technikailag: új `BottomNav.jsx` komponens, csak `@media (max-width:640px)` alatt renderelve (a sidebar marad változatlan desktopon), `position:fixed;bottom:0` + `padding-bottom:env(safe-area-inset-bottom)` (iPhone home-sáv alá ne csússzon szöveg), min. 56px magas sáv, gombonként ikon+11px felirat, aktív fül kiemelve (szín + félkövér, a meglévő `--sidebar-accent` színnel). Az 5. "Több" gomb egy alulról felcsúszó panelt nyit (lásd 2. pont), ami a maradék 12 elemet mutatja, ugyanabban a csoportosításban, mint ma a sidebar (Pénzügyek / Admin / Webshop címkékkel).

**Fontos**: mivel most lesz alsó sáv, minden tartalom-területnek kell egy `padding-bottom: 70px` mobilon, hogy az utolsó sor/gomb ne csússzon az alsó nav mögé (pl. a `FinanceTab` "Nap zárása" gombja, vagy egy hosszú lista alja).

## 2. "Több" panel — a maradék funkciók alulról felcsúszva

Ne külön oldal legyen, hanem egy `overlay` + alulról becsúszó, lekerekített felső sarkú lap (ugyanaz a "bottom sheet" minta, amit a 3. pontban a modaloknál is javaslok — érdemes egy közös `<BottomSheet>` komponenst csinálni, amit mindkét helyen újrahasznosítotok). Tartalma: a mai sidebar többi csoportja (Alkatrészek, Kliensek, Garancia / Elszámolás, Számlák / Szabadság, Áttekintés, Felhasználók, Kuka / Felvásárlás, Szerviz árbecslő), plusz alul a helyszín-váltó és Beállítások/Kijelentkezés — vagyis lényegében a mai `sidebar-inner`+`sidebar-bottom` tartalma, csak "Több" gombbal nyitva, nem hamburgerrel.

## 3. Modalok — legyenek alulról felcsúszó lapok mobilon, ne kis lebegő kártyák

Ma (`index.css` 330-331. sor) minden modal (`.overlay`+`.modal`) középre igazított, lekerekített kártya, max 540px széles, max 92vh magas, belül scrollozható — ez asztali gépen jó, de mobilon egy natív app inkább alulról csúsztatja fel a form-panelt, tele szélességben, lekerekített **csak felül**. Ez az egyik legjellemzőbb "applikáció-érzetet" adó minta.

```css
@media (max-width:640px){
  .overlay{align-items:flex-end;padding:0}
  .modal{max-width:100%;width:100%;border-radius:20px 20px 0 0;max-height:88vh;
         padding-bottom:calc(26px + env(safe-area-inset-bottom))}
}
```
Ez CSS-only változtatás, semmilyen komponenst nem kell átírni — minden meglévő modal (Tranzakció, Munkalap, Termék, stb.) automatikusan ezt kapja.

## 4. 9 fülön a táblázat oldalra görgetéssel "lóg ki" mobilon — ezt találtam a legkomolyabb hibának

Ez pontosan az, amitől félsz ("ne lógjon ki semmi a nézetből"). A kódban **már van a helyes minta** — a `TransactionsPeriodList.jsx`, `CustomersTab.jsx` és `WarrantyTab.jsx` 640px alatt nem táblázatot mutat, hanem olvasható, egymás alatti kártyákat (`.mob-cards`/`.mob-row` — a `.tw table{display:none}` a 433. sorban, a kártyás nézet pedig ezalatt jelenik meg). **Ez a minta viszont NINCS bevezetve** a következő 9 fülön, amik nyers `<table>`-t tesznek egy `.tw` (`overflow-x:auto`) dobozba — mobilon ez azt jelenti, hogy a táblázat **oldalra görgethető, apró betűs csík** lesz, nem olvasható kártyalista:

- `InvoicesTab.jsx` (Számlák)
- `BuybackTab.jsx` (Felvásárlás)
- `CashSettlementTab.jsx` (Elszámolás — pont amit legutóbb átdolgoztunk!)
- `StockTab.jsx` (Telefonok — az egyik leggyakrabban nézett lista)
- `PartsTab.jsx` (Alkatrészek)
- `UsersTab.jsx` (Felhasználók)
- `RepairPricesTab.jsx` (Szerviz árbecslő)
- `LeaveTab.jsx` (Szabadság)
- `TrashTab.jsx` (Kuka)

**Javaslat**: ahelyett, hogy mind a 9 fülbe kézzel bemásoljuk a `TransactionsPeriodList`-ben már bevált `mob-cards`/`mob-row` logikát (az duplikáció, nehéz karban tartani), csináljunk egy **közös, újrahasználható `<ResponsiveTable>` komponenst**: kap egy `columns` leírót és egy `renderMobileRow(row)` függvényt, deszkopon `<table>`-t renderel, 640px alatt automatikusan a kártyás `mob-row` nézetet — és ezt vezessük be mind a 9 helyen, a `TransactionsPeriodList`-et is erre átállítva (hogy egy helyen legyen a logika, ne 4-5 külön másolatban).

## 5. Szerviz kanban — a görgetés és a húzás (drag) összeakad mobilon

`ServiceTab.jsx`: a kanban oszlopok (`kanban-wrap{overflow-x:auto}`) oldalra görgethetők, **és** ugyanakkor húzhatók is (`@dnd-kit` `PointerSensor`) egy munkalap státuszváltásához. Ujjal ez a két gesztus (oldalra lapozás vs. kártya felhúzása) zavarja egymást — ez az egyik legismertebb mobil-kanban buktató.

Szerencsére **már van rá a kódban jó alternatíva, csak túl kicsi**: minden kártyán ott a `‹`/`›` léptető gomb (`TicketCard.jsx` 19-20. sor, `.t-card-step`), ami drag nélkül lépteti a státuszt — de `index.css` 278. sor szerint csak **20×20px**, jóval a 44px-es minimum alatt. Javaslat: mobilon (`@media max-width:640px`) ezt a két gombot vizuálisan is hangsúlyosabbra, min. **40×40px**-re nagyítjuk, hogy ez legyen a kézenfekvő mobil-interakció, a húzás pedig maradjon meg másodlagos, desktop-elsődleges lehetőségnek.

## 6. Apró érintési célpontok — általános audit

A sztenderd (44px iOS / 48px Android) alatt vannak még: `.iconbtn` (index.css 122. sor, `padding:4px` egy kis ikonra — ökölszabály szerint ~24-28px teljes méret), `.logout-btn` (71. sor, hasonló), `.confirm-btn` (127-130. sor, `padding:4px 9px`). Ezeket nem kell átméretezni desktopon (ott az egérrel pontos kattintás nem gond), de `@media (pointer:coarse)` — vagyis érintőképernyőn — kapjanak nagyobb `padding`-et (min. a láthatatlan hit-area érje el a 44px-et, a vizuális ikon mérete maradhat kicsi).

## 7. Amit NEM kell bántani — már ma is jól működik

- A form-rácsok (`row2`, `row3`, `bb-grid`) 640px alatt már 1 oszlopra esnek szét (`index.css` 434, 745. sor) — rendben vannak.
- A statcard-sorok (`statrow.c3-c6`) már 900px-nél 2 oszlopra, `statrow.c4-c6` 640px alatt szintén 2 oszlopra esik — jó.
- A viewport meta tag helyesen be van állítva (`index.html`).
- A modal már ma is `max-height:92vh` + belső scroll — nem "lóg ki" függőlegesen, csak vizuálisan nem "app-szerű" (3. pont).

---

## Ellenőrzőlista implementálás után

- Alsó nav-sáv látszik 640px alatt: Pult / Szerviz / Telefonok / Bevétel / Több, min. 56px magas, `safe-area-inset-bottom` figyelembe véve, aktív fül kiemelve
- "Több" panel alulról felcsúszva mutatja a maradék 12 funkciót, csoportosítva
- Minden modal mobilon alulról felcsúszó, teli szélességű, csak felül lekerekített lap
- Az összes tartalom-terület alján van annyi hely (`padding-bottom`), hogy az alsó nav ne takarjon ki gombot/sort
- Mind a 9 érintett fülön (Számlák, Felvásárlás, Elszámolás, Telefonok, Alkatrészek, Felhasználók, Szerviz árbecslő, Szabadság, Kuka) kártyás nézet van táblázat helyett 640px alatt — közös `<ResponsiveTable>` komponensből
- Szerviz kanbanban a `‹`/`›` léptető gombok min. 40×40px-esek mobilon
- Érintőképernyőn (`pointer:coarse`) minden gomb hit-area-ja legalább ~40-44px
- `npm run build` hibamentes
- **Kérlek, tesztelj rajta ténylegesen a telefonodról implementálás után** — az automata böngészős teszt a sandbox hálózati korlátai miatt nem futott le végig, ez a spec kód-átvizsgálás alapján készült
- Nincs `git push`, csak lokális commit

---

**Források**:
- [Mobile Navigation Design: 8 Types, Examples & Best Practices (2026) — UXPin](https://www.uxpin.com/studio/blog/mobile-navigation-examples/)
- [Mobile Navigation UX Best Practices, Patterns & Examples (2026) — Design Studio UI/UX](https://www.designstudiouiux.com/blog/mobile-navigation-ux/)
- [Bottom Navigation Bar on Mobile Websites: Should You Use It? — The Hangline](https://www.thehangline.com/bottom-navigation-bar-on-mobile-websites-should-you-use-it/)
- [Mobile Navigation Patterns That Work in 2026 — Phone Simulator](https://phone-simulator.com/blog/mobile-navigation-patterns-in-2026)
