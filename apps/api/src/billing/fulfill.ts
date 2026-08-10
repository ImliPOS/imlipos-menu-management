import { and, eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";

const { subscriptions, subscriptionOrders } = schema;

/**
 * Activate the display licence an order paid for. Per-licence model: each paid
 * order adds ONE new active subscription (existing licences are untouched — a
 * shop accumulates one licence per display it buys). Safe to call more than
 * once (webhook retries, double-clicked mock-pay): only the caller that flips
 * the order pending → paid inserts the licence; everyone else no-ops.
 */
export async function fulfillOrder(orderId: string, providerPaymentId?: string) {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .update(subscriptionOrders)
      .set({
        status: "paid",
        providerPaymentId: providerPaymentId ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(subscriptionOrders.id, orderId),
          eq(subscriptionOrders.status, "pending"),
        ),
      )
      .returning();

    if (!order) {
      const [existing] = await tx
        .select()
        .from(subscriptionOrders)
        .where(eq(subscriptionOrders.id, orderId))
        .limit(1);
      return { order: existing ?? null, subscription: null, alreadyProcessed: true };
    }

    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    endsAt.setFullYear(endsAt.getFullYear() + 1);
    const [subscription] = await tx
      .insert(subscriptions)
      .values({
        shopId: order.shopId,
        planId: order.planId,
        status: "active",
        startsAt,
        endsAt,
        notes: `licence · order:${order.id} (${order.provider})`,
      })
      .returning();

    const [linked] = await tx
      .update(subscriptionOrders)
      .set({ subscriptionId: subscription!.id, updatedAt: new Date() })
      .where(eq(subscriptionOrders.id, order.id))
      .returning();

    return { order: linked!, subscription: subscription!, alreadyProcessed: false };
  });
}

/**
 * Mark an order's payment as failed. Pending-only, same idempotency rule as
 * fulfillOrder — a late "failed" webhook can never downgrade a paid order.
 */
export async function failOrder(orderId: string, providerPaymentId?: string) {
  const [order] = await db
    .update(subscriptionOrders)
    .set({
      status: "failed",
      providerPaymentId: providerPaymentId ?? null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(subscriptionOrders.id, orderId),
        eq(subscriptionOrders.status, "pending"),
      ),
    )
    .returning();
  return { order: order ?? null };
}
