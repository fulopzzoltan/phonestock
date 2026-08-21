import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";

export default function LegalPage({ title }) {
  return (
    <div className="pub-shop">
      <PublicHeader activeNav="stock" />
      <main className="pub-lookup-main">
        <div className="login-card" style={{ maxWidth: 520 }}>
          <div className="login-title">{title}</div>
          <div className="login-note">
            Ez az oldal még készül. Ha kérdésed van a vásárlás feltételeivel vagy az adatkezeléssel kapcsolatban,
            hívj minket bizalommal: <a href="tel:0773985278">0773 985 278</a>.
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
