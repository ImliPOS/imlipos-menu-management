import { env } from "../env.js";
import { mockProvider } from "./mock.js";
import { phonepeProvider } from "./phonepe.js";
import type { BillingProvider } from "./provider.js";

/** The active gateway adapter (per BILLING_PROVIDER). */
export function getProvider(): BillingProvider {
  switch (env.BILLING_PROVIDER) {
    case "mock":
      return mockProvider;
    case "phonepe":
      return phonepeProvider;
  }
}

export { fulfillOrder, failOrder } from "./fulfill.js";
export { WebhookVerificationError } from "./provider.js";
export type { BillingProvider, WebhookResult } from "./provider.js";
