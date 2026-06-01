"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PlusIcon, Trash2Icon } from "lucide-react";
import type { Category, Item } from "@imlipos/contracts";
import { api } from "@/lib/api";
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

  async function toggleItem(it: Item) {
    const updated = await api.toggleItem(it.id, !it.isAvailable);
    setItems((prev) => prev.map((x) => (x.id === it.id ? updated : x)));
  }

  async function deleteItem(it: Item) {
    if (!confirm(`Delete “${it.name}”?`)) return;
    await api.deleteItem(it.id);
    setItems((prev) => prev.filter((x) => x.id !== it.id));
  }

  if (loading) return <PageSpinner />;

  if (categories.length === 0)
    return (
      <div className="mx-auto max-w-4xl p-8">
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
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} item{items.length === 1 ? "" : "s"} across {categories.length}{" "}
          categor{categories.length === 1 ? "y" : "ies"}
        </p>
        <AddItemDialog
          categories={categories}
          onCreated={(it) => setItems((p) => [...p, it])}
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
                <li key={it.id} className="flex items-center justify-between px-4 py-3">
                  <span className={it.isAvailable ? "" : "text-muted-foreground line-through"}>
                    {it.name} — ₹{it.price}
                  </span>
                  <div className="flex items-center gap-4">
                    <span
                      className={`rounded-md px-3 py-1 text-sm ${
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
                    <button
                      onClick={() => deleteItem(it)}
                      className="text-muted-foreground hover:text-red-400"
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
        Toggling “Sold out” pushes live to every TV showing this item.
      </p>
    </div>
  );
}

function AddItemDialog({
  categories,
  onCreated,
}: {
  categories: Category[];
  onCreated: (it: Item) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [busy, setBusy] = useState(false);

  // Default the category to the first one whenever the dialog opens.
  const firstCat = useMemo(() => categories[0]?.id ?? "", [categories]);
  function onOpenChange(next: boolean) {
    if (next) setCategoryId((c) => c || firstCat);
    setOpen(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = parseFloat(price);
    if (!name.trim() || Number.isNaN(p) || !categoryId) return;
    setBusy(true);
    try {
      const created = await api.createItem({
        categoryId,
        name: name.trim(),
        price: p,
      });
      onCreated(created);
      setName("");
      setPrice("");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="size-4" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add item</DialogTitle>
          <DialogDescription>Add a dish or drink to a category.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-2 space-y-4">
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
              disabled={busy || !name.trim() || price.trim() === "" || !categoryId}
            >
              {busy ? "Adding…" : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
