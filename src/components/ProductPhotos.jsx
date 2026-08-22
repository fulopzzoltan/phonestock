import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { resizeImage, thumbPathOf, photoUrl, THUMB_MAX, FULL_MAX } from "../lib/imageResize";
import { TrashIcon } from "./icons";

export default function ProductPhotos({ productId }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  async function load() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("product_photos")
      .select("id, storage_path")
      .eq("product_id", productId)
      .order("created_at", { ascending: true });
    if (!err) setPhotos(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [productId]);

  async function handleFiles(e) {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      for (const file of files) {
        const base = crypto.randomUUID();
        const fullPath = `${productId}/${base}.webp`;
        const thumbPath = `${productId}/${base}_thumb.webp`;
        const [fullBlob, thumbBlob] = await Promise.all([
          resizeImage(file, FULL_MAX, 0.85),
          resizeImage(file, THUMB_MAX, 0.75),
        ]);
        const { error: upErr } = await supabase.storage.from("product-photos").upload(fullPath, fullBlob, { contentType: "image/webp" });
        if (upErr) throw upErr;
        const { error: upThumbErr } = await supabase.storage.from("product-photos").upload(thumbPath, thumbBlob, { contentType: "image/webp" });
        if (upThumbErr) throw upThumbErr;
        const { error: insErr } = await supabase.from("product_photos").insert({ product_id: productId, storage_path: fullPath });
        if (insErr) throw insErr;
      }
      await load();
    } catch (err) {
      setError(err.message || "Hiba történt a feltöltés közben.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(photo) {
    setError("");
    try {
      await supabase.storage.from("product-photos").remove([photo.storage_path, thumbPathOf(photo.storage_path)]);
      await supabase.from("product_photos").delete().eq("id", photo.id);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (err) {
      setError(err.message || "Hiba történt a törlés közben.");
    }
  }

  return (
    <div className="dp-section">
      <div className="dp-section-title">Fotók</div>
      {error && <div className="errbar">{error}</div>}
      {loading ? (
        <div style={{ fontSize: 12.5, color: "#9CA3AF" }}>Betöltés...</div>
      ) : (
        <div className="photo-grid">
          {photos.map((p) => (
            <div key={p.id} className="photo-thumb">
              <img src={photoUrl(p.storage_path, "thumb")} alt="" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = photoUrl(p.storage_path, "full"); }} />
              <button type="button" className="photo-thumb-del" onClick={() => handleDelete(p)} title="Törlés">
                <TrashIcon width={13} height={13} />
              </button>
            </div>
          ))}
          <button type="button" className="photo-add-btn" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? "Feltöltés..." : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>Fotó készítése</span>
              </>
            )}
          </button>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple style={{ display: "none" }} onChange={handleFiles} />
    </div>
  );
}
