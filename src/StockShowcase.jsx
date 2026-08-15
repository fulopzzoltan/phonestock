import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "./lib/supabaseClient";
import { t, translateColor, translateWarranty } from "./lib/i18n";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import { SearchIcon } from "./components/icons";
import { EmptyState, LoadingState } from "./components/EmptyState";

const SITE = "https://phonestock-manager.netlify.app";

const deviceSvg = (
  <svg viewBox="0 0 40 64" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="2" y="2" width="36" height="60" rx="7" />
    <line x1="15" y1="56" x2="25" y2="56" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

function photoUrl(path) {
  return supabase.storage.from("product-photos").getPublicUrl(path).data.publicUrl;
}

export default function StockShowcase({ lang = "hu" }) {
  const s = t(lang);
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

  const stockCounts = useMemo(() => {
    const counts = {};
    phones.forEach((p) => {
      const key = `${p.brand}|${p.model}|${p.storage || ""}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [phones]);

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

  const canonical = lang === "ro" ? `${SITE}/ro/telefoane` : `${SITE}/keszlet`;
  const title = lang === "ro" ? "Telefoane second-hand și noi — Telefonos" : "Használt és új telefonok — Telefonos";
  const description = lang === "ro"
    ? "Telefoane recondiționate și noi, verificate, cu garanție, în Ghimeș și Sfântu Gheorghe."
    : "Felújított és új telefonok, garanciával, Gyimesben és Szentgyörgyön.";

  return (
    <div className="pub-shop">
      <Helmet>
        <html lang={lang} />
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <link rel="alternate" hrefLang="hu" href={`${SITE}/keszlet`} />
        <link rel="alternate" hrefLang="ro" href={`${SITE}/ro/telefoane`} />
        <link rel="alternate" hrefLang="x-default" href={`${SITE}/keszlet`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org", "@type": "ElectronicsStore",
          name: "Telefonos", priceRange: "$$", telephone: "+40773985278",
          inLanguage: lang,
          // Cím/nyitvatartás: valós adat kell ide (TASKS_SEO_GEO.md 6. pont) — placeholder, amíg meg nem adod.
          address: [
            { "@type": "PostalAddress", addressLocality: "Ghimeș", addressRegion: "Harghita", addressCountry: "RO" },
            { "@type": "PostalAddress", addressLocality: "Sfântu Gheorghe", addressRegion: "Covasna", addressCountry: "RO" },
          ],
        })}</script>
      </Helmet>
      <PublicHeader activeNav="stock" lang={lang}>
        <div className="pub-search-row">
          <div className="pub-search-box">
            <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, stroke: "var(--pub-ink-soft)", fill: "none", strokeWidth: 2 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input placeholder={s.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="pub-chip-row">
          {brands.map((b) => (
            <button key={b} type="button" className={`pub-chip${brand === b ? " active" : ""}`} onClick={() => setBrand(b)}>{b === "all" ? s.allBrands : b}</button>
          ))}
        </div>
        <div className="pub-chip-row">
          <button type="button" className={`pub-chip${cond === "all" ? " active" : ""}`} onClick={() => setCond("all")}>{s.allConditions}</button>
          <button type="button" className={`pub-chip${cond === "New" ? " active" : ""}`} onClick={() => setCond("New")}>{s.conditionNew}</button>
          <button type="button" className={`pub-chip${cond === "Refurbished" ? " active" : ""}`} onClick={() => setCond("Refurbished")}>{s.conditionRefurb}</button>
          <select className="pub-sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="price-asc">{s.sortPriceAsc}</option>
            <option value="price-desc">{s.sortPriceDesc}</option>
            <option value="brand">{s.sortBrand}</option>
          </select>
        </div>
      </PublicHeader>

      <div className="pub-results-bar">
        <div className="pub-results-count">{loading ? "…" : s.resultsCount(filtered.length)}</div>
      </div>

      <main className="pub-main">
        {error && <div className="errbar">{error}</div>}
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState icon={SearchIcon}>{s.noResults}</EmptyState>
        ) : (
          <div className="pub-grid">
            {filtered.map((p) => {
              const isLastOne = stockCounts[`${p.brand}|${p.model}|${p.storage || ""}`] === 1;
              const hasAnchor = p.new_price && Number(p.new_price) > Number(p.sale_price);
              const href = lang === "ro" ? `/ro/telefon/${p.id}` : `/telefon/${p.id}`;
              return (
                <div key={p.id} className="pub-card" role="link" tabIndex={0}
                  onClick={() => { window.location.href = href; }}
                  onKeyDown={(e) => { if (e.key === "Enter") window.location.href = href; }}
                >
                  <div className="pub-card-top">
                    <span className={`pub-cond-pill ${p.condition === "New" ? "new" : "refurb"}`}>{p.condition === "New" ? s.conditionNew : s.conditionRefurb}</span>
                    {isLastOne && <span className="pub-scarcity-pill">{s.scarcity}</span>}
                  </div>
                  <div className="pub-device-art">
                    {p.photo_paths && p.photo_paths.length > 0 ? (
                      <img src={photoUrl(p.photo_paths[0])} alt={`${p.brand} ${p.model}`} className="pub-device-photo" />
                    ) : deviceSvg}
                  </div>
                  <div className="pub-card-name">{p.brand} {p.model}</div>
                  <div className="pub-card-specs">
                    {p.storage && <span>{p.storage}</span>}
                    {p.color && <span>{translateColor(p.color, lang)}</span>}
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
                      {s.warrantyTag(translateWarranty(p.warranty, lang))}
                    </div>
                  )}
                  <div className="pub-card-foot">
                    <div>
                      {hasAnchor && (
                        <div className="pub-anchor">
                          <span className="pub-anchor-old">{Number(p.new_price).toLocaleString("hu-HU")} Lei</span>
                          <span className="pub-anchor-save">{s.saveLabel(Math.round(p.new_price - p.sale_price).toLocaleString("hu-HU"))}</span>
                        </div>
                      )}
                      <div className="pub-price mono">{Number(p.sale_price).toLocaleString("hu-HU")}<span className="pub-cur">Lei</span></div>
                    </div>
                    <a className="pub-ask-btn" href="tel:0773985278" onClick={(e) => e.stopPropagation()}>{s.interested}</a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <PublicFooter lang={lang} />
    </div>
  );
}
