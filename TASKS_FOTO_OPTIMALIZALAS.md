# TASKS — Fotó-feltöltés optimalizálása (kliens-oldali resize, gyors webshop-betöltés)

## 0. A jelenlegi probléma — kód alapján

Megnéztem a `src/components/ProductPhotos.jsx`-t: a `handleFiles()` (29-50. sor) a kiválasztott/lefotózott fájlt **változtatás nélkül, teljes kamera-felbontásban** tölti fel a `product-photos` Supabase Storage bucketbe (`upload(path, file, ...)`, 39. sor), majd a `product_photos` táblába kerül a `storage_path`. Nincs se resize, se tömörítés, se több méret.

A publikus webshop (`StockShowcase.jsx` rácsnézete, `PhoneDetail.jsx` galériája) ugyanezt a fájlt tölti be `photoUrl()`-lal, **listaoldalon is** — vagyis egy 20 kártyás rácsnézet akár 20× 3-8 MB-os telefonkamera-fotót tölt le, ez adja a lassú betöltést. Nincs Supabase Image Transformations sem bekapcsolva (az egyébként is csak Pro csomagtól felfelé elérhető funkció — ha már Pro-n vagytok, az egy alternatíva, de a lenti megoldás csomagtól függetlenül működik, és a tárhelyet is kíméli, mert eleve kisebb fájl kerül fel).

## 1. Megoldás: kliens-oldali resize feltöltés előtt, két méretben

Új megosztott segédfájl: **`src/lib/imageResize.js`**

```js
// Kép átméretezése + WebP-tömörítése feltöltés előtt, a böngészőben (Canvas API).
// Nincs szükség szerver-oldali képfeldolgozásra — ugyanaz az elv, mint a PDF-rendelés
// import kliens-oldali feldolgozásánál (pdfjs-dist), nem kell külön backend.
export function resizeImage(file, maxDim, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
      else if (height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim; }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => { URL.revokeObjectURL(url); blob ? resolve(blob) : reject(new Error("Kép feldolgozása sikertelen.")); }, "image/webp", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Kép betöltése sikertelen.")); };
    img.src = url;
  });
}

export const THUMB_MAX = 480;   // listaoldali kártya-fotó
export const FULL_MAX = 1600;   // terméklap fő fotó / galéria
```
WebP-t választunk (nem JPEG-et) — minden mai böngésző (Safari is, iOS 14+ óta) támogatja, és 25-35%-kal kisebb ugyanolyan minőségnél.

## 2. `ProductPhotos.jsx` módosítása — mindkét méret feltöltése

A `handleFiles()` (29-50. sor) így módosul: minden kiválasztott fájlból **két** blob készül (`resizeImage(file, THUMB_MAX, 0.75)` és `resizeImage(file, FULL_MAX, 0.85)`), és mindkettő felkerül, ugyanazzal az alap-UUID-vel, `_thumb` utótaggal megkülönböztetve:

```js
const base = crypto.randomUUID();
const fullPath = `${productId}/${base}.webp`;
const thumbPath = `${productId}/${base}_thumb.webp`;
const [fullBlob, thumbBlob] = await Promise.all([
  resizeImage(file, FULL_MAX, 0.85),
  resizeImage(file, THUMB_MAX, 0.75),
]);
await supabase.storage.from("product-photos").upload(fullPath, fullBlob, { contentType: "image/webp" });
await supabase.storage.from("product-photos").upload(thumbPath, thumbBlob, { contentType: "image/webp" });
await supabase.from("product_photos").insert({ product_id: productId, storage_path: fullPath });
```
**Nincs DB-séma változás** — a `product_photos.storage_path` továbbra is a teljes-méretű kép útvonalát tárolja, a thumb-változat a fájlnév-konvencióból (`_thumb` utótag a kiterjesztés előtt) derül, nem külön mezőből.

## 3. `photoUrl()` helper bővítése — méret-paraméterrel, biztonságos visszaeséssel

`StockShowcase.jsx`, `PhoneDetail.jsx`, `ProductPhotos.jsx` mindegyikében ugyanaz a minta (`photoUrl(path)`/`publicUrl(path)`) — közösítsd `src/lib/imageResize.js`-be (vagy egy meglévő lib-fájlba):

```js
export function photoUrl(path, size = "full") {
  const p = size === "thumb" ? path.replace(/(\.\w+)$/, "_thumb$1") : path;
  return supabase.storage.from("product-photos").getPublicUrl(p).data.publicUrl;
}
```
A **régi, még resize előtt feltöltött fotóknak nincs `_thumb` változatuk** — ezért az `<img>`-eken tegyél `onError` fallbackot, ami sikertelen thumb-betöltéskor visszavált a teljes méretre:
```jsx
<img src={photoUrl(path, "thumb")} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = photoUrl(path, "full"); }} loading="lazy" decoding="async" alt="..." />
```
Így a régi képeknél nincs törés (csak lassabban töltenek, amíg újra nem fotózzák őket), az újaknál pedig azonnal a kis méret jön be.

## 4. Hol melyik méret kell

- **`StockShowcase.jsx` rácsnézet** (`pub-device-photo`) → `photoUrl(p.photo_paths[0], "thumb")`
- **`PhoneDetail.jsx` fő kép** → `photoUrl(photos[activePhoto], "full")`
- **`PhoneDetail.jsx` galéria-csík (kis előnézetek)** → `photoUrl(ph, "thumb")`
- **`ProductPhotos.jsx` admin-oldali rácsnézet** → `photoUrl(p.storage_path, "thumb")` (staff sem tölt le feleslegesen nagy képet, ha csak áttekint egy listát)

## 5. Extra, gyakorlatilag ingyen performancia-nyerés

Minden publikus `<img>`-re: `loading="lazy" decoding="async"`, és ha ismert az arány, `width`/`height` attribútum (elkerüli a lapugrálást betöltés közben — CLS). Natív böngésző-funkció, nem kell hozzá könyvtár.

## 6. Régi, már feltöltött fotók — opcionális utólagos pótlás

Nem kötelező azonnal megoldani (a 3. pont `onError`-fallbackja miatt semmi nem törik el), de ha szeretnéd, egy egyszeri script végigmehet a meglévő `product_photos` sorokon, letölti az eredetit, legyártja hozzá a `_thumb` változatot, visszatölti — utána minden régi fotó is gyorsan töltődik. Ezt külön kérésre dolgozom ki, ha kell.

---

## Ellenőrzőlista implementálás után

- `npm run build` hibamentes
- Új fotó feltöltésekor mindkét méret (`xxx.webp` + `xxx_thumb.webp`) bekerül a Storage-ba
- Webshop listaoldal a kis méretet tölti be (DevTools Network fülön ellenőrizhető: fotónként ~30-60 KB, nem több MB)
- Terméklap fő képe a nagy méretet tölti be, de az is WebP-tömörített, nem nyers kamera-fájl
- Régi (resize előtti) fotóknál nincs törött kép — `onError` visszavált a teljes méretre
- Nincs `git push`, csak lokális commit
