import { z } from "zod";
import { isoDate } from "./menu";
import type { SubscriptionWithPlan } from "./admin";

/**
 * ---- Owner billing / checkout contracts ----
 * Consumed by the owner web app (/billing routes). Provider-agnostic: the
 * CheckoutNext union covers popup-style (Razorpay), redirect-style (Stripe),
 * dev mock, and free-plan instant completion.
 */

export const orderStatus = z.enum(["pending", "paid", "failed", "cancelled"]);
export type OrderStatus = z.infer<typeof orderStatus>;

export const subscriptionOrderSchema = z.object({
  id: z.string().uuid(),
  shopId: z.string().uuid(),
  planId: z.string().uuid(),
  /** Price snapshot at checkout time. */
  amount: z.number().nonnegative(),
  currency: z.string(),
  status: orderStatus,
  provider: z.string(),
  providerOrderId: z.string().nullable(),
  providerPaymentId: z.string().nullable(),
  /** Set once paid — the subscription this order created. */
  subscriptionId: z.string().uuid().nullable(),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type SubscriptionOrder = z.infer<typeof subscriptionOrderSchema>;

export const checkoutInputSchema = z.object({ planId: z.string().uuid() });
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

/** What the client must do next to complete payment. */
export type CheckoutNext =
  | { kind: "mock"; orderId: string } // dev: call POST /billing/orders/:id/mock-pay
  | { kind: "redirect"; url: string } // hosted checkout page (Stripe-style)
  | { kind: "client"; provider: string; payload: Record<string, unknown> } // SDK popup (Razorpay-style)
  | { kind: "complete" }; // free plan — fulfilled at checkout

export interface CheckoutResponse {
  order: SubscriptionOrder;
  next: CheckoutNext;
}

export interface OwnerBillingSummary {
  /** Number of active display licences (each = one paired display allowed). */
  activeCount: number;
  active: SubscriptionWithPlan[];
  /** All licences (active + past), newest first. */
  subscriptions: SubscriptionWithPlan[];
}

export interface BillingUsage {
  /** True when the shop holds at least one active display licence. */
  hasPlan: boolean;
  planName: string | null;
  /** active = displays paired; limit = display licences held. */
  devices: { active: number; limit: number };
  screens: number;
  items: number;
  categories: number;
}
