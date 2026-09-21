import { and, eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";

const { subscriptions, subscriptionOrders } = schema;

/**
 * Activate the display licences an order paid for. Per-licence model: a paid
 * order adds `order.quantity` new active subscriptions, one per display
 * (existing licences are untouched — a shop accumulates one licence per
 * display it buys). Safe to call more than once (webhook retries,
 * double-clicked mock-pay): only the caller that flips the order
 * pending → paid inserts the licences; everyone else no-ops.
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
      return {
        order: existing ?? null,
        subscription: null,
        subscriptions: [],
        alreadyProcessed: true,
      };
    }

    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    endsAt.setFullYear(endsAt.getFullYear() + 1);
    const count = Math.max(1, order.quantity);
    const created = await tx
      .insert(subscriptions)
      .values(
        Array.from({ length: count }, (_, i) => ({
          shopId: order.shopId,
          planId: order.planId,
          status: "active" as const,
          startsAt,
          endsAt,
          notes: `licence ${i + 1}/${count} · order:${order.id} (${order.provider})`,
        })),
      )
      .returning();

    // The order links to its first licence; the notes on each licence carry
    // the order id, so the rest remain traceable too.
    const [linked] = await tx
      .update(subscriptionOrders)
      .set({ subscriptionId: created[0]!.id, updatedAt: new Date() })
      .where(eq(subscriptionOrders.id, order.id))
      .returning();

    return {
      order: linked!,
      subscription: created[0]!,
      subscriptions: created,
      alreadyProcessed: false,
    };
  });
}
