"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

const input =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

/** One-field onboarding: name your shop. Runs once, right after sign-up. */
export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bounce out if not signed in, or already onboarded.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace("/signin");
      const me = await api.me().catch(() => null);
      if (me?.shop) router.replace("/dashboard");
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.createShop(name.trim());
      router.replace("/dashboard");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold">Name your shop</h1>
        <p className="text-sm text-muted-foreground">
          This is the cafe/shop you’ll manage menus for.
        </p>
        <input
          className={input}
          placeholder="e.g. Imli Cafe"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          className="w-full rounded-md bg-primary px-3 py-2 text-primary-foreground disabled:opacity-50"
          type="submit"
          disabled={busy || name.trim().length === 0}
        >
          {busy ? "Creating…" : "Create shop"}
        </button>
      </form>
    </main>
  );
}
