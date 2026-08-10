import { Router } from "express";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { checkoutInputSchema } from "@imlipos/contracts";
import { db, schema } from "../db/client.js";
import { requireOwner, shopId } from "../middleware/auth.js";
import {
  getProvider,
  fulfillOrder,
  failOrder,
  WebhookVerificationError,
} from "../billing/index.js";
import { LIVE_STATUSES, getDeviceEntitlement } from "../billing/limits.js";
import { toOrderJson, toPlanJson } from "../lib/plans.js";
import { env } from "../env.js";

const { shops, plans, subscriptions, subscriptionOrders, devices, screens, items, categories } =
  schema;

/** Owner-facing billing: plan catalog, own subscription, checkout. */
export const billingRouter = Router();
billingRouter.use(requireOwner);

/**
 * Payment gateway webhooks. Mounted separately in index.ts with a raw body
 * parser (signature verification needs the exact bytes) BEFORE express.json.
 * The provider verifies auth and normalizes the event; fulfillment/failure is
 * provider-agnostic and idempotent, so gateway retries are safe.
 */
export const billingWebhookRouter = Router();
billingWebhookRouter.post("/:provider", async (req, res) => {
  const provider = getProvider();
  if (req.params.provider !== provider.name) {
    return res.status(404).json({ error: "Unknown provider" });
  }
  let result;
  try {
    result = await provider.handleWebhook(req);
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("[billing] webhook error:", err);
    // 5xx → the gateway retries later.
    return res.status(500).json({ error: "Webhook processing failed" });
  }
  // Event we don't act on (refunds, still-pending) — acknowledge and move on.
  if (!result) return res.json({ received: true });

  if (result.outcome === "paid") {
    await fulfillOrder(result.orderId, result.providerPaymentId);
  } else {
    await failOrder(result.orderId, result.providerPaymentId);
  }
  res.json({ received: true });
});

/** Active plans, cheapest first (nulls treated as 0 by coalesce ordering). */
billingRouter.get("/plans", async (_req, res) => {
  const rows = await db
    .select()
    .from(plans)
    .where(eq(plans.isActive, true))
    .orderBy(asc(plans.priceMonthly));
  res.json(rows.map(toPlanJson));
});

/** Own display licences (subscriptions) — active first, newest first. */
billingRouter.get("/subscription", async (req, res) => {
  const rows = await db
    .select({
      sub: subscriptions,
      planName: plans.name,
      planDeviceLimit: plans.deviceLimit,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(subscriptions.shopId, shopId(req)))
    .orderBy(desc(subscriptions.createdAt));

  const all = rows.map(({ sub, planName, planDeviceLimit }) => ({
    ...sub,
    planName,
    planDeviceLimit,
  }));
  const active = all.filter((s) =>
    (LIVE_STATUSES as readonly string[]).includes(s.status),
  );
  res.json({
    activeCount: active.length,
    active,
    subscriptions: all,
  });
});

/** Usage vs plan limits. The device limit is enforced at POST /devices/pair. */
billingRouter.get("/usage", async (req, res) => {
  const sid = shopId(req);
  const count = (table: typeof screens | typeof items | typeof categories) =>
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(table)
      .where(eq(table.shopId, sid));

  const [[activeDevices], [screenCount], [itemCount], [categoryCount], entitlement] =
    await Promise.all([
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(devices)
        .where(and(eq(devices.shopId, sid), eq(devices.status, "active"))),
      count(screens),
      count(items),
      count(categories),
      getDeviceEntitlement(sid),
    ]);

  res.json({
    hasPlan: entitlement.hasPlan,
    planName: entitlement.planName,
    devices: {
      active: activeDevices?.n ?? 0,
      limit: entitlement.limit,
    },
    screens: screenCount?.n ?? 0,
    items: itemCount?.n ?? 0,
    categories: categoryCount?.n ?? 0,
  });
});

/** Order history (payment history in the UI later). */
billingRouter.get("/orders", async (req, res) => {
  const rows = await db
    .select()
    .from(subscriptionOrders)
    .where(eq(subscriptionOrders.shopId, shopId(req)))
    .orderBy(desc(subscriptionOrders.createdAt));
  res.json(rows.map(toOrderJson));
});

/** Poll target while a payment is in flight. */
billingRouter.get("/orders/:id", async (req, res) => {
  const [row] = await db
    .select()
    .from(subscriptionOrders)
    .where(
      and(
        eq(subscriptionOrders.id, req.params.id),
        eq(subscriptionOrders.shopId, shopId(req)),
      ),
    )
    .limit(1);
  if (!row) return res.status(404).json({ error: "Order not found" });

  // Pending order + a provider that can be asked directly → reconcile with the
  // gateway. Covers the customer landing back from the hosted page before the
  // webhook arrives (and local dev, where webhooks can't reach us at all).
  const provider = getProvider();
  if (
    row.status === "pending" &&
    row.provider === provider.name &&
    provider.checkOrderStatus
  ) {
    try {
      const state = await provider.checkOrderStatus(row);
      if (state === "paid") {
        const { order } = await fulfillOrder(row.id);
        return res.json(toOrderJson(order ?? row));
      }
      if (state === "failed") {
        const { order } = await failOrder(row.id);
        return res.json(toOrderJson(order ?? row));
      }
    } catch (err) {
      // Status check is best-effort; the webhook remains the source of truth.
      console.error("[billing] order status reconcile failed:", err);
    }
  }
  res.json(toOrderJson(row));
});

/** Start a subscription purchase. */
billingRouter.post("/checkout", async (req, res) => {
  const parsed = checkoutInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const sid = shopId(req);

  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, parsed.data.planId))
    .limit(1);
  if (!plan) return res.status(404).json({ error: "Plan not found" });
  if (!plan.isActive) return res.status(400).json({ error: "Plan is retired" });

  const provider = getProvider();

  // Supersede any earlier abandoned checkout attempts.
  await db
    .update(subscriptionOrders)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(subscriptionOrders.shopId, sid),
        eq(subscriptionOrders.status, "pending"),
      ),
    );

  const amount = plan.priceMonthly ?? "0.00";
  const [order] = await db
    .insert(subscriptionOrders)
    .values({
      shopId: sid,
      planId: plan.id,
      amount,
      provider: provider.name,
    })
    .returning();

  // Free plan: nothing to pay — fulfill right away.
  if (Number(amount) === 0) {
    const { order: paid } = await fulfillOrder(order!.id);
    return res
      .status(201)
      .json({ order: toOrderJson(paid!), next: { kind: "complete" } });
  }

  const [shop] = await db
    .select({ name: shops.name })
    .from(shops)
    .where(eq(shops.id, sid))
    .limit(1);

  const { next, providerOrderId } = await provider.createCheckout({
    order: order!,
    plan,
    shopName: shop?.name ?? "",
    ownerEmail: req.auth!.email,
  });

  const [updated] = providerOrderId
    ? await db
        .update(subscriptionOrders)
        .set({ providerOrderId, updatedAt: new Date() })
        .where(eq(subscriptionOrders.id, order!.id))
        .returning()
    : [order!];

  res.status(201).json({ order: toOrderJson(updated!), next });
});

/**
 * Dev-only payment simulation. Exists ONLY while BILLING_PROVIDER=mock —
 * with a real gateway configured this endpoint 404s, so it can never be used
 * to skip payment in production.
 */
billingRouter.post("/orders/:id/mock-pay", async (req, res) => {
  if (env.BILLING_PROVIDER !== "mock") {
    return res.status(404).json({ error: "Not found" });
  }
  const [order] = await db
    .select()
    .from(subscriptionOrders)
    .where(
      and(
        eq(subscriptionOrders.id, req.params.id),
        eq(subscriptionOrders.shopId, shopId(req)),
      ),
    )
    .limit(1);
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.provider !== "mock") {
    return res.status(400).json({ error: "Not a mock order" });
  }

  const { order: paid, subscription } = await fulfillOrder(
    order.id,
    "mock_payment",
  );
  res.json({ order: paid ? toOrderJson(paid) : null, subscription });
});
