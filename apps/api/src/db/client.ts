import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";
import { env } from "../env.js";

/**
 * Single pooled client for the long-running API.
 * Point DATABASE_URL at Supabase's pooled (Supavisor/pgBouncer) connection
 * string. `prepare: false` is required when using a transaction pooler.
 */
const queryClient = postgres(env.DATABASE_URL, { prepare: false, max: 10 });

export const db = drizzle(queryClient, { schema });
export { schema };
