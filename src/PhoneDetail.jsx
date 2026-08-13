import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";

const deviceSvg = (
  <svg viewBox="0 0 40 64" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="2" y="2" width="36" height="60" rx="7" />
    <line x1="15" y1="56" x2="25" y2="56" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

function photoUrl(path) {
  return supabase.storage.from("product-photos").getPublicUrl(path).data.publicUrl;
}

export default function PhoneDetail({ id }) {
  const [phone, setPhone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_public_stock");
      setPhone((data || []).find((p) => p.id === id) || null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="pub-shop">
        <PublicHeader activeNav="stock" />
        <div className="pub-empty">Betöltés...</div>
        <PublicFooter />
      </div>
    );
  }
  if (!phone) {
    return (
      <div className="pub-shop">
        <PublicHeader activeNav="stock" />
        <div className="pub-empty">Ez a darab már elkelt, vagy nem található.<br /><a href="/" className="pub-ask-btn" style={{ marginTop: 12 }}>Vissza a készlethez</a></div>
        <PublicFooter />
      </div>
    );
  }

  const photos = phone.photo_paths || [];

  return (
    <div className="pub-shop">
      <PublicHeader activeNav="stock" />
      <main className="pub-detail-main">
        <a href="/" className="pub-back-link">← Vissza a készlethez</a>
        <div className="pub-detail-grid">
          <div className="pub-detail-gallery">
            <div className="pub-detail-photo-main">
              {photos.length > 0 ? <img src={photoUrl(photos[activePhoto])} alt={`${phone.brand} ${phone.model}`} /> : <div className="pub-device-art" style={{ height: 320, width: "100%" }}>{deviceSvg}</div>}
            </div>
            {photos.length > 1 && (
              <div className="pub-detail-thumbs">
                {photos.map((ph, i) => (
                  <button key={i} type="button" className={`pub-detail-thumb${i === activePhoto ? " active" : ""}`} onClick={() => setActivePhoto(i)}>
                    <img src={photoUrl(ph)} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="pub-detail-info">
            <span className={`pub-cond-pill ${phone.condition === "New" ? "new" : "refurb"}`}>{phone.condition === "New" ? "Új" : "Felújított"}</span>
            <h1 className="pub-detail-title">{phone.brand} {phone.model}</h1>
            <div className="pub-detail-specs">
              {phone.storage && <div><b>Tárhely</b> {phone.storage}</div>}
              {phone.color && <div><b>Szín</b> {phone.color}</div>}
              {phone.battery_health != null && <div><b>Akkumulátor</b> {phone.battery_health}%</div>}
              {phone.warranty && <div><b>Garancia</b> {phone.warranty}</div>}
            </div>
            {phone.new_price && Number(phone.new_price) > Number(phone.sale_price) && (
              <div className="pub-anchor" style={{ fontSize: 14 }}>
                <span className="pub-anchor-old">{Number(phone.new_price).toLocaleString("hu-HU")} Lei</span>
                <span className="pub-anchor-save">Spórolsz {Math.round(phone.new_price - phone.sale_price).toLocaleString("hu-HU")} Lei</span>
              </div>
            )}
            <div className="pub-detail-price mono">{Number(phone.sale_price).toLocaleString("hu-HU")}<span className="pub-cur">Lei</span></div>
            <a className="pub-ask-btn" style={{ padding: "13px 22px", fontSize: 14 }} href="tel:0773985278">Érdekel — hívj minket</a>
            <div className="pub-detail-note">Az ár és a készlet folyamatosan frissül, végleges adásvétel az üzletben történik.</div>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
