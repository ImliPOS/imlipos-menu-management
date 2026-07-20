import type { BillingProvider } from "./provider.js";

/**
 * Dev/test stand-in for a real gateway. Checkout returns a "mock" next-step;
 * the client completes it via POST /billing/orders/:id/mock-pay (which only
 * exists while BILLING_PROVIDER=mock). No webhooks.
 */
export const mockProvider: BillingProvider = {
  name: "mock",
  async createCheckout({ order }) {
    return {
      next: { kind: "mock", orderId: order.id },
      providerOrderId: `mock_${order.id}`,
    };
  },
  async handleWebhook() {
    return null;
  },
};
