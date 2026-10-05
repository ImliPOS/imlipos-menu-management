import { pgSchema, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";

/**
 * READ-ONLY mapping of Supabase's `auth.users` table, used by the super-admin
 * routes to join shop owners to their auth profile in SQL (avoids paging
 * through `auth.admin.listUsers()`).
 *
 * Deliberately kept OUT of schema.ts: drizzle.config.ts points only at
 * schema.ts, so this table never appears in generated migrations. Never write
 * to it — Supabase owns this schema.
 */
const authSchema = pgSchema("auth");

export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }),
  lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true }),
  rawAppMetaData: jsonb("raw_app_meta_data"),
});
