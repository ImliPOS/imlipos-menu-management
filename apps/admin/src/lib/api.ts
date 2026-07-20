import {
  appUrls,
  resolveAppEnv,
  type AdminCustomerDetail,
  type AdminCustomerRow,
  type AdminGrowth,
  type AdminOverview,
  type AssignSubscriptionInput,
  type CreatePlanInput,
  type Paginated,
  type Plan,
  type Subscription,
  type SubscriptionStatus,
  type SubscriptionWithPlan,
  type UpdatePlanInput,
  type UpdateSubscriptionInput,
} from "@imlipos/contracts";

import { supabase } from "./supabase";

// Auto-derived from the environment; set VITE_API_URL only to override.
const API = import.meta.env.VITE_API_URL ?? appUrls(resolveAppEnv()).apiUrl;

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
  // customers
  listCustomers: (params: { search?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.page) q.set("page", String(params.page));
    if (params.pageSize) q.set("pageSize", String(params.pageSize));
    return call<Paginated<AdminCustomerRow>>(`/admin/customers?${q}`);
  },
  getCustomer: (shopId: string) =>
    call<AdminCustomerDetail>(`/admin/customers/${shopId}`),
  // metrics
  overview: () => call<AdminOverview>("/admin/metrics/overview"),
  growth: (interval: "week" | "month", months = 12) =>
    call<AdminGrowth>(`/admin/metrics/growth?interval=${interval}&months=${months}`),
  // plans
  listPlans: () => call<Plan[]>("/admin/plans"),
  createPlan: (b: CreatePlanInput) =>
    call<Plan>("/admin/plans", { method: "POST", body: JSON.stringify(b) }),
  updatePlan: (id: string, b: UpdatePlanInput) =>
    call<Plan>(`/admin/plans/${id}`, { method: "PATCH", body: JSON.stringify(b) }),
  // subscriptions
  listSubscriptions: (status?: SubscriptionStatus) =>
    call<SubscriptionWithPlan[]>(
      `/admin/subscriptions${status ? `?status=${status}` : ""}`,
    ),
  assignSubscription: (shopId: string, b: AssignSubscriptionInput) =>
    call<Subscription>(`/admin/customers/${shopId}/subscription`, {
      method: "POST",
      body: JSON.stringify(b),
    }),
  updateSubscription: (id: string, b: UpdateSubscriptionInput) =>
    call<Subscription>(`/admin/subscriptions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(b),
    }),
};
