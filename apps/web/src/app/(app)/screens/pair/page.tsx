"use client";

import { useEffect, useState } from "react";
import { PlusIcon, Trash2Icon, Tv } from "lucide-react";
import type { Device, Screen } from "@imlipos/contracts";
import { api } from "@/lib/api";
import { PageSpinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
              onRemoved={(id) => setDevices((p) => p.filter((x) => x.id !== id))}
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
            <Input
              id="code"
              className="tracking-widest"
              placeholder="6-digit code from the display"
              inputMode="numeric"
              maxLength={6}
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value.replace(/\D/g, ""))}
            />
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

function DisplayCard({
  device,
  screen,
  onRemoved,
}: {
  device: Device;
  screen?: Screen;
  onRemoved: (id: string) => void;
}) {
  const online = isOnline(device);
  const ratio = screen?.orientation === "portrait" ? 9 / 16 : 16 / 9;
  const label = device.name ?? screen?.name ?? "Display";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  async function remove() {
    await api.removeDevice(device.id);
    onRemoved(device.id);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="group block w-full cursor-pointer text-left">
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
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>Display details</DialogDescription>
        </DialogHeader>
        <dl className="mt-2 space-y-3 text-sm">
          <Row label="Name">{device.name ?? "—"}</Row>
          <Row label="Status">
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${online ? "bg-green-400" : "bg-muted-foreground"}`} />
              {online ? "Online" : "Offline"}
            </span>
          </Row>
          <Row label="Screen">{screen?.name ?? "—"}</Row>
          <Row label="Orientation">{screen?.orientation ?? "—"}</Row>
          <Row label="Last seen">
            {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : "Never"}
          </Row>
          <Row label="Paired since">
            {new Date(device.createdAt).toLocaleDateString()}
          </Row>
          <Row label="Device ID">
            <span className="font-mono text-xs">{device.id.slice(0, 8)}…</span>
          </Row>
        </dl>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
          <AlertDialog
            open={confirmOpen}
            onOpenChange={(o) => {
              setConfirmOpen(o);
              if (!o) setConfirmText("");
            }}
          >
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2Icon className="size-4" />
                Remove display
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove “{label}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  This un-pairs the display — it stops showing the menu and returns to
                  its pairing code. This can’t be undone. Type{" "}
                  <span className="font-medium text-foreground">{label}</span> to confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={label}
                autoFocus
              />
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={confirmText !== label}
                  onClick={remove}
                  className="disabled:pointer-events-none disabled:opacity-50"
                >
                  Remove display
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}
