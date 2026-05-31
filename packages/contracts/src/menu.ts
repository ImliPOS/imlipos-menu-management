import { z } from "zod";

/** ISO timestamp string. */
export const isoDate = z.string().datetime();

/** ---- Category ---- */
export const categorySchema = z.object({
  id: z.string().uuid(),
  shopId: z.string().uuid(),
  name: z.string().min(1).max(120),
  sortOrder: z.number().int().nonnegative(),
  isAvailable: z.boolean(),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type Category = z.infer<typeof categorySchema>;

export const createCategorySchema = z.object({
  name: z.string().min(1).max(120),
  sortOrder: z.number().int().nonnegative().optional(),
  isAvailable: z.boolean().optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

/** ---- Item ---- */
export const mediaType = z.enum(["image", "video"]);
export type MediaType = z.infer<typeof mediaType>;

export const itemSchema = z.object({
  id: z.string().uuid(),
  shopId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(160),
  description: z.string().max(2000).nullable(),
  price: z.number().nonnegative(),
  mediaUrl: z.string().url().nullable(),
  mediaType: mediaType.nullable(),
  isAvailable: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type Item = z.infer<typeof itemSchema>;

export const createItemSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(160),
  description: z.string().max(2000).nullable().optional(),
  price: z.number().nonnegative(),
  mediaUrl: z.string().url().nullable().optional(),
  mediaType: mediaType.nullable().optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});
export type CreateItemInput = z.infer<typeof createItemSchema>;

export const updateItemSchema = createItemSchema.partial();
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

/** Toggle sold-out (used by both items and categories). */
export const availabilitySchema = z.object({ isAvailable: z.boolean() });
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
