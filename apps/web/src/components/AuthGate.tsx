"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

/**
 * Wraps protected pages. Ensures: (1) a Supabase session exists, else → /signin;
 * (2) the owner has a shop, else → /onboarding. Renders children only when both
 * hold. Client-side gating keeps the admin a simple SPA (no SSR cookie wiring).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace("/signin");
      try {
        const me = await api.me();
        if (!active) return;
        if (!me.shop) return router.replace("/onboarding");
        setOk(true);
      } catch {
        router.replace("/signin");
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  if (!ok) return <main className="p-8 text-neutral-500">Loading…</main>;
  return <>{children}</>;
}
