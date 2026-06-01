import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import type { DeviceClaims } from "@imlipos/contracts";
import { db, schema } from "../db/client.js";
import {
  verifyDeviceToken,
  verifySupabaseToken,
  type AuthUser,
} from "../auth/tokens.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthUser; // the Supabase-authenticated owner user
      shopId?: string; // resolved tenant (when the user has a shop)
      device?: DeviceClaims; // a TV device
    }
  }
}

function bearer(req: Request): string | null {
  const h = req.header("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice("Bearer ".length).trim();
}

/** Require a signed-in owner (Supabase access token). Sets req.auth. */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = bearer(req);
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.auth = await verifySupabaseToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

/**
 * Require an owner who has completed onboarding (has a shop). Sets req.shopId.
 * Returns 409 if the user is authenticated but has no shop yet.
 */
export async function requireOwner(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  await requireAuth(req, res, async () => {
    const [shop] = await db
      .select({ id: schema.shops.id })
      .from(schema.shops)
      .where(eq(schema.shops.ownerId, req.auth!.userId))
      .limit(1);
    if (!shop) {
      return res.status(409).json({ error: "No shop — complete onboarding" });
    }
    req.shopId = shop.id;
    next();
  });
}

/**
 * Require a device token (TV). Sets req.device. Also verifies the device row
 * still exists and is active — so deleting or revoking a device immediately
 * invalidates its (otherwise stateless) token.
 */
export async function requireDevice(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = bearer(req);
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    const claims = await verifyDeviceToken(token);
    const [dev] = await db
      .select({ status: schema.devices.status })
      .from(schema.devices)
      .where(eq(schema.devices.id, claims.sub))
      .limit(1);
    if (!dev || dev.status !== "active") {
      return res.status(401).json({ error: "Device revoked" });
    }
    req.device = claims;
    next();
  } catch {
    res.status(401).json({ error: "Invalid device token" });
  }
}

/** The authenticated tenant for the current request. */
export function shopId(req: Request): string {
  if (!req.shopId) throw new Error("shopId() called without an owner context");
  return req.shopId;
}
