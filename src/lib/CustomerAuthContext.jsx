import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "./supabaseClient";
import { customerProfileFromApi } from "./mappers";

const CustomerAuthContext = createContext(null);

// A Supabase auth kliens ritkán (hálózati/böngésző-specifikus okból) sosem oldja fel a
// promise-t egy sikertelen vagy beragadt kérésnél — ez időkorláttal biztosítja, hogy a
// be-/kijelentkezés/regisztráció soha ne tudjon örökre "Kérlek várj..." állapotban maradni.
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve({ error: new Error("Időtúllépés — nincs válasz a szervertől. Próbáld újra.") }), ms)),
  ]);
}

// Ismert supabase-js v2 hiba (navigator.locks deadlock a session mentésekor —
// https://github.com/supabase/supabase-js/issues/2013): a signInWithPassword promise néha
// sosem oldódik fel, PEDIG a bejelentkezés a szerveren sikeres és a session a háttérben
// ténylegesen létrejön. Emiatt a promise mellett a sessiönt is pollozzuk — amelyik előbb
// megvan, azt fogadjuk el, ahelyett hogy a beragadt promise-ra várnánk másodpercekig.
async function pollForSession(matchEmail) {
  for (let i = 0; i < 16; i++) {
    await new Promise((r) => setTimeout(r, 250));
    const { data } = await supabase.auth.getSession();
    if (data.session && data.session.user?.email === matchEmail) return data.session;
  }
  return null;
}

export function CustomerAuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const signOutInFlight = useRef(false);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return; }
    setProfileLoading(true);
    try {
      const { data, error } = await supabase.from("customer_profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      setProfile(data ? customerProfileFromApi(data) : null);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      if (data.session?.user?.id) loadProfile(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      setSession(sess ?? null);
      if (sess?.user?.id) loadProfile(sess.user.id);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  async function signUp(email, password, fullName, phone) {
    const { error } = await withTimeout(supabase.auth.signUp({
      email, password,
      options: { data: { is_customer: true, full_name: fullName, phone } },
    }), 8000);
    if (error) throw new Error(error.message);
  }

  async function signIn(email, password) {
    const result = await Promise.race([
      supabase.auth.signInWithPassword({ email, password }).then(({ error }) => (error ? { error } : { ok: true })),
      pollForSession(email).then((sess) => (sess ? { ok: true, session: sess } : { error: new Error("Időtúllépés — nincs válasz a szervertől. Próbáld újra.") })),
    ]);
    if (result.error) throw new Error(result.error.message);
    if (result.session) {
      setSession(result.session);
      loadProfile(result.session.user.id);
    }
  }

  async function signOut() {
    // Ha a felhasználó türelmetlenül többször is a Kijelentkezésre kattint, mielőtt az első
    // kattintás lezajlana, ne induljon el több párhuzamos kijelentkezés (ez okozta a "Session
    // not found" hibát a második kattintásnál).
    if (signOutInFlight.current) return;
    signOutInFlight.current = true;
    try {
      // A szerveres kijelentkezés hibázhat, vagy akár be is ragadhat (a kliens megpróbálja
      // frissíteni a lejárt tokent kijelentkezés előtt) — ilyenkor legfeljebb 4 mp után a
      // helyi munkamenetet akkor is töröljük, hogy a felhasználó soha ne ragadhasson be.
      const { error } = await withTimeout(supabase.auth.signOut(), 4000);
      if (error) {
        await supabase.auth.signOut({ scope: "local" });
      }
      // Ne az onAuthStateChange eseményre várjunk (az is elmaradhat/késhet, ugyanúgy, mint
      // bejelentkezéskor) — a UI-t itt azonnal, kézzel is kijelentkezett állapotba állítjuk.
      setSession(null);
      setProfile(null);
    } finally {
      signOutInFlight.current = false;
    }
  }

  async function resetPassword(email) {
    const { error } = await withTimeout(
      supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/fiok` }),
      8000
    );
    if (error) throw new Error(error.message);
  }

  async function updatePassword(newPassword) {
    const { error } = await withTimeout(supabase.auth.updateUser({ password: newPassword }), 8000);
    if (error) throw new Error(error.message);
    setPasswordRecovery(false);
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading: session === undefined || (session && profileLoading && !profile),
    // Bejelentkezve van, de nincs customer_profiles sora — pl. egy staff-fiók, ami
    // (tévedésből) a /fiok oldalon próbál bejelentkezni admin-e-maillel.
    noCustomerProfile: !!session && !profileLoading && !profile,
    passwordRecovery,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
  };

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  return ctx;
}
