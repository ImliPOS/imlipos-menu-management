/**
 * Single source of truth for environment-specific service URLs.
 *
 * URLs are NOT secrets — the Render, Vercel and Supabase *project* URLs are all
 * public — so they live here in git, keyed by environment. Secrets (DB
 * password, service-role key, anon key, JWT secret) NEVER belong here; they
 * stay in each platform's dashboard, scoped per service/environment.
 *
 * The active environment is auto-derived from the deploy platform's branch
 * signal (see `resolveAppEnv`), so no URL is ever a value you edit on a branch
 * and merge: `dev` branch → `dev` URLs, `main` branch → `prod` URLs.
 */
export type AppEnv = "local" | "dev" | "prod";

export interface AppUrls {
  /** Express API origin (Render). Also used for Socket.IO. */
  apiUrl: string;
  /** Web app origin (Vercel) — used by the API for CORS. */
  webOrigin: string;
  /** Supabase project URL (Auth + Storage). */
  supabaseUrl: string;
}

const URLS: Record<AppEnv, AppUrls> = {
  local: {
    apiUrl: "http://localhost:4000",
    webOrigin: "http://localhost:3000",
    // No local Supabase — local dev shares the dev/test project.
    supabaseUrl: "https://vicerfokousxmbrytdhm.supabase.co",
  },
  dev: {
    apiUrl: "https://imlipos-menu-management-test.onrender.com",
    webOrigin: "https://imlipos-menu-management-test.vercel.app",
    supabaseUrl: "https://vicerfokousxmbrytdhm.supabase.co",
  },
  prod: {
    apiUrl: "https://imlipos-menu-management.onrender.com",
    webOrigin: "https://imlipos-menu-management-web.vercel.app",
    supabaseUrl: "https://jrxbgyjsabenvxstfpmw.supabase.co",
  },
};

function normalize(v: string | undefined): AppEnv | null {
  return v === "local" || v === "dev" || v === "prod" ? v : null;
}

/**
 * Resolve the active environment from whatever signal the current runtime
 * exposes. Priority:
 *   1. Explicit override: APP_ENV / NEXT_PUBLIC_APP_ENV / EXPO_PUBLIC_APP_ENV
 *   2. Vercel:  VERCEL_ENV="production" → prod, any preview branch → dev
 *   3. Render:  RENDER_GIT_BRANCH="main" → prod, any other branch → dev
 *   4. Fallback → local
 *
 * Only NEXT_PUBLIC_/EXPO_PUBLIC_ vars survive into browser/native bundles, so
 * those explicit overrides are how the client learns its environment (the web
 * build injects NEXT_PUBLIC_APP_ENV; the TV build sets EXPO_PUBLIC_APP_ENV per
 * EAS profile).
 *
 * IMPORTANT — do NOT alias `process.env` (e.g. `const env = process.env; env.X`)
 * or index it dynamically. The Next.js (DefinePlugin) and Expo (babel-preset-
 * expo) bundlers inline public vars by *textual* substitution of the literal
 * token `process.env.NEXT_PUBLIC_*` / `process.env.EXPO_PUBLIC_*` only; an
 * aliased read is never rewritten and resolves to undefined in the client
 * bundle, silently falling back to "local". Each public var below is therefore
 * read as a bare literal so it inlines at build time. The server-only vars
 * (APP_ENV / VERCEL_ENV / RENDER_GIT_BRANCH) stay behind a `process` guard so
 * their un-inlined access can't throw where `process` is absent (the browser).
 */
export function resolveAppEnv(): AppEnv {
  const hasProcess = typeof process !== "undefined" && !!process.env;

  // Public vars — literal reads so Next/Expo inline them into the client bundle.
  // NEXT_PUBLIC is safe to read unconditionally (web inlines it; RN's process
  // shim yields undefined). EXPO_PUBLIC stays guarded so its un-inlined web read
  // can't throw; on native the process shim makes the guard pass.
  const explicit =
    normalize(process.env.NEXT_PUBLIC_APP_ENV) ??
    (hasProcess ? normalize(process.env.EXPO_PUBLIC_APP_ENV) : null) ??
    (hasProcess ? normalize(process.env.APP_ENV) : null);
  if (explicit) return explicit;

  // Server-only branch signals — meaningful only in Node, guarded for the client.
  if (hasProcess) {
    if (process.env.VERCEL_ENV)
      return process.env.VERCEL_ENV === "production" ? "prod" : "dev";
    if (process.env.RENDER_GIT_BRANCH)
      return process.env.RENDER_GIT_BRANCH === "main" ? "prod" : "dev";
  }

  return "local";
}

/** Service URLs for the given (or auto-resolved) environment. */
export function appUrls(env: AppEnv = resolveAppEnv()): AppUrls {
  return URLS[env];
}
