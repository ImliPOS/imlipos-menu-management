import type { schema } from "../db/client.js";

/** numeric columns come back as strings; the API contract uses numbers. */
export function toPlanJson(row: typeof schema.plans.$inferSelect) {
  return {
    ...row,
    priceMonthly: row.priceMonthly === null ? null : Number(row.priceMonthly),
  };
}

/** Same coercion for subscription orders (amount is numeric). */
export function toOrderJson(row: typeof schema.subscriptionOrders.$inferSelect) {
  return { ...row, amount: Number(row.amount) };
}
