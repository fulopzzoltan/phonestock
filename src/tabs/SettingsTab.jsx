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
      <div className="row2">
        <div className="field"><label>Cégnév</label><input value={f.companyName} onChange={set("companyName")} /></div>
        <div className="field"><label>CUI</label><input value={f.companyCui} onChange={set("companyCui")} /></div>
      </div>
      <div className="field"><label>Székhely</label><input value={f.companyAddress} onChange={set("companyAddress")} /></div>
      <div className="row2">
        <div className="field"><label>Telefon</label><input value={f.companyPhone} onChange={set("companyPhone")} /></div>
        <div className="field"><label>Email</label><input value={f.companyEmail} onChange={set("companyEmail")} /></div>
      </div>
      <div className="field">
        <label>Felmondási határidő (nap)</label>
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
      <div className="row2">
        <div className="field"><label>Sorozat</label><input value={f.smartbillDefaultSeries} onChange={set("smartbillDefaultSeries")} placeholder="pl. TLF" /></div>
        <div className="field"><label>ÁFA-kód</label><input value={f.smartbillDefaultTaxName} onChange={set("smartbillDefaultTaxName")} placeholder="pl. Scutit fara drept" /></div>
      </div>
      <button type="button" className="btn sec sm" disabled={busy} onClick={() => updateSettings({ smartbillDefaultSeries: f.smartbillDefaultSeries, smartbillDefaultTaxName: f.smartbillDefaultTaxName })}>
        {busy ? "Mentés..." : "Mentés"}
      </button>

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #E5E7EB", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={testLocId} onChange={(e) => setTestLocId(e.target.value)} style={{ maxWidth: 160 }}>
          {testable.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <button type="button" className="btn sec sm" disabled={testState === "busy" || !testLocId} onClick={runTest}>
          {testState === "busy" ? "Tesztelés..." : "Kapcsolat tesztelése"}
        </button>
        {testState && testState !== "busy" && (
          testState.ok
            ? <span style={{ color: "#22C55E", fontWeight: 700 }}>✓ OK</span>
            : <span style={{ color: "#EF4444", fontWeight: 700 }}>✗ {testState.error}</span>
        )}
      </div>
    </div>
  );
}

function LocationReviewUrlRow({ loc, editLocation, busy }) {
  const [value, setValue] = useState(loc.google_review_url || "");
  const dirty = value !== (loc.google_review_url || "");
  return (
    <div className="settings-row" style={{ alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <div style={{ minWidth: 90, fontWeight: 600, fontSize: 12.5 }}>{loc.name}</div>
      <input
        value={value} onChange={(e) => setValue(e.target.value)}
        placeholder="https://g.page/r/.../review" style={{ flex: 1, minWidth: 160 }}
      />
      <button type="button" className="btn sec sm" disabled={busy || !dirty} onClick={() => editLocation(loc.id, { googleReviewUrl: value.trim() })}>
        Mentés
      </button>
    </div>
  );
}

function LocationSamedayPickupRow({ loc, editLocation, busy }) {
  const [value, setValue] = useState(loc.sameday_pickup_point_id || "");
  const dirty = value !== (loc.sameday_pickup_point_id || "");
  return (
    <div className="settings-row" style={{ alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <div style={{ minWidth: 90, fontWeight: 600, fontSize: 12.5 }}>{loc.name}</div>
      <input
        value={value} onChange={(e) => setValue(e.target.value)}
        placeholder="pont ID" style={{ flex: 1, minWidth: 120, maxWidth: 180 }}
      />
      <button type="button" className="btn sec sm" disabled={busy || !dirty} onClick={() => editLocation(loc.id, { samedayPickupPointId: value.trim() })}>
        Mentés
      </button>
    </div>
  );
}

function SamedaySettings({ locations, editLocation, busy }) {
  const realLocations = (locations || []).filter((l) => l.name !== "Tartalék");
  return (
    <div className="pult-section">
      <div className="pult-section-head"><ChatIcon width={16} height={16} />SameDay szállítás</div>
      {realLocations.map((l) => (
        <LocationSamedayPickupRow key={l.id} loc={l} editLocation={editLocation} busy={busy} />
      ))}
    </div>
  );
}

function ReviewRequestSettings({ settings, updateSettings, busy, locations, editLocation }) {
  const realLocations = (locations || []).filter((l) => l.name !== "Tartalék");
  return (
    <div className="pult-section">
      <div className="pult-section-head"><ChatIcon width={16} height={16} />Google-értékelés</div>
      <div className="settings-row">
        <div className="settings-row-lbl">Automata kérés</div>
        <Toggle checked={!!settings.reviewRequestEnabled} disabled={busy} onChange={(v) => updateSettings({ reviewRequestEnabled: v })} />
      </div>
      {settings.reviewRequestEnabled && (
        <div className="settings-row">
          <div className="settings-row-lbl">Napok száma</div>
          <input
            type="number" min={1} max={14} style={{ width: 64 }}
            value={settings.reviewRequestDelayDays}
            onChange={(e) => updateSettings({ reviewRequestDelayDays: Number(e.target.value) || 2 })}
          />
        </div>
      )}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #E5E7EB" }}>
        {realLocations.map((l) => (
          <LocationReviewUrlRow key={l.id} loc={l} editLocation={editLocation} busy={busy} />
        ))}
      </div>
    </div>
  );
}

function slugify(label) {
  return label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "jutalom";
}

function LoyaltyRewardRow({ reward, onSave, busy }) {
  const [f, setF] = useState({ label: reward.label, pointCost: reward.pointCost, ourCost: reward.ourCost ?? "", customerValue: reward.customerValue ?? "", active: reward.active });
  const dirty = f.label !== reward.label || Number(f.pointCost) !== reward.pointCost
    || Number(f.ourCost || 0) !== Number(reward.ourCost || 0) || Number(f.customerValue || 0) !== Number(reward.customerValue || 0)
    || f.active !== reward.active;
  return (
    <div className="settings-row" style={{ alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} style={{ maxWidth: 180 }} />
      <input type="number" title="Pontköltség" value={f.pointCost} onChange={(e) => setF({ ...f, pointCost: e.target.value })} placeholder="pont" style={{ maxWidth: 70 }} />
      <input type="number" title="Nekünk mennyibe kerül (Lei)" value={f.ourCost} onChange={(e) => setF({ ...f, ourCost: e.target.value })} placeholder="költség" style={{ maxWidth: 80 }} />
      <input type="number" title="Vevőnek mennyit ér (Lei)" value={f.customerValue} onChange={(e) => setF({ ...f, customerValue: e.target.value })} placeholder="érték" style={{ maxWidth: 80 }} />
      <Toggle checked={f.active} disabled={busy} onChange={(v) => setF({ ...f, active: v })} />
      <button type="button" className="btn sec sm" disabled={busy || !dirty} onClick={() => onSave(f)}>Mentés</button>
    </div>
  );
}

function LoyaltyRewardsSettings({ rewards, addLoyaltyReward, editLoyaltyReward, busy }) {
  const [newLabel, setNewLabel] = useState("");
  const [newPointCost, setNewPointCost] = useState("");
  const sorted = [...(rewards || [])].sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <div className="pult-section">
      <div className="pult-section-head"><SettingsIcon width={16} height={16} />Hűségpont-katalógus</div>
      {sorted.map((r) => (
        <LoyaltyRewardRow key={r.id} reward={r} busy={busy} onSave={(f) => editLoyaltyReward(r.id, { ...r, ...f })} />
      ))}
      <div className="settings-row" style={{ alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8, paddingTop: 8, borderTop: "1px solid #E5E7EB" }}>
        <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Új jutalom" style={{ maxWidth: 180 }} />
        <input type="number" value={newPointCost} onChange={(e) => setNewPointCost(e.target.value)} placeholder="pont" style={{ maxWidth: 70 }} />
        <button
          type="button" className="btn sec sm" disabled={busy || !newLabel.trim() || !newPointCost}
          onClick={() => {
            addLoyaltyReward({ rewardKey: `${slugify(newLabel)}_${Date.now().toString(36)}`, label: newLabel.trim(), pointCost: newPointCost, ourCost: "", customerValue: "", active: true, sortOrder: sorted.length + 1 });
            setNewLabel(""); setNewPointCost("");
          }}
        >
          + Új
        </button>
      </div>
    </div>
  );
}

function WhatsappFollowupSettings({ settings, updateSettings, busy }) {
  return (
    <div className="pult-section">
      <div className="pult-section-head"><ChatIcon width={16} height={16} />Vásárlás utáni WhatsApp</div>
      <div className="settings-row">
        <div className="settings-row-lbl">Vásárlás után</div>
        <Toggle checked={!!settings.loyaltyFollowupEnabled} disabled={busy} onChange={(v) => updateSettings({ loyaltyFollowupEnabled: v })} />
      </div>
      {settings.loyaltyFollowupEnabled && (
        <div className="settings-row">
          <div className="settings-row-lbl">Napok száma</div>
          <input
            type="number" min={1} max={14} style={{ width: 64 }}
            value={settings.loyaltyFollowupDays}
            onChange={(e) => updateSettings({ loyaltyFollowupDays: Number(e.target.value) || 3 })}
          />
        </div>
      )}
      <div className="settings-row-desc" style={{ marginTop: 6 }}>Kikapcsolva, amíg a hűségpont él nem indul.</div>
    </div>
  );
}

function TicketSmsSettings({ settings, updateSettings, busy }) {
  return (
    <div className="pult-section">
      <div className="pult-section-head"><ChatIcon width={16} height={16} />Automatikus SMS-ek</div>
      <div className="settings-row">
        <div className="settings-row-lbl">Felvételkor</div>
        <Toggle checked={!!settings.smsOnTicketCreate} disabled={busy} onChange={(v) => updateSettings({ smsOnTicketCreate: v })} />
      </div>
      <div className="settings-row">
        <div className="settings-row-lbl">Átvehetőnél</div>
        <Toggle checked={!!settings.smsOnTicketReady} disabled={busy} onChange={(v) => updateSettings({ smsOnTicketReady: v })} />
      </div>
      <div className="settings-row" style={{ marginTop: 10 }}>
        <div className="settings-row-lbl">Szerviz-érdeklődés (becslő) beküldésekor</div>
        <Toggle checked={!!settings.smsOnRepairLead} disabled={busy} onChange={(v) => updateSettings({ smsOnRepairLead: v })} />
      </div>
      <div className="settings-row">
        <div className="settings-row-lbl">Felvásárlási ajánlatkéréskor</div>
        <Toggle checked={!!settings.smsOnBuybackOffer} disabled={busy} onChange={(v) => updateSettings({ smsOnBuybackOffer: v })} />
      </div>
      <div className="settings-row-desc" style={{ marginTop: 6 }}>
        Ez a két utóbbi egyelőre WhatsApp-sablon jóváhagyás nélkül csak SMS-fallback-kel megy ki — a végleges szöveget és a WhatsApp-sablont még be kell állítani.
      </div>
    </div>
  );
}

function SettingsGroup({ title }) {
  return <div className="pult-group-title">{title}</div>;
}

export default function SettingsTab({ isAdmin, profile, user, settings, updateSettings, busy, setChangePasswordModal, locations, loyaltyRewards, addLoyaltyReward, editLoyaltyReward, editLocation }) {
  return (
    <div className="pult-settings">
      <div className="pult-section">
        <div className="settings-row">
          <div>
            <div className="settings-row-lbl">{profile?.fullName || user?.email}</div>
            <div className="settings-row-desc">{isAdmin ? "Admin" : "Alkalmazott"}{profile?.email ? ` · ${profile.email}` : ""}</div>
          </div>
          <button type="button" className="btn sec sm" onClick={() => setChangePasswordModal(true)}>Jelszó</button>
        </div>
      </div>

      {isAdmin && (
        <>
          <SettingsGroup title="Automatizmusok" />
          <div className="pult-row3">
            <TicketSmsSettings settings={settings} updateSettings={updateSettings} busy={busy} />
            <ReviewRequestSettings settings={settings} updateSettings={updateSettings} busy={busy} locations={locations} editLocation={editLocation} />
            <WhatsappFollowupSettings settings={settings} updateSettings={updateSettings} busy={busy} />
          </div>

          <SettingsGroup title="Integrációk" />
          <div className="pult-row2">
            <SmartBillSettings settings={settings} updateSettings={updateSettings} busy={busy} locations={locations} />
            <SamedaySettings locations={locations} editLocation={editLocation} busy={busy} />
          </div>

          <SettingsGroup title="Cég és hűségprogram" />
          <div className="pult-row2">
            <CompanySettings settings={settings} updateSettings={updateSettings} busy={busy} />
            <LoyaltyRewardsSettings rewards={loyaltyRewards} addLoyaltyReward={addLoyaltyReward} editLoyaltyReward={editLoyaltyReward} busy={busy} />
          </div>
        </>
      )}
    </div>
  );
}
