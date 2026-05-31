import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { requireAuth } from "../middleware/auth.js";

const { shops } = schema;
export const shopsRouter = Router();
shopsRouter.use(requireAuth);

/** Who am I + do I have a shop yet? Drives the onboarding redirect. */
shopsRouter.get("/me", async (req, res) => {
  const [shop] = await db
    .select()
    .from(shops)
    .where(eq(shops.ownerId, req.auth!.userId))
    .limit(1);
  res.json({
    userId: req.auth!.userId,
    email: req.auth!.email,
    shop: shop ?? null,
  });
});

const createShopSchema = z.object({ name: z.string().min(1).max(120) });

/** Create the owner's shop (one per owner for the MVP). */
shopsRouter.post("/", async (req, res) => {
  const parsed = createShopSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const [existing] = await db
    .select({ id: shops.id })
    .from(shops)
    .where(eq(shops.ownerId, req.auth!.userId))
    .limit(1);
  if (existing) return res.status(409).json({ error: "Shop already exists" });

  const [row] = await db
    .insert(shops)
    .values({ ownerId: req.auth!.userId, name: parsed.data.name })
    .returning();
  res.status(201).json(row);
});
