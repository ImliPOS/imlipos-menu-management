"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Shop settings (rename) — moved here from the old Settings page. */
export function ShopSettings() {
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
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="flex flex-col space-y-1">
        <h3 className="font-semibold">Shop</h3>
        <p className="text-sm text-muted-foreground">
          The cafe/shop name shown across the admin.
        </p>
      </div>

      <form onSubmit={save} className="space-y-4 lg:col-span-2">
        <div className="space-y-2">
          <Label htmlFor="shop-name">Shop name</Label>
          <Input
            id="shop-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            placeholder="e.g. Imli Cafe"
          />
        </div>
        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-sm text-green-400">Saved ✓</span>}
          <Button type="submit" disabled={busy || name.trim().length === 0} className="max-sm:w-full">
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
