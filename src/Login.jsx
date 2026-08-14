import { useState } from "react";
import { useAuth } from "./lib/AuthContext";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";

const LAST_EMAIL_KEY = "phonestock_last_email";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState(() => localStorage.getItem(LAST_EMAIL_KEY) || "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Add meg az email címed."); return; }
    if (!password) { setError("Add meg a jelszavad."); return; }
    setBusy(true);
    try {
      await signIn(email, password);
      localStorage.setItem(LAST_EMAIL_KEY, email.trim());
    } catch (err) {
      setError(err.message || "Hiba történt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pub-shop">
      <PublicHeader activeNav="login" />
      <main className="pub-lookup-main">
        <div className="login-card" style={{ maxWidth: 380 }}>
          <div className="login-title">Bejelentkezés</div>
          {error && <div className="errbar">{error}</div>}
          <form onSubmit={submit} autoComplete="on">
            <div className="field"><label>Email</label><input type="email" name="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="te@pelda.hu" /></div>
            <div className="field"><label>Jelszó</label><input type="password" name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></div>
            <button className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} disabled={busy} type="submit">
              {busy ? "Kérlek várj..." : "Bejelentkezés"}
            </button>
          </form>
          <div className="login-note">
            Fiókot csak meghívóval lehet létrehozni — kérj meghívót egy adminisztrátortól.
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
