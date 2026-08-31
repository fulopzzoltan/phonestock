# TASKS — "Rögzítve" (ma "Átvett") státusz alstátuszainak újragondolása

Kérés (idézve, mert elég tömör volt, itt a saját értelmezésem is, hogy egyeztessünk, mielőtt épül):

> "az beerkezett statusz legyen rogzitve megnevezesu és azon belül legyen az hogy: atvett, garancia, sajat, alkatreszre var és leadasra var — csak ezt a kettőt együtt is ki lehessen választani. a sima atvett az nem kell alkatresz és ott van a keszulek. a garanciális az visszahozták, viszont ott is kellene, hogy garanciális szerviz vagy értékesített telefon. az alkatrészre vár, akkor várjuk az alkatrészt, a készülék bent van. és ha készülékre vár, simán akkor van alkatrész, de a kliensnek nem volt jó [hogy behozza]. és ha a kettő együtt, az is érthető."

## 0. Amit ebből megértettem — így épült meg a terv

A mai "Átvett" főstátusz (a felületen "Beérkezett" néven fut) alstátuszai ma egy lapos lista: *Egyszerű átvétel / Garanciális / Alkatrészre vár* — egyszerre csak egy választható. Te ezt **két, egymástól független dimenzióra** bontanád szét:

1. **Mire várunk, hogy elkezdhessük a munkát** — ezt a kettőt lehessen **együtt** is jelölni:
   - **Alkatrészre vár** — a készülék nálunk van, de az alkatrész nincs meg
   - **Készülékre vár** ("leadásra vár") — az alkatrész megvan (vagy nem is kell), de a készülék még nincs nálunk, mert az ügyfélnek nem volt jó behozni
   - **Mindkettő** — se alkatrész, se készülék
   - **Egyik sem** — ez a "sima Átvett": nem kell alkatrész, a készülék itt van, mehet a munka
2. **Milyen jellegű az ügy** — ez egy külön címke, nem "mire várunk": **Garanciális**, és ha az, akkor azt is jelölni kell, hogy **garanciális szerviz** (egy általunk javított munka reklamációja) vagy **garanciális termék** (egy általunk eladott telefon garanciája).

A "saját" (amit felsoroltál) — ez **már ma is megvan**, csak nem a sub_status része, hanem egy külön mező (`ticket_kind`: "Saját készlet - előkészítés" / "Saját készlet - garanciális") — ezt nem kell újraépíteni, csak jelzem, hogy fedve van.

## 1. Egy fontos, már ismert hiba, amit ez a munka egyben kijavít

A `DashboardTab.jsx`-ben már ott áll egy saját magatoknak írt megjegyzés: *"Garanciálisok % egyelőre nem mérhető megbízhatóan: a 'Garanciális' jelölés státuszváltáskor törlődik, nem marad meg a munkalapon végig... ehhez egy külön, tartós mezőt kellene bevezetni."* — ez pontosan igaz: a `TicketFormModal.jsx`-ben főstátusz-váltáskor a sub_status mindig visszaáll az új főstátusz első opciójára (`SUB_STATUSES[key]?.[0]?.key`), és mivel "Garanciális" ma csak az "Átvett" alatt létező opció, amint a munkalap "Javítás alatt"-ba kerül, **elvész a garanciális jelölés**.

Emiatt a "garanciális szerviz / garanciális termék" jelölést **nem** a főstátusz-függő `sub_status` mezőbe teszem — hanem egy **külön, önálló, a teljes életúton megmaradó mezőbe**, ami pont ezt a régi hibát is megoldja.

## 2. Konkrét terv

### 2.1 "Mire várunk" — bővített `sub_status` lista, ÁTVETT alatt (nincs DB-migráció, a `sub_status` sima szöveg mező)

```js
// src/lib/utils.js
export const STATUSES = [
  { key: "Átvett", label: "Rögzítve", color: "#F59E0B", cls: "st-beveve" },  // csak a label változik, a key marad — nulla migrációs kockázat
  ...
];

export const SUB_STATUSES = {
  "Átvett": [
    { key: null, label: "Átvett", cls: "st-beveve" },
    { key: "Alkatrészre vár", label: "Alkatrészre vár", cls: "st-alkatresz" },
    { key: "Készülékre vár", label: "Készülékre vár", cls: "st-alkatresz" },
    { key: "Alkatrészre és készülékre vár", label: "Alkatrészre és készülékre vár", cls: "st-alkatresz" },
  ],
  ...
};
```

A "kettőt együtt is ki lehessen választani" igényt **nem** valódi többszörös kijelöléssel oldom meg (az egy nagyobb szerkezeti váltás lenne — checkbox-pár a mai egy-választós lista helyett), hanem azzal, hogy **a kombináció maga is egy önálló, kiválasztható opció** a listában — pontosan úgy működik, mint ma a "Sikertelen"/"Átadva" az "Átadásra" alatt: egy pultos szemével egyetlen kattintás, technikailag pedig ugyanaz az egyszerű `sub_status` mező marad, amit a rendszer többi része (SLA-számítás, kanban-oszlopok, riportok) már ismer.

### 2.2 "Milyen jellegű az ügy" — új, tartós mező, NEM a sub_status része

```sql
alter table service_tickets add column is_warranty boolean not null default false;
alter table service_tickets add column warranty_kind text check (warranty_kind in ('szerviz', 'termék'));
```

- `is_warranty = true` + `warranty_kind = 'szerviz'` → a munkalap egy korábbi, általunk végzett javítás reklamációja
- `is_warranty = true` + `warranty_kind = 'termék'` → egy általunk eladott telefon garanciájának érvényesítése
- Ez a két mező **bármelyik főstátuszban** látszik és állítható (nem csak "Átvett" alatt), és **nem törlődik** státuszváltáskor — így a `DashboardTab.jsx` garanciális-arány statisztikája végre megbízhatóan mérhető lesz, ahogy a kód már jelezte, hogy kellene.
- UI: a `TicketFormModal.jsx`-ben egy külön kapcsoló ("Garanciális ügy" checkbox + felbukkanó "Szerviz / Értékesített telefon" választó), a `TicketCard.jsx`/lista-nézetben pedig egy önálló, tartós badge (hasonlóan a mai "Saját — előkészítés"/"Saját — garanciális" `t-kind-pill`-hez, csak ez a "garanciális"-t jelöli, függetlenül attól, hogy a munkalap éppen melyik főstátuszban van).

### 2.3 "Saját" — nincs teendő

A `ticket_kind` mező már ma is pontosan ezt csinálja ("Saját készlet - előkészítés" / "Saját készlet - garanciális") — ez marad változatlan, csak megjegyzem, hogy ez a réteg már létezik, nehogy duplikáljuk.

## 3. Amit tisztázni kell

- **"Garanciális szerviz" ÉS "Alkatrészre vár" egyszerre?** — a 2.1/2.2 szétválasztás miatt ez magától megoldódik (a kettő független mező), tehát egy garanciális szerviz-ügy egyben lehet "Alkatrészre vár" állapotban is — ez volt-e a szándékod, vagy a garanciális ügyek mindig külön logikát követnek nálatok?
- **Meglévő munkalapok migrálása**: a ma `sub_status = 'Garanciális'` munkalapok automatikusan `is_warranty = true`-ra állnának — de a `warranty_kind`-ot (szerviz vagy termék) visszamenőleg nem tudja kitalálni a rendszer. Javaslat: migráláskor `warranty_kind = 'szerviz'` legyen az alapértelmezés (mert a régi "Garanciális" jelölés eddig is jellemzően ügyfél-szervizhez kötődött, nem eladott telefonhoz — ha ez nem stimmel, jelezd), és a régi tételeket egyszer át lehet nézni, ha fontos a pontosság.
- **Badge-elrendezés**: a `TicketCard.jsx`-en már van egy "Saját" pill és egy SLA-badge is — belefér-e vizuálisan egy harmadik, "Garanciális" badge is anélkül, hogy zsúfolt legyen a kártya, vagy inkább egyben jelenjen meg a "Saját"-tal egy közös "címke-sorban"?

---

## Ellenőrzőlista implementálás után

- "Átvett" főstátusz felirata "Rögzítve"-re változik, a belső `key` nem változik (nincs adat-migráció emiatt)
- "Átvett" alstátusz-lista: Átvett / Alkatrészre vár / Készülékre vár / Alkatrészre és készülékre vár
- Új, önálló `is_warranty`/`warranty_kind` mező — bármelyik főstátuszban látszik és állítható, státuszváltáskor NEM törlődik
- `TicketFormModal.jsx` garanciális kapcsolója és a `TicketCard.jsx`/lista badge frissítve
- `DashboardTab.jsx` garanciális-arány statisztika a megbízható, tartós mezőt használja (a mai figyelmeztető szöveg törölhető)
- Meglévő `sub_status='Garanciális'` munkalapok migrálva `is_warranty=true`-ra
- `npm run build` hibamentes
- Nincs `git push`, csak lokális commit
