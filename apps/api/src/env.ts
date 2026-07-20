import { config } from "dotenv";
import path from "node:path";
import { z } from "zod";
import { appUrls, resolveAppEnv } from "@imlipos/contracts";

// cwd is apps/api when run via pnpm/turbo → load the monorepo-root .env,
// then any local apps/api/.env override.
config({ path: path.resolve(process.cwd(), "../../.env") });
config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  DEVICE_JWT_SECRET: z.string().min(16),
  // URLs auto-derive from the branch (see @imlipos/contracts env map); set these
  // only to override. WEB_ORIGIN may be a comma-separated allow-list.
  WEB_ORIGIN: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  // Secrets — always set per service in the Render dashboard.
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(16),
  SUPABASE_STORAGE_BUCKET: z.string().default("menu-media"),
  // Payment gateway for subscription checkout. Widen the enum (and add the
  // provider's key env vars) when a real gateway lands; 'mock' simulates
  // payment and enables the dev-only mock-pay endpoint.
  BILLING_PROVIDER: z.enum(["mock"]).default("mock"),
});

const parsed = schema.parse(process.env);

// dev branch → dev URLs, main → prod URLs, local → localhost.
const APP_ENV = resolveAppEnv();
const urls = appUrls(APP_ENV);

export const env = {
  ...parsed,
  APP_ENV,
  // Both browser apps (owner web + super-admin console) need CORS access; a
  // manual WEB_ORIGIN override must therefore list both origins.
  WEB_ORIGIN: parsed.WEB_ORIGIN ?? `${urls.webOrigin},${urls.adminOrigin}`,
  SUPABASE_URL: parsed.SUPABASE_URL ?? urls.supabaseUrl,
};

/** Allowed CORS origins, parsed from the comma-separated WEB_ORIGIN. */
export const webOrigins = env.WEB_ORIGIN.split(",")
  .map((o) => o.trim().replace(/\/$/, "")) // tolerate trailing slashes
  .filter(Boolean);

/** cors `origin` option: allow listed origins (and same-origin/no-origin requests). */
export const corsOrigin = (
  origin: string | undefined,
  cb: (err: Error | null, allow?: boolean) => void,
) => {
  // No Origin header = same-origin, curl, or native app (TV) → allow.
  if (!origin) return cb(null, true);
  cb(null, webOrigins.includes(origin.replace(/\/$/, "")));
};
