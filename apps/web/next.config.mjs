import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Next only auto-loads env files from this app folder, not the monorepo root.
// Load the root .env here so NEXT_PUBLIC_* vars are available at build time.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../.env") });

// Auto-derive the deploy environment from Vercel's system env: main → prod,
// any preview branch → dev. Inlined as NEXT_PUBLIC_ so the browser bundle can
// resolve its service URLs from the shared env map. Absent locally → the app
// falls back to "local" (localhost URLs).
const appEnv = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === "production"
    ? "prod"
    : "dev"
  : undefined;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Shared workspace package is TS source — let Next transpile it.
  transpilePackages: ["@imlipos/contracts"],
  ...(appEnv ? { env: { NEXT_PUBLIC_APP_ENV: appEnv } } : {}),
};
export default nextConfig;
