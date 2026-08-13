import { useState } from "react";
import { useAuth } from "./lib/AuthContext";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
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
    } catch (err) {
      setError(err.message || "Hiba történt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-icon"><svg viewBox="0 0 24 24"><path d="M17 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2zm-5 15a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3-7H9V5h6v5z"/></svg></div>
          <div className="brand-name">TELEF<span>O</span>NOS</div>
        </div>
        {error && <div className="errbar">{error}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="te@pelda.hu" /></div>
          <div className="field"><label>Jelszó</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></div>
          <button className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} disabled={busy} type="submit">
            {busy ? "Kérlek várj..." : "Bejelentkezés"}
          </button>
        </form>
        <div className="login-note">
          Fiókot csak meghívóval lehet létrehozni — kérj meghívót egy adminisztrátortól.
        </div>
      </div>
    </div>
  );
}
