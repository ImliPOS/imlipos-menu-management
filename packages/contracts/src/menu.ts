import { z } from "zod";

/** ISO timestamp string. */
export const isoDate = z.string().datetime();

/** ---- Uncategorised ----
 *  An item may sit outside every category (`categoryId === null`). For display
 *  purposes those loose items are gathered into ONE virtual group carrying this
 *  sentinel id. It flows, paginates and can be picked for a block exactly like a
 *  real category, but it prints no heading — just a single blank line separating
 *  it from the items above it. The id is deliberately not a uuid so it can never
 *  collide with a real category, which is why `categoryIds` on a layout zone is
 *  a plain string array rather than a uuid array. */
export const UNCATEGORIZED_ID = "uncategorized";
/** Operator-facing label for the virtual group (never rendered on a display). */
export const UNCATEGORIZED_LABEL = "Uncategorised";
export function isUncategorized(id: string): boolean {
  return id === UNCATEGORIZED_ID;
}

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
  /** null = the item belongs to no category (see UNCATEGORIZED_ID). */
  categoryId: z.string().uuid().nullable(),
  name: z.string().min(1).max(160),
  description: z.string().max(2000).nullable(),
  price: z.number().nonnegative(),
  mediaUrl: z.string().url().nullable(),
  mediaType: mediaType.nullable(),
  isAvailable: z.boolean(),
  isFeatured: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type Item = z.infer<typeof itemSchema>;

export const createItemSchema = z.object({
  /** Omit or pass null to create the item without a category. */
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(160),
  description: z.string().max(2000).nullable().optional(),
  price: z.number().nonnegative(),
  mediaUrl: z.string().url().nullable().optional(),
  mediaType: mediaType.nullable().optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});
export type CreateItemInput = z.infer<typeof createItemSchema>;

export const updateItemSchema = createItemSchema.partial();
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

/** Toggle sold-out (used by both items and categories). */
export const availabilitySchema = z.object({ isAvailable: z.boolean() });
export type AvailabilityInput = z.infer<typeof availabilitySchema>;

/** ---- Resolved views (what a display renders) ---- */
export const menuItemView = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  mediaUrl: z.string().url().nullable(),
  mediaType: mediaType.nullable(),
  isAvailable: z.boolean(),
  isFeatured: z.boolean(),
  sortOrder: z.number().int(),
});
export type MenuItemView = z.infer<typeof menuItemView>;

export const menuCategoryView = z.object({
  /** A real category's uuid, or UNCATEGORIZED_ID for the virtual group. */
  id: z.string(),
  name: z.string(),
  sortOrder: z.number().int(),
  isAvailable: z.boolean(),
  items: z.array(menuItemView),
});
export type MenuCategoryView = z.infer<typeof menuCategoryView>;
