"use client";

import { createClient } from "@supabase/supabase-js";
import { appUrls, resolveAppEnv } from "@imlipos/contracts";

// Project URL auto-derives from the branch; the anon key is a per-project secret
// and must be set in the Vercel dashboard (scoped per environment).
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? appUrls(resolveAppEnv()).supabaseUrl;

/**
 * Browser Supabase client (anon/publishable key). Handles owner sign-up/sign-in
 * and holds the session. We read the access token from here and send it as a
 * Bearer token to the Express API + Socket.IO.
 */
export const supabase = createClient(
  SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } },
);
