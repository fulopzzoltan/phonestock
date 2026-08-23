import { createContext, useContext, useEffect, useState, useCallback } from "react";
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

export function CustomerAuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

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
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
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
    const { error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }), 8000);
    if (error) throw new Error(error.message);
  }

  async function signOut() {
    // A szerveres kijelentkezés hibázhat, vagy akár be is ragadhat (a kliens megpróbálja
    // frissíteni a lejárt tokent kijelentkezés előtt) — ilyenkor legfeljebb 4 mp után a
    // helyi munkamenetet akkor is töröljük, hogy a felhasználó soha ne ragadhasson be.
    const { error } = await withTimeout(supabase.auth.signOut(), 4000);
    if (error) {
      await supabase.auth.signOut({ scope: "local" });
    }
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading: session === undefined || (session && profileLoading && !profile),
    // Bejelentkezve van, de nincs customer_profiles sora — pl. egy staff-fiók, ami
    // (tévedésből) a /fiok oldalon próbál bejelentkezni admin-e-maillel.
    noCustomerProfile: !!session && !profileLoading && !profile,
    signUp,
    signIn,
    signOut,
  };

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  return ctx;
}
