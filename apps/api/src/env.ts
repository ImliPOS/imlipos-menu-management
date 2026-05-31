import { config } from "dotenv";
import path from "node:path";
import { z } from "zod";

// cwd is apps/api when run via pnpm/turbo → load the monorepo-root .env,
// then any local apps/api/.env override.
config({ path: path.resolve(process.cwd(), "../../.env") });
config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  DEVICE_JWT_SECRET: z.string().min(16),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  // Supabase Storage (uses the project URL + service-role key, server-side only).
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(16),
  SUPABASE_STORAGE_BUCKET: z.string().default("menu-media"),
});

export const env = schema.parse(process.env);
