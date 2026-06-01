import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  primaryKey,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);
export const deviceStatusEnum = pgEnum("device_status", [
  "pending",
  "active",
  "revoked",
]);
export const orientationEnum = pgEnum("orientation", ["landscape", "portrait"]);

/**
 * ---- Tenancy ----
 * Owners are managed by Supabase Auth (the `auth.users` table). We don't model
 * that table here; `ownerId` simply stores the Supabase auth user id (uuid).
 */
export const shops = pgTable(
  "shops",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id").notNull(), // = Supabase auth.users.id
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({ ownerIdx: index("shops_owner_idx").on(t.ownerId) }),
);

/** ---- Menu ---- */
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isAvailable: boolean("is_available").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({ shopIdx: index("categories_shop_idx").on(t.shopId) }),
);

export const items = pgTable(
  "items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    mediaUrl: text("media_url"),
    mediaType: mediaTypeEnum("media_type"),
    isAvailable: boolean("is_available").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    shopIdx: index("items_shop_idx").on(t.shopId),
    categoryIdx: index("items_category_idx").on(t.categoryId),
  }),
);

/** ---- Screens ---- */
export const screens = pgTable(
  "screens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    location: text("location"),
    orientation: orientationEnum("orientation").notNull().default("landscape"),
    theme: text("theme").notNull().default("default"),
    /** Bumped on any change affecting this screen; TVs use it to drop stale snapshots. */
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({ shopIdx: index("screens_shop_idx").on(t.shopId) }),
);

export const screenCategories = pgTable(
  "screen_categories",
  {
    screenId: uuid("screen_id")
      .notNull()
      .references(() => screens.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.screenId, t.categoryId] }),
    screenIdx: index("screen_categories_screen_idx").on(t.screenId),
  }),
);

/** ---- Devices (TVs) ---- */
export const devices = pgTable(
  "devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id").references(() => shops.id, { onDelete: "cascade" }),
    screenId: uuid("screen_id").references(() => screens.id, {
      onDelete: "set null",
    }),
    name: text("name"),
    hardwareId: text("hardware_id").notNull(),
    pairingCode: text("pairing_code"),
    pairingExpiresAt: timestamp("pairing_expires_at", { withTimezone: true }),
    claimTokenHash: text("claim_token_hash"),
    status: deviceStatusEnum("status").notNull().default("pending"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    codeIdx: index("devices_pairing_code_idx").on(t.pairingCode),
    screenIdx: index("devices_screen_idx").on(t.screenId),
  }),
);
