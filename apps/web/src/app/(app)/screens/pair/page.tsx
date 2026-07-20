"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusIcon, Sparkles, Tv } from "lucide-react";
import type { BillingUsage, Device, Screen } from "@imlipos/contracts";
import { api, apiErrorCode, ApiError } from "@/lib/api";
import { useSettingsModal } from "@/components/settings/SettingsModalContext";
import { PageSpinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const isOnline = (d: Device) =>
  d.lastSeenAt ? Date.now() - new Date(d.lastSeenAt).getTime() < 90_000 : false;

export default function PairDevice() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [usage, setUsage] = useState<BillingUsage | null>(null);
  const [pairOpen, setPairOpen] = useState(false);
  const [limitHit, setLimitHit] = useState<{ active: number; limit: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const { openSettings } = useSettingsModal();

  async function loadDevices() {
    setDevices(await api.listDevices());
  }

  async function loadUsage() {
    setUsage(await api.billingUsage());
  }

  useEffect(() => {
    Promise.all([api.listScreens(), api.listDevices(), api.billingUsage()])
      .then(([s, d, u]) => {
        setScreens(s);
        setDevices(d);
        setUsage(u);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    // Live-ish: poll device list (pairings + online status) every 5s.
    const t = setInterval(() => loadDevices().catch(() => {}), 5000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <PageSpinner />;

  const paired = devices.filter((d) => d.status === "active");
  const screenById = new Map(screens.map((s) => [s.id, s]));

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      {/* Header: live count + Pair Device button */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium">Paired Displays</h2>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-sm text-muted-foreground">
            {paired.length}
          </span>
          <span className="ml-1 flex items-center gap-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
            live
          </span>
          {usage && (
            <span className="ml-2 text-xs text-muted-foreground">
              Licences: {usage.devices.active} / {usage.devices.limit} used
            </span>
          )}
        </div>
        {/* Gate at the button: without a spare licence, prompt to buy instead
            of opening the pairing form. The API also enforces this on submit. */}
        <Button
          onClick={() => {
            const active = usage?.devices.active ?? 0;
            const limit = usage?.devices.limit ?? 0;
            if (active >= limit) setLimitHit({ active, limit });
            else setPairOpen(true);
          }}
        >
          <PlusIcon className="size-4" />
          Pair Display
        </Button>
        <PairDeviceDialog
          open={pairOpen}
          onOpenChange={setPairOpen}
          onPaired={() => {
            loadDevices();
            loadUsage().catch(() => {});
          }}
          onLimit={setLimitHit}
        />
      </div>

      {/* Shown when pairing is rejected: no spare display licence. */}
      <Dialog open={!!limitHit} onOpenChange={(o) => !o && setLimitHit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {limitHit?.limit === 0
                ? "You need a display licence"
                : "No spare licence"}
            </DialogTitle>
            <DialogDescription>
              {limitHit?.limit === 0
                ? "Each display needs its own licence. Buy a licence to pair this display."
                : `All ${limitHit?.limit} of your display licences are in use (${limitHit?.active} paired). Buy another licence to pair one more display.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLimitHit(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setLimitHit(null);
                openSettings("billing");
              }}
            >
              <Sparkles className="size-4" />
              Buy a licence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {paired.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No displays paired yet. Use “Pair Display” to add one.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {paired.map((d) => (
            <DisplayCard
              key={d.id}
              device={d}
              screen={d.screenId ? screenById.get(d.screenId) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PairDeviceDialog({
  open,
  onOpenChange,
  onPaired,
  onLimit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaired: () => void;
  onLimit: (info: { active: number; limit: number }) => void;
}) {
  const [pairingCode, setPairingCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.pairDevice({ pairingCode, name: name.trim() });
      onPaired();
      setPairingCode("");
      setName("");
      onOpenChange(false);
    } catch (err) {
      if (apiErrorCode(err) === "DEVICE_LIMIT") {
        const body = (err as ApiError).body as { active: number; limit: number };
        // Reset the form so a retry after buying a licence starts clean.
        setPairingCode("");
        setName("");
        onOpenChange(false);
        onLimit({ active: body.active, limit: body.limit });
      } else {
        setError("Invalid or expired code.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pair a Display</DialogTitle>
          <DialogDescription>
            Enter the 6-digit code shown on the display and give it a name. You can
            customise its layout after pairing.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              autoFocus
              placeholder="e.g. Counter Display"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Pairing code</Label>
            <InputOTP
              id="code"
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              value={pairingCode}
              onChange={setPairingCode}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit code shown on the display.
            </p>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || pairingCode.length !== 6 || !name.trim()}
            >
              {busy ? "Pairing…" : "Pair display"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DisplayCard({ device, screen }: { device: Device; screen?: Screen }) {
  const online = isOnline(device);
  const ratio = screen?.orientation === "portrait" ? 9 / 16 : 16 / 9;
  const label = device.name ?? screen?.name ?? "Display";

  return (
    <Link href={`/screens/pair/${device.id}`} className="group block">
      <AspectRatio ratio={ratio}>
        <div className="relative flex h-full items-center justify-center rounded-lg border border-border bg-secondary/40 px-2 text-center transition-colors group-hover:border-foreground/40">
          <span
            className={`absolute right-2 top-2 h-2 w-2 rounded-full ${
              online ? "bg-green-400" : "bg-muted-foreground"
            }`}
          />
          <span className="flex flex-col items-center gap-1">
            <Tv className="size-5 text-muted-foreground" />
            <span className="font-medium">{label}</span>
          </span>
        </div>
      </AspectRatio>
      <p className="mt-2 text-sm text-muted-foreground">
        {online ? "Online" : "Offline"}
      </p>
    </Link>
  );
}
