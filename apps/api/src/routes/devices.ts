import { Router } from "express";
import { and, eq, gt } from "drizzle-orm";
import { createHash, randomBytes, randomInt } from "node:crypto";
import {
  pairDeviceSchema,
  registerDeviceSchema,
  reportResolutionSchema,
  updateLayoutSchema,
} from "@imlipos/contracts";
import { db, schema } from "../db/client.js";
import { requireOwner, requireDevice, shopId } from "../middleware/auth.js";
import { signDeviceToken } from "../auth/tokens.js";
import {
  emitScreenReassigned,
  emitDeviceUnpaired,
  emitDeviceRefresh,
} from "../realtime/io.js";
import { buildDeviceContent } from "../services/deviceContent.js";

const { devices, screens } = schema;
export const devicesRouter = Router();

const PAIRING_TTL_MS = 10 * 60 * 1000; // 10 minutes
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const sixDigit = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

/**
 * Step 1 — TV self-registers (UNAUTHENTICATED). Returns a pairing code to show
 * on screen + a secret claim token the TV keeps to collect its device token.
 * NOTE: rate-limit this endpoint and /pair in front of the app (see middleware).
 */
devicesRouter.post("/register", async (req, res) => {
  const parsed = registerDeviceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const claimToken = randomBytes(32).toString("hex");
  const pairingCode = sixDigit();
  const expiresAt = new Date(Date.now() + PAIRING_TTL_MS);

  const [row] = await db
    .insert(devices)
    .values({
      hardwareId: parsed.data.hardwareId,
      pairingCode,
      pairingExpiresAt: expiresAt,
      claimTokenHash: sha256(claimToken),
      status: "pending",
    })
    .returning({ id: devices.id });

  res.status(201).json({
    deviceId: row!.id,
    pairingCode,
    claimToken,
    expiresAt: expiresAt.toISOString(),
  });
});

/**
 * Step 3 — TV polls status with its claim token. Once the owner has claimed it,
 * returns the long-lived device token (then never again).
 */
devicesRouter.get("/:id/status", async (req, res) => {
  const claimToken = req.header("x-claim-token");
  if (!claimToken) return res.status(401).json({ error: "Missing claim token" });

  const [device] = await db
    .select()
    .from(devices)
    .where(eq(devices.id, req.params.id))
    .limit(1);
  if (!device || device.claimTokenHash !== sha256(claimToken)) {
    return res.status(404).json({ error: "Not found" });
  }

  if (device.status === "active" && device.shopId && device.screenId) {
    const deviceToken = await signDeviceToken({
      deviceId: device.id,
      shopId: device.shopId,
      screenId: device.screenId,
    });
    return res.json({
      status: "active",
      screenId: device.screenId,
      deviceToken,
    });
  }
  res.json({ status: device.status, screenId: device.screenId, deviceToken: null });
});

/**
 * Step 2 — Owner claims a device (AUTHENTICATED) by entering the code +
 * choosing a screen. Binds the device to the owner's shop.
 */
devicesRouter.post("/pair", requireOwner, async (req, res) => {
  const parsed = pairDeviceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  // Screen must belong to this owner.
  const [screen] = await db
    .select({ id: screens.id })
    .from(screens)
    .where(and(eq(screens.id, parsed.data.screenId), eq(screens.shopId, shopId(req))))
    .limit(1);
  if (!screen) return res.status(404).json({ error: "Screen not found" });

  const [device] = await db
    .select()
    .from(devices)
    .where(
      and(
        eq(devices.pairingCode, parsed.data.pairingCode),
        eq(devices.status, "pending"),
        gt(devices.pairingExpiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!device) return res.status(404).json({ error: "Invalid or expired code" });

  await db
    .update(devices)
    .set({
      shopId: shopId(req),
      screenId: parsed.data.screenId,
      name: parsed.data.name,
      status: "active",
      pairingCode: null,
      pairingExpiresAt: null,
    })
    .where(eq(devices.id, device.id));

  res.json({ ok: true, deviceId: device.id });
});

/** Owner: list TVs + online status. */
devicesRouter.get("/", requireOwner, async (req, res) => {
  const rows = await db
    .select({
      id: devices.id,
      screenId: devices.screenId,
      name: devices.name,
      screenWidth: devices.screenWidth,
      screenHeight: devices.screenHeight,
      layout: devices.layout,
      status: devices.status,
      lastSeenAt: devices.lastSeenAt,
      createdAt: devices.createdAt,
    })
    .from(devices)
    .where(eq(devices.shopId, shopId(req)));
  res.json(
    rows.map((r) => ({
      id: r.id,
      shopId: shopId(req),
      screenId: r.screenId,
      name: r.name,
      resolution:
        r.screenWidth && r.screenHeight
          ? { width: r.screenWidth, height: r.screenHeight }
          : null,
      layout: r.layout ?? null,
      status: r.status,
      lastSeenAt: r.lastSeenAt,
      createdAt: r.createdAt,
    })),
  );
});

/** Owner: re-assign a TV to a different screen (switches content live). */
devicesRouter.patch("/:id/screen", requireOwner, async (req, res) => {
  const screenId = (req.body?.screenId as string) ?? "";
  const [screen] = await db
    .select({ id: screens.id })
    .from(screens)
    .where(and(eq(screens.id, screenId), eq(screens.shopId, shopId(req))))
    .limit(1);
  if (!screen) return res.status(404).json({ error: "Screen not found" });

  const [row] = await db
    .update(devices)
    .set({ screenId })
    .where(and(eq(devices.id, req.params.id), eq(devices.shopId, shopId(req))))
    .returning({ id: devices.id });
  if (!row) return res.status(404).json({ error: "Device not found" });

  emitScreenReassigned(screenId);
  res.json({ ok: true });
});

/** Owner: revoke a device (kills its token on next call). */
devicesRouter.post("/:id/revoke", requireOwner, async (req, res) => {
  await db
    .update(devices)
    .set({ status: "revoked", screenId: null })
    .where(and(eq(devices.id, req.params.id), eq(devices.shopId, shopId(req))));
  emitDeviceUnpaired(req.params.id);
  res.json({ ok: true });
});

/** Owner: remove a device entirely. It un-pairs and shows a fresh code. */
devicesRouter.delete("/:id", requireOwner, async (req, res) => {
  const [row] = await db
    .delete(devices)
    .where(and(eq(devices.id, req.params.id), eq(devices.shopId, shopId(req))))
    .returning({ id: devices.id });
  if (!row) return res.status(404).json({ error: "Not found" });
  // Push an immediate un-pair to the TV (it's likely still socket-connected).
  emitDeviceUnpaired(req.params.id);
  res.status(204).end();
});

/** Device: heartbeat to update online status. */
devicesRouter.post("/heartbeat", requireDevice, async (req, res) => {
  await db
    .update(devices)
    .set({ lastSeenAt: new Date() })
    .where(eq(devices.id, req.device!.sub));
  res.json({ ok: true });
});

/** Device: report its screen resolution (drives the layout editor preview). */
devicesRouter.post("/resolution", requireDevice, async (req, res) => {
  const parsed = reportResolutionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  await db
    .update(devices)
    .set({ screenWidth: parsed.data.width, screenHeight: parsed.data.height })
    .where(eq(devices.id, req.device!.sub));
  res.json({ ok: true });
});

/** Device: its resolved zone content (boot + on refresh). */
devicesRouter.get("/content", requireDevice, async (req, res) => {
  const [device] = await db
    .select({
      shopId: devices.shopId,
      screenId: devices.screenId,
      layout: devices.layout,
    })
    .from(devices)
    .where(eq(devices.id, req.device!.sub))
    .limit(1);
  if (!device?.shopId) return res.status(404).json({ error: "Not found" });
  const content = await buildDeviceContent(
    device.shopId,
    device.screenId,
    device.layout,
    Date.now(),
  );
  res.json(content);
});

/** Owner: set a device's layout (zones + content). */
devicesRouter.patch("/:id/layout", requireOwner, async (req, res) => {
  const parsed = updateLayoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const [row] = await db
    .update(devices)
    .set({ layout: parsed.data })
    .where(and(eq(devices.id, req.params.id), eq(devices.shopId, shopId(req))))
    .returning({ id: devices.id });
  if (!row) return res.status(404).json({ error: "Not found" });
  emitDeviceRefresh(row.id);
  res.json({ ok: true });
});
