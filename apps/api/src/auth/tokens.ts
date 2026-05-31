import { SignJWT, jwtVerify } from "jose";
import type { DeviceClaims } from "@imlipos/contracts";
import { env } from "../env.js";
import { supabaseAdmin } from "../lib/supabase.js";

/** ---- Owner auth: validate a Supabase access token via the Auth API ---- */

export interface AuthUser {
  userId: string;
  email: string | null;
}

// Small in-memory cache so we don't hit Supabase on every request.
const userCache = new Map<string, { user: AuthUser; exp: number }>();
const CACHE_MS = 30_000;

export async function verifySupabaseToken(token: string): Promise<AuthUser> {
  const hit = userCache.get(token);
  if (hit && hit.exp > Date.now()) return hit.user;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error("Invalid Supabase token");

  const user: AuthUser = { userId: data.user.id, email: data.user.email ?? null };
  userCache.set(token, { user, exp: Date.now() + CACHE_MS });
  return user;
}

/** ---- TV device tokens: our own long-lived JWTs (unchanged) ---- */

const deviceSecret = new TextEncoder().encode(env.DEVICE_JWT_SECRET);

export async function signDeviceToken(claims: {
  deviceId: string;
  shopId: string;
  screenId: string;
}): Promise<string> {
  return new SignJWT({
    shopId: claims.shopId,
    screenId: claims.screenId,
    kind: "device",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.deviceId)
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(deviceSecret);
}

export async function verifyDeviceToken(token: string): Promise<DeviceClaims> {
  const { payload } = await jwtVerify(token, deviceSecret);
  if (
    !payload.sub ||
    typeof payload.shopId !== "string" ||
    typeof payload.screenId !== "string"
  ) {
    throw new Error("Invalid device token");
  }
  return {
    sub: payload.sub,
    shopId: payload.shopId,
    screenId: payload.screenId,
    kind: "device",
  };
}
