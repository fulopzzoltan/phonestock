import { supabase, unwrap } from "../../lib/supabaseClient";
import { profileFromApi, settingsFromApi, vaultCredentialFromApi } from "../../lib/mappers";

export function createAdminActions(ctx) {
  const {
    setChangePasswordModal, setInfo, setInviteError, setInviteModal, setLocations, setSettings, setUsers,
    setVaultCredentials, user,
  } = ctx;
  const withBusy = (...a) => ctx.withBusy(...a);

  // SETTINGS (admin write, mindenki olvassa — SMS-kapcsolók, jelszóváltás onnan nyílik)
  async function updateSettings(patch) {
    await withBusy(async () => {
      const apiPatch = {};
      if ("smsOnTicketCreate" in patch) apiPatch.sms_on_ticket_create = patch.smsOnTicketCreate;
      if ("smsOnTicketReady" in patch) apiPatch.sms_on_ticket_ready = patch.smsOnTicketReady;
      if ("smsOnRepairLead" in patch) apiPatch.sms_on_repair_lead = patch.smsOnRepairLead;
      if ("smsOnBuybackOffer" in patch) apiPatch.sms_on_buyback_offer = patch.smsOnBuybackOffer;
      if ("loyaltyFollowupEnabled" in patch) apiPatch.loyalty_followup_enabled = patch.loyaltyFollowupEnabled;
      if ("loyaltyFollowupDays" in patch) apiPatch.loyalty_followup_days = patch.loyaltyFollowupDays;
      if ("reviewRequestEnabled" in patch) apiPatch.review_request_enabled = patch.reviewRequestEnabled;
      if ("reviewRequestDelayDays" in patch) apiPatch.review_request_delay_days = patch.reviewRequestDelayDays;
      if ("companyName" in patch) apiPatch.company_name = patch.companyName;
      if ("companyCui" in patch) apiPatch.company_cui = patch.companyCui;
      if ("companyAddress" in patch) apiPatch.company_address = patch.companyAddress;
      if ("companyPhone" in patch) apiPatch.company_phone = patch.companyPhone;
      if ("companyEmail" in patch) apiPatch.company_email = patch.companyEmail;
      if ("consignmentNoticeDays" in patch) apiPatch.consignment_notice_days = patch.consignmentNoticeDays;
      if ("smartbillDefaultSeries" in patch) apiPatch.smartbill_default_series = patch.smartbillDefaultSeries;
      if ("smartbillDefaultTaxName" in patch) apiPatch.smartbill_default_tax_name = patch.smartbillDefaultTaxName;
      apiPatch.updated_at = new Date().toISOString();
      apiPatch.updated_by = user.id;
      const r = unwrap(await supabase.from("app_settings").update(apiPatch).eq("id", true).select());
      setSettings(settingsFromApi(r[0]));
    });
  }
  async function editLocation(id, patch) {
    await withBusy(async () => {
      const apiPatch = {};
      if ("googleReviewUrl" in patch) apiPatch.google_review_url = patch.googleReviewUrl || null;
      if ("samedayPickupPointId" in patch) apiPatch.sameday_pickup_point_id = patch.samedayPickupPointId || null;
      const r = unwrap(await supabase.from("locations").update(apiPatch).eq("id", id).select());
      setLocations((prev) => prev.map((l) => (l.id === id ? r[0] : l)));
    });
  }
  // BELÉPÉSEK (jelszókezelő) — minden művelet SECURITY DEFINER RPC-n megy át, a jelszó
  // sosem kerül a normál customers/products-mintájú REST-lekérésekbe. A reveal minden
  // hívásnál újra lekéri és naplózza a szervert (ld. vault_credentials_password_manager
  // migráció) — szándékosan nem cache-eljük hosszú távra a kliensen.
  async function createVaultCredential(f) {
    const { data, error } = await supabase.rpc("create_vault_credential", {
      p_site_name: f.siteName, p_site_url: f.siteUrl || null, p_username: f.username || null,
      p_password: f.password, p_notes: f.notes || null, p_category: f.category || null, p_visibility: f.visibility,
    });
    if (error) throw error;
    const r = unwrap(await supabase.from("vault_credentials").select("*").eq("id", data).single());
    if (r) setVaultCredentials((prev) => [...prev, vaultCredentialFromApi(r)].sort((a, b) => a.siteName.localeCompare(b.siteName)));
  }
  async function updateVaultCredentialMeta(id, f) {
    const { error } = await supabase.rpc("update_vault_credential", {
      p_id: id, p_site_name: f.siteName, p_site_url: f.siteUrl || null, p_username: f.username || null,
      p_notes: f.notes || null, p_category: f.category || null, p_visibility: f.visibility,
    });
    if (error) throw error;
    setVaultCredentials((prev) => prev.map((c) => (c.id === id ? {
      ...c, siteName: f.siteName, siteUrl: f.siteUrl, username: f.username, notes: f.notes, category: f.category, visibility: f.visibility,
    } : c)));
  }
  async function changeVaultCredentialPassword(id, newPassword) {
    const { error } = await supabase.rpc("update_vault_credential_password", { p_id: id, p_new_password: newPassword });
    if (error) throw error;
  }
  async function deleteVaultCredential(id) {
    const { error } = await supabase.rpc("delete_vault_credential", { p_id: id });
    if (error) throw error;
    setVaultCredentials((prev) => prev.filter((c) => c.id !== id));
  }
  async function revealVaultCredential(id) {
    const { data, error } = await supabase.rpc("reveal_vault_credential", { p_id: id });
    if (error) throw new Error(error.message || "Nem sikerült lekérni a jelszót.");
    return data;
  }
  // USERS (admin only)
  async function updateUserProfile(id, patch) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("profiles").update(patch).eq("id", id).select());
      setUsers((prev) => prev.map((u) => (u.id === id ? profileFromApi(r[0]) : u)));
    });
  }
  async function inviteEmployee({ email, fullName, locationId }) {
    setInviteError("");
    await withBusy(async () => {
      const { data, error: fnError } = await supabase.functions.invoke("invite-employee", {
        body: { email, fullName, locationId },
      });
      if (fnError || data?.error) {
        let msg = data?.error || fnError?.message || "Meghívás sikertelen.";
        if (fnError?.context) {
          const body = await fnError.context.json().catch(() => null);
          if (body?.error) msg = body.error;
        }
        setInviteError(msg);
        return;
      }
      setInviteModal(false);
      setInfo(`Meghívó elküldve — ${email} emailben kap egy linket a jelszó beállításához.`);
      const usrs = unwrap(await supabase.from("profiles").select("*").order("created_at"));
      setUsers(usrs.map(profileFromApi));
    });
  }
  async function callManageEmployee(action, userId) {
    let ok = false;
    await withBusy(async () => {
      const { data, error: fnError } = await supabase.functions.invoke("manage-employee", {
        body: { action, userId, origin: window.location.origin },
      });
      if (fnError || data?.error) {
        let msg = data?.error || fnError?.message || "Művelet sikertelen.";
        if (fnError?.context) {
          const body = await fnError.context.json().catch(() => null);
          if (body?.error) msg = body.error;
        }
        throw new Error(msg);
      }
      ok = true;
    });
    return ok;
  }
  async function changeOwnPassword(newPassword) {
    await withBusy(async () => {
      const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
      if (pwError) throw new Error(pwError.message);
      setChangePasswordModal(false);
      setInfo("Jelszó módosítva.");
    });
  }
  async function resetEmployeePassword(userId, email) {
    const ok = await callManageEmployee("reset_password", userId);
    if (ok) setInfo(`Jelszó-visszaállító email elküldve — ${email}.`);
  }
  async function deleteEmployee(userId) {
    const ok = await callManageEmployee("delete", userId);
    if (ok) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setInfo("Felhasználó eltávolítva.");
    }
  }

  return {
    updateSettings, editLocation, createVaultCredential, updateVaultCredentialMeta,
    changeVaultCredentialPassword, deleteVaultCredential, revealVaultCredential, updateUserProfile,
    inviteEmployee, callManageEmployee, changeOwnPassword, resetEmployeePassword, deleteEmployee,
  };
}
