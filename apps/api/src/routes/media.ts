import { Router } from "express";
import { z } from "zod";
import { requireOwner, shopId } from "../middleware/auth.js";
import { presignUpload } from "../lib/storage.js";

export const mediaRouter = Router();
mediaRouter.use(requireOwner);

const presignSchema = z.object({
  contentType: z.string(),
  size: z.number().int().positive(),
});

/** Return a Supabase signed upload URL so the browser uploads directly (bypassing the API). */
mediaRouter.post("/presign", async (req, res) => {
  const parsed = presignSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  try {
    const out = await presignUpload({
      shopId: shopId(req),
      contentType: parsed.data.contentType,
      size: parsed.data.size,
    });
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});
