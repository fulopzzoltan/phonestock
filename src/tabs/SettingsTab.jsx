import { SettingsIcon, ChatIcon } from "../components/icons";

function Toggle({ checked, disabled, onChange }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="slider" />
    </label>
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
      </div>
    </>
  );
}
