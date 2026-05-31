ALTER TABLE "shops" DROP CONSTRAINT IF EXISTS "shops_owner_id_users_id_fk";--> statement-breakpoint
DROP TABLE IF EXISTS "accounts";--> statement-breakpoint
DROP TABLE IF EXISTS "sessions";--> statement-breakpoint
DROP TABLE IF EXISTS "users";--> statement-breakpoint
DROP TABLE IF EXISTS "verification_tokens";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shops_owner_idx" ON "shops" USING btree ("owner_id");
