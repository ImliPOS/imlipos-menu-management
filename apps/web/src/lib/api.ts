"use client";

import type {
  Category,
  CreateCategoryInput,
  CreateItemInput,
  CreateScreenInput,
  Device,
  Item,
  PairDeviceInput,
  Screen,
} from "@imlipos/contracts";

import { supabase } from "./supabase";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** The Supabase access token for the current session. */
async function getApiToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return token;
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
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
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
  pairDevice: (b: PairDeviceInput) =>
    call<{ ok: true }>("/devices/pair", {
      method: "POST",
      body: JSON.stringify(b),
    }),
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
