import { supabase } from "./supabaseClient";

// Kép átméretezése + WebP-tömörítése feltöltés előtt, a böngészőben (Canvas API).
// Nincs szükség szerver-oldali képfeldolgozásra.
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

// A "xxx.webp" teljes-méretű fotó útvonalából a "xxx_thumb.webp" kis méretű változat útvonala.
export function thumbPathOf(path) {
  return path.replace(/(\.\w+)$/, "_thumb$1");
}

// size="thumb" esetén a kis méretű változatot kéri le — régi, resize előtti fotóknál ennek
// nincs storage-objektuma, ezért a hívó oldalon <img onError> visszaeséssel kell a "full"-ra váltani.
export function photoUrl(path, size = "full") {
  const p = size === "thumb" ? thumbPathOf(path) : path;
  return supabase.storage.from("product-photos").getPublicUrl(p).data.publicUrl;
}
