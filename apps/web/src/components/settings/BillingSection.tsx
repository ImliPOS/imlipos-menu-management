"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  CheckoutNext,
  OwnerBillingSummary,
  Plan,
  SubscriptionOrder,
} from "@imlipos/contracts";
import { BadgeCheck, CircleAlert, MonitorSmartphone } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageSpinner, Spinner } from "@/components/ui/spinner";

type View =
  | { step: "overview" }
  | { step: "confirm" }
  | { step: "paying"; next: CheckoutNext; orderId: string }
  | { step: "confirming" } // back from the gateway, waiting for order to settle
  | { step: "success" }
  | { step: "failed"; message: string };

function priceLabel(plan: Plan) {
  return plan.priceMonthly == null || plan.priceMonthly === 0
    ? "Free"
    : `₹${plan.priceMonthly.toLocaleString("en-IN")}/yr`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const ORDER_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "text-green-400" },
  failed: { label: "Failed", cls: "text-red-400" },
  pending: { label: "Pending", cls: "text-muted-foreground" },
  cancelled: { label: "Cancelled", cls: "text-muted-foreground" },
};

/**
 * Per-licence billing: each ₹3,500 subscription is one display licence. Shows
 * active licences, a Buy-licence action, and a Claude-style payment history.
 */
export function BillingSection() {
  const [summary, setSummary] = useState<OwnerBillingSummary | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [orders, setOrders] = useState<SubscriptionOrder[]>([]);
  const [view, setView] = useState<View>({ step: "overview" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    return Promise.all([
      api.billingSummary(),
      api.billingPlans(),
      api.billingOrders(),
    ])
      .then(([s, plans, o]) => {
        setSummary(s);
        setPlan(plans[0] ?? null);
        setOrders(o);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Returning from a hosted checkout page (PhonePe redirects back with
  // ?billing_order=<id>): strip the param and poll the order until the
  // webhook — or the API's own gateway reconciliation — settles it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("billing_order");
    if (!orderId) return;
    params.delete("billing_order");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (qs ? `?${qs}` : ""),
    );

    let stale = false;
    setView({ step: "confirming" });
    (async () => {
      try {
        for (let i = 0; i < 15; i++) {
          const order = await api.getOrder(orderId);
          if (stale) return;
          if (order.status === "paid") {
            await load();
            setView({ step: "success" });
            return;
          }
          if (order.status === "failed" || order.status === "cancelled") {
            setView({
              step: "failed",
              message: "The payment was not completed. You have not been charged for this order.",
            });
            return;
          }
          await new Promise((r) => setTimeout(r, 2000));
        }
        if (!stale) {
          setView({
            step: "failed",
            message:
              "We haven't received payment confirmation yet. If you completed the payment, your licence will activate automatically in a few minutes — check back shortly.",
          });
        }
      } catch (err) {
        if (!stale) setView({ step: "failed", message: String(err) });
      }
    })();
    return () => {
      stale = true;
    };
  }, [load]);

  if (!summary || !plan) return <PageSpinner />;

  async function startCheckout() {
    if (!plan) return;
    setBusy(true);
    try {
      const { order, next } = await api.checkout(plan.id);
      if (next.kind === "complete") {
        await load();
        setView({ step: "success" });
      } else if (next.kind === "redirect") {
        window.location.assign(next.url);
      } else {
        // "mock" today; a gateway SDK popup ("client") plugs in here later.
        setView({ step: "paying", next, orderId: order.id });
      }
    } catch (err) {
      setView({ step: "failed", message: String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function completeMockPayment(orderId: string) {
    setBusy(true);
    try {
      await api.mockPay(orderId);
      // Poll until the order reports paid — mirrors the webhook-driven flow a
      // real gateway needs, even though mock-pay is synchronous.
      for (let i = 0; i < 10; i++) {
        const order = await api.getOrder(orderId);
        if (order.status === "paid") {
          await load();
          setView({ step: "success" });
          return;
        }
        if (order.status === "failed" || order.status === "cancelled") break;
        await new Promise((r) => setTimeout(r, 1000));
      }
      setView({ step: "failed", message: "Payment didn't complete." });
    } catch (err) {
      setView({ step: "failed", message: String(err) });
    } finally {
      setBusy(false);
    }
  }

  // ---- Checkout sub-views ----

  if (view.step === "confirm") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col space-y-1">
          <h3 className="font-semibold">Buy a display licence</h3>
          <p className="text-sm text-muted-foreground">
            Review your order before continuing to payment.
          </p>
        </div>
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{plan.name} · 1 display licence</span>
              <span className="font-semibold">{priceLabel(plan)}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              One licence lets you pair one display. Billed yearly. To run more
              displays, buy an additional licence for each.
            </p>
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            href="/refunds"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Refund Policy
          </a>
          .
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setView({ step: "overview" })}>
            Back
          </Button>
          <Button disabled={busy} onClick={startCheckout}>
            {busy ? <Spinner /> : "Continue to payment"}
          </Button>
        </div>
      </div>
    );
  }

  if (view.step === "paying") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col space-y-1">
          <h3 className="font-semibold">Payment</h3>
          <p className="text-sm text-muted-foreground">
            {plan.name} · 1 display licence — {priceLabel(plan)}
          </p>
        </div>
        {view.next.kind === "mock" ? (
          <Card>
            <CardContent className="space-y-4">
              <p className="text-sm">
                <span className="font-medium">Simulated payment (dev).</span> No
                payment gateway is connected yet — this completes the order as if
                the payment succeeded.
              </p>
              <Button
                disabled={busy}
                onClick={() => completeMockPayment(view.orderId)}
              >
                {busy ? <Spinner /> : "Complete mock payment"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Opening payment provider…
              </p>
            </CardContent>
          </Card>
        )}
        <Button variant="ghost" onClick={() => setView({ step: "overview" })}>
          Cancel
        </Button>
      </div>
    );
  }

  if (view.step === "confirming") {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <Spinner />
        <div>
          <h3 className="text-lg font-semibold">Confirming your payment…</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Hang tight — we&apos;re waiting for the payment confirmation from
            your bank. This usually takes a few seconds.
          </p>
        </div>
      </div>
    );
  }

  if (view.step === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <BadgeCheck className="size-12 text-green-400" />
        <div>
          <h3 className="text-lg font-semibold">Licence activated</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            You can now pair one more display. Thanks!
          </p>
        </div>
        <Button variant="outline" onClick={() => setView({ step: "overview" })}>
          Back to billing
        </Button>
      </div>
    );
  }

  if (view.step === "failed") {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <CircleAlert className="size-12 text-red-400" />
        <div>
          <h3 className="text-lg font-semibold">Payment didn&apos;t go through</h3>
          <p className="mt-1 max-w-sm break-words text-sm text-muted-foreground">
            {view.message}
          </p>
        </div>
        <Button variant="outline" onClick={() => setView({ step: "overview" })}>
          Try again
        </Button>
      </div>
    );
  }

  // ---- Overview ----

  const { activeCount, active } = summary;
  const nextRenewal = active
    .map((s) => s.endsAt)
    .filter((d): d is string => !!d)
    .sort()[0];
  const paymentHistory = orders.filter(
    (o) => o.status === "paid" || o.status === "failed",
  );

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex flex-col space-y-1">
          <h3 className="font-semibold">Billing</h3>
          <p className="text-sm text-muted-foreground">
            Your display licences and payment history.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div>
              {activeCount > 0 ? (
                <>
                  <p className="font-medium">
                    {plan.name}
                    <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                      {activeCount} licence{activeCount === 1 ? "" : "s"}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activeCount} display{activeCount === 1 ? "" : "s"} ·{" "}
                    {priceLabel(plan)} each
                    {nextRenewal ? ` · next renewal ${formatDate(nextRenewal)}` : ""}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">No active licence</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Buy a {plan.name} licence ({priceLabel(plan)}) to pair a
                    display. One licence covers one display.
                  </p>
                </>
              )}
            </div>
            <Button onClick={() => setView({ step: "confirm" })}>
              {activeCount > 0 ? "Buy another licence" : "Buy a licence"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium">Payment history</h4>
        {paymentHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paymentHistory.map((o) => {
                  const s = ORDER_STATUS_LABEL[o.status] ?? {
                    label: o.status,
                    cls: "text-muted-foreground",
                  };
                  return (
                    <tr key={o.id}>
                      <td className="py-3">{formatDate(o.createdAt)}</td>
                      <td className="py-3 tabular-nums">
                        ₹{o.amount.toLocaleString("en-IN")}
                      </td>
                      <td className={`py-3 ${s.cls}`}>{s.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MonitorSmartphone className="size-3.5" />
          Downloadable invoices will be available once the payment gateway is
          connected.
        </p>
      </div>
    </div>
  );
}
