import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  boolean,
  timestamp,
  numeric,
  primaryKey,
  index,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import type { DeviceLayout } from "@imlipos/contracts";

export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);
export const deviceStatusEnum = pgEnum("device_status", [
  "pending",
  "active",
  "revoked",
]);
export const orientationEnum = pgEnum("orientation", ["landscape", "portrait"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "expired",
  "cancelled",
]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "failed",
  "cancelled",
]);

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
    isFeatured: boolean("is_featured").notNull().default(false),
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
    screenWidth: integer("screen_width"),
    screenHeight: integer("screen_height"),
    screenScale: real("screen_scale"), // device pixel ratio (dp = px / scale)
    layout: jsonb("layout").$type<DeviceLayout>(),
    /** Extra clockwise rotation (0/90/180/270) applied on top of the
     *  orientation-derived one, for panels mounted turned or upside down.
     *  Nullable with no default: existing displays stay on NULL and render
     *  exactly as they did before this column existed. */
    rotation: integer("rotation"),
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

/**
 * ---- Plans & subscriptions (super-admin managed) ----
 * No payment provider yet: plans are catalog rows and subscriptions are
 * assigned manually from the admin console. Price is display-only.
 */
export const plans = pgTable("plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  deviceLimit: integer("device_limit").notNull().default(1),
  priceMonthly: numeric("price_monthly", { precision: 10, scale: 2 }),
  /** Retired plans keep history but can't be assigned to new subscriptions. */
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    startsAt: timestamp("starts_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** null = open-ended. */
    endsAt: timestamp("ends_at", { withTimezone: true }),
    /** null = use the plan's deviceLimit. */
    deviceLimitOverride: integer("device_limit_override"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    shopIdx: index("subscriptions_shop_idx").on(t.shopId),
    // Per-licence model: a shop may hold multiple live subscriptions, one per
    // paid display licence — so there is no single-live-subscription index.
  }),
);

/**
 * Checkout orders for subscription purchases. Provider-agnostic: `provider`
 * is 'mock' until a real gateway (Razorpay/Stripe) is integrated; the
 * provider's own ids land in providerOrderId/providerPaymentId.
 */
export const subscriptionOrders = pgTable(
  "subscription_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    /** Snapshot of the plan price at checkout time. */
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("INR"),
    status: orderStatusEnum("status").notNull().default("pending"),
    provider: text("provider").notNull(),
    providerOrderId: text("provider_order_id"),
    providerPaymentId: text("provider_payment_id"),
    /** Set once paid — the subscription this order created. */
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    shopIdx: index("subscription_orders_shop_idx").on(t.shopId),
    providerOrderIdx: index("subscription_orders_provider_order_idx").on(
      t.providerOrderId,
    ),
  }),
);
