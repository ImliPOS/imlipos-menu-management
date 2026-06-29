"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ImageIcon, Pencil, PlusIcon, Star, Trash2Icon, UploadCloud, X } from "lucide-react";
import type { Category, Item } from "@imlipos/contracts";
import { api, uploadMedia } from "@/lib/api";
import { PageSpinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

export default function Menu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.listCategories(), api.listItems()])
      .then(([c, i]) => {
        setCategories(c);
        setItems(i);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function upsertItem(it: Item) {
    setItems((prev) =>
      prev.some((x) => x.id === it.id)
        ? prev.map((x) => (x.id === it.id ? it : x))
        : [...prev, it],
    );
  }

  async function toggleItem(it: Item) {
    const updated = await api.toggleItem(it.id, !it.isAvailable);
    upsertItem(updated);
  }

  async function deleteItem(it: Item) {
    if (!confirm(`Delete “${it.name}”?`)) return;
    await api.deleteItem(it.id);
    setItems((prev) => prev.filter((x) => x.id !== it.id));
  }

  if (loading) return <PageSpinner />;

  if (categories.length === 0)
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
        <p className="text-muted-foreground">
          No categories yet. Create some under{" "}
          <Link href="/categories" className="text-foreground underline">
            Category
          </Link>{" "}
          first, then add items here.
        </p>
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {items.length} item{items.length === 1 ? "" : "s"} across {categories.length}{" "}
          categor{categories.length === 1 ? "y" : "ies"}
        </p>
        <ItemDialog
          categories={categories}
          onSaved={upsertItem}
          trigger={
            <Button>
              <PlusIcon className="size-4" />
              Add Item
            </Button>
          }
        />
      </div>

      {categories
        .map((cat) => ({ cat, catItems: items.filter((i) => i.categoryId === cat.id) }))
        .filter(({ catItems }) => catItems.length > 0)
        .map(({ cat, catItems }) => (
          <section key={cat.id} className="mb-8">
            <h2 className="mb-2 text-lg font-medium">
              {cat.name}{" "}
              {!cat.isAvailable && (
                <span className="text-sm text-red-400">(category hidden)</span>
              )}
            </h2>
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {catItems.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Thumb url={it.mediaUrl} />
                    <span
                      className={`truncate ${it.isAvailable ? "" : "text-muted-foreground line-through"}`}
                    >
                      {it.name} — ₹{it.price}
                    </span>
                    {it.isFeatured && (
                      <span
                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300"
                        title="Featured on display"
                      >
                        <Star className="size-3 fill-current" />
                        <span className="hidden sm:inline">Featured</span>
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    {/* The switch already conveys availability; the text badge is
                        redundant on narrow screens, so hide it there. */}
                    <span
                      className={`hidden rounded-md px-3 py-1 text-sm sm:inline-block ${
                        it.isAvailable
                          ? "bg-green-500/15 text-green-300"
                          : "bg-red-500/15 text-red-300"
                      }`}
                    >
                      {it.isAvailable ? "Available" : "Sold out"}
                    </span>
                    <Switch
                      checked={it.isAvailable}
                      onCheckedChange={() => toggleItem(it)}
                      aria-label={`Toggle ${it.name}`}
                    />
                    <ItemDialog
                      categories={categories}
                      item={it}
                      onSaved={upsertItem}
                      trigger={
                        <button
                          className="p-1 text-muted-foreground hover:text-foreground"
                          aria-label={`Edit ${it.name}`}
                        >
                          <Pencil className="size-4" />
                        </button>
                      }
                    />
                    <button
                      onClick={() => deleteItem(it)}
                      className="p-1 text-muted-foreground hover:text-red-400"
                      aria-label={`Delete ${it.name}`}
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

      <p className="mt-8 text-sm text-muted-foreground">
        Toggling “Sold out” pushes live to every display showing this item.
      </p>
    </div>
  );
}

function Thumb({ url }: { url: string | null }) {
  if (!url)
    return (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
        <ImageIcon className="size-4" />
      </div>
    );
  return (
    <img
      src={url}
      alt=""
      className="size-10 shrink-0 rounded-md border border-border object-cover"
    />
  );
}

function ItemDialog({
  categories,
  item,
  trigger,
  onSaved,
}: {
  categories: Category[];
  item?: Item;
  trigger: React.ReactNode;
  onSaved: (it: Item) => void;
}) {
  const editing = !!item;
  const firstCat = useMemo(() => categories[0]?.id ?? "", [categories]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [featured, setFeatured] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  function onOpenChange(next: boolean) {
    if (next) {
      setName(item?.name ?? "");
      setPrice(item ? String(item.price) : "");
      setCategoryId(item?.categoryId ?? firstCat);
      setMediaUrl(item?.mediaUrl ?? null);
      setFeatured(item?.isFeatured ?? false);
    }
    setOpen(next);
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("Please choose an image");
    setUploading(true);
    try {
      const url = await uploadMedia(file);
      setMediaUrl(url);
    } catch (err) {
      alert(`Upload failed: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = parseFloat(price);
    if (!name.trim() || Number.isNaN(p) || !categoryId) return;
    setBusy(true);
    try {
      const mediaType = mediaUrl ? ("image" as const) : null;
      // Featuring requires an image.
      const isFeatured = featured && !!mediaUrl;
      const saved = editing
        ? await api.updateItem(item!.id, {
            name: name.trim(),
            price: p,
            categoryId,
            mediaUrl,
            mediaType,
            isFeatured,
          })
        : await api.createItem({
            categoryId,
            name: name.trim(),
            price: p,
            mediaUrl: mediaUrl ?? undefined,
            mediaType: mediaType ?? undefined,
            isFeatured,
          });
      onSaved(saved);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit item" : "Add item"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update this menu item." : "Add a dish or drink to a category."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-2 space-y-4">
          {/* Image */}
          <div className="space-y-2">
            <Label>Image</Label>
            <div className="flex items-center gap-4">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-background">
                {mediaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-secondary/60">
                  <UploadCloud className="size-4" />
                  {uploading ? "Uploading…" : mediaUrl ? "Replace" : "Upload"}
                  <input type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                </label>
                {mediaUrl && (
                  <button
                    type="button"
                    onClick={() => setMediaUrl(null)}
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-red-400"
                  >
                    <X className="size-4" /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Feature on display */}
          <label className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
            <span>
              <span className="block text-sm font-medium">Feature on display</span>
              <span className="block text-xs text-muted-foreground">
                Show this item with its photo in the display’s featured strip.
                {!mediaUrl && " Add an image first."}
              </span>
            </span>
            <Switch
              checked={featured && !!mediaUrl}
              disabled={!mediaUrl}
              onCheckedChange={setFeatured}
              aria-label="Feature on display"
            />
          </label>

          <div className="space-y-2">
            <Label htmlFor="item-name">Item name</Label>
            <Input
              id="item-name"
              autoFocus
              placeholder="e.g. Apple Juice"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-price">Price (₹)</Label>
            <Input
              id="item-price"
              inputMode="decimal"
              placeholder="e.g. 50"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-category">Category</Label>
            <select
              id="item-category"
              className={field}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || uploading || !name.trim() || price.trim() === ""}
            >
              {busy ? "Saving…" : editing ? "Save changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
