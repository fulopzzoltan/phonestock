import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { TrashIcon } from "./icons";

export default function TicketPhotos({ ticketId }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  async function load() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("service_ticket_photos")
      .select("id, storage_path")
      .eq("service_ticket_id", ticketId)
      .order("created_at", { ascending: true });
    if (!err) setPhotos(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [ticketId]);

  function publicUrl(path) {
    return supabase.storage.from("product-photos").getPublicUrl(path).data.publicUrl;
  }

  async function handleFiles(e) {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      for (const file of files) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `ticket/${ticketId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("product-photos").upload(path, file, { contentType: file.type || "image/jpeg" });
        if (upErr) throw upErr;
        const { error: insErr } = await supabase.from("service_ticket_photos").insert({ service_ticket_id: ticketId, storage_path: path });
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
      await supabase.storage.from("product-photos").remove([photo.storage_path]);
      await supabase.from("service_ticket_photos").delete().eq("id", photo.id);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (err) {
      setError(err.message || "Hiba történt a törlés közben.");
    }
  }

  return (
    <div className="dp-section">
      <div className="dp-section-title">Állapotfotók (átvételkor)</div>
      {error && <div className="errbar">{error}</div>}
      {loading ? (
        <div style={{ fontSize: 12.5, color: "#9CA3AF" }}>Betöltés...</div>
      ) : (
        <div className="photo-grid">
          {photos.map((p) => (
            <div key={p.id} className="photo-thumb">
              <img src={publicUrl(p.storage_path)} alt="" />
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
