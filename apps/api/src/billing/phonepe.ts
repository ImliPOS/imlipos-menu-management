import crypto from "node:crypto";
import { env, webAppOrigin } from "../env.js";
import {
  WebhookVerificationError,
  type BillingProvider,
  type WebhookResult,
} from "./provider.js";

/**
 * PhonePe PG — Standard Checkout v2 (hosted pay page).
 *
 * Flow: createCheckout registers the order (POST /checkout/v2/pay) and returns
 * a redirect URL to PhonePe's hosted page. PhonePe then (a) redirects the
 * customer back to the web app with ?billing_order=<id>, and (b) POSTs a
 * webhook to /billing/webhook/phonepe. Fulfillment happens on whichever
 * arrives first — the webhook, or the order poll reconciling via
 * checkOrderStatus (GET /checkout/v2/order/:id/status).
 *
 * Docs: developer.phonepe.com → Payment Gateway → Standard Checkout (v2).
 */

const HOSTS = {
  sandbox: {
    oauth: "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token",
    pg: "https://api-preprod.phonepe.com/apis/pg-sandbox",
  },
  production: {
    oauth: "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
    pg: "https://api.phonepe.com/apis/pg",
  },
} as const;

const hosts = () => HOSTS[env.PHONEPE_ENV];

// O-Bearer token cache — PhonePe tokens live for a while (expires_at epoch
// seconds); refresh a couple of minutes early rather than per request.
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 120 > now) return cachedToken.token;

  const res = await fetch(hosts().oauth, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.PHONEPE_CLIENT_ID!,
      client_secret: env.PHONEPE_CLIENT_SECRET!,
      client_version: env.PHONEPE_CLIENT_VERSION,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) {
    throw new Error(`PhonePe oauth failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_at: number };
  cachedToken = { token: data.access_token, expiresAt: data.expires_at };
  return data.access_token;
}

async function pgFetch(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  return fetch(`${hosts().pg}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `O-Bearer ${token}`,
      ...init?.headers,
    },
  });
}

/** PhonePe order states → our order outcomes. */
function mapState(state: string): "paid" | "failed" | "pending" {
  if (state === "COMPLETED") return "paid";
  if (state === "FAILED") return "failed";
  return "pending"; // PENDING (and anything unrecognized stays pending)
}

export const phonepeProvider: BillingProvider = {
  name: "phonepe",

  async createCheckout({ order, plan, shopName }) {
    // PhonePe amounts are in paise; merchantOrderId (≤63 chars, [A-Za-z0-9_-])
    // is our order UUID, so webhooks/status checks map straight back to it.
    const amountPaise = Math.round(Number(order.amount) * 100);
    const res = await pgFetch("/checkout/v2/pay", {
      method: "POST",
      body: JSON.stringify({
        merchantOrderId: order.id,
        amount: amountPaise,
        metaInfo: { udf1: order.shopId, udf2: plan.name },
        paymentFlow: {
          type: "PG_CHECKOUT",
          message: `ImliPos display licence — ${shopName || plan.name}`,
          merchantUrls: {
            redirectUrl: `${webAppOrigin}/menu?billing_order=${order.id}`,
          },
        },
      }),
    });
    if (!res.ok) {
      throw new Error(
        `PhonePe create payment failed: ${res.status} ${await res.text()}`,
      );
    }
    const data = (await res.json()) as {
      orderId: string;
      state: string;
      redirectUrl: string;
    };
    return {
      next: { kind: "redirect", url: data.redirectUrl },
      providerOrderId: data.orderId,
    };
  },

  async handleWebhook(req): Promise<WebhookResult | null> {
    // PhonePe authenticates callbacks with SHA256("username:password") in the
    // Authorization header (pair configured on the Business dashboard).
    const received = (req.headers.authorization ?? "")
      .replace(/^SHA256\s+/i, "")
      .trim()
      .toLowerCase();
    const expected = crypto
      .createHash("sha256")
      .update(`${env.PHONEPE_WEBHOOK_USERNAME}:${env.PHONEPE_WEBHOOK_PASSWORD}`)
      .digest("hex");
    const a = Buffer.from(received);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new WebhookVerificationError("Bad webhook authorization");
    }

    // Raw-body mount (index.ts) → req.body is a Buffer.
    const event = JSON.parse((req.body as Buffer).toString("utf8")) as {
      event: string;
      payload: {
        merchantOrderId: string;
        state: string;
        paymentDetails?: { transactionId?: string }[];
      };
    };

    // Only checkout events matter here (refund events land once refunds are
    // built). Per PhonePe docs, trust payload.state over the event name.
    if (!event.event?.startsWith("checkout.order.")) return null;
    const outcome = mapState(event.payload.state);
    if (outcome === "pending") return null;
    return {
      orderId: event.payload.merchantOrderId,
      outcome,
      providerPaymentId: event.payload.paymentDetails?.[0]?.transactionId,
    };
  },

  async checkOrderStatus(order) {
    const res = await pgFetch(
      `/checkout/v2/order/${order.id}/status?details=false`,
      { method: "GET" },
    );
    if (!res.ok) {
      throw new Error(
        `PhonePe order status failed: ${res.status} ${await res.text()}`,
      );
    }
    const data = (await res.json()) as { state: string };
    return mapState(data.state);
  },
};
