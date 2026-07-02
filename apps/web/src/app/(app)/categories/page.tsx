"use client";

import { useEffect, useMemo, useState } from "react";
import { PlusIcon, Search, Tags, Trash2Icon, X } from "lucide-react";
import type { Category } from "@imlipos/contracts";
import { api } from "@/lib/api";
import { PageSpinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, query]);

  useEffect(() => {
    api
      .listCategories()
      .then(setCategories)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function toggleCategory(cat: Category) {
    const updated = await api.toggleCategory(cat.id, !cat.isAvailable);
    setCategories((p) => p.map((c) => (c.id === cat.id ? updated : c)));
  }

  async function deleteCategory(cat: Category) {
    if (
      !confirm(
        `Delete category “${cat.name}” and all its items? This can't be undone.`,
      )
    )
      return;
    await api.deleteCategory(cat.id);
    setCategories((p) => p.filter((c) => c.id !== cat.id));
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 basis-full sm:basis-64 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search categories…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-9"
            aria-label="Search categories"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {categories.length} categor{categories.length === 1 ? "y" : "ies"}
        </p>
        <AddCategoryDialog onCreated={(c) => setCategories((p) => [...p, c])} />
      </div>

      {categories.length === 0 ? (
        <p className="text-muted-foreground">
          No categories yet. Use “Add category” to create your first one.
        </p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-4 py-10 text-center">
          <p className="text-muted-foreground">No categories match “{query}”.</p>
          <Button variant="outline" className="mt-3" onClick={() => setQuery("")}>
            Clear search
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((cat) => (
            <Item key={cat.id} variant="outline">
              <ItemMedia variant="icon">
                <Tags />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{cat.name}</ItemTitle>
                <ItemDescription>
                  {cat.isAvailable
                    ? "Shown on assigned screens"
                    : "Hidden from all screens"}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Switch
                  checked={cat.isAvailable}
                  onCheckedChange={() => toggleCategory(cat)}
                  aria-label={`Toggle ${cat.name}`}
                />
                <button
                  onClick={() => deleteCategory(cat)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-red-400"
                  aria-label={`Delete ${cat.name}`}
                >
                  <Trash2Icon className="size-4" />
                </button>
              </ItemActions>
            </Item>
          ))}
        </div>
      )}

      <p className="mt-8 text-sm text-muted-foreground">
        Add items to these categories under <span className="text-foreground">Menu</span>.
        Toggle removes the whole category from every display showing it.
      </p>
    </div>
  );
}

function AddCategoryDialog({ onCreated }: { onCreated: (c: Category) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const created = await api.createCategory({ name: name.trim() });
      onCreated(created);
      setName("");
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
          Add category
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add category</DialogTitle>
          <DialogDescription>
            Categories group your menu items (e.g. Coffee, Main Course).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Category name</Label>
            <Input
              id="category-name"
              autoFocus
              placeholder="e.g. Coffee"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? "Adding…" : "Add category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
