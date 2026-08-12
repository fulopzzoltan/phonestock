import { useState, useEffect, useMemo } from "react";
import { supabase } from "./lib/supabaseClient";

const deviceSvg = (
  <svg viewBox="0 0 40 64" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="2" y="2" width="36" height="60" rx="7" />
    <line x1="15" y1="56" x2="25" y2="56" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export default function StockShowcase() {
  const [phones, setPhones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("all");
  const [cond, setCond] = useState("all");
  const [sort, setSort] = useState("price-asc");

  useEffect(() => {
    (async () => {
      try {
        const { data, error: err } = await supabase.rpc("get_public_stock");
        if (err) throw err;
        setPhones(data || []);
      } catch (err) {
        setError(err.message || "Hiba történt a készlet betöltése közben.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const brands = useMemo(() => ["all", ...new Set(phones.map((p) => p.brand))].sort((a, b) => (a === "all" ? -1 : b === "all" ? 1 : a.localeCompare(b))), [phones]);

  const filtered = useMemo(() => {
    let items = phones.filter((p) => {
      if (brand !== "all" && p.brand !== brand) return false;
      if (cond !== "all" && p.condition !== cond) return false;
      if (q.trim() && !`${p.brand} ${p.model} ${p.color || ""}`.toLowerCase().includes(q.trim().toLowerCase())) return false;
      return true;
    });
    items = [...items].sort((a, b) => {
      if (sort === "price-asc") return (Number(a.sale_price) || 0) - (Number(b.sale_price) || 0);
      if (sort === "price-desc") return (Number(b.sale_price) || 0) - (Number(a.sale_price) || 0);
      return a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model);
    });
    return items;
  }, [phones, brand, cond, q, sort]);

  return (
    <div className="pub-shop">
      <header className="pub-header">
        <div className="pub-header-inner">
          <div className="pub-brand-row">
            <div className="pub-wordmark">
              <div className="pub-mark">
                <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: "none", stroke: "#fff", strokeWidth: 2 }}>
                  <rect x="6" y="2" width="12" height="20" rx="2.5" /><line x1="10" y1="18.5" x2="14" y2="18.5" />
                </svg>
              </div>
              <div className="pub-name">TELEF<em>O</em>NOS</div>
            </div>
            <nav className="pub-nav">
              <a className="pub-nav-link active" href="/">Készlet</a>
              <a className="pub-nav-link" href="/status">Szerviz / vásárlás státusz</a>
              <a className="pub-nav-link pub-nav-login" href="/admin">Bejelentkezés</a>
            </nav>
          </div>
          <div className="pub-search-row">
            <div className="pub-search-box">
              <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, stroke: "var(--pub-ink-soft)", fill: "none", strokeWidth: 2 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input placeholder="Keresés — pl. iPhone 13, Samsung A07..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div className="pub-chip-row">
            {brands.map((b) => (
              <button key={b} type="button" className={`pub-chip${brand === b ? " active" : ""}`} onClick={() => setBrand(b)}>{b === "all" ? "Minden márka" : b}</button>
            ))}
          </div>
          <div className="pub-chip-row">
            <button type="button" className={`pub-chip${cond === "all" ? " active" : ""}`} onClick={() => setCond("all")}>Összes állapot</button>
            <button type="button" className={`pub-chip${cond === "New" ? " active" : ""}`} onClick={() => setCond("New")}>Új</button>
            <button type="button" className={`pub-chip${cond === "Refurbished" ? " active" : ""}`} onClick={() => setCond("Refurbished")}>Felújított</button>
            <select className="pub-sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="price-asc">Ár: olcsóbb elöl</option>
              <option value="price-desc">Ár: drágább elöl</option>
              <option value="brand">Márka szerint</option>
            </select>
          </div>
        </div>
      </header>

      <div className="pub-results-bar">
        <div className="pub-results-count"><b>{loading ? "…" : filtered.length}</b> telefon készleten</div>
      </div>

      <main className="pub-main">
        {error && <div className="errbar">{error}</div>}
        {loading ? (
          <div className="pub-empty">Betöltés...</div>
        ) : filtered.length === 0 ? (
          <div className="pub-empty">Nincs találat a szűrésre — próbálj más márkát vagy keresőszót.</div>
        ) : (
          <div className="pub-grid">
            {filtered.map((p) => (
              <div key={p.id} className="pub-card">
                <div className="pub-card-top">
                  <span className={`pub-cond-pill ${p.condition === "New" ? "new" : "refurb"}`}>{p.condition === "New" ? "Új" : "Felújított"}</span>
                </div>
                <div className="pub-device-art">{deviceSvg}</div>
                <div className="pub-card-name">{p.brand} {p.model}</div>
                <div className="pub-card-specs">
                  {p.storage && <span>{p.storage}</span>}
                  {p.color && <span>{p.color}</span>}
                </div>
                {p.battery_health != null && (
                  <div className="pub-battery-row">
                    <div className="pub-battery-track"><div className="pub-battery-fill" style={{ width: `${p.battery_health}%` }} /></div>
                    <span className="pub-battery-label mono">{p.battery_health}%</span>
                  </div>
                )}
                {p.warranty && (
                  <div className="pub-warranty-tag">
                    <svg viewBox="0 0 24 24" style={{ width: 11, height: 11, stroke: "var(--pub-ink-soft)", fill: "none", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }}><path d="M12 3l7 2.5v5.8c0 4.2-2.9 7.6-7 8.7-4.1-1.1-7-4.5-7-8.7V5.5L12 3z" /></svg>
                    {p.warranty} garancia
                  </div>
                )}
                <div className="pub-card-foot">
                  <div className="pub-price mono">{Number(p.sale_price).toLocaleString("hu-HU")}<span className="pub-cur">Lei</span></div>
                  <a className="pub-ask-btn" href="tel:0773985278">Érdekel</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="pub-footer">
        <div className="pub-footer-inner">Telefonos — az árak és a raktárkészlet folyamatosan frissülnek, végleges ár a szervizben/üzletben.</div>
      </footer>
    </div>
  );
}
