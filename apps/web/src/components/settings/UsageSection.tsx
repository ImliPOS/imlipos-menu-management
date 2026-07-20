"use client";

import { useEffect, useState } from "react";
import type { BillingUsage } from "@imlipos/contracts";
import { api } from "@/lib/api";
import { PageSpinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}

/** Informational usage vs plan limits. */
export function UsageSection() {
  const [usage, setUsage] = useState<BillingUsage | null>(null);

  useEffect(() => {
    api.billingUsage().then(setUsage).catch(console.error);
  }, []);

  if (!usage) return <PageSpinner />;

  const pct =
    usage.devices.limit > 0
      ? Math.min(100, (usage.devices.active / usage.devices.limit) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h3 className="font-semibold">Usage</h3>
        <p className="text-sm text-muted-foreground">
          Displays you&apos;re running against your purchased licences.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Displays used / licences
          </span>
          <span className="text-sm font-medium tabular-nums">
            {usage.devices.active} / {usage.devices.limit}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {!usage.hasPlan && (
          <p className="mt-2 text-xs text-muted-foreground">
            You have no licences yet. Buy a licence in Billing to pair a display.
          </p>
        )}
      </div>

      <Separator />

      <div className="divide-y divide-border">
        <Row label="Screens" value={usage.screens} />
        <Row label="Menu items" value={usage.items} />
        <Row label="Categories" value={usage.categories} />
      </div>

      <p className="text-xs text-muted-foreground">
        Limits are informational for now and aren&apos;t enforced.
      </p>
    </div>
  );
}
