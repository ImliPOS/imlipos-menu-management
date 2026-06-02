import { Router } from "express";
import { and, asc, eq } from "drizzle-orm";
import {
  availabilitySchema,
  createCategorySchema,
  updateCategorySchema,
} from "@imlipos/contracts";
import { db, schema } from "../db/client.js";
import { requireOwner, shopId } from "../middleware/auth.js";
import {
  bumpScreenVersion,
  screensShowingCategory,
} from "../services/content.js";
import {
  emitCategoryUpdated,
  emitMenuRefresh,
  emitShopMenuChanged,
} from "../realtime/io.js";

const { categories } = schema;
export const categoriesRouter = Router();
categoriesRouter.use(requireOwner);

categoriesRouter.get("/", async (req, res) => {
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.shopId, shopId(req)))
    .orderBy(asc(categories.sortOrder));
  res.json(rows);
});

categoriesRouter.post("/", async (req, res) => {
  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const [row] = await db
    .insert(categories)
    .values({ ...parsed.data, shopId: shopId(req) })
    .returning();
  res.status(201).json(row);
});

categoriesRouter.patch("/:id", async (req, res) => {
  const parsed = updateCategorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const [row] = await db
    .update(categories)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(categories.id, req.params.id), eq(categories.shopId, shopId(req))))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  emitShopMenuChanged(shopId(req));
  res.json(row);
});

/** Sold-out toggle — broadcasts live to every screen showing this category. */
categoriesRouter.patch("/:id/availability", async (req, res) => {
  const parsed = availabilitySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const [row] = await db
    .update(categories)
    .set({ isAvailable: parsed.data.isAvailable, updatedAt: new Date() })
    .where(and(eq(categories.id, req.params.id), eq(categories.shopId, shopId(req))))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });

  const screenIds = await screensShowingCategory(shopId(req), row.id);
  for (const sid of screenIds) {
    const version = await bumpScreenVersion(sid);
    emitCategoryUpdated([sid], {
      screenId: sid,
      categoryId: row.id,
      isAvailable: row.isAvailable,
      version,
    });
  }
  emitShopMenuChanged(shopId(req));
  res.json(row);
});

categoriesRouter.delete("/:id", async (req, res) => {
  // Capture affected screens BEFORE deleting (the join rows cascade away).
  const screenIds = await screensShowingCategory(shopId(req), req.params.id);
  const [row] = await db
    .delete(categories)
    .where(and(eq(categories.id, req.params.id), eq(categories.shopId, shopId(req))))
    .returning({ id: categories.id });
  if (!row) return res.status(404).json({ error: "Not found" });

  for (const sid of screenIds) {
    const version = await bumpScreenVersion(sid);
    emitMenuRefresh(sid, { screenId: sid, version });
  }
  emitShopMenuChanged(shopId(req));
  res.status(204).end();
});
