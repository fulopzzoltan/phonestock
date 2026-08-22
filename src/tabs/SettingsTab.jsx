import { useState, useEffect } from "react";
import { SettingsIcon, ChatIcon } from "../components/icons";

function Toggle({ checked, disabled, onChange }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="slider" />
    </label>
  );
}

function CompanySettings({ settings, updateSettings, busy }) {
  const [f, setF] = useState({
    companyName: settings.companyName || "",
    companyCui: settings.companyCui || "",
    companyAddress: settings.companyAddress || "",
    companyPhone: settings.companyPhone || "",
    companyEmail: settings.companyEmail || "",
    consignmentNoticeDays: settings.consignmentNoticeDays ?? "",
  });
  useEffect(() => {
    setF({
      companyName: settings.companyName || "",
      companyCui: settings.companyCui || "",
      companyAddress: settings.companyAddress || "",
      companyPhone: settings.companyPhone || "",
      companyEmail: settings.companyEmail || "",
      consignmentNoticeDays: settings.consignmentNoticeDays ?? "",
    });
  }, [settings]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="pult-section">
      <div className="pult-section-head"><SettingsIcon width={16} height={16} />Cégadatok</div>
      <div className="settings-row-desc" style={{ marginBottom: 10 }}>
        Ezek az adatok kerülnek a generált dokumentumokba (bizományos szerződés, borderou, nyilatkozatok).
      </div>
      <div className="row2">
        <div className="field"><label>Cégnév</label><input value={f.companyName} onChange={set("companyName")} /></div>
        <div className="field"><label>Cégjegyzékszám / CUI</label><input value={f.companyCui} onChange={set("companyCui")} /></div>
      </div>
      <div className="field"><label>Székhely cím</label><input value={f.companyAddress} onChange={set("companyAddress")} placeholder="A dokumentumokon a cég (nem a boltok) hivatalos címe" /></div>
      <div className="row2">
        <div className="field"><label>Telefonszám</label><input value={f.companyPhone} onChange={set("companyPhone")} /></div>
        <div className="field"><label>Email</label><input value={f.companyEmail} onChange={set("companyEmail")} /></div>
      </div>
      <div className="field">
        <label>Bizományos szerződés felmondási határideje (nap) <span style={{ color: "#9CA3AF", fontWeight: 400 }}>— jogilag még pontosítandó, addig üresen marad a szerződésen</span></label>
        <input type="number" value={f.consignmentNoticeDays} onChange={set("consignmentNoticeDays")} placeholder="pl. 30" style={{ maxWidth: 140 }} />
      </div>
      <button type="button" className="btn sec sm" disabled={busy} onClick={() => updateSettings({
        companyName: f.companyName, companyCui: f.companyCui, companyAddress: f.companyAddress,
        companyPhone: f.companyPhone, companyEmail: f.companyEmail,
        consignmentNoticeDays: f.consignmentNoticeDays === "" ? null : Number(f.consignmentNoticeDays),
      })}>
        {busy ? "Mentés..." : "Mentés"}
      </button>
    </div>
  );
}

export default function SettingsTab({ isAdmin, profile, user, settings, updateSettings, busy, setChangePasswordModal }) {
  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Beállítások</div></div>
      </div>

      <div className="pult-grid">
        <div className="pult-section">
          <div className="pult-section-head"><SettingsIcon width={16} height={16} />Fiók</div>
          <div className="settings-row">
            <div>
              <div className="settings-row-lbl">{profile?.fullName || user?.email}</div>
              <div className="settings-row-desc">{isAdmin ? "Admin" : "Alkalmazott"}{profile?.email ? ` · ${profile.email}` : ""}</div>
            </div>
            <button type="button" className="btn sec sm" onClick={() => setChangePasswordModal(true)}>Jelszó módosítása</button>
          </div>
        </div>

        {isAdmin && (
          <div className="pult-section">
            <div className="pult-section-head"><ChatIcon width={16} height={16} />Automatikus SMS-ek</div>
            <div className="settings-row">
              <div>
                <div className="settings-row-lbl">SMS munkalap felvételekor</div>
                <div className="settings-row-desc">Az ügyfél SMS-t kap, amikor átvesszük a készülékét, a munkalapszámmal és a nyomon követő linkkel.</div>
              </div>
              <Toggle checked={!!settings.smsOnTicketCreate} disabled={busy} onChange={(v) => updateSettings({ smsOnTicketCreate: v })} />
            </div>
            <div className="settings-row">
              <div>
                <div className="settings-row-lbl">SMS, amikor átvehető a készülék</div>
                <div className="settings-row-desc">Az ügyfél SMS-t kap, amint a munkalap "Átvehető" állapotba kerül (nem küld, ha "Sikertelen" vagy már helyben "Átadva").</div>
              </div>
              <Toggle checked={!!settings.smsOnTicketReady} disabled={busy} onChange={(v) => updateSettings({ smsOnTicketReady: v })} />
            </div>
          </div>
        )}

        {isAdmin && <CompanySettings settings={settings} updateSettings={updateSettings} busy={busy} />}
      </div>
    </>
  );
}
