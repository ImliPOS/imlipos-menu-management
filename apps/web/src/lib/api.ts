"use client";

import {
  appUrls,
  resolveAppEnv,
  type BillingUsage,
  type Category,
  type CheckoutResponse,
  type CreateCategoryInput,
  type CreateItemInput,
  type CreateScreenInput,
  type Device,
  type Item,
  type OwnerBillingSummary,
  type PairDeviceInput,
  type Plan,
  type Screen,
  type SubscriptionOrder,
  type UpdateItemInput,
  type DeviceLayout,
} from "@imlipos/contracts";

import { supabase } from "./supabase";

// Auto-derived from the branch (main → prod, preview → dev, local → localhost).
// Set NEXT_PUBLIC_API_URL only to override.
const API = process.env.NEXT_PUBLIC_API_URL ?? appUrls(resolveAppEnv()).apiUrl;

/** The Supabase access token for the current session. */
async function getApiToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return token;
}

/** API failure carrying the HTTP status and parsed JSON body (if any). */
export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message: string,
  ) {
    super(message);
  }
}

/** The machine-readable `code` field from an ApiError body, if present. */
export function apiErrorCode(err: unknown): string | null {
  if (!(err instanceof ApiError)) return null;
  const code = (err.body as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : null;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getApiToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch {
      // non-JSON error body — keep body null
    }
    throw new ApiError(res.status, body, `API ${res.status}: ${text}`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  // onboarding
  me: () =>
    call<{ userId: string; email: string | null; shop: { id: string; name: string } | null }>(
      "/shops/me",
    ),
  createShop: (name: string) =>
    call<{ id: string; name: string }>("/shops", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  updateShop: (name: string) =>
    call<{ id: string; name: string }>("/shops", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  deleteAccount: () => call<void>("/shops/account", { method: "DELETE" }),
  // menu
  listCategories: () => call<Category[]>("/categories"),
  createCategory: (b: CreateCategoryInput) =>
    call<Category>("/categories", { method: "POST", body: JSON.stringify(b) }),
  toggleCategory: (id: string, isAvailable: boolean) =>
    call<Category>(`/categories/${id}/availability`, {
      method: "PATCH",
      body: JSON.stringify({ isAvailable }),
    }),
  deleteCategory: (id: string) =>
    call<void>(`/categories/${id}`, { method: "DELETE" }),
  listItems: () => call<Item[]>("/items"),
  createItem: (b: CreateItemInput) =>
    call<Item>("/items", { method: "POST", body: JSON.stringify(b) }),
  updateItem: (id: string, b: UpdateItemInput) =>
    call<Item>(`/items/${id}`, { method: "PATCH", body: JSON.stringify(b) }),
  toggleItem: (id: string, isAvailable: boolean) =>
    call<Item>(`/items/${id}/availability`, {
      method: "PATCH",
      body: JSON.stringify({ isAvailable }),
    }),
  deleteItem: (id: string) => call<void>(`/items/${id}`, { method: "DELETE" }),
  // screens
  listScreens: () => call<Screen[]>("/screens"),
  createScreen: (b: CreateScreenInput) =>
    call<Screen>("/screens", { method: "POST", body: JSON.stringify(b) }),
  updateScreen: (id: string, b: Partial<CreateScreenInput>) =>
    call<Screen>(`/screens/${id}`, { method: "PATCH", body: JSON.stringify(b) }),
  deleteScreen: (id: string) =>
    call<void>(`/screens/${id}`, { method: "DELETE" }),
  getScreenCategories: (screenId: string) =>
    call<{ categoryId: string; sortOrder: number }[]>(
      `/screens/${screenId}/categories`,
    ),
  setScreenCategories: (
    screenId: string,
    categories: { categoryId: string; sortOrder: number }[],
  ) =>
    call<{ ok: true; version: number }>(`/screens/${screenId}/categories`, {
      method: "PUT",
      body: JSON.stringify({ categories }),
    }),
  // devices
  listDevices: () => call<Device[]>("/devices"),
  removeDevice: (id: string) => call<void>(`/devices/${id}`, { method: "DELETE" }),
  renameDevice: (id: string, name: string) =>
    call<{ ok: true; name: string }>(`/devices/${id}/name`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  updateDeviceLayout: (id: string, layout: DeviceLayout) =>
    call<{ ok: true }>(`/devices/${id}/layout`, {
      method: "PATCH",
      body: JSON.stringify(layout),
    }),
  pairDevice: (b: PairDeviceInput) =>
    call<{ ok: true }>("/devices/pair", {
      method: "POST",
      body: JSON.stringify(b),
    }),
  // billing
  billingPlans: () => call<Plan[]>("/billing/plans"),
  billingSummary: () => call<OwnerBillingSummary>("/billing/subscription"),
  billingUsage: () => call<BillingUsage>("/billing/usage"),
  billingOrders: () => call<SubscriptionOrder[]>("/billing/orders"),
  checkout: (planId: string) =>
    call<CheckoutResponse>("/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ planId }),
    }),
  getOrder: (id: string) => call<SubscriptionOrder>(`/billing/orders/${id}`),
  mockPay: (orderId: string) =>
    call<{ order: SubscriptionOrder | null }>(
      `/billing/orders/${orderId}/mock-pay`,
      { method: "POST" },
    ),
  // media
  presign: (contentType: string, size: number) =>
    call<{ uploadUrl: string; token: string; publicUrl: string; path: string }>(
      "/media/presign",
      { method: "POST", body: JSON.stringify({ contentType, size }) },
    ),
};

/**
 * Upload a file to Supabase Storage using a backend-issued signed upload URL,
 * then return the public CDN URL to store on the item. The browser sends the
 * bytes straight to Supabase — they never pass through our API server.
 */
export async function uploadMedia(file: File): Promise<string> {
  const { uploadUrl, publicUrl } = await api.presign(file.type, file.size);
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return publicUrl;
}
