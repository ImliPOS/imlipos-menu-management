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
  // Payment gateway for subscription checkout. 'mock' simulates payment and
  // enables the dev-only mock-pay endpoint; 'phonepe' uses PhonePe PG
  // Standard Checkout v2 (hosted redirect page).
  BILLING_PROVIDER: z.enum(["mock", "phonepe"]).default("mock"),
  // PhonePe PG credentials (Business dashboard → Developer Settings). All
  // required when BILLING_PROVIDER=phonepe. 'sandbox' hits api-preprod.
  PHONEPE_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  PHONEPE_CLIENT_ID: z.string().optional(),
  PHONEPE_CLIENT_SECRET: z.string().optional(),
  PHONEPE_CLIENT_VERSION: z.string().default("1"),
  // Webhook basic-auth pair, as configured on the PhonePe dashboard when
  // registering the webhook URL (we verify SHA256(username:password)).
  PHONEPE_WEBHOOK_USERNAME: z.string().optional(),
  PHONEPE_WEBHOOK_PASSWORD: z.string().optional(),
});

const parsed = schema
  .superRefine((val, ctx) => {
    if (val.BILLING_PROVIDER !== "phonepe") return;
    for (const key of [
      "PHONEPE_CLIENT_ID",
      "PHONEPE_CLIENT_SECRET",
      "PHONEPE_WEBHOOK_USERNAME",
      "PHONEPE_WEBHOOK_PASSWORD",
    ] as const) {
      if (!val[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when BILLING_PROVIDER=phonepe`,
        });
      }
    }
  })
  .parse(process.env);

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

/**
 * The owner web app's origin — where payment gateways redirect the customer
 * after checkout. First WEB_ORIGIN entry by convention (web before admin).
 */
export const webAppOrigin = webOrigins[0]!;

/** cors `origin` option: allow listed origins (and same-origin/no-origin requests). */
export const corsOrigin = (
  origin: string | undefined,
  cb: (err: Error | null, allow?: boolean) => void,
) => {
  // No Origin header = same-origin, curl, or native app (TV) → allow.
  if (!origin) return cb(null, true);
  cb(null, webOrigins.includes(origin.replace(/\/$/, "")));
};
