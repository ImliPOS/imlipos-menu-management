import { Router } from "express";
import { and, asc, eq } from "drizzle-orm";
import {
  createScreenSchema,
  setScreenCategoriesSchema,
  updateScreenSchema,
} from "@imlipos/contracts";
import { db, schema } from "../db/client.js";
import { requireOwner, requireDevice, shopId } from "../middleware/auth.js";
import { buildScreenContent, bumpScreenVersion } from "../services/content.js";
import { emitMenuRefresh } from "../realtime/io.js";

const { screens, screenCategories } = schema;
export const screensRouter = Router();

/** ---- Owner-authed screen management ---- */
screensRouter.get("/", requireOwner, async (req, res) => {
  const rows = await db
    .select()
    .from(screens)
    .where(eq(screens.shopId, shopId(req)))
    .orderBy(asc(screens.createdAt));
  res.json(rows);
});

screensRouter.post("/", requireOwner, async (req, res) => {
  const parsed = createScreenSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const [row] = await db
    .insert(screens)
    .values({ ...parsed.data, shopId: shopId(req) })
    .returning();
  res.status(201).json(row);
});

screensRouter.patch("/:id", requireOwner, async (req, res) => {
  const parsed = updateScreenSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const [row] = await db
    .update(screens)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(screens.id, req.params.id), eq(screens.shopId, shopId(req))))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

/** Set which categories show on a screen, then nudge TVs to refetch. */
screensRouter.put("/:id/categories", requireOwner, async (req, res) => {
  const parsed = setScreenCategoriesSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const [owned] = await db
    .select({ id: screens.id })
    .from(screens)
    .where(and(eq(screens.id, req.params.id), eq(screens.shopId, shopId(req))))
    .limit(1);
  if (!owned) return res.status(404).json({ error: "Not found" });

  await db.transaction(async (tx) => {
    await tx
      .delete(screenCategories)
      .where(eq(screenCategories.screenId, req.params.id));
    if (parsed.data.categories.length) {
      await tx.insert(screenCategories).values(
        parsed.data.categories.map((c) => ({
          screenId: req.params.id,
          categoryId: c.categoryId,
          sortOrder: c.sortOrder,
        })),
      );
    }
  });

  const version = await bumpScreenVersion(req.params.id);
  emitMenuRefresh(req.params.id, { screenId: req.params.id, version });
  res.json({ ok: true, version });
});

/** Owner: read a screen's current category assignments (to prefill the UI). */
screensRouter.get("/:id/categories", requireOwner, async (req, res) => {
  const [owned] = await db
    .select({ id: screens.id })
    .from(screens)
    .where(and(eq(screens.id, req.params.id), eq(screens.shopId, shopId(req))))
    .limit(1);
  if (!owned) return res.status(404).json({ error: "Not found" });

  const rows = await db
    .select({
      categoryId: screenCategories.categoryId,
      sortOrder: screenCategories.sortOrder,
    })
    .from(screenCategories)
    .where(eq(screenCategories.screenId, req.params.id))
    .orderBy(asc(screenCategories.sortOrder));
  res.json(rows);
});

/** ---- Device-authed: a TV fetches its own screen content (boot + reconnect) ---- */
screensRouter.get("/:id/content", requireDevice, async (req, res) => {
  if (req.device!.screenId !== req.params.id) {
    return res.status(403).json({ error: "Device not bound to this screen" });
  }
  const content = await buildScreenContent(req.device!.shopId, req.params.id);
  if (!content) return res.status(404).json({ error: "Not found" });
  res.json(content);
});
