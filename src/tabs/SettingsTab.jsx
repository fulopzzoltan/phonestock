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

function LocationReviewUrlRow({ loc, editLocation, busy }) {
  const [value, setValue] = useState(loc.google_review_url || "");
  const dirty = value !== (loc.google_review_url || "");
  return (
    <div className="settings-row" style={{ alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <div style={{ minWidth: 100, fontWeight: 600, fontSize: 12.5 }}>{loc.name}</div>
      <input
        value={value} onChange={(e) => setValue(e.target.value)}
        placeholder="https://g.page/r/.../review" style={{ flex: 1, minWidth: 220 }}
      />
      <button type="button" className="btn sec sm" disabled={busy || !dirty} onClick={() => editLocation(loc.id, { googleReviewUrl: value.trim() })}>
        Mentés
      </button>
    </div>
  );
}

function ReviewRequestSettings({ settings, updateSettings, busy, locations, editLocation }) {
  const realLocations = (locations || []).filter((l) => l.name !== "Tartalék");
  return (
    <div className="pult-section">
      <div className="pult-section-head"><ChatIcon width={16} height={16} />Google-értékelés kérés</div>
      <div className="settings-row">
        <div>
          <div className="settings-row-lbl">Automatikus értékelés-kérés</div>
          <div className="settings-row-desc">
            Néhány nappal egy szerviz-átadás vagy telefon-eladás után az ügyfél kap egy rövid
            üzenetet (WhatsApp, ha be van állítva, egyébként SMS) egy Google-értékelés linkkel.
            Nem érinti a saját készletes (előkészítés/garanciális) munkalapokat.
          </div>
        </div>
        <Toggle checked={!!settings.reviewRequestEnabled} disabled={busy} onChange={(v) => updateSettings({ reviewRequestEnabled: v })} />
      </div>
      {settings.reviewRequestEnabled && (
        <div className="settings-row">
          <div>
            <div className="settings-row-lbl">Hány nappal az átadás/eladás után menjen ki</div>
            <div className="settings-row-desc">2-3 nap a szokásos — legyen ideje kipróbálni, de még friss legyen az élmény.</div>
          </div>
          <input
            type="number" min={1} max={14} style={{ width: 64 }}
            value={settings.reviewRequestDelayDays}
            onChange={(e) => updateSettings({ reviewRequestDelayDays: Number(e.target.value) || 2 })}
          />
        </div>
      )}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #E5E7EB" }}>
        <div className="settings-row-lbl" style={{ marginBottom: 8 }}>Google-értékelés link helyszínenként</div>
        <div className="settings-row-desc" style={{ marginBottom: 10 }}>
          A "Írjon értékelést" linket a Google Cégprofilból lehet kimásolni (Cégprofil kezelése → Vélemények kérése).
          Amíg egy helyszínnek nincs beállítva, ott nem megy ki értékelés-kérés.
        </div>
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
      <input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} style={{ maxWidth: 220 }} />
      <input type="number" title="Pontköltség" value={f.pointCost} onChange={(e) => setF({ ...f, pointCost: e.target.value })} placeholder="pont" style={{ maxWidth: 90 }} />
      <input type="number" title="Nekünk mennyibe kerül (Lei)" value={f.ourCost} onChange={(e) => setF({ ...f, ourCost: e.target.value })} placeholder="költség (Lei)" style={{ maxWidth: 110 }} />
      <input type="number" title="Vevőnek mennyit ér (Lei)" value={f.customerValue} onChange={(e) => setF({ ...f, customerValue: e.target.value })} placeholder="érték (Lei)" style={{ maxWidth: 110 }} />
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
      <div className="pult-section-head"><SettingsIcon width={16} height={16} />Hűségpont-beváltási katalógus</div>
      <div className="settings-row-desc" style={{ marginBottom: 10 }}>
        Ezek a jutalmak jelennek meg beváltható tételként az ügyfél pontegyenlege alapján a Kliens-lapon. A pontszerzés (1 pont/Lei) és az ajánlói bónusz (200 pont) automatikus, nem itt állítható.
      </div>
      {sorted.map((r) => (
        <LoyaltyRewardRow key={r.id} reward={r} busy={busy} onSave={(f) => editLoyaltyReward(r.id, { ...r, ...f })} />
      ))}
      <div className="settings-row" style={{ alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10, paddingTop: 10, borderTop: "1px solid #E5E7EB" }}>
        <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Új jutalom neve" style={{ maxWidth: 220 }} />
        <input type="number" value={newPointCost} onChange={(e) => setNewPointCost(e.target.value)} placeholder="pont" style={{ maxWidth: 90 }} />
        <button
          type="button" className="btn sec sm" disabled={busy || !newLabel.trim() || !newPointCost}
          onClick={() => {
            addLoyaltyReward({ rewardKey: `${slugify(newLabel)}_${Date.now().toString(36)}`, label: newLabel.trim(), pointCost: newPointCost, ourCost: "", customerValue: "", active: true, sortOrder: sorted.length + 1 });
            setNewLabel(""); setNewPointCost("");
          }}
        >
          + Új jutalom
        </button>
      </div>
    </div>
  );
}

export default function SettingsTab({ isAdmin, profile, user, settings, updateSettings, busy, setChangePasswordModal, locations, loyaltyRewards, addLoyaltyReward, editLoyaltyReward, editLocation }) {
  return (
    <>
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

        {isAdmin && (
          <div className="pult-section">
            <div className="pult-section-head"><ChatIcon width={16} height={16} />Vásárlás utáni visszajelzés-kérés</div>
            <div className="settings-row">
              <div>
                <div className="settings-row-lbl">WhatsApp-üzenet telefon-vásárlás után</div>
                <div className="settings-row-desc">
                  Néhány nappal egy telefon-eladás után az ügyfél kap egy rövid "minden rendben?" üzenetet
                  Google-értékelés kéréssel, benne a hűségpont-egyenlegével. <b>Szándékosan kikapcsolva marad</b>,
                  amíg a hűségpont-rendszert ténylegesen el nem indítjuk az ügyfelek felé — ne kapjon valaki
                  pontokról szóló üzenetet egy programról, amiről még nem is tud.
                </div>
              </div>
              <Toggle checked={!!settings.loyaltyFollowupEnabled} disabled={busy} onChange={(v) => updateSettings({ loyaltyFollowupEnabled: v })} />
            </div>
            {settings.loyaltyFollowupEnabled && (
              <div className="settings-row">
                <div>
                  <div className="settings-row-lbl">Hány nappal a vásárlás után menjen ki</div>
                  <div className="settings-row-desc">Legyen elég idő kipróbálni a telefont, de még friss legyen az élmény — 2-4 nap a szokásos.</div>
                </div>
                <input
                  type="number" min={1} max={14} style={{ width: 64 }}
                  value={settings.loyaltyFollowupDays}
                  onChange={(e) => updateSettings({ loyaltyFollowupDays: Number(e.target.value) || 3 })}
                />
              </div>
            )}
          </div>
        )}

        {isAdmin && <ReviewRequestSettings settings={settings} updateSettings={updateSettings} busy={busy} locations={locations} editLocation={editLocation} />}
        {isAdmin && <CompanySettings settings={settings} updateSettings={updateSettings} busy={busy} />}
        {isAdmin && <SmartBillSettings settings={settings} updateSettings={updateSettings} busy={busy} locations={locations} />}
        {isAdmin && <LoyaltyRewardsSettings rewards={loyaltyRewards} addLoyaltyReward={addLoyaltyReward} editLoyaltyReward={editLoyaltyReward} busy={busy} />}
      </div>
    </>
  );
}
