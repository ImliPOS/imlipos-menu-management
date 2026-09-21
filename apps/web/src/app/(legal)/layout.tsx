import Link from "next/link";
import type { ReactNode } from "react";
import { PublicFooter } from "@/components/legal/PublicFooter";

/**
 * Public legal/compliance pages (terms, refunds, privacy, contact).
 * Deliberately outside the (app) group: no auth, reachable by payment-gateway
 * reviewers without an account.
 */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="flex h-14 items-center border-b border-border px-6">
        <Link href="/" className="font-semibold">
          ImliPos
        </Link>
      </header>
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
