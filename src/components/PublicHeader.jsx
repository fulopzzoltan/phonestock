export default function PublicHeader({ children, activeNav = "stock" }) {
  return (
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
            <a className={`pub-nav-link${activeNav === "stock" ? " active" : ""}`} href="/">Készlet</a>
            <a className={`pub-nav-link${activeNav === "buyback" ? " active" : ""}`} href="/eladom">Add el a telefonod</a>
            <a className={`pub-nav-link${activeNav === "repair" ? " active" : ""}`} href="/becsles">Szerviz árbecslő</a>
            <a className={`pub-nav-link${activeNav === "status" ? " active" : ""}`} href="/status">Szerviz / vásárlás státusz</a>
            <a className="pub-nav-link pub-nav-login" href="/admin">Bejelentkezés</a>
          </nav>
        </div>
        {children}
      </div>
    </header>
  );
}
