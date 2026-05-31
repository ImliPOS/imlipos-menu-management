import { z } from "zod";
import { isoDate } from "./menu";

export const orientation = z.enum(["landscape", "portrait"]);
export type Orientation = z.infer<typeof orientation>;

/** ---- Screen ---- */
export const screenSchema = z.object({
  id: z.string().uuid(),
  shopId: z.string().uuid(),
  name: z.string().min(1).max(120),
  location: z.string().max(160).nullable(),
  orientation,
  theme: z.string().max(60).default("default"),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type Screen = z.infer<typeof screenSchema>;

export const createScreenSchema = z.object({
  name: z.string().min(1).max(120),
  location: z.string().max(160).nullable().optional(),
  orientation: orientation.optional(),
  theme: z.string().max(60).optional(),
});
export type CreateScreenInput = z.infer<typeof createScreenSchema>;

export const updateScreenSchema = createScreenSchema.partial();
export type UpdateScreenInput = z.infer<typeof updateScreenSchema>;

/** ---- Screen ↔ Category assignment (what shows where) ---- */
export const screenCategorySchema = z.object({
  screenId: z.string().uuid(),
  categoryId: z.string().uuid(),
  sortOrder: z.number().int().nonnegative(),
});
export type ScreenCategory = z.infer<typeof screenCategorySchema>;

export const setScreenCategoriesSchema = z.object({
  categories: z.array(
    z.object({
      categoryId: z.string().uuid(),
      sortOrder: z.number().int().nonnegative(),
    }),
  ),
});
export type SetScreenCategoriesInput = z.infer<typeof setScreenCategoriesSchema>;

/**
 * The full payload a TV fetches on boot / reconnect for its assigned screen.
 * Categories carry their items inline, already filtered + ordered.
 */
export const screenContentSchema = z.object({
  screen: screenSchema,
  categories: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      sortOrder: z.number().int(),
      isAvailable: z.boolean(),
      items: z.array(
        z.object({
          id: z.string().uuid(),
          name: z.string(),
          description: z.string().nullable(),
          price: z.number(),
          mediaUrl: z.string().url().nullable(),
          mediaType: z.enum(["image", "video"]).nullable(),
          isAvailable: z.boolean(),
          sortOrder: z.number().int(),
        }),
      ),
    }),
  ),
  /** Monotonic version so the TV can ignore stale snapshots after reconnect. */
  version: z.number().int(),
});
export type ScreenContent = z.infer<typeof screenContentSchema>;
