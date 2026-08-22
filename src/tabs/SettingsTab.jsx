import { useState, useEffect } from "react";
import { SettingsIcon, ChatIcon } from "../components/icons";
import { supabase } from "../lib/supabaseClient";

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

function SmartBillSettings({ settings, updateSettings, busy, locations }) {
  const [f, setF] = useState({
    smartbillDefaultSeries: settings.smartbillDefaultSeries || "",
    smartbillDefaultTaxName: settings.smartbillDefaultTaxName || "",
  });
  useEffect(() => {
    setF({
      smartbillDefaultSeries: settings.smartbillDefaultSeries || "",
      smartbillDefaultTaxName: settings.smartbillDefaultTaxName || "",
    });
  }, [settings]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const testable = (locations || []).filter((l) => l.name !== "Tartalék");
  const [testLocId, setTestLocId] = useState(testable[0]?.id || "");
  const [testState, setTestState] = useState(null); // null | "busy" | { ok, error }

  async function runTest() {
    if (!testLocId) return;
    setTestState("busy");
    const { data, error } = await supabase.functions.invoke("smartbill-issue-document", {
      body: { action: "test", location_id: testLocId },
    });
    if (error) {
      setTestState({ ok: false, error: error.message || "Ismeretlen hiba" });
    } else {
      setTestState(data);
    }
  }

  return (
    <div className="pult-section">
      <div className="pult-section-head"><SettingsIcon width={16} height={16} />SmartBill</div>
      <div className="settings-row-desc" style={{ marginBottom: 10 }}>
        Számla/bon kiállítás SmartBillen keresztül. A hitelesítő adatok Supabase secretként vannak beállítva, itt nem szerepelnek.
      </div>
      <div className="row2">
        <div className="field">
          <label>Alapértelmezett számlasorozat <span style={{ color: "#9CA3AF", fontWeight: 400 }}>— ha üres, automatikusan próbál választani</span></label>
          <input value={f.smartbillDefaultSeries} onChange={set("smartbillDefaultSeries")} placeholder="pl. TLF" />
        </div>
        <div className="field">
          <label>Alapértelmezett ÁFA-kód <span style={{ color: "#9CA3AF", fontWeight: 400 }}>— neplătitor esetén a könyvelővel egyeztetett érték</span></label>
          <input value={f.smartbillDefaultTaxName} onChange={set("smartbillDefaultTaxName")} placeholder="pl. Scutit fara drept de deducere" />
        </div>
      </div>
      <button type="button" className="btn sec sm" disabled={busy} onClick={() => updateSettings({ smartbillDefaultSeries: f.smartbillDefaultSeries, smartbillDefaultTaxName: f.smartbillDefaultTaxName })}>
        {busy ? "Mentés..." : "Mentés"}
      </button>

      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #E5E7EB" }}>
        <div className="settings-row-lbl" style={{ marginBottom: 8 }}>Kapcsolat tesztelése</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={testLocId} onChange={(e) => setTestLocId(e.target.value)} style={{ maxWidth: 200 }}>
            {testable.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <button type="button" className="btn sec sm" disabled={testState === "busy" || !testLocId} onClick={runTest}>
            {testState === "busy" ? "Tesztelés..." : "SmartBill kapcsolat tesztelése"}
          </button>
          {testState && testState !== "busy" && (
            testState.ok
              ? <span style={{ color: "#22C55E", fontWeight: 700 }}>✓ Sikeres kapcsolat</span>
              : <span style={{ color: "#EF4444", fontWeight: 700 }}>✗ {testState.error}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsTab({ isAdmin, profile, user, settings, updateSettings, busy, setChangePasswordModal, locations }) {
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
        {isAdmin && <SmartBillSettings settings={settings} updateSettings={updateSettings} busy={busy} locations={locations} />}
      </div>
    </>
  );
}
