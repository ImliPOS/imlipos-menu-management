import { createClient } from "@supabase/supabase-js";
import { env } from "../env.js";

/**
 * Server-side Supabase client using the service-role key. Used for:
 *  - Storage (signed upload URLs)
 *  - Auth: validating owner access tokens via auth.getUser(jwt)
 * The service-role key bypasses RLS and must never leave the backend.
 */
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
