# TASKS — Design egységesítés (UX/UI audit alapján)

Ez egy végrehajtható feladatlista a kódoló agentnek (Claude Code). A cél: az admin app annyira letisztult és egységes legyen, mint amilyennek a kliens felé induló résznek (webshop, becslő, felvásárló) lennie kell ahhoz, hogy tényleg eladjon. Jelenleg minden képernyő egyenként jól meg van csinálva, de nincs egy közös rendszerből — ez a feladatlista ezt húzza össze.

**Ne pusholj / ne deployolj**, a CLAUDE.md szabálya szerint csak lokális commit, amíg nem szólnak. Minden pontot külön commit-ban vidd fel.

**Kontextus / piaci benchmark (2026-08-15-i kutatás):**
- SaaS admin dashboardoknál (Linear, Supabase, Stripe stílus) a bevált gyakorlat: minimális, tokenekre épülő színrendszer — egy márka-szín, zöld a sikeres/pozitív állapotra, piros csak a hibára, minden más szürke-skála. ([Color System for SaaS Dashboard](https://www.getcolors.dev/en/colors/saas-dashboard), [35 SaaS Dashboard Design Examples 2026](https://www.925studios.co/blog/saas-dashboard-design-examples-2026))
- Használt-telefon piacon (Back Market, Swappa) a bizalomépítés vizuálisan is következetes: azonos badge-stílus a garanciára/állapotra/minőségre mindenhol a felületen, nem soronként kitalálva. ([Back Market — Building trust for renewed devices](https://www.circularx.eu/en/cases/73/back-market-building-trust-for-renewed-devices), [Swappa](https://swappa.com/))
- A saját logónkból ([Group 10.png]) kinyert pontos zöld: **RGB(29,185,84) / #1DB954** — ez **nem egyezik** a kódban jelenleg használt `--accent:#22C55E`-vel. Ez a legvalószínűbb oka annak, hogy a brand és az app "majdnem, de nem pont" ugyanaz a zöld.

---

## 0. Alapozás: egységes szín-paletta (ELŐBB ez, minden más erre épül)

**Fájl:** `src/index.css`, `:root` blokk (3–14. sor körül)

Jelenlegi állapot: `--accent:#22C55E` és `--accent-dark:#16A34A` — ez egy Tailwind-zöld, nem a logó zöldje. Emellett kb. 8 helyen van **hardcode-olt** `rgba(34,197,94,...)` érték (pl. `.btn` box-shadow, `.navbtn:hover`, `.call-link`, `.chat-fab`, `.field:focus` box-shadow, `.loc-static`) — ezek nem követik automatikusan a CSS-változót, külön kell cserélni.

Új token-készlet (a logó zöldjéből származtatva):

```css
:root{
  --primary:#1DB954;        /* logó zöld — volt --accent:#22C55E */
  --primary-dark:#159C46;   /* hover/pressed — volt --accent-dark:#16A34A, alig változik */
  --primary-soft:#E8FBEF;   /* halvány tint háttér, badge/hover alapja */
  --primary-ink:#0F7A36;    /* sötét szöveg tint háttéren — volt helyenként #15803D, #0A5A40 */

  --danger:#DC2626; --danger-soft:#FEE2E2; --danger-ink:#B91C1C;
  --warning:#F59E0B; --warning-soft:#FEF3C7; --warning-ink:#92400E;
  --info:#2563EB; --info-soft:#DBEAFE; --info-ink:#1D4ED8;
  --failed:#9D174D; --failed-soft:#FCE7F3; /* "sikertelen" — külön marad a danger-től, más jelentés */

  --radius-sm:8px; --radius-md:12px; --radius-lg:16px; --radius-pill:999px;

  /* tartsd meg a meglévőket, csak alias-ként a fentiekre */
  --accent:var(--primary); --accent-dark:var(--primary-dark);
  --sidebar-accent:var(--primary); --sidebar-accent-text:var(--primary-ink); --sidebar-accent-soft:var(--primary-soft);
  ...
}
```

Tennivaló:
- Cseréld le a fenti módon a `:root` blokkot (őrizd meg a nem-szín változókat: `--shadow-card`, `--shadow-lg`, `--sidebar-bg`, `--sidebar-text*`).
- Grep-eld végig a fájlt `rgba(34,197,94` és `rgba(34, 197, 94` mintára, és minden találatot cserélj `rgba(29,185,84,` -re (ugyanazokkal az alpha-értékekkel).
- A `.pub-accent-ink:#0A5A40` (kb. 278. sor, publikus oldal tokenjei) cseréld `var(--primary-ink)`-re, hogy a publikus és admin zöld szövegszín is egyezzen.
- A már meglévő 3 különböző kék (`.st-alkatresz` #1D4ED8, `.st-qc` #0369A1, `.gar-pill` #2563EB) egységesítsd `var(--info)`/`var(--info-soft)`-ra.
- A `.st-*` badge-osztályok (118–125. sor) színeit hagyd, csak formalizáld a fenti token-nevekre, ahol van megfelelőjük.

Ellenőrzés: `npm run build`, majd nézd meg élőben a sidebar-t, a gombokat és egy statcard-ot — a zöld most már pontosan a logó zöldje legyen (nyisd meg egymás mellett a logót és az appot, szemre nem szabad látszódnia különbségnek).

---

## 1. Ikon-rendszer emoji helyett

**Probléma:** a sidebar navigáció már jó, saját SVG ikon-rendszert használ (`src/components/icons.jsx` — `DashboardIcon`, `ServiceIcon`, `PhoneCaseIcon`, `PartsIcon`, `FinanceIcon`, `CustomersIcon`, `WarrantyIcon` stb. már léteznek). A hiba ott van, ahol emoji lopakodott be helyette — ez OS/böngésző szerint máshogy néz ki, és megtöri az egyébként letisztult tipográfiát.

**Pontos helyek (cseréld emoji → meglévő vagy új SVG ikon, `icons.jsx`-ből importálva):**

- `src/tabs/DashboardTab.jsx` 16, 27, 76, 95, 101. sor: `📱 Telefonok` → `<PhoneCaseIcon width={14} height={14}/> Telefonok`, `🔧 Szerviz` → `<ServiceIcon .../>`, `💰 Bevételek & Kiadások` → `<FinanceIcon .../>`, `🔩 Alkatrészek` → `<PartsIcon .../>`, `👤 Kliensek` → `<CustomersIcon .../>`. Ezek az ikonok **már léteznek**, csak a Dashboardon nincsenek használva.
- `src/components/TicketCard.jsx` 18. sor: `🔧 Saját — előkészítés` / `↩️ Saját — ...` → használj egy kis `ServiceIcon`-t vagy egy új `OwnStockIcon`-t inline, ne emoji-t.
- `src/App.jsx` 467, 477. sor (`📅`, `✅` a csapat-chat automata üzeneteknél), 1386. sor (`💬` a chat-gomb felirata) → cseréld `LeaveIcon`/`ClockIcon`-ra ill. egy egyszerű `ChatIcon`-ra (hozz létre egyet `icons.jsx`-ben, buborék-ikon, ugyanazzal a stroke-stílussal mint a többi: `stroke="currentColor" strokeWidth="1.7"`).
- `src/components/TeamChatPanel.jsx` 70, 84, 92, 103, 111. sor (`💬`, `🔧`, `📦`) → ugyanaz a `ChatIcon`/`ServiceIcon`/`PartsIcon`.
- `src/components/QuickSaleButtons.jsx` 24. sor (`⚡ Gyors eladás`) → egy kis villám-ikon vagy hagyd el, a felirat önmagában is elég.
- `src/BuybackFlow.jsx` 155, 156, 271, 272, 277, 281. sor (`💶`, `📞`, `📍`, `📦`) → publikus oldalon lehet kicsit lazább, de itt is SVG-t használj, ne emoji-t (konzisztens legyen a `RepairEstimator.jsx`-szel).
- `src/lib/i18n.js` 43–45, 87–89. sor (`📞`, `🏬`) → mindkét nyelvi verzióban (HU/RO) cseréld ugyanarra az ikonra, amit a Buyback flow-nál használsz.

**Ne nyúlj hozzá:** a `✓` és `→` karakterek (pl. `DetailPanel.jsx` 83/98/99. sor, `i18n.js` `back: "← Vissza"`) — ezek egyszerű tipográfiai jelek, nem színes emoji, nem okoznak inkonzisztenciát, hagyd békén.

---

## 2. Egységes badge/tag komponens

**Probléma:** két különböző "címke" forma verseng egymással. A `.st-*` osztályok (118–125. sor), `.badge-loc/.badge-income/.badge-expense` (126–128), `.sla-badge` (131–133) mind **999px pill** alakúak — ez a jó irány. De a `.prob-pill` (129. sor) és `.gar-pill` (130. sor) **6px lekerekített téglalap** — más forma, ugyanabban a kontextusban (pl. egy szerviz kártyán egyszerre látszik pill és nem-pill címke).

**Fájl:** `src/index.css`, kb. 118–133. sor

Tennivaló:
- Vezess be egy alap `.tag` osztályt: `.tag{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:var(--radius-pill);font-size:10.5px;font-weight:600;}`
- A `.prob-pill` és `.gar-pill` kapjon `border-radius:var(--radius-pill)` -t (jelenleg 6px), hogy formailag illeszkedjen a többihez. Színük maradhat.
- Vizsgáld át `src/components/DetailPanel.jsx` (`prob-pill`, `gar-pill` használat), `src/components/TicketCard.jsx` (kanban kártya címkéi) — mindenhol ugyanaz a `.tag` alap + szemantikus módosító (`.tag-info`, `.tag-warning` stb. a 0. pontban bevezetett tokenekkel) fusson.

---

## 3. Publikus oldal ↔ admin vizuális híd

**Probléma:** a `/keszlet` webshop kártyás-e-commerce érzetű (`.pub-card`, 14px radius, hover-lift), az admin táblás-sűrű (`.statcard` 18px, `.stk-card` 16px, `.t-card` 14px, `.bb-card` 18px, `.leave-card` 14px) — **5 különböző radius-érték** kártya-jellegű elemeken.

**Fájl:** `src/index.css`

Tennivaló:
- Minden "kártya" konténer (`.statcard`, `.stk-card`, `.t-card`, `.pub-card`, `.bb-card`, `.leave-card`) kapjon egységesen `border-radius:var(--radius-lg)` (16px) — a 0. pontban bevezetett tokenből.
- A `--pub-accent`, `--pub-accent-ink`, `--pub-accent-soft` (278. sor) már `var(--accent)`-ra hivatkozik részben — igazítsd mindet a 0. pont token-jeire (`var(--primary)`, `var(--primary-ink)`, `var(--primary-soft)`), hogy a publikus oldal zöldje és az admin zöldje pixopenen megegyezzen.
- Nézd át a `PublicHeader.jsx`/`PublicFooter.jsx` és a `Sidebar.jsx` fejléc-magasságát/paddingjét — nem kell egyeznie (más use-case), de a logó-doboz (`.brand-mark`, 23. sor) színe pontosan `var(--primary)` legyen, ne külön hardcode.

---

## 4. Üres / betöltés állapotok

**Jó hír:** egy közös `.empty` osztály (index.css 92. sor: `color:#9CA3AF;text-align:center;padding:36px;font-size:13px`) már **egységesen** fut kb. 10 fülön (`StockTab`, `ServiceTab`, `PartsTab`, `FinanceTab`, `CustomersTab`, `WarrantyTab`, `UsersTab`, `TrashTab`, `RepairPricesTab`). Ez jó alap, csak vizuálisan sivár ("Betöltés...", "Nincs X" — sima szürke szöveg).

Tennivaló:
- **Fájl:** `src/index.css` — dobj rá egy leheletnyi karaktert az `.empty` osztályra: kicsit nagyobb padding, és egy halvány ikon-hely (`.empty svg{width:32px;height:32px;color:#D1D5DB;margin-bottom:8px}`).
- Hozz létre egy kis `EmptyState` komponenst (`src/components/EmptyState.jsx`), ami egy ikont (props-ban átadható, pl. `ServiceIcon`) + szöveget renderel az `.empty` osztályon belül, és cseréld le vele a fenti 10 fül `<div className="empty">Nincs X.</div>` mintáit — a "Betöltés..." állapotnál elég egy egyszerű spinner (`.spin` CSS animáció, `border-radius:50%;border:2px solid #E5E7EB;border-top-color:var(--primary)`), nem kell ikon.
- A `.k-empty` (192. sor, kanban üres oszlop "Üres" szövege) és a `.pub-empty` (`BuybackFlow.jsx` 128. sor) is ugyanezt a mintát kapja.

---

## 5. Hover / mikroanimáció

**Megfigyelés:** a `.pub-card:hover{transform:translateY(-2px)}` (311–312. sor) él érzetet ad a publikus oldalon. Az admin kártyák (`.stk-card:hover`, 146–147. sor és `.t-card:hover`, 172–173. sor) csak `box-shadow`-t váltanak, nincs `transform` — ezért az admin "statikusabbnak" hat.

**Fájl:** `src/index.css`

Tennivaló:
- `.stk-card:hover` és `.t-card:hover` kapjon `transform:translateY(-1px)`-et is (finomabb, mint a publikusé, mert admin — ne legyen túl "játékos"), és tegyél rá `transition:transform .12s,box-shadow .12s,border-color .12s` -t a bázis (nem-hover) szabályra.
- `.statcard`-ra NE tegyél hover-effektet (azok nem kattinthatók, félrevezető lenne).

---

## 6. Mobil / pult-használat

**Probléma:** a `Telefonok` fülön már van lista/rács nézet-váltó (`ListViewIcon`/`GridViewIcon`, `src/tabs/StockTab.jsx`) — ez jó minta. A `Bevételek & Kiadások`, `Kliensek`, `Garancia` fülek viszont csak sima `<table>`-ek `.tw{overflow-x:auto}`-val — ez telefonon oldalra-görgetős, ami a pultnál kapkodva használva macerás.

**Fájl:** `src/index.css`, kb. 251–259. sor (a meglévő reszponzív breakpointok)

Tennivaló:
- 640px alatt vizsgáld meg, hogy a `Bevételek & Kiadások` (`FinanceTab.jsx`), `Kliensek` (`CustomersTab.jsx`) és `Garancia` (`WarrantyTab.jsx`) táblázatai kapjanak egy kártyás fallback nézetet (ugyanaz a minta, mint a `.t-card`/`.stk-card`), NE csak vízszintes scroll-t — legalább a leggyakrabban használt 2 oszlopot (név + összeg/dátum) emelje ki egy sorba, a többi másodlagos infó legyen alatta kisebb betűvel.
- Ez a legnagyobb falat a listából — ha időhiány van, ezt priorizáld a végére, a 0–5. pontok fontosabbak a "letisztultság" érzethez.

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- A logó és az app zöldje egymás mellett nézve pixel-pontosan egyezik
- Nincs színes emoji sehol az admin felületen (kereshető: `grep -rnP '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]' src`)
- Minden badge/címke (probléma-tag, garancia-tag, sub-status-tag) ugyanolyan pill-formájú
- A Dashboard, a Telefonok-kártyák és a publikus `/keszlet` kártyák azonos lekerekítéssel és árnyékkal néznek ki
- Üres állapotok (`.empty`, `.k-empty`, `.pub-empty`) mind az új, ikonos mintát használják
- Kanban és Telefonok-kártyák hoverkor finoman "megemelkednek"
- Nincs `git push`, csak lokális commit-ok, amíg nem szólnak
