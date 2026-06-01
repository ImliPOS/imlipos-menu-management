"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const input =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

export default function Settings() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.me().then((me) => setName(me.shop?.name ?? "")).catch(console.error);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    try {
      await api.updateShop(name.trim());
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg p-8">
      <form
        onSubmit={save}
        className="space-y-4 rounded-xl border border-border bg-card p-6"
      >
        <h2 className="font-medium">Shop</h2>
        <div>
          <label className="text-sm text-muted-foreground">Shop name</label>
          <input
            className={input}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy || name.trim().length === 0}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          {saved && <span className="text-sm text-green-400">Saved ✓</span>}
        </div>
      </form>
    </div>
  );
}
