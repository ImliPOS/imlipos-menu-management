import { Router } from "express";
import { and, asc, eq } from "drizzle-orm";
import {
  availabilitySchema,
  createItemSchema,
  updateItemSchema,
} from "@imlipos/contracts";
import { db, schema } from "../db/client.js";
import { requireOwner, shopId } from "../middleware/auth.js";
import {
  bumpScreenVersion,
  screensShowingCategory,
} from "../services/content.js";
import { emitItemUpdated, emitMenuRefresh, emitShopMenuChanged } from "../realtime/io.js";

const { items } = schema;
export const itemsRouter = Router();
itemsRouter.use(requireOwner);

itemsRouter.get("/", async (req, res) => {
  const rows = await db
    .select()
    .from(items)
    .where(eq(items.shopId, shopId(req)))
    .orderBy(asc(items.sortOrder));
  res.json(rows);
});

itemsRouter.post("/", async (req, res) => {
  const parsed = createItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const [row] = await db
    .insert(items)
    .values({
      ...parsed.data,
      price: String(parsed.data.price),
      shopId: shopId(req),
    })
    .returning();
  emitShopMenuChanged(shopId(req));
  res.status(201).json(row);
});

itemsRouter.patch("/:id", async (req, res) => {
  const parsed = updateItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { price, ...rest } = parsed.data;
  const [row] = await db
    .update(items)
    .set({
      ...rest,
      ...(price !== undefined ? { price: String(price) } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(items.id, req.params.id), eq(items.shopId, shopId(req))))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });

  // Name/price/image change → tell screens showing this item to refetch.
  const screenIds = await screensShowingCategory(shopId(req), row.categoryId);
  for (const sid of screenIds) {
    const version = await bumpScreenVersion(sid);
    emitMenuRefresh(sid, { screenId: sid, version });
  }
  emitShopMenuChanged(shopId(req));
  res.json(row);
});

/** Sold-out toggle — the core real-time path. */
itemsRouter.patch("/:id/availability", async (req, res) => {
  const parsed = availabilitySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const [row] = await db
    .update(items)
    .set({ isAvailable: parsed.data.isAvailable, updatedAt: new Date() })
    .where(and(eq(items.id, req.params.id), eq(items.shopId, shopId(req))))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });

  const screenIds = await screensShowingCategory(shopId(req), row.categoryId);
  for (const sid of screenIds) {
    const version = await bumpScreenVersion(sid);
    emitItemUpdated([sid], {
      screenId: sid,
      itemId: row.id,
      isAvailable: row.isAvailable,
      version,
    });
  }
  emitShopMenuChanged(shopId(req));
  res.json(row);
});

itemsRouter.delete("/:id", async (req, res) => {
  const [row] = await db
    .delete(items)
    .where(and(eq(items.id, req.params.id), eq(items.shopId, shopId(req))))
    .returning({ id: items.id, categoryId: items.categoryId });
  if (!row) return res.status(404).json({ error: "Not found" });

  const screenIds = await screensShowingCategory(shopId(req), row.categoryId);
  for (const sid of screenIds) {
    const version = await bumpScreenVersion(sid);
    emitMenuRefresh(sid, { screenId: sid, version });
  }
  emitShopMenuChanged(shopId(req));
  res.status(204).end();
});
