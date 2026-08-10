import type { Request } from "express";
import type { CheckoutNext } from "@imlipos/contracts";
import type { schema } from "../db/client.js";

type OrderRow = typeof schema.subscriptionOrders.$inferSelect;
type PlanRow = typeof schema.plans.$inferSelect;

export interface WebhookResult {
  /** Our subscription_orders.id (carried through provider metadata/notes). */
  orderId: string;
  outcome: "paid" | "failed";
  providerPaymentId?: string;
}

/** Thrown by handleWebhook when the request fails signature/auth checks → 401. */
export class WebhookVerificationError extends Error {}

/**
 * Payment gateway adapter. A real provider (PhonePe/Razorpay/Stripe) implements:
 *  - createCheckout: register the order with the gateway and tell the client
 *    what to do next (open an SDK popup, redirect to a hosted page, …).
 *  - handleWebhook: verify the signature on the raw request and normalize the
 *    event; fulfillment itself is provider-agnostic (see fulfill.ts).
 *  - checkOrderStatus (optional): query the gateway for a pending order's
 *    fate — the fallback when the customer returns from the hosted page
 *    before (or without) the webhook arriving.
 */
export interface BillingProvider {
  readonly name: string;
  createCheckout(args: {
    order: OrderRow;
    plan: PlanRow;
    shopName: string;
    ownerEmail: string | null;
  }): Promise<{ next: CheckoutNext; providerOrderId?: string }>;
  handleWebhook(req: Request): Promise<WebhookResult | null>;
  checkOrderStatus?(order: OrderRow): Promise<"paid" | "failed" | "pending">;
}
