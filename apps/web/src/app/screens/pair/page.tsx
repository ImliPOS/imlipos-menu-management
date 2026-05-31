"use client";

import { useEffect, useState } from "react";
import type { Screen } from "@imlipos/contracts";
import { api } from "@/lib/api";
import { AuthGate } from "@/components/AuthGate";

export default function PairDevicePage() {
  return (
    <AuthGate>
      <PairDevice />
    </AuthGate>
  );
}

/** Owner enters the 6-digit code shown on a new TV and binds it to a screen. */
function PairDevice() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [pairingCode, setPairingCode] = useState("");
  const [screenId, setScreenId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api.listScreens().then(setScreens).catch(console.error);
  }, []);

  async function onPair(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.pairDevice({ pairingCode, screenId });
      setMsg("Paired! The TV will switch to this screen momentarily.");
      setPairingCode("");
    } catch {
      setMsg("Invalid or expired code.");
    }
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-6 text-2xl font-semibold">Pair a TV</h1>
      <form onSubmit={onPair} className="space-y-4">
        <input
          className="w-full rounded-md border border-input bg-background px-3 py-2 tracking-widest text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="6-digit code from the TV"
          value={pairingCode}
          inputMode="numeric"
          maxLength={6}
          onChange={(e) => setPairingCode(e.target.value.replace(/\D/g, ""))}
        />
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={screenId}
          onChange={(e) => setScreenId(e.target.value)}
        >
          <option value="">Choose a screen…</option>
          {screens.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          className="w-full rounded-md bg-primary px-3 py-2 text-primary-foreground disabled:opacity-50"
          disabled={pairingCode.length !== 6 || !screenId}
          type="submit"
        >
          Pair device
        </button>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      </form>
    </main>
  );
}
