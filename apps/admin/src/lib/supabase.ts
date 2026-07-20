import { createClient } from "@supabase/supabase-js";
import { appUrls, resolveAppEnv } from "@imlipos/contracts";

// Project URL auto-derives from the environment (define block in vite.config
// inlines NEXT_PUBLIC_APP_ENV for resolveAppEnv); the anon key is set per
// environment (root .env locally, Vercel dashboard when deployed).
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? appUrls(resolveAppEnv()).supabaseUrl;

export const supabase = createClient(
  SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } },
);
