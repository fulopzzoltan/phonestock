import { useState } from "react";
import { CloseIcon } from "./icons";

// Új belépés felvitele / meglévő szerkesztése. Szerkesztésnél a jelszó mező szándékosan
// nincs előre kitöltve (nem is jön vissza ide sosem nyílt szövegként) — a jelszó cseréje
// külön, elkülönített mini-form a modal alján, saját "Csere" gombbal, hogy véletlenül se
// lehessen az összes többi mezőt menteni úgy, hogy közben a jelszó mező üresen felülírná
// a régit.
export default function VaultCredentialModal({ credential, onClose, onSave, onChangePassword, busy }) {
  const isEdit = !!credential;
  const [f, setF] = useState({
    siteName: credential?.siteName || "",
    siteUrl: credential?.siteUrl || "",
    username: credential?.username || "",
    notes: credential?.notes || "",
    category: credential?.category || "",
    visibility: credential?.visibility || "admin",
    password: "",
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.siteName.trim() && (isEdit || f.password.trim());

  const [newPassword, setNewPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwDone, setPwDone] = useState(false);
  const [pwError, setPwError] = useState("");

  async function submitPasswordChange() {
    if (!newPassword.trim()) return;
    setPwBusy(true);
    setPwError("");
    try {
      await onChangePassword(newPassword.trim());
      setPwDone(true);
      setNewPassword("");
      setTimeout(() => setPwDone(false), 2500);
    } catch (err) {
      setPwError(err.message || "Nem sikerült a jelszócsere.");
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? "Belépés szerkesztése" : "Új belépés"} <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>
        <div className="row2">
          <div className="field"><label>Szolgáltatás / oldal neve</label><input value={f.siteName} onChange={set("siteName")} placeholder="pl. Emag beszállítói fiók" /></div>
          <div className="field"><label>Kategória (opcionális)</label><input value={f.category} onChange={set("category")} placeholder="pl. Beszállító" /></div>
        </div>
        <div className="field"><label>Weboldal (opcionális)</label><input value={f.siteUrl} onChange={set("siteUrl")} placeholder="https://..." /></div>
        <div className="row2">
          <div className="field"><label>Felhasználónév / email</label><input value={f.username} onChange={set("username")} /></div>
          {!isEdit && (
            <div className="field"><label>Jelszó</label><input value={f.password} onChange={set("password")} placeholder="Jelszó" /></div>
          )}
        </div>
        <div className="field"><label>Jegyzet</label>
          <textarea
            value={f.notes}
            onChange={(e) => setF({ ...f, notes: e.target.value })}
            placeholder="Pl. melyik fiókkal jelentkezz be, mire szolgál..."
            style={{ width: "100%", minHeight: 56, background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 9, padding: "9px 10px", fontFamily: "inherit", fontSize: 13, resize: "vertical" }}
          />
        </div>
        <div className="field">
          <label>Ki láthatja?</label>
          <div className="status-seg" style={{ marginTop: 4 }}>
            <button type="button" className={f.visibility === "admin" ? "active" : ""} onClick={() => setF({ ...f, visibility: "admin" })}>Csak admin</button>
            <button type="button" className={f.visibility === "everyone" ? "active" : ""} onClick={() => setF({ ...f, visibility: "everyone" })}>Minden alkalmazott</button>
          </div>
        </div>

        {isEdit && (
          <div className="field" style={{ borderTop: "1px solid #E5E7EB", paddingTop: 12, marginTop: 6 }}>
            <label>Jelszó cseréje</label>
            {pwError && <div className="errbar" style={{ marginBottom: 8 }}>{pwError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Új jelszó" style={{ flex: 1 }} />
              <button type="button" className="btn sec" disabled={!newPassword.trim() || pwBusy} onClick={submitPasswordChange}>
                {pwBusy ? "Csere..." : "Csere"}
              </button>
            </div>
            {pwDone && <div style={{ fontSize: 11.5, color: "#15803D", marginTop: 4 }}>✓ Jelszó lecserélve.</div>}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!valid || busy} onClick={() => valid && onSave(f)}>{busy ? "Mentés..." : isEdit ? "Mentés" : "Létrehozás"}</button>
        </div>
      </div>
    </div>
  );
}
