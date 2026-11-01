import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/** Client Supabase pour le navigateur (session stockée dans des cookies). */
export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  const env = getSupabaseEnv();
  if (!env) return null;
  browserClient = createBrowserClient(env.url, env.key);
  return browserClient;
}
