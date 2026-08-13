import { useState } from "react";
import { useAuth } from "./lib/AuthContext";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email.trim()) { setError("Add meg az email címed."); return; }
    if (!password) { setError("Add meg a jelszavad."); return; }
    if (mode === "signup" && password.length < 6) { setError("A jelszónak legalább 6 karakter hosszúnak kell lennie."); return; }
    setBusy(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        await signUp(email, password, fullName);
        setInfo("Fiók létrehozva. Ha email megerősítés van bekapcsolva a projektben, nézd meg a postaládád, majd jelentkezz be.");
        setMode("login");
      }
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
        <div className="login-toggle">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Bejelentkezés</button>
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Regisztráció</button>
        </div>
        {error && <div className="errbar">{error}</div>}
        {info && <div className="banner warn">{info}</div>}
        <form onSubmit={submit}>
          {mode === "signup" && (
            <div className="field"><label>Név</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Kovács János" /></div>
          )}
          <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="te@pelda.hu" /></div>
          <div className="field">
            <label>Jelszó</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            {mode === "signup" && <div className="field-hint">Legalább 6 karakter</div>}
          </div>
          <button className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} disabled={busy} type="submit">
            {busy ? "Kérlek várj..." : mode === "login" ? "Bejelentkezés" : "Fiók létrehozása"}
          </button>
        </form>
        <div className="login-note">
          {mode === "signup"
            ? "Az első regisztrált fiók automatikusan adminisztrátor lesz. Utána az adminisztrátor rendeli hozzá a többi felhasználót egy helyszínhez."
            : "Ha nincs még fiókod, válts a Regisztráció fülre."}
        </div>
      </div>
    </div>
  );
}
