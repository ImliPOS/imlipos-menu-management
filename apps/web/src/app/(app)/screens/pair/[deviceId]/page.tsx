"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2Icon } from "lucide-react";
import type { Device, Screen } from "@imlipos/contracts";
import { api } from "@/lib/api";
import { PageSpinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutEditorPanel } from "@/components/LayoutEditor";
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

const isOnline = (d: Device) =>
  d.lastSeenAt ? Date.now() - new Date(d.lastSeenAt).getTime() < 90_000 : false;

export default function DeviceDetail() {
  const router = useRouter();
  const { deviceId } = useParams<{ deviceId: string }>();
  const [device, setDevice] = useState<Device | null>(null);
  const [screen, setScreen] = useState<Screen | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmText, setConfirmText] = useState("");

  async function load() {
    const [devices, screens] = await Promise.all([
      api.listDevices(),
      api.listScreens(),
    ]);
    const d = devices.find((x) => x.id === deviceId) ?? null;
    setDevice(d);
    setScreen(d?.screenId ? screens.find((s) => s.id === d.screenId) ?? null : null);
    setLoading(false);
  }
  useEffect(() => {
    load().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  if (loading) return <PageSpinner />;
  if (!device)
    return (
      <div className="mx-auto max-w-4xl p-8">
        <p className="text-muted-foreground">Display not found.</p>
        <Link href="/screens/pair" className="text-foreground underline">
          Back to displays
        </Link>
      </div>
    );

  const label = device.name ?? screen?.name ?? "Display";
  const online = isOnline(device);

  async function remove() {
    await api.removeDevice(device!.id);
    router.replace("/screens/pair");
  }

  return (
    <div className="mx-auto max-w-5xl p-8">
      <Link
        href="/screens/pair"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Paired Displays
      </Link>

      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{label}</h1>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${online ? "bg-green-400" : "bg-muted-foreground"}`} />
            {online ? "Online" : "Offline"}
          </span>
        </div>

        <AlertDialog onOpenChange={(o) => !o && setConfirmText("")}>
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
                This un-pairs the display — it stops showing the menu and returns to its
                pairing code. This can’t be undone. Type{" "}
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
      </div>

      {/* Details */}
      <section className="mb-10 grid grid-cols-2 gap-x-8 gap-y-3 rounded-xl border border-border bg-card p-6 text-sm sm:grid-cols-3">
        <Detail label="Screen">{screen?.name ?? "—"}</Detail>
        <Detail label="Orientation">{screen?.orientation ?? "—"}</Detail>
        <Detail label="Resolution">
          {device.resolution
            ? `${device.resolution.width}×${device.resolution.height}`
            : "Unknown"}
        </Detail>
        <Detail label="Last seen">
          {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : "Never"}
        </Detail>
        <Detail label="Paired since">
          {new Date(device.createdAt).toLocaleDateString()}
        </Detail>
        <Detail label="Device ID">
          <span className="font-mono text-xs">{device.id.slice(0, 8)}…</span>
        </Detail>
      </section>

      {/* Layout */}
      <h2 className="mb-3 text-lg font-medium">Layout</h2>
      <LayoutEditorPanel
        device={device}
        orientation={screen?.orientation}
        onSaved={load}
      />
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground">{children}</dd>
    </div>
  );
}
