# TASKS — SEO + GEO (AI-kereshetőség) + kétnyelvűség (HU/RO) a publikus oldalakon

**Kontextus:** ez a feladat a publikus webshop-felületet (`/keszlet`, a `TASKS_WEBSHOP.md`-ben leírt `/telefon/:id`, a `TASKS_SZERVIZ_ARBECSLO.md`-ben leírt `/becsles`) alapozza meg SEO és GEO (Generative Engine Optimization — hogy AI-alapú keresések, pl. ChatGPT/Perplexity is megtaláljanak minket) szempontból, **és** bevezeti a kétnyelvűséget (magyar + román).

**Miért most, és miért ez a két dolog együtt:**
1. **Igazolt technikai tény (2026-08-14-i kutatás):** a GPTBot, ClaudeBot, PerplexityBot és a többi AI-crawler **nem futtat JavaScript-et** — csak a nyers HTML-t nézi. A jelenlegi React SPA HTML-je üres (`<div id="root"></div>`), a telefonok csak JS-sel töltődnek be. Ez azt jelenti: **jelenleg egyetlen AI-crawler sem lát semmit a vitrinből.** Ez a legfontosabb, mindent megelőző pont ebben a feladatban.
2. **Románia lakosságának nagy része románul keres**, Székelyföldön kívülről és sokszor belülről is. A magyar-only tartalom ezt a keresési felületet teljesen kihagyja. Mivel a `PhoneDetail.jsx` és a `RepairEstimator.jsx` MÉG NINCS megírva (csak specifikálva a másik két TASKS fájlban), most van itt az ideje beépíteni a kétnyelvűséget — utólag sokkal több munka lenne.

**Fontos, amit NEM fordítunk le:** a belső admin-felület (`src/App.jsx` és minden komponense) marad magyar — az a személyzetnek szól, nincs SEO-értéke. Csak a publikus, bejelentkezés nélküli oldalak kapnak román verziót.

Ne pusholj / ne deployolj, csak lokális commit, amíg nem szólnak.

---

## 1. i18n alap — `src/lib/i18n.js`

Nem kell hozzá nagy könyvtár (pl. `react-i18next`) — a publikus felület szövegfelülete kicsi és zárt, egy egyszerű szótár-objektum elég, és illik a kódbázis jelenlegi stílusához (kevés függőség, kézzel írt CSS).

```js
export const STRINGS = {
  hu: {
    navStock: "Készlet", navStatus: "Szerviz / vásárlás státusz", navLogin: "Bejelentkezés",
    searchPlaceholder: "Keresés — pl. iPhone 13, Samsung A07...",
    allBrands: "Minden márka", allConditions: "Összes állapot",
    conditionNew: "Új", conditionRefurb: "Felújított",
    sortPriceAsc: "Ár: olcsóbb elöl", sortPriceDesc: "Ár: drágább elöl", sortBrand: "Márka szerint",
    resultsCount: (n) => `${n} telefon készleten`,
    loading: "Betöltés...", noResults: "Nincs találat a szűrésre — próbálj más márkát vagy keresőszót.",
    warrantyTag: (w) => `${w} garancia`, interested: "Érdekel",
    footer: "Telefonos — az árak és a raktárkészlet folyamatosan frissülnek, végleges ár a szervizben/üzletben.",
    scarcity: "Utolsó darab", saveLabel: (n) => `Spórolsz ${n} Lei`,
    backToStock: "Vissza a készlethez", soldOut: "Ez a darab már elkelt, vagy nem található.",
  },
  ro: {
    navStock: "Telefoane", navStatus: "Stare service / achiziție", navLogin: "Autentificare",
    searchPlaceholder: "Căutare — ex. iPhone 13, Samsung A07...",
    allBrands: "Toate mărcile", allConditions: "Toate stările",
    conditionNew: "Nou", conditionRefurb: "Recondiționat",
    sortPriceAsc: "Preț: crescător", sortPriceDesc: "Preț: descrescător", sortBrand: "După marcă",
    resultsCount: (n) => `${n} telefoane în stoc`,
    loading: "Se încarcă...", noResults: "Niciun rezultat — încearcă altă marcă sau alt cuvânt cheie.",
    warrantyTag: (w) => `garanție ${w}`, interested: "Sunt interesat",
    footer: "Telefonos — prețurile și stocul se actualizează constant, prețul final se stabilește în magazin/service.",
    scarcity: "Ultima bucată", saveLabel: (n) => `Economisești ${n} Lei`,
    backToStock: "Înapoi la stoc", soldOut: "Această bucată s-a vândut deja sau nu a fost găsită.",
  },
};
export const t = (lang) => STRINGS[lang] || STRINGS.hu;
```

**Fontos:** ezek a fordítások szolgálati/UI-szövegek, rendes fordítási munkával készültek, de **mielőtt élesítitek, nézesd át egy román anyanyelvűvel** — különösen a marketingesebb szövegeket (footer, garanciajegy-szövegek), az UI-gombokat (Keresés/Szűrés stb.) valószínűleg rendben vannak.

---

## 2. Routing bővítés — `src/main.jsx`

A meglévő regex-alapú routing mellé (ld. jelenlegi `stockMatch`/`statusMatch` minta) egy `/ro` előtaggal tükrözött útvonal-készlet, **nem törve a meglévő magyar útvonalakat**:

```js
const roStockMatch = window.location.pathname.match(/^\/ro\/telefoane\/?$/i);
const roPhoneDetailMatch = window.location.pathname.match(/^\/ro\/telefon\/([0-9a-f-]{36})\/?$/i);
const roRepairMatch = window.location.pathname.match(/^\/ro\/estimare\/?$/i);
```
```jsx
if (roStockMatch) return <StockShowcase lang="ro" />;
if (roPhoneDetailMatch) return <PhoneDetail id={roPhoneDetailMatch[1]} lang="ro" />;
if (roRepairMatch) return <RepairEstimator lang="ro" />;
```
(a meglévő `stockMatch`/`phoneDetailMatch`/`repairMatch` ágak `lang="hu"`-t adjanak át explicit — ne maradjon defaultra bízva, mert a hreflang-hoz és a JSON-LD `inLanguage`-hez is kell tudni pontosan, melyik nyelven vagyunk).

A `/status` és `/receipt` oldalakat **egyelőre hagyd magyarul** — meglévő ügyfél használja őket, nem új-ügyfél-szerzésre valók, alacsony SEO-érték. Ha később mégis kell, ugyanez a minta bővíthető rájuk.

---

## 3. `StockShowcase.jsx` átalakítása

**Fájl:** `src/StockShowcase.jsx` — fogadjon `lang` propot (`export default function StockShowcase({ lang = "hu" })`), importálja a `t` függvényt (`import { t } from "./lib/i18n"`), a komponens tetején `const s = t(lang);`, majd minden hardkódolt magyar string helyett `s.xxx`. Pl.:
```jsx
<a className="pub-nav-link active" href={lang === "ro" ? "/ro/telefoane" : "/"}>{s.navStock}</a>
<a className="pub-nav-link" href={lang === "ro" ? "/status" : "/status"}>{s.navStatus}</a>
```
A keresőmező placeholder, a chip-feliratok ("Minden márka", "Összes állapot", "Új"/"Felújított"), a rendezés-select opciói, a "X telefon készleten" szám, az "Érdekel" gomb, a footer szöveg — mind `s.`-ből jöjjön, ne hardkódolva.

**Nyelv-váltó gomb** a fejlécben, a `pub-nav` végén:
```jsx
<a className="pub-nav-link pub-lang-switch" href={lang === "ro" ? "/keszlet" : "/ro/telefoane"}>{lang === "ro" ? "HU" : "RO"}</a>
```
(egyszerű link a másik nyelvű megfelelő oldalra — nem automata átirányítás, a felhasználó dönt.)

---

## 4. `PhoneDetail.jsx` és `RepairEstimator.jsx` — i18n bevezetése MÁR ÍRÁSKOR

Ez a két fájl a `TASKS_WEBSHOP.md`, illetve a `TASKS_SZERVIZ_ARBECSLO.md` alapján készül el — **azoknál a specifikációknál built-in HU stringek vannak leírva vázlatként.** Amikor ezeket megírod, ne szó szerint azt a HU szöveget hardkódold bele, hanem ugyanígy `lang` prop + `t(lang)` mintával, a fenti `STRINGS` szótárat bővítve a szükséges kulcsokkal (pl. `deviceSpecs`, `warrantyLabel`, `estimateProblemLabels` stb. — nézd át mindkét fájl JSX-vázlatát, és minden felhasználó felé mutatkozó szöveghez adj HU+RO párt a szótárba).

---

## 5. SEO meta-tagek + hreflang

Telepítsd a `react-helmet-async`-ot (`npm install react-helmet-async`) — ez teszi lehetővé, hogy React komponensekből dinamikusan írjunk `<title>`/`<meta>`/`<link>` tageket a `<head>`-be, oldalanként és nyelvenként eltérőt.

**Fájl:** `src/main.jsx` — csomagold be a publikus route-okat `<HelmetProvider>`-be.

**Fájl:** `src/StockShowcase.jsx` (és a másik két oldal) — a komponens tetején:
```jsx
import { Helmet } from "react-helmet-async";
...
<Helmet>
  <title>{lang === "ro" ? "Telefoane second-hand și noi — Telefonos" : "Használt és új telefonok — Telefonos"}</title>
  <meta name="description" content={lang === "ro"
    ? "Telefoane recondiționate și noi, verificate, cu garanție, în Ghimeș și Sfântu Gheorghe."
    : "Felújított és új telefonok, garanciával, Gyimesben és Szentgyörgyön."} />
  <link rel="canonical" href={`https://phonestock-manager.netlify.app${lang === "ro" ? "/ro/telefoane" : "/keszlet"}`} />
  <link rel="alternate" hrefLang="hu" href="https://phonestock-manager.netlify.app/keszlet" />
  <link rel="alternate" hrefLang="ro" href="https://phonestock-manager.netlify.app/ro/telefoane" />
  <link rel="alternate" hrefLang="x-default" href="https://phonestock-manager.netlify.app/keszlet" />
  <meta property="og:title" content={lang === "ro" ? "Telefoane second-hand și noi — Telefonos" : "Használt és új telefonok — Telefonos"} />
  <meta property="og:type" content="website" />
</Helmet>
```
A `PhoneDetail.jsx`-nél a title/description legyen az adott telefon adataiból generált (pl. `"iPhone 13 128GB, Excelent — 1379 Lei | Telefonos"`), ne statikus.

**Megjegyzés a valós domainről:** a fenti `phonestock-manager.netlify.app` a jelenlegi Netlify-domain — ha valaha saját domain kerül elé, itt (és a sitemap/robots.txt-ben, 8–9. pont) ezt frissíteni kell.

---

## 6. JSON-LD strukturált adat

**Fájl:** `src/StockShowcase.jsx` — a `<Helmet>` blokkba egy `<script type="application/ld+json">` a boltokról (`LocalBusiness`):
```jsx
<script type="application/ld+json">{JSON.stringify({
  "@context": "https://schema.org", "@type": "ElectronicsStore",
  "name": "Telefonos", "priceRange": "$$",
  "inLanguage": lang,
  // FONTOS: a cím/nyitvatartás/pontos telefonszám VALÓS adat kell legyen — ezt add meg te, ne találja ki a kód
  "address": [
    { "@type": "PostalAddress", "addressLocality": "Ghimeș", "addressRegion": "Harghita", "addressCountry": "RO" },
    { "@type": "PostalAddress", "addressLocality": "Sfântu Gheorghe", "addressRegion": "Covasna", "addressCountry": "RO" },
  ],
})}</script>
```

**Fájl:** `src/PhoneDetail.jsx` — minden telefonhoz `Product` séma:
```jsx
<script type="application/ld+json">{JSON.stringify({
  "@context": "https://schema.org", "@type": "Product",
  "name": `${phone.brand} ${phone.model}`,
  "itemCondition": phone.condition === "New" ? "https://schema.org/NewCondition" : "https://schema.org/RefurbishedCondition",
  "offers": { "@type": "Offer", "price": phone.sale_price, "priceCurrency": "RON", "availability": "https://schema.org/InStock" },
})}</script>
```

**Ki kell töltened (nem találhatom ki):** a `PostalAddress` pontos utca/házszám, a `openingHours`, és ha van, a pontos publikus telefonszám boltonként — ezek valós, a tulajdonos által megadott adatok kellenek, ahogy a garanciaszövegnél is.

---

## 7. `robots.txt`

**Új fájl:** `public/robots.txt`:
```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /status
Disallow: /receipt

User-agent: GPTBot
Allow: /keszlet
Allow: /ro/telefoane
Allow: /telefon/
Allow: /ro/telefon/
Allow: /becsles
Allow: /ro/estimare

User-agent: ClaudeBot
Allow: /keszlet
Allow: /ro/telefoane
Allow: /telefon/
Allow: /ro/telefon/
Allow: /becsles
Allow: /ro/estimare

User-agent: PerplexityBot
Allow: /

Sitemap: https://phonestock-manager.netlify.app/sitemap.xml
```
(A `/status` és `/receipt` tiltása nem biztonsági kérdés — azok amúgy is csak token-alapú security-definer RPC-n át érnek el adatot — hanem SEO-tisztaság: ne induljon crawl-büdzsé alacsony-értékű, egyedi ügyfélnek szóló oldalakra.)

---

## 8. `sitemap.xml` — dinamikusan generálva

Mivel a készlet naponta többször változik, egy build-időben legenerált statikus sitemap gyorsan elavulna (és a repóban a "ne pusholj/deployolj magadtól" szabály miatt a build ritkán fut újra). Ehelyett egy **Supabase Edge Function** (`sitemap`, a meglévő `send-sms` mintájára), ami élőben lekéri a `get_public_stock()`-ot és legenerálja az XML-t minden kéréskor:

```ts
// supabase/functions/sitemap/index.ts (vázlat)
Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: phones } = await supabase.rpc("get_public_stock");
  const base = "https://phonestock-manager.netlify.app";
  const staticUrls = [
    { hu: `${base}/keszlet`, ro: `${base}/ro/telefoane` },
    { hu: `${base}/becsles`, ro: `${base}/ro/estimare` },
  ];
  let urls = staticUrls.map(u => `<url><loc>${u.hu}</loc><xhtml:link rel="alternate" hreflang="ro" href="${u.ro}"/></url>`).join("");
  urls += (phones || []).map(p =>
    `<url><loc>${base}/telefon/${p.id}</loc><xhtml:link rel="alternate" hreflang="ro" href="${base}/ro/telefon/${p.id}"/></url>`
  ).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
});
```
A `netlify.toml`-ban adj egy redirect-szabályt, hogy a `/sitemap.xml` erre a function-re mutasson:
```toml
[[redirects]]
  from = "/sitemap.xml"
  to = "https://aaiyyhskvxjqfhrgoulh.supabase.co/functions/v1/sitemap"
  status = 200
```

---

## 9. `llms.txt`

**Új fájl:** `public/llms.txt` — ez egy egyszerű, géppel jól olvasható Markdown-összefoglaló az oldalról, amit egyre több AI-rendszer néz meg direktben (a `robots.txt` mintájára, a gyökérben). Kétnyelvű, egy fájlban:

```markdown
# Telefonos

Second-hand and new phone shop with repair service, two locations in Harghita/Covasna, Romania (Ghimeș, Sfântu Gheorghe).
Bolt használt és új telefonokra, szervizzel, két helyszínen (Gyimes, Szentgyörgy).

## Pages / Oldalak
- Stock / Készlet: /keszlet (HU), /ro/telefoane (RO) — live phone inventory with prices, condition, warranty
- Repair estimate / Szerviz árbecslő: /becsles (HU), /ro/estimare (RO) — instant repair pricing for common issues
- Repair/purchase status lookup: /status, /receipt — existing customers only

## Business
- Two-year+ operating history, in-house repair service
- Warranty on all sales and repairs
- [ITT ADD MEG: pontos cím, nyitvatartás, telefonszám mindkét helyszínre]
```

**Ezt is ki kell töltened a valós adatokkal** (cím, nyitvatartás, telefonszám) — nem találhatom ki.

---

## 10. Prerendering — AI/keresőbotoknak renderelt HTML

**Ez a legfontosabb lépés, enélkül a fentiek nagy része nem ér célt** (a botok simán nem futtatnak JS-t, tehát a fenti Helmet/JSON-LD/meta-tagek sosem jutnak el hozzájuk kódból generálva).

2026-tól a Netlify a régi beépített prerendering helyett egy **Prerender extension**-t kínál (Prerender.io-integráció, minden csomagban elérhető, ingyenesen is), ami edge function-nel ismeri fel a bot user-agenteket, és egy headless Chromite-tal renderelt HTML-t ad vissza nekik — a valódi látogatók változatlanul a sima SPA-t kapják.

**Ehhez nem kell kódot írni**, hanem:
1. Netlify Dashboard → Extensions → keresd meg a "Prerender" extension-t, telepítsd a phonestock site-ra.
2. Regisztrálj egy Prerender.io fiókot, kösd össze a tokent az extension beállításaiban.
3. Ellenőrizd a Prerender.io saját díjszabását (van ingyenes szint kis oldalméretre, de nézd meg a jelenlegi limiteket, mert ez időben változhat) — ez a lépés a Netlify-fiókodból végezhető, nem kódmódosítás.
4. Teszteld: `curl -A "GPTBot" https://phonestock-manager.netlify.app/keszlet` — a válasznak tartalmaznia kell a telefonok listáját HTML-ben, nem üres `<div id="root">`-ot.

---

## Ellenőrzőlista implementálás után

- `curl -A "GPTBot" .../keszlet` és `.../ro/telefoane` is tényleges tartalmat ad vissza, nem üres HTML-shell-t
- A nyelv-váltó gomb működik mindhárom publikus oldalon, és a helyes párra visz
- `view-source:` -ban látszik az oldalankénti egyedi `<title>`, meta description, hreflang linkek, JSON-LD script
- `/robots.txt` és `/sitemap.xml` élesben elérhető és helyes tartalmat ad
- `/llms.txt` elérhető, és a valós cím/nyitvatartás adatokkal van kitöltve (nem placeholder)
- A `PhoneDetail.jsx` és `RepairEstimator.jsx` (amikor megírásra kerülnek) az `i18n.js` szótárt használják, nem hardkódolt HU szöveget
- Egy román anyanyelvű átnézte a RO szövegeket élesítés előtt
