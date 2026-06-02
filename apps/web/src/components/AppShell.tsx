"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Tags,
  BookOpen,
  MonitorPlay,
  QrCode,
  User,
  LogOut,
  PanelLeft,
  Menu as MenuIcon,
  X,
  ChevronsUpDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type NavItem = { href: string; label: string; icon: React.ElementType };

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Menu Management",
    items: [
      { href: "/categories", label: "Category", icon: Tags },
      { href: "/menu", label: "Menu", icon: BookOpen },
    ],
  },
  {
    group: "Orientation & Pairing",
    items: [
      { href: "/screens", label: "Screens", icon: MonitorPlay },
      { href: "/screens/pair", label: "Pair a Display", icon: QrCode },
    ],
  },
];

const TITLES: Record<string, string> = {
  "/categories": "Category",
  "/menu": "Menu",
  "/screens": "Screens",
  "/screens/pair": "Pair a Display",
  "/profile": "Profile",
};

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const title =
    TITLES[pathname] ??
    (pathname.startsWith("/screens/pair/") ? "Display" : "");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem("imlipos.sidebarCollapsed");
    if (saved) setCollapsed(saved === "1");
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      localStorage.setItem("imlipos.sidebarCollapsed", c ? "0" : "1");
      return !c;
    });
  }

  const isActive = (href: string) => pathname === href;

  const SidebarBody = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <BookOpen className="h-4 w-4" />
        </div>
        {!collapsed && <span className="font-semibold">ImliPos</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV.map((section) => (
          <div key={section.group} className="mb-4">
            {!collapsed && (
              <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {section.group}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                      } ${collapsed ? "justify-center" : ""}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: user dropdown */}
      <div className="border-t border-border p-2">
        <UserMenu email={email} collapsed={collapsed} />
      </div>
    </div>
  );

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 border-r border-border bg-card transition-all md:block ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {SidebarBody}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-border bg-card">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-2 top-3 text-muted-foreground"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {SidebarBody}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-muted-foreground md:hidden"
            aria-label="Open menu"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <button
            onClick={toggleCollapsed}
            className="hidden text-muted-foreground hover:text-foreground md:block"
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">{title}</h1>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

/** Footer account button that opens a dropdown (Profile, Log out). */
function UserMenu({ email, collapsed }: { email: string; collapsed: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = email ? email[0]?.toUpperCase() : "?";

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/signin");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-secondary/60 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-xs">
          {initial}
        </div>
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-sm text-muted-foreground">{email}</span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </>
        )}
      </button>

      {open && (
        <div
          className={`absolute bottom-full z-50 mb-2 w-56 overflow-hidden rounded-lg border border-border bg-card shadow-lg ${
            collapsed ? "left-0" : "left-0 right-0"
          }`}
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-xs">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{email || "Signed in"}</p>
            </div>
          </div>
          <div className="py-1">
            <MenuLink href="/profile" icon={User} onClick={() => setOpen(false)}>
              Profile
            </MenuLink>
          </div>
          <div className="border-t border-border py-1">
            <button
              onClick={() => {
                setOpen(false);
                setLogoutOpen(true);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}

      {/* Controlled + always mounted, so closing the dropdown can't unmount it. */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out of ImliPos?</AlertDialogTitle>
            <AlertDialogDescription>
              You’ll be signed out of the admin. Your menus and screens keep
              running on your displays. You can sign back in anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={signOut}>Log out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  onClick,
  children,
}: {
  href: string;
  icon: React.ElementType;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}
