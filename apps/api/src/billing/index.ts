import { env } from "../env.js";
import { mockProvider } from "./mock.js";
import type { BillingProvider } from "./provider.js";

/** The active gateway adapter (per BILLING_PROVIDER). */
export function getProvider(): BillingProvider {
  switch (env.BILLING_PROVIDER) {
    case "mock":
      return mockProvider;
  }
}

export { fulfillOrder } from "./fulfill.js";
export type { BillingProvider, WebhookResult } from "./provider.js";
