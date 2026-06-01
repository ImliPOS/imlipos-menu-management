"use client";

import { useEffect, useState } from "react";
import type { Category } from "@imlipos/contracts";
import { api } from "@/lib/api";
import { PageSpinner } from "@/components/ui/spinner";

const input =
  "rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState("");

  useEffect(() => {
    api
      .listCategories()
      .then(setCategories)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCat.trim()) return;
    const created = await api.createCategory({ name: newCat.trim() });
    setCategories((p) => [...p, created]);
    setNewCat("");
  }

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
    <div className="mx-auto max-w-3xl p-8">
      <form onSubmit={addCategory} className="mb-8 flex gap-2">
        <input
          className={`${input} flex-1`}
          placeholder="New category (e.g. Coffee)"
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
          disabled={!newCat.trim()}
        >
          Add category
        </button>
      </form>

      {categories.length === 0 ? (
        <p className="text-muted-foreground">No categories yet. Add one above to start.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {categories.map((cat) => (
            <li key={cat.id} className="flex items-center justify-between px-4 py-3">
              <span>{cat.name}</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-md px-3 py-1 text-sm ${
                    cat.isAvailable
                      ? "bg-green-500/15 text-green-300"
                      : "bg-red-500/15 text-red-300"
                  }`}
                >
                  {cat.isAvailable ? "Shown" : "Hidden"}
                </button>
                <button
                  onClick={() => deleteCategory(cat)}
                  className="text-sm text-muted-foreground hover:text-red-400"
                  aria-label={`Delete ${cat.name}`}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-sm text-muted-foreground">
        Add items to these categories under <span className="text-foreground">Menu</span>.
        “Hidden” removes the whole category from every TV showing it.
      </p>
    </div>
  );
}
