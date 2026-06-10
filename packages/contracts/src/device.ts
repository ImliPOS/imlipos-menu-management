import { z } from "zod";
import { isoDate } from "./menu";
import { deviceLayout, resolution } from "./layout";

export const deviceStatus = z.enum(["pending", "active", "revoked"]);
export type DeviceStatus = z.infer<typeof deviceStatus>;

/** ---- Device (a physical display) ---- */
export const deviceSchema = z.object({
  id: z.string().uuid(),
  shopId: z.string().uuid().nullable(), // null until claimed
  screenId: z.string().uuid().nullable(),
  name: z.string().nullable(), // owner-given display name, set at pairing
  resolution: resolution.nullable(), // reported by the device
  layout: deviceLayout.nullable(), // per-device zone layout
  status: deviceStatus,
  lastSeenAt: isoDate.nullable(),
  createdAt: isoDate,
});

/** Owner sets a device's layout. */
export const updateLayoutSchema = deviceLayout;
export type UpdateLayoutInput = z.infer<typeof updateLayoutSchema>;
export type Device = z.infer<typeof deviceSchema>;

/**
 * Step 1 — TV self-registers (unauthenticated). Returns a pairing code the TV
 * displays, plus a claim token the TV keeps secret to collect its device token.
 */
export const registerDeviceSchema = z.object({
  hardwareId: z.string().min(8).max(128),
});
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;

export const registerDeviceResponse = z.object({
  deviceId: z.string().uuid(),
  pairingCode: z.string().regex(/^\d{6}$/),
  claimToken: z.string(),
  expiresAt: isoDate,
});
export type RegisterDeviceResponse = z.infer<typeof registerDeviceResponse>;

/**
 * Step 2 — Owner claims the device (authenticated with owner JWT) by entering
 * the code and naming it. A screen is auto-created for the display on pair;
 * `screenId` is optional and only sent when binding to an existing screen.
 */
export const pairDeviceSchema = z.object({
  pairingCode: z.string().regex(/^\d{6}$/),
  screenId: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
});
export type PairDeviceInput = z.infer<typeof pairDeviceSchema>;

/**
 * Step 3 — TV polls status with its claim token. Once active, it receives the
 * long-lived device token.
 */
export const deviceStatusResponse = z.object({
  status: deviceStatus,
  screenId: z.string().uuid().nullable(),
  deviceToken: z.string().nullable(), // present once status === "active"
});
export type DeviceStatusResponse = z.infer<typeof deviceStatusResponse>;

export const heartbeatResponse = z.object({ ok: z.literal(true) });
export type HeartbeatResponse = z.infer<typeof heartbeatResponse>;
