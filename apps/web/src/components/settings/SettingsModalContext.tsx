"use client";

import { createContext, useContext } from "react";
import type { SettingsSection } from "./SettingsModal";

type SettingsModalCtx = {
  openSettings: (section: SettingsSection) => void;
};

const SettingsModalContext = createContext<SettingsModalCtx | null>(null);

export const SettingsModalProvider = SettingsModalContext.Provider;

/** Open the settings modal from anywhere under AppShell. */
export function useSettingsModal(): SettingsModalCtx {
  const ctx = useContext(SettingsModalContext);
  if (!ctx) {
    throw new Error("useSettingsModal must be used within AppShell");
  }
  return ctx;
}
