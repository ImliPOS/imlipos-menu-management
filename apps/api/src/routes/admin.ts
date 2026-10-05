import { Router } from "express";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import {
  adminCustomersQuery,
  assignSubscriptionSchema,
  createPlanSchema,
  growthQuery,
  subscriptionStatus,
  updatePlanSchema,
  updateSubscriptionSchema,
} from "@imlipos/contracts";
import { z } from "zod";
import { db, schema } from "../db/client.js";
import { authUsers } from "../db/authSchema.js";
import { requireSuperAdmin } from "../middleware/auth.js";
import { toPlanJson } from "../lib/plans.js";

const { shops, items, screens, devices, plans, subscriptions } = schema;

/** Cross-tenant platform-operator API. Everything here is super-admin only. */
export const adminRouter = Router();
adminRouter.use(requireSuperAdmin);

/** A device is "online" if it heartbeat within this window (matches web). */
const ONLINE_WINDOW = sql`now() - interval '90 seconds'`;

/** Subscriptions considered live (at most one per shop via partial unique index). */
const LIVE_STATUSES = ["trialing", "active"] as const;

/** ---- Customers ---- */

adminRouter.get("/customers", async (req, res) => {
  const parsed = adminCustomersQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { search, page, pageSize } = parsed.data;

  const filter = search
    ? or(
        ilike(shops.name, `%${search}%`),
        ilike(authUsers.email, `%${search}%`),
      )
    : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        shopId: shops.id,
        shopName: shops.name,
        shopCreatedAt: shops.createdAt,
        ownerId: shops.ownerId,
        ownerEmail: authUsers.email,
        ownerLastSignInAt: authUsers.lastSignInAt,
        // Fully qualify both sides: Drizzle renders bare column tokens
        // unqualified in join-free queries, and an unqualified "id" inside the
        // subquery would resolve to the inner table's own id.
        deviceCount: sql<number>`(select count(*)::int from ${devices} where ${devices}."shop_id" = ${shops}."id")`,
        screenCount: sql<number>`(select count(*)::int from ${screens} where ${screens}."shop_id" = ${shops}."id")`,
        itemCount: sql<number>`(select count(*)::int from ${items} where ${items}."shop_id" = ${shops}."id")`,
        subscriptionId: subscriptions.id,
        subscriptionStatus: subscriptions.status,
        subscriptionEndsAt: subscriptions.endsAt,
        planName: plans.name,
      })
      .from(shops)
      .leftJoin(authUsers, eq(authUsers.id, shops.ownerId))
      .leftJoin(
        subscriptions,
        and(
          eq(subscriptions.shopId, shops.id),
          inArray(subscriptions.status, [...LIVE_STATUSES]),
        ),
      )
      .leftJoin(plans, eq(plans.id, subscriptions.planId))
      .where(filter)
      .orderBy(desc(shops.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(shops)
      .leftJoin(authUsers, eq(authUsers.id, shops.ownerId))
      .where(filter),
  ]);

  res.json({
    rows: rows.map((r) => ({
      shopId: r.shopId,
      shopName: r.shopName,
      shopCreatedAt: r.shopCreatedAt,
      ownerId: r.ownerId,
      ownerEmail: r.ownerEmail,
      ownerLastSignInAt: r.ownerLastSignInAt,
      deviceCount: r.deviceCount,
      screenCount: r.screenCount,
      itemCount: r.itemCount,
      subscription: r.subscriptionId
        ? {
            id: r.subscriptionId,
            planName: r.planName ?? "",
            status: r.subscriptionStatus,
            endsAt: r.subscriptionEndsAt,
          }
        : null,
    })),
    total: totalRow?.total ?? 0,
    page,
    pageSize,
  });
});

adminRouter.get("/customers/:shopId", async (req, res) => {
  const shopId = req.params.shopId;

  const [shopRow] = await db
    .select({
      shopId: shops.id,
      shopName: shops.name,
      shopCreatedAt: shops.createdAt,
      ownerId: shops.ownerId,
      ownerEmail: authUsers.email,
      ownerCreatedAt: authUsers.createdAt,
      ownerLastSignInAt: authUsers.lastSignInAt,
    })
    .from(shops)
    .leftJoin(authUsers, eq(authUsers.id, shops.ownerId))
    .where(eq(shops.id, shopId))
    .limit(1);
  if (!shopRow) return res.status(404).json({ error: "Shop not found" });

  const [deviceRows, screenRows, subRows, [itemCount], [categoryCount]] =
    await Promise.all([
    db
      .select({
        id: devices.id,
        name: devices.name,
        status: devices.status,
        lastSeenAt: devices.lastSeenAt,
        online: sql<boolean>`${devices.lastSeenAt} > ${ONLINE_WINDOW}`,
        screenName: screens.name,
      })
      .from(devices)
      .leftJoin(screens, eq(screens.id, devices.screenId))
      .where(eq(devices.shopId, shopId))
      .orderBy(desc(devices.createdAt)),
    db
      .select({ id: screens.id, name: screens.name, location: screens.location })
      .from(screens)
      .where(eq(screens.shopId, shopId)),
    db
      .select({
        sub: subscriptions,
        planName: plans.name,
        planDeviceLimit: plans.deviceLimit,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(eq(subscriptions.shopId, shopId))
      .orderBy(desc(subscriptions.createdAt)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(items)
      .where(eq(items.shopId, shopId)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.categories)
      .where(eq(schema.categories.shopId, shopId)),
  ]);

  res.json({
    shopId: shopRow.shopId,
    shopName: shopRow.shopName,
    shopCreatedAt: shopRow.shopCreatedAt,
    owner: {
      id: shopRow.ownerId,
      email: shopRow.ownerEmail,
      createdAt: shopRow.ownerCreatedAt,
      lastSignInAt: shopRow.ownerLastSignInAt,
    },
    counts: {
      devices: deviceRows.length,
      screens: screenRows.length,
      items: itemCount?.n ?? 0,
      categories: categoryCount?.n ?? 0,
    },
    devices: deviceRows,
    screens: screenRows,
    subscriptions: subRows.map(({ sub, planName, planDeviceLimit }) => ({
      ...sub,
      planName,
      planDeviceLimit,
    })),
  });
});

/** ---- Metrics ---- */

adminRouter.get("/metrics/overview", async (_req, res) => {
  const [
    [shopCount],
    [itemCount],
    [screenCount],
    deviceByStatus,
    [deviceOnline],
    subByStatus,
    subByPlan,
  ] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(shops),
    db.select({ n: sql<number>`count(*)::int` }).from(items),
    db.select({ n: sql<number>`count(*)::int` }).from(screens),
    db
      .select({ status: devices.status, n: sql<number>`count(*)::int` })
      .from(devices)
      .groupBy(devices.status),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(devices)
      .where(sql`${devices.lastSeenAt} > ${ONLINE_WINDOW}`),
    db
      .select({ status: subscriptions.status, n: sql<number>`count(*)::int` })
      .from(subscriptions)
      .groupBy(subscriptions.status),
    db
      .select({ planName: plans.name, n: sql<number>`count(*)::int` })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(inArray(subscriptions.status, [...LIVE_STATUSES]))
      .groupBy(plans.name),
  ]);

  const byStatus = Object.fromEntries(deviceByStatus.map((r) => [r.status, r.n]));
  res.json({
    shops: shopCount?.n ?? 0,
    items: itemCount?.n ?? 0,
    screens: screenCount?.n ?? 0,
    devices: {
      total: deviceByStatus.reduce((sum, r) => sum + r.n, 0),
      byStatus,
      online: deviceOnline?.n ?? 0,
    },
    subscriptions: {
      byStatus: Object.fromEntries(subByStatus.map((r) => [r.status, r.n])),
      byPlan: subByPlan.map((r) => ({ planName: r.planName, count: r.n })),
    },
  });
});

adminRouter.get("/metrics/growth", async (req, res) => {
  const parsed = growthQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { interval, months } = parsed.data;
  // interval is Zod-whitelisted to "week" | "month" before reaching sql.raw.
  const trunc = sql.raw(`'${interval}'`);
  const since = sql`now() - make_interval(months => ${months})`;

  const series = (table: typeof shops | typeof devices) =>
    db
      .select({
        bucket: sql<string>`date_trunc(${trunc}, ${table.createdAt})`,
        count: sql<number>`count(*)::int`,
      })
      .from(table)
      .where(sql`${table.createdAt} >= ${since}`)
      .groupBy(sql`date_trunc(${trunc}, ${table.createdAt})`)
      .orderBy(sql`date_trunc(${trunc}, ${table.createdAt})`);

  const [shopSeries, deviceSeries] = await Promise.all([
    series(shops),
    series(devices),
  ]);
  res.json({ interval, shops: shopSeries, devices: deviceSeries });
});

/** ---- Plans ---- */

adminRouter.get("/plans", async (_req, res) => {
  const rows = await db.select().from(plans).orderBy(plans.createdAt);
  res.json(rows.map(toPlanJson));
});

adminRouter.post("/plans", async (req, res) => {
  const parsed = createPlanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { priceMonthly, ...rest } = parsed.data;
  const [row] = await db
    .insert(plans)
    .values({
      ...rest,
      priceMonthly: priceMonthly == null ? null : priceMonthly.toFixed(2),
    })
    .returning();
  res.status(201).json(toPlanJson(row!));
});

adminRouter.patch("/plans/:id", async (req, res) => {
  const parsed = updatePlanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { priceMonthly, ...rest } = parsed.data;
  const [row] = await db
    .update(plans)
    .set({
      ...rest,
      ...(priceMonthly !== undefined
        ? { priceMonthly: priceMonthly === null ? null : priceMonthly.toFixed(2) }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(plans.id, req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: "Plan not found" });
  res.json(toPlanJson(row));
});

/** ---- Subscriptions ---- */

const subscriptionsQuery = z.object({ status: subscriptionStatus.optional() });

adminRouter.get("/subscriptions", async (req, res) => {
  const parsed = subscriptionsQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const rows = await db
    .select({
      sub: subscriptions,
      planName: plans.name,
      planDeviceLimit: plans.deviceLimit,
      shopName: shops.name,
      ownerEmail: authUsers.email,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .innerJoin(shops, eq(shops.id, subscriptions.shopId))
    .leftJoin(authUsers, eq(authUsers.id, shops.ownerId))
    .where(
      parsed.data.status
        ? eq(subscriptions.status, parsed.data.status)
        : undefined,
    )
    .orderBy(desc(subscriptions.createdAt));

  res.json(
    rows.map(({ sub, ...rest }) => ({
      ...sub,
      ...rest,
    })),
  );
});

/** Assign/change a shop's plan: cancels any live subscription, inserts the new one. */
adminRouter.post("/customers/:shopId/subscription", async (req, res) => {
  const parsed = assignSubscriptionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const shopId = req.params.shopId;
  const input = parsed.data;

  const [shop] = await db
    .select({ id: shops.id })
    .from(shops)
    .where(eq(shops.id, shopId))
    .limit(1);
  if (!shop) return res.status(404).json({ error: "Shop not found" });

  const [plan] = await db
    .select({ id: plans.id, isActive: plans.isActive })
    .from(plans)
    .where(eq(plans.id, input.planId))
    .limit(1);
  if (!plan) return res.status(404).json({ error: "Plan not found" });
  if (!plan.isActive) return res.status(400).json({ error: "Plan is retired" });

  const row = await db.transaction(async (tx) => {
    await tx
      .update(subscriptions)
      .set({ status: "cancelled", endsAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(subscriptions.shopId, shopId),
          inArray(subscriptions.status, [...LIVE_STATUSES]),
        ),
      );
    const [inserted] = await tx
      .insert(subscriptions)
      .values({
        shopId,
        planId: input.planId,
        status: input.status ?? "active",
        startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        deviceLimitOverride: input.deviceLimitOverride ?? null,
        notes: input.notes ?? null,
      })
      .returning();
    return inserted!;
  });
  res.status(201).json(row);
});

adminRouter.patch("/subscriptions/:id", async (req, res) => {
  const parsed = updateSubscriptionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const input = parsed.data;

  const [row] = await db
    .update(subscriptions)
    .set({
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.startsAt !== undefined
        ? { startsAt: new Date(input.startsAt) }
        : {}),
      ...(input.endsAt !== undefined
        ? { endsAt: input.endsAt === null ? null : new Date(input.endsAt) }
        : {}),
      ...(input.deviceLimitOverride !== undefined
        ? { deviceLimitOverride: input.deviceLimitOverride }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: "Subscription not found" });
  res.json(row);
});
