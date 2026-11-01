import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (_supabaseClient) {
    return _supabaseClient;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  _supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return _supabaseClient;
}
