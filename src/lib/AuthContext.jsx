import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "./supabaseClient";
import { profileFromApi } from "./mappers";

const AuthContext = createContext(null);

// A Supabase auth kliens ritkán (hálózati/böngésző-specifikus okból) sosem oldja fel a
// promise-t egy sikertelen vagy beragadt kérésnél — ez időkorláttal biztosítja, hogy a
// bejelentkezés/kijelentkezés soha ne tudjon örökre "Kérlek várj..." állapotban maradni.
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

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const signOutInFlight = useRef(false);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return; }
    setProfileLoading(true);
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      setProfile(data ? profileFromApi(data) : null);
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

  async function signIn(email, password) {
    const result = await Promise.race([
      supabase.auth.signInWithPassword({ email, password }).then(({ error }) => (error ? { error } : { ok: true })),
      pollForSession(email).then((sess) => (sess ? { ok: true, session: sess } : { error: new Error("Időtúllépés — nincs válasz a szervertől. Próbáld újra.") })),
    ]);
    if (result.error) throw new Error(result.error.message);
    if (result.session) {
      // A beragadt promise miatt a normál onAuthStateChange esemény lekéshet vagy sosem
      // fusson le — a session-t itt manuálisan is alkalmazzuk, hogy a UI ne várjon rá tovább.
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
      // A szerveres kijelentkezés hibázhat (pl. már érvénytelen/törölt session), vagy akár
      // be is ragadhat (a kliens megpróbálja frissíteni a lejárt tokent kijelentkezés előtt) —
      // ilyenkor legfeljebb 4 mp után a helyi munkamenetet akkor is töröljük, hogy a felhasználó
      // soha ne ragadhasson be bejelentkezve.
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

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading: session === undefined || (session && profileLoading && !profile),
    // Bejelentkezve van, a profil-lekérdezés lezárult, de nincs profiles sor — ilyen pl. egy
    // ügyfél-fiók (customer_profiles), aminek szándékosan nincs admin/alkalmazotti profilja.
    // Ezt külön kell kezelni a "van profil, csak nincs helyszín" állapottól (ld. App.jsx).
    noStaffProfile: !!session && !profileLoading && !profile,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
