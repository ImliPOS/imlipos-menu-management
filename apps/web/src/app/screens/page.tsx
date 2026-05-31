"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Category, Orientation, Screen } from "@imlipos/contracts";
import { api } from "@/lib/api";
import { AuthGate } from "@/components/AuthGate";

export default function ScreensPage() {
  return (
    <AuthGate>
      <Screens />
    </AuthGate>
  );
}

const input =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900";

function Screens() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [s, c] = await Promise.all([api.listScreens(), api.listCategories()]);
    setScreens(s);
    setCategories(c);
  }
  useEffect(() => {
    refresh().catch(console.error);
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.createScreen({ name: name.trim(), orientation });
      setName("");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Screens</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/dashboard" className="text-neutral-500 hover:text-neutral-900">
            Menu
          </Link>
          <Link href="/screens/pair" className="font-medium text-neutral-900 underline">
            Pair a TV
          </Link>
        </div>
      </header>

      <form
        onSubmit={onCreate}
        className="mb-8 space-y-3 rounded-xl border border-neutral-200 bg-white p-5"
      >
        <h2 className="font-medium">Add a screen</h2>
        <input
          className={input}
          placeholder="e.g. Counter Left"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className={input}
          value={orientation}
          onChange={(e) => setOrientation(e.target.value as Orientation)}
        >
          <option value="landscape">Landscape</option>
          <option value="portrait">Portrait</option>
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          className="rounded-md bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
          type="submit"
          disabled={busy || name.trim().length === 0}
        >
          {busy ? "Adding…" : "Add screen"}
        </button>
      </form>

      <h2 className="mb-2 font-medium">Your screens</h2>
      {screens.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No screens yet. Add one above, then pair a TV to it.
        </p>
      ) : (
        <div className="space-y-3">
          {screens.map((s) => (
            <ScreenCard key={s.id} screen={s} categories={categories} />
          ))}
        </div>
      )}
    </main>
  );
}

/** A screen with an expandable "what shows here" category picker. */
function ScreenCard({
  screen,
  categories,
}: {
  screen: Screen;
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function openPanel() {
    setOpen((o) => !o);
    if (!open) {
      const current = await api.getScreenCategories(screen.id);
      setSelected(new Set(current.map((c) => c.categoryId)));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    const ordered = Array.from(selected).map((categoryId, i) => ({
      categoryId,
      sortOrder: i,
    }));
    await api.setScreenCategories(screen.id, ordered);
    setBusy(false);
    setSaved(true);
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <span>
          {screen.name}{" "}
          <span className="text-sm text-neutral-400">({screen.orientation})</span>
        </span>
        <button onClick={openPanel} className="text-sm text-neutral-900 underline">
          {open ? "Close" : "Content"}
        </button>
      </div>
      {open && (
        <div className="border-t border-neutral-200 px-4 py-3">
          <p className="mb-2 text-sm text-neutral-500">
            Pick which categories show on this screen:
          </p>
          {categories.length === 0 ? (
            <p className="text-sm text-neutral-400">
              No categories yet — add some on the Menu page first.
            </p>
          ) : (
            <ul className="mb-3 space-y-1">
              {categories.map((c) => (
                <li key={c.id}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                    />
                    {c.name}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={save}
            disabled={busy}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          {saved && <span className="ml-3 text-sm text-green-700">Saved ✓</span>}
        </div>
      )}
    </div>
  );
}
