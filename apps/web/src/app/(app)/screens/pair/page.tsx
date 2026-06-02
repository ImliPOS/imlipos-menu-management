"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusIcon, Tv } from "lucide-react";
import type { Device, Screen } from "@imlipos/contracts";
import { api } from "@/lib/api";
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
  DialogTrigger,
} from "@/components/ui/dialog";

const field =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

const isOnline = (d: Device) =>
  d.lastSeenAt ? Date.now() - new Date(d.lastSeenAt).getTime() < 90_000 : false;

export default function PairDevice() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDevices() {
    setDevices(await api.listDevices());
  }

  useEffect(() => {
    Promise.all([api.listScreens(), api.listDevices()])
      .then(([s, d]) => {
        setScreens(s);
        setDevices(d);
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
    <div className="mx-auto max-w-5xl p-8">
      {/* Header: live count + Pair Device button */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium">Paired Displays</h2>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-sm text-muted-foreground">
            {paired.length}
          </span>
          <span className="ml-1 flex items-center gap-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
            live
          </span>
        </div>
        <PairDeviceDialog screens={screens} onPaired={loadDevices} />
      </div>

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
  screens,
  onPaired,
}: {
  screens: Screen[];
  onPaired: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pairingCode, setPairingCode] = useState("");
  const [screenId, setScreenId] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.pairDevice({ pairingCode, screenId, name: name.trim() });
      onPaired();
      setPairingCode("");
      setScreenId("");
      setName("");
      setOpen(false);
    } catch {
      setError("Invalid or expired code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="size-4" />
          Pair Display
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pair a Display</DialogTitle>
          <DialogDescription>
            Enter the 6-digit code shown on the display, name it, and pick the screen
            it should show.
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
          <div className="space-y-2">
            <Label htmlFor="screen">Screen</Label>
            <select
              id="screen"
              className={field}
              value={screenId}
              onChange={(e) => setScreenId(e.target.value)}
            >
              <option value="">Choose a screen…</option>
              {screens.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || pairingCode.length !== 6 || !screenId || !name.trim()}
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
