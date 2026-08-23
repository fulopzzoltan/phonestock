import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// autoRefreshToken kikapcsolva: a Supabase auth kliens háttérben futó, időzített
// token-frissítése (auto-refresh tick) ismerten ütközhet a foreground be-/kijelentkezéssel
// (lásd github.com/supabase/supabase-js/issues/2013, github.com/supabase/auth-js
// lockless-coordination migrációs jegyzet a "_autoRefreshTokenTick" egyidejűségi
// hibáiról) — ez okozta a beragadó/lelassult bejelentkezést. Enélkül a munkamenet kb.
// egy óra után lejár (ilyenkor a felhasználónak újra be kell jelentkeznie), de a
// be-/kijelentkezés maga megbízhatóan, gyorsan lezajlik.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false },
});

export function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// PostgREST alapból max 1000 sort ad vissza egy kérésre — lapozva kérjük le, hogy
// nagyobb táblák (pl. ügyfelek, munkalapok) ne vágódjanak le csendben.
const PAGE_SIZE = 1000;
export async function fetchAllRows(queryFactory) {
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await queryFactory().range(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    all = all.concat(data || []);
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return { data: all, error: null };
}
