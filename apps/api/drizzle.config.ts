import { config } from "dotenv";
import path from "node:path";
import type { Config } from "drizzle-kit";

// cwd is apps/api when run via pnpm/turbo → root .env is two levels up.
// Load root first, then any local apps/api/.env override.
config({ path: path.resolve(process.cwd(), "../../.env") });
config();

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
