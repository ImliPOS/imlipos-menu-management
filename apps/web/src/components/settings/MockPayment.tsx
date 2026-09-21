"use client";

import { useState } from "react";
import { CheckCircle2, Lock, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

/** How long the simulated gateway "confirms" before reporting success. */
const CONFIRMING_MS = 1600;

/**
 * Simulated UPI checkout for the mock billing provider: a scan-to-pay QR and
 * a "Payment done" button, mirroring the pay-by-QR flow a real gateway shows,
 * so the purchase can be demonstrated end to end before a gateway is live.
 *
 * TEST MODE ONLY: the QR is a static placeholder image that isn't tied to any
 * payment account, and nothing is sent to any payment network. "Payment done"
 * and "Skip payment" both activate the licence via the API's mock-pay
 * endpoint; Skip just does it without the ceremony, so an operator who only
 * wants to pair a display isn't held up.
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
  const [confirming, setConfirming] = useState(false);
  const locked = busy || confirming;

  async function paymentDone() {
    setConfirming(true);
    // Hold on the "confirming" state briefly so the demo reads like a real
    // gateway round-trip rather than an instant flip to success.
    await new Promise((r) => setTimeout(r, CONFIRMING_MS));
    try {
      await onPay();
    } finally {
      setConfirming(false);
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

          <div className="flex flex-col items-center gap-3">
            <div className="rounded-lg bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/mock-payment-qr.png"
                alt="Sample UPI QR code for the simulated payment"
                width={200}
                height={196}
                className="block h-auto w-[200px] max-w-full"
              />
            </div>
            <p className="text-center text-sm">
              Scan with any UPI app to pay{" "}
              <span className="font-medium tabular-nums">{amountLabel}</span>
            </p>
            <p className="text-center text-xs text-muted-foreground">
              Sample QR — it isn&apos;t linked to a payment account. Press
              “Payment done” to simulate a successful payment.
            </p>
          </div>

          <Button className="w-full" disabled={locked} onClick={paymentDone}>
            {confirming ? (
              <>
                <Spinner /> Confirming payment…
              </>
            ) : busy ? (
              <Spinner />
            ) : (
              <>
                <CheckCircle2 className="size-4" /> Payment done
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
