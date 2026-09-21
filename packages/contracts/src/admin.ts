import { z } from "zod";
import { isoDate } from "./menu";

/**
 * ---- Super-admin console contracts ----
 * Shapes for the /admin/* API surface consumed by @imlipos/admin. The super
 * admin is the platform operator; "customer" here means a shop + its owner
 * (Supabase auth user).
 */

/** ---- Plans ---- */
export const planSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80),
  description: z.string().max(500).nullable(),
  deviceLimit: z.number().int().positive(),
  /** Display-only for now — no payment provider is wired up. */
  priceMonthly: z.number().nonnegative().nullable(),
  isActive: z.boolean(),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type Plan = z.infer<typeof planSchema>;

export const createPlanSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).nullable().optional(),
  deviceLimit: z.number().int().positive().optional(),
  priceMonthly: z.number().nonnegative().nullable().optional(),
  isActive: z.boolean().optional(),
});
export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = createPlanSchema.partial();
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

/** ---- Subscriptions ---- */
export const subscriptionStatus = z.enum([
  "trialing",
  "active",
  "expired",
  "cancelled",
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatus>;

export const subscriptionSchema = z.object({
  id: z.string().uuid(),
  shopId: z.string().uuid(),
  planId: z.string().uuid(),
  status: subscriptionStatus,
  startsAt: isoDate,
  endsAt: isoDate.nullable(),
  /** null = use the plan's deviceLimit. */
  deviceLimitOverride: z.number().int().positive().nullable(),
  notes: z.string().max(1000).nullable(),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type Subscription = z.infer<typeof subscriptionSchema>;

export interface SubscriptionWithPlan extends Subscription {
  planName: string;
  planDeviceLimit: number;
  shopName?: string;
  ownerEmail?: string | null;
}

export const assignSubscriptionSchema = z.object({
  planId: z.string().uuid(),
  status: subscriptionStatus.optional(), // default "active"
  startsAt: isoDate.optional(),
  endsAt: isoDate.nullable().optional(),
  deviceLimitOverride: z.number().int().positive().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});
export type AssignSubscriptionInput = z.infer<typeof assignSubscriptionSchema>;

export const updateSubscriptionSchema = z.object({
  status: subscriptionStatus.optional(),
  startsAt: isoDate.optional(),
  endsAt: isoDate.nullable().optional(),
  deviceLimitOverride: z.number().int().positive().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;

/** ---- Customers (shop + owner) ---- */
export const adminCustomersQuery = z.object({
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export type AdminCustomersQuery = z.infer<typeof adminCustomersQuery>;

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminCustomerRow {
  shopId: string;
  shopName: string;
  shopCreatedAt: string;
  ownerId: string;
  ownerEmail: string | null;
  ownerLastSignInAt: string | null;
  deviceCount: number;
  screenCount: number;
  itemCount: number;
  /** The live (trialing/active) subscription, if any. */
  subscription: {
    id: string;
    planName: string;
    status: SubscriptionStatus;
    endsAt: string | null;
  } | null;
}

export interface AdminCustomerDevice {
  id: string;
  name: string | null;
  status: "pending" | "active" | "revoked";
  lastSeenAt: string | null;
  online: boolean;
  screenName: string | null;
}

export interface AdminCustomerDetail {
  shopId: string;
  shopName: string;
  shopCreatedAt: string;
  owner: {
    id: string;
    email: string | null;
    createdAt: string | null;
    lastSignInAt: string | null;
  };
  counts: { devices: number; screens: number; items: number; categories: number };
  devices: AdminCustomerDevice[];
  screens: { id: string; name: string; location: string | null }[];
  subscriptions: SubscriptionWithPlan[];
}

/** ---- Metrics ---- */
export interface AdminOverview {
  shops: number;
  items: number;
  screens: number;
  devices: { total: number; byStatus: Record<string, number>; online: number };
  subscriptions: {
    byStatus: Record<string, number>;
    byPlan: { planName: string; count: number }[];
  };
}

export const growthQuery = z.object({
  interval: z.enum(["week", "month"]).default("month"),
  months: z.coerce.number().int().positive().max(36).default(12),
});
export type GrowthQuery = z.infer<typeof growthQuery>;

export interface GrowthPoint {
  bucket: string; // ISO date of the period start
  count: number;
}

export interface AdminGrowth {
  interval: "week" | "month";
  shops: GrowthPoint[];
  devices: GrowthPoint[];
}
