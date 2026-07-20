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

/**
 * Payment gateway adapter. A real provider (Razorpay/Stripe) implements:
 *  - createCheckout: register the order with the gateway and tell the client
 *    what to do next (open an SDK popup, redirect to a hosted page, …).
 *  - handleWebhook: verify the signature on the raw request and normalize the
 *    event; fulfillment itself is provider-agnostic (see fulfill.ts).
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
}
