import type { ReactNode } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";

/**
 * Shared layout for all authenticated pages. The sidebar (AppShell) mounts once
 * here and persists across navigations — only the page content below swaps, so
 * clicking nav items no longer remounts/refreshes the whole screen.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
