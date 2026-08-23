import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { customerProfileFromApi } from "./mappers";

const CustomerAuthContext = createContext(null);

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
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { is_customer: true, full_name: fullName, phone } },
    });
    if (error) throw new Error(error.message);
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      // A szerveres kijelentkezés hibázhat (pl. már érvénytelen/törölt session) —
      // ilyenkor a helyi munkamenetet akkor is töröljük, hogy ne ragadjon be a felhasználó.
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
