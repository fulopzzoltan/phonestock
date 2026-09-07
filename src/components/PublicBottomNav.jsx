// Alsó tabsáv mobilra — iOS / eMag-app mintára: a legfontosabb menüpontok mindig
// hüvelykujj-távolságban legyenek, ne kelljen a tetejére (hamburgerbe) nyúlni értük.
// Egyelőre csak a nyomonkovetes.telefonos.ro (minimal) oldalon éles, teszt jelleggel —
// de szándékosan `items`-alapú, nem a nyomonkövetéshez hardkódolt, hogy amikor a teljes
// webshopon (App.jsx melletti publikus oldalakon) is bővül a menü, ugyanez a komponens
// egyszerűen újrahasználható legyen több taggal (Telefonok, Felvásárlás, Szerviz, Kosár stb.).
//
// items: [{ key, label, icon: IconComponent, href?, onClick?, active?, badge?, external? }]
// Csak href VAGY onClick kell — ha mindkettő hiányzik, sima span-ként jelenik meg.
export default function PublicBottomNav({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <nav className="pub-bottom-nav" role="navigation" aria-label="Fő menü">
      {items.map((it) => {
        const Icon = it.icon;
        const inner = (
          <>
            <span className="pub-bnav-ic-wrap">
              <Icon width={22} height={22} className="pub-bnav-ic" />
              {it.badge > 0 && <span className="pub-bnav-badge">{it.badge}</span>}
            </span>
            <span className="pub-bnav-label">{it.label}</span>
          </>
        );
        const cls = `pub-bnav-item${it.active ? " active" : ""}`;
        if (it.onClick) {
          return (
            <button key={it.key} type="button" className={cls} onClick={it.onClick}>
              {inner}
            </button>
          );
        }
        return (
          <a
            key={it.key}
            className={cls}
            href={it.href}
            {...(it.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {inner}
          </a>
        );
      })}
    </nav>
  );
}
