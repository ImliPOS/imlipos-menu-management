import { z } from "zod";
import { isoDate } from "./menu";

export const deviceStatus = z.enum(["pending", "active", "revoked"]);
export type DeviceStatus = z.infer<typeof deviceStatus>;

/** ---- Device (a physical TV) ---- */
export const deviceSchema = z.object({
  id: z.string().uuid(),
  shopId: z.string().uuid().nullable(), // null until claimed
  screenId: z.string().uuid().nullable(),
  status: deviceStatus,
  lastSeenAt: isoDate.nullable(),
  createdAt: isoDate,
});
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
 * the code and choosing a screen.
 */
export const pairDeviceSchema = z.object({
  pairingCode: z.string().regex(/^\d{6}$/),
  screenId: z.string().uuid(),
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
