import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "../db/client.js";

const { plans, subscriptions } = schema;

/** Subscriptions that count as "live" (each is one active display licence). */
export const LIVE_STATUSES = ["trialing", "active"] as const;

/**
 * The display entitlement for a shop. Per-licence model: each live
 * subscription is one licence for one display, so the display limit is simply
 * the number of live subscriptions. A shop with no licence cannot pair any
 * display. Enforced at POST /devices/pair.
 */
export async function getDeviceEntitlement(shopId: string): Promise<{
  hasPlan: boolean;
  planName: string | null;
  limit: number;
}> {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      planName: sql<string | null>`max(${plans.name})`,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(
      and(
        eq(subscriptions.shopId, shopId),
        inArray(subscriptions.status, [...LIVE_STATUSES]),
      ),
    );

  const limit = row?.count ?? 0;
  return {
    hasPlan: limit > 0,
    planName: row?.planName ?? null,
    limit,
  };
}
