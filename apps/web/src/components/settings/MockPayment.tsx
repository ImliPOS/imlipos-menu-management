"use client";

import { useState } from "react";
import {
  CreditCard,
  Landmark,
  Lock,
  Smartphone,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type Method = "upi" | "card" | "netbanking";

const METHODS: { id: Method; label: string; icon: typeof Smartphone }[] = [
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "netbanking", label: "Net banking", icon: Landmark },
];

/** How long the simulated gateway "processes" before reporting success. */
const PROCESSING_MS = 1600;

/**
 * Simulated checkout for the mock billing provider. It walks through the
 * steps a real gateway will show — pick a method, review the amount, pay —
 * so the flow can be demonstrated end to end before a gateway is connected.
 *
 * TEST MODE ONLY: every field is pre-filled with dummy values and read-only,
 * so no real card, UPI or bank details can be typed in, and nothing is sent to
 * any payment network. "Pay" and "Skip payment" both activate the licence via
 * the API's mock-pay endpoint; Skip just does it without the ceremony, so an
 * operator who only wants to pair a display isn't held up.
 */
export function MockPayment({
  amountLabel,
  description,
  busy,
  onPay,
  onSkip,
  onCancel,
}: {
  amountLabel: string;
  description: string;
  busy: boolean;
  onPay: () => Promise<void>;
  onSkip: () => Promise<void>;
  onCancel: () => void;
}) {
  const [method, setMethod] = useState<Method>("upi");
  const [processing, setProcessing] = useState(false);
  const locked = busy || processing;

  async function pay() {
    setProcessing(true);
    // Hold on the "processing" state briefly so the demo reads like a real
    // gateway round-trip rather than an instant flip to success.
    await new Promise((r) => setTimeout(r, PROCESSING_MS));
    try {
      await onPay();
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{description}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{amountLabel}</p>
            </div>
            <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-400">
              Test mode · no real charge
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {METHODS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                disabled={locked}
                onClick={() => setMethod(id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-md border px-2 py-3 text-xs font-medium transition-colors",
                  method === id
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  locked && "opacity-60",
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>

          {method === "upi" && (
            <div className="space-y-2">
              <Label htmlFor="mock-upi">UPI ID</Label>
              <Input id="mock-upi" value="demo@paytm" readOnly />
              <p className="text-xs text-muted-foreground">
                Sample UPI ID. In live mode you&apos;ll approve the request in
                your UPI app.
              </p>
            </div>
          )}

          {method === "card" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="mock-card">Card number</Label>
                <Input id="mock-card" value="4111 1111 1111 1111" readOnly />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="mock-exp">Expiry</Label>
                  <Input id="mock-exp" value="12/30" readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mock-cvv">CVV</Label>
                  <Input id="mock-cvv" value="•••" readOnly />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Sample test card. Real card entry is disabled in test mode.
              </p>
            </div>
          )}

          {method === "netbanking" && (
            <div className="space-y-2">
              <Label htmlFor="mock-bank">Bank</Label>
              <Input id="mock-bank" value="Demo Bank (test)" readOnly />
              <p className="text-xs text-muted-foreground">
                In live mode you&apos;ll be redirected to your bank to approve
                the payment.
              </p>
            </div>
          )}

          <Button className="w-full" disabled={locked} onClick={pay}>
            {processing ? (
              <>
                <Spinner /> Processing payment…
              </>
            ) : busy ? (
              <Spinner />
            ) : (
              <>
                <Lock className="size-4" /> Pay {amountLabel}
              </>
            )}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <Lock className="size-3" />
            Simulated payment — no payment gateway is connected yet.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Skip payment for now</p>
            <p className="text-xs text-muted-foreground">
              Activate the licence straight away and keep going.
            </p>
          </div>
          <Button variant="outline" disabled={locked} onClick={onSkip}>
            <SkipForward className="size-4" />
            Skip payment
          </Button>
        </CardContent>
      </Card>

      <Button variant="ghost" disabled={locked} onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
