"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Category, Item } from "@imlipos/contracts";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { AuthGate } from "@/components/AuthGate";

export default function DashboardPage() {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  );
}

const input =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900";

function Dashboard() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState("");

  async function refresh() {
    const [c, i] = await Promise.all([api.listCategories(), api.listItems()]);
    setCategories(c);
    setItems(i);
    setLoading(false);
  }
  useEffect(() => {
    refresh().catch(console.error);
  }, []);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCat.trim()) return;
    const created = await api.createCategory({ name: newCat.trim() });
    setCategories((p) => [...p, created]);
    setNewCat("");
  }

  async function toggleItem(it: Item) {
    const updated = await api.toggleItem(it.id, !it.isAvailable);
    setItems((prev) => prev.map((x) => (x.id === it.id ? updated : x)));
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/signin");
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Menu</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/screens" className="font-medium text-neutral-900 underline">
            Screens
          </Link>
          <Link href="/screens/pair" className="font-medium text-neutral-900 underline">
            Pair a TV
          </Link>
          <button onClick={signOut} className="text-neutral-500 hover:text-neutral-900">
            Sign out
          </button>
        </div>
      </header>

      {/* Add category */}
      <form onSubmit={addCategory} className="mb-8 flex gap-2">
        <input
          className={`${input} flex-1`}
          placeholder="New category (e.g. Coffee)"
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
          disabled={!newCat.trim()}
        >
          Add category
        </button>
      </form>

      {loading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : categories.length === 0 ? (
        <p className="text-neutral-500">No categories yet. Add one above to start.</p>
      ) : (
        categories.map((cat) => (
          <CategorySection
            key={cat.id}
            category={cat}
            items={items.filter((i) => i.categoryId === cat.id)}
            onItemAdded={(it) => setItems((p) => [...p, it])}
            onToggle={toggleItem}
            onItemDeleted={(id) => setItems((p) => p.filter((x) => x.id !== id))}
            onCategoryDeleted={(id) => {
              setCategories((p) => p.filter((c) => c.id !== id));
              setItems((p) => p.filter((i) => i.categoryId !== id));
            }}
          />
        ))
      )}

      <p className="mt-8 text-sm text-neutral-500">
        Toggling “Sold out” pushes live to every TV showing this item. Assign categories
        to a screen under <Link href="/screens" className="underline">Screens</Link>.
      </p>
    </main>
  );
}

function CategorySection({
  category,
  items,
  onItemAdded,
  onToggle,
  onItemDeleted,
  onCategoryDeleted,
}: {
  category: Category;
  items: Item[];
  onItemAdded: (it: Item) => void;
  onToggle: (it: Item) => void;
  onItemDeleted: (id: string) => void;
  onCategoryDeleted: (id: string) => void;
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

  async function deleteCategory() {
    if (
      !confirm(
        `Delete category “${category.name}” and all its items? This can't be undone.`,
      )
    )
      return;
    await api.deleteCategory(category.id);
    onCategoryDeleted(category.id);
  }

  async function deleteItem(it: Item) {
    if (!confirm(`Delete “${it.name}”?`)) return;
    await api.deleteItem(it.id);
    onItemDeleted(it.id);
  }

  return (
    <section className="mb-8">
      <h2 className="mb-2 flex items-center justify-between text-lg font-medium">
        <span>
          {category.name}{" "}
          {!category.isAvailable && (
            <span className="text-sm text-red-600">(category off)</span>
          )}
        </span>
        <button
          onClick={deleteCategory}
          className="text-sm font-normal text-red-600 hover:text-red-800"
        >
          Delete category
        </button>
      </h2>
      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {items.map((it) => (
          <li key={it.id} className="flex items-center justify-between px-4 py-3">
            <span className={it.isAvailable ? "" : "text-neutral-400 line-through"}>
              {it.name} — ₹{it.price}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onToggle(it)}
                className={`rounded-md px-3 py-1 text-sm ${
                  it.isAvailable
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {it.isAvailable ? "Available" : "Sold out"}
              </button>
              <button
                onClick={() => deleteItem(it)}
                className="text-sm text-neutral-400 hover:text-red-600"
                aria-label={`Delete ${it.name}`}
              >
                ✕
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-4 py-3 text-sm text-neutral-400">No items yet.</li>
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
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm disabled:opacity-50"
          disabled={!name.trim() || price.trim() === ""}
        >
          Add item
        </button>
      </form>
    </section>
  );
}
