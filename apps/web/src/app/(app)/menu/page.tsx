"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Category, Item } from "@imlipos/contracts";
import { api } from "@/lib/api";
import { PageSpinner } from "@/components/ui/spinner";

const input =
  "rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

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

  if (loading) return <PageSpinner />;

  if (categories.length === 0)
    return (
      <div className="mx-auto max-w-3xl p-8">
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
      {categories.map((cat) => (
        <CategorySection
          key={cat.id}
          category={cat}
          items={items.filter((i) => i.categoryId === cat.id)}
          onItemAdded={(it) => setItems((p) => [...p, it])}
          onToggle={toggleItem}
          onItemDeleted={(id) => setItems((p) => p.filter((x) => x.id !== id))}
        />
      ))}
      <p className="mt-8 text-sm text-muted-foreground">
        Toggling “Sold out” pushes live to every TV showing this item.
      </p>
    </div>
  );
}

function CategorySection({
  category,
  items,
  onItemAdded,
  onToggle,
  onItemDeleted,
}: {
  category: Category;
  items: Item[];
  onItemAdded: (it: Item) => void;
  onToggle: (it: Item) => void;
  onItemDeleted: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const p = parseFloat(price);
    if (!name.trim() || Number.isNaN(p)) return;
    const created = await api.createItem({
      categoryId: category.id,
      name: name.trim(),
      price: p,
    });
    onItemAdded(created);
    setName("");
    setPrice("");
  }

  async function deleteItem(it: Item) {
    if (!confirm(`Delete “${it.name}”?`)) return;
    await api.deleteItem(it.id);
    onItemDeleted(it.id);
  }

  return (
    <section className="mb-8">
      <h2 className="mb-2 text-lg font-medium">
        {category.name}{" "}
        {!category.isAvailable && (
          <span className="text-sm text-red-400">(category hidden)</span>
        )}
      </h2>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {items.map((it) => (
          <li key={it.id} className="flex items-center justify-between px-4 py-3">
            <span className={it.isAvailable ? "" : "text-muted-foreground line-through"}>
              {it.name} — ₹{it.price}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onToggle(it)}
                className={`rounded-md px-3 py-1 text-sm ${
                  it.isAvailable
                    ? "bg-green-500/15 text-green-300"
                    : "bg-red-500/15 text-red-300"
                }`}
              >
                {it.isAvailable ? "Available" : "Sold out"}
              </button>
              <button
                onClick={() => deleteItem(it)}
                className="text-sm text-muted-foreground hover:text-red-400"
                aria-label={`Delete ${it.name}`}
              >
                ✕
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted-foreground">No items yet.</li>
        )}
      </ul>
      <form onSubmit={addItem} className="mt-2 flex gap-2">
        <input
          className={`${input} flex-1`}
          placeholder="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={`${input} w-28`}
          placeholder="Price"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-md border border-input bg-background px-4 py-2 text-sm disabled:opacity-50"
          disabled={!name.trim() || price.trim() === ""}
        >
          Add item
        </button>
      </form>
    </section>
  );
}
