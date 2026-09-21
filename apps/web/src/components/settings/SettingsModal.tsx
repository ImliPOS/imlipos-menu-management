"use client";

import type { LucideIcon } from "lucide-react";
import {
  CreditCard,
  Gauge,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { PersonalInfo } from "@/components/profile/PersonalInfo";
import { EmailPassword } from "@/components/profile/EmailPassword";
import { ShopSettings } from "@/components/profile/ShopSettings";
import { DangerZone } from "@/components/profile/DangerZone";
import { BillingSection } from "./BillingSection";
import { UsageSection } from "./UsageSection";

export type SettingsSection = "general" | "account" | "billing" | "usage";

const SECTIONS: { id: SettingsSection; label: string; icon: LucideIcon }[] = [
  { id: "general", label: "General", icon: SlidersHorizontal },
  { id: "account", label: "Account", icon: UserRound },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "usage", label: "Usage", icon: Gauge },
];

/**
 * Claude-style settings overlay: section rail on the left (top tab strip on
 * mobile), scrollable panel on the right. Opened from the user menu.
 */
export function SettingsModal({
  open,
  section,
  onOpenChange,
  onSectionChange,
}: {
  open: boolean;
  section: SettingsSection;
  onOpenChange: (open: boolean) => void;
  onSectionChange: (section: SettingsSection) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* !important modifiers: the base DialogContent sets w-full/max-w-lg/p-6
          and cn() doesn't tailwind-merge, so a plain max-w override loses to the
          base. Cap desktop at max-w-4xl (896px); go full-screen under md. */}
      <DialogContent className="flex h-[min(680px,85dvh)] w-full !max-w-4xl flex-col gap-0 overflow-hidden !p-0 max-md:h-[100dvh] max-md:!max-w-none max-md:!rounded-none md:flex-row">
        <DialogTitle className="sr-only">Settings</DialogTitle>

        {/* Desktop section rail */}
        <nav className="hidden w-52 shrink-0 border-r border-border bg-background/40 p-3 md:block">
          <p className="px-3 pb-3 pt-1 text-sm font-semibold">Settings</p>
          <div className="space-y-1">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onSectionChange(id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  section === id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </nav>

        {/* Mobile tab strip */}
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2 pr-12 md:hidden">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onSectionChange(id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                section === id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/60",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1 overflow-y-auto p-6 md:p-8">
          {section === "general" && <PersonalInfo />}
          {section === "account" && (
            <div>
              <EmailPassword />
              <Separator className="my-8" />
              <ShopSettings />
              <Separator className="my-8" />
              <DangerZone />
            </div>
          )}
          {section === "billing" && <BillingSection />}
          {section === "usage" && <UsageSection />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
