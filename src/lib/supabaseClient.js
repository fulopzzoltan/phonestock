import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
