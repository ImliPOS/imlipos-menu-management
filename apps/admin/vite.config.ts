import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Environment resolution mirrors @imlipos/contracts resolveAppEnv(): Vercel
// production → prod, Vercel preview → dev, local → local. VITE_APP_ENV is the
// explicit override.
const appEnv =
  process.env.VITE_APP_ENV ??
  (process.env.VERCEL_ENV === "production"
    ? "prod"
    : process.env.VERCEL_ENV
      ? "dev"
      : "local");

export default defineConfig({
  plugins: [react()],
  server: { port: 3001 },
  // Load VITE_* vars from the monorepo-root .env (same convention as api/web).
  envDir: path.resolve(__dirname, "../.."),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  // contracts' resolveAppEnv() reads process.env.NEXT_PUBLIC_APP_ENV as a bare
  // literal (inlined by Next's bundler). Vite has no process shim, so inline it
  // here too — this also short-circuits before any other process.env access.
  define: {
    "process.env.NEXT_PUBLIC_APP_ENV": JSON.stringify(appEnv),
  },
});
