import Link from "next/link";

const LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/refunds", label: "Refund Policy" },
  { href: "/privacy", label: "Privacy" },
  { href: "/contact", label: "Contact" },
];

/**
 * Slim policy footer — required links for payment-gateway merchant review.
 * Used both on the public auth pages and, with `newTab`, pinned under the
 * authenticated app content (so it opens policies without leaving the app).
 */
export function PublicFooter({ newTab = false }: { newTab?: boolean }) {
  return (
    <footer className="shrink-0 border-t border-border px-6 py-3">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} ImliPos</span>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              {...(newTab
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
