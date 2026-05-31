import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Next only auto-loads env files from this app folder, not the monorepo root.
// Load the root .env here so NEXT_PUBLIC_* vars are available at build time.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../.env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Shared workspace package is TS source — let Next transpile it.
  transpilePackages: ["@imlipos/contracts"],
};
export default nextConfig;
