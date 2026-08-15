Egy meglévő React + Vite webalkalmazás (PhoneStock) újratervezését szeretném — csak a vizuális dizájnt, a funkciókat nem.

KONTEXTUS
Ez egy belső, bejelentkezős kezelő szoftver egy két telephelyes telefonos üzlet (Gyimes és Szentgyörgy) számára. Napi szinten alkalmazottak és az admin használja géptől/tablettől, nem ügyfelek. A cél egy modern, letisztult, "profi SaaS dashboard" hangulat — gondolj Linear, Stripe Dashboard vagy Notion stílusú letisztultságra, ne "startup landing page" színes-hangulatos dizájnra.

JELENLEGI FELÉPÍTÉS (ezt tartsd meg, csak vizuálisan alakítsd újra)
- Bal oldali fix sidebar navigáció, ikonokkal: 📊 Áttekintés, 🔧 Szerviz, 📱 Telefonok, 🔩 Alkatrészek, 💰 Bevételek & Kiadások, 👤 Kliensek, 🛡️ Garanciális, 👥 Felhasználók (csak admin), 🗑️ Kuka
- Fejlécben helyszín-váltó (Gyimes / Szentgyörgy / Mindkettő)
- Dashboard: statisztika-kártyák rácsban (Készlet értéke, Bevétel, Szerviz aktív munkalapok száma, stb.) + egy grafikon (készletérték idővonal)
- Táblázatos listák (telefonok, alkatrészek, tranzakciók) sorválasztással, oldalsó/modális részletpanellel
- Modálok űrlapokhoz (új telefon felvétele, eladás rögzítése, szerviz munkalap létrehozása, tranzakció hozzáadása)
- Munkalap-kártyák (TicketCard) 3 fő státusszal: Átvett / Javítás alatt / Átadásra, és almatricákkal (pl. Garanciális, Alkatrészre vár, Sikertelen, Átadva)
- Nyomtatható garanciajegy/bizonylat sablon (ezt hagyd egyszerű, nyomtatásbarát feketén-fehéren)

STACK MEGKÖTÉS
- Sima React + kézzel írt CSS, NINCS Tailwind, NINCS UI-könyvtár (MUI, shadcn, stb.) — a kimenetnek is ilyennek kell lennie: tiszta CSS class-ok (BEM-szerű vagy egyszerű kebab-case névkonvenció), hogy be tudjam illeszteni a meglévő src/index.css-be
- Ne generálj új komponens-struktúrát, csak CSS-t / class-neveket / design tokeneket (színek, spacing, radius, árnyék, tipográfia) adj, amit át tudok ültetni

DESIGN IGÉNYEK
- Világos téma, letisztult, sok fehér tér, halvány szürke háttér a fő felületen, fehér kártyák enyhe árnyékkal
- Egy jól megválasztott elsődleges szín (pl. mély kék vagy indigó) a gombokhoz, aktív navigációs elemekhez, linkekhez — a bevétel/pozitív értékek zöldek, kiadás/negatív piros, figyelmeztetés sárga/narancs maradjon (jelenlegi szemantika)
- Modern, jól olvasható tipográfia (system font stack vagy Inter), egyértelmű vizuális hierarchia a számok/statisztikák kiemelésére
- Kártyák, gombok, input mezők legyenek konzisztensek: egységes border-radius, padding, hover/active állapotok
- Reszponzív ne legyen prioritás (asztali/tablet használat a fő eset), de ne törjön el kisebb ablaknál se

MIT KÉREK TŐLED
1. Egy rövid design-koncepció leírás (színpaletta hex kódokkal, betűtípus, spacing-skála)
2. Konkrét CSS változtatási javaslatok a fő elemekre: sidebar, navbar gombok, statisztika-kártyák (.statcard), táblázatok, gombok (.btn variánsok), modálok, badge-ek/címkék (.badge-*)
3. Ha van rá mód, adj egy önálló, másolható CSS blokkot (:root CSS custom properties + a fő class-ok), amit be tudok illeszteni a projektbe
