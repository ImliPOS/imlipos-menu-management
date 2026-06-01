"use client";

import { useEffect, useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import type { Category, Device, Orientation, Screen } from "@imlipos/contracts";
import { api } from "@/lib/api";
import { PageSpinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

const field =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

export default function Screens() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [s, c] = await Promise.all([api.listScreens(), api.listCategories()]);
    setScreens(s);
    setCategories(c);
  }
  useEffect(() => {
    refresh()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {screens.length} screen{screens.length === 1 ? "" : "s"}
        </p>
        <AddScreenDialog onCreated={(s) => setScreens((p) => [...p, s])} />
      </div>

      {screens.length === 0 ? (
        <p className="text-muted-foreground">
          No screens yet. Use “Add Screen”, then pair a display to it.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {screens.map((s) => (
            <ScreenCard
              key={s.id}
              screen={s}
              categories={categories}
              onUpdated={(u) => setScreens((p) => p.map((x) => (x.id === u.id ? u : x)))}
              onDeleted={(id) => setScreens((p) => p.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AddScreenDialog({ onCreated }: { onCreated: (s: Screen) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const created = await api.createScreen({ name: name.trim(), orientation });
      onCreated(created);
      setName("");
      setOrientation("landscape");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="size-4" />
          Add Screen
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a screen</DialogTitle>
          <DialogDescription>
            A screen is a layout (e.g. “Counter Left”) you pair a display to.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="screen-name">Screen name</Label>
            <Input
              id="screen-name"
              autoFocus
              placeholder="e.g. Counter Left"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="screen-orientation">Orientation</Label>
            <select
              id="screen-orientation"
              className={field}
              value={orientation}
              onChange={(e) => setOrientation(e.target.value as Orientation)}
            >
              <option value="landscape">Landscape</option>
              <option value="portrait">Portrait</option>
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? "Adding…" : "Add screen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ScreenCard({
  screen,
  categories,
  onUpdated,
  onDeleted,
}: {
  screen: Screen;
  categories: Category[];
  onUpdated: (s: Screen) => void;
  onDeleted: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(screen.name);
  const [orientation, setOrientation] = useState<Orientation>(screen.orientation);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [devices, setDevices] = useState<Device[]>([]);
  const [busy, setBusy] = useState(false);

  async function loadDevices() {
    const all = await api.listDevices();
    setDevices(all.filter((d) => d.screenId === screen.id));
  }

  async function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setName(screen.name);
      setOrientation(screen.orientation);
      const current = await api.getScreenCategories(screen.id);
      setSelected(new Set(current.map((c) => c.categoryId)));
      loadDevices().catch(console.error);
    }
  }

  async function removeDevice(id: string) {
    if (!confirm("Remove this display? It will return to the pairing screen.")) return;
    await api.removeDevice(id);
    setDevices((p) => p.filter((d) => d.id !== id));
  }

  function isOnline(d: Device) {
    return d.lastSeenAt ? Date.now() - new Date(d.lastSeenAt).getTime() < 90_000 : false;
  }

  function toggleCat(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function save() {
    setBusy(true);
    try {
      const updated = await api.updateScreen(screen.id, { name: name.trim(), orientation });
      await api.setScreenCategories(
        screen.id,
        Array.from(selected).map((categoryId, i) => ({ categoryId, sortOrder: i })),
      );
      onUpdated(updated);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete screen “${screen.name}”?`)) return;
    await api.deleteScreen(screen.id);
    onDeleted(screen.id);
    setOpen(false);
  }

  const ratio = screen.orientation === "portrait" ? 9 / 16 : 16 / 9;

  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="group block w-full cursor-pointer text-left"
      >
        <AspectRatio ratio={ratio}>
          <div className="flex h-full items-center justify-center rounded-lg border border-border bg-secondary/40 px-2 text-center transition-colors group-hover:border-foreground/40">
            <span className="font-medium">{screen.name}</span>
          </div>
        </AspectRatio>
        <p className="mt-2 text-sm text-muted-foreground">{screen.orientation}</p>
      </button>

      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Edit screen</DrawerTitle>
        </DrawerHeader>

        <div className="no-scrollbar flex-1 space-y-6 overflow-y-auto p-4">
          <div className="space-y-2">
            <Label htmlFor={`name-${screen.id}`}>Screen name</Label>
            <Input
              id={`name-${screen.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`orient-${screen.id}`}>Orientation</Label>
            <select
              id={`orient-${screen.id}`}
              className={field}
              value={orientation}
              onChange={(e) => setOrientation(e.target.value as Orientation)}
            >
              <option value="landscape">Landscape</option>
              <option value="portrait">Portrait</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Content (categories shown here)</Label>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No categories yet — add some under Category first.
              </p>
            ) : (
              <ul className="space-y-1">
                {categories.map((c) => (
                  <li key={c.id}>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleCat(c.id)}
                      />
                      {c.name}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <Label>Paired Displays</Label>
            {devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No displays paired to this screen yet.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {devices.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          isOnline(d) ? "bg-green-400" : "bg-muted-foreground"
                        }`}
                        title={isOnline(d) ? "Online" : "Offline"}
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium text-foreground">
                          {d.name ?? "Unnamed display"}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {isOnline(d)
                            ? "Online"
                            : d.lastSeenAt
                              ? `Last seen ${new Date(d.lastSeenAt).toLocaleString()}`
                              : "Never connected"}
                        </span>
                      </span>
                    </span>
                    <button
                      onClick={() => removeDevice(d.id)}
                      className="shrink-0 text-muted-foreground hover:text-red-400"
                      aria-label="Remove display"
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            onClick={remove}
            className="inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300"
          >
            <Trash2Icon className="size-4" />
            Delete screen
          </button>
        </div>

        <DrawerFooter>
          <Button onClick={save} disabled={busy || !name.trim()}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
