"use client";

import { createClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client (anon/publishable key). Handles owner sign-up/sign-in
 * and holds the session. We read the access token from here and send it as a
 * Bearer token to the Express API + Socket.IO.
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } },
);
