"use client";

import { useEffect, useState } from "react";
import type { Category, Orientation, Screen } from "@imlipos/contracts";
import { api } from "@/lib/api";

const input =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

export default function Screens() {
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
    <div className="mx-auto max-w-2xl p-8">
      <form
        onSubmit={onCreate}
        className="mb-8 space-y-3 rounded-xl border border-border bg-card p-5"
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
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
          type="submit"
          disabled={busy || name.trim().length === 0}
        >
          {busy ? "Adding…" : "Add screen"}
        </button>
      </form>

      <h2 className="mb-2 font-medium">Your screens</h2>
      {screens.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No screens yet. Add one above, then pair a TV to it.
        </p>
      ) : (
        <div className="space-y-3">
          {screens.map((s) => (
            <ScreenCard key={s.id} screen={s} categories={categories} />
          ))}
        </div>
      )}
    </div>
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
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3">
        <span>
          {screen.name}{" "}
          <span className="text-sm text-muted-foreground">({screen.orientation})</span>
        </span>
        <button onClick={openPanel} className="text-sm text-foreground underline">
          {open ? "Close" : "Content"}
        </button>
      </div>
      {open && (
        <div className="border-t border-border px-4 py-3">
          <p className="mb-2 text-sm text-muted-foreground">
            Pick which categories show on this screen:
          </p>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
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
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          {saved && <span className="ml-3 text-sm text-green-400">Saved ✓</span>}
        </div>
      )}
    </div>
  );
}
