import { and, asc, eq, inArray } from "drizzle-orm";
import type {
  DeviceContent,
  DeviceLayout,
  MenuCategoryView,
  ResolvedZone,
} from "@imlipos/contracts";
import { DEFAULT_THEME } from "@imlipos/contracts";
import { db, schema } from "../db/client.js";

const { categories, items, screenCategories } = schema;

/** Load categories (with items) for a shop, keyed by id. */
async function loadCategories(
  shopId: string,
  categoryIds: string[],
): Promise<Map<string, MenuCategoryView>> {
  if (categoryIds.length === 0) return new Map();
  const cats = await db
    .select()
    .from(categories)
    .where(and(eq(categories.shopId, shopId), inArray(categories.id, categoryIds)));
  const its = await db
    .select()
    .from(items)
    .where(inArray(items.categoryId, categoryIds))
    .orderBy(asc(items.sortOrder));

  const map = new Map<string, MenuCategoryView>();
  for (const c of cats) {
    map.set(c.id, {
      id: c.id,
      name: c.name,
      sortOrder: c.sortOrder,
      isAvailable: c.isAvailable,
      items: its
        .filter((i) => i.categoryId === c.id)
        .map((i) => ({
          id: i.id,
          name: i.name,
          description: i.description,
          price: Number(i.price),
          mediaUrl: i.mediaUrl,
          mediaType: i.mediaType,
          isAvailable: i.isAvailable,
          isFeatured: i.isFeatured,
          sortOrder: i.sortOrder,
        })),
    });
  }
  return map;
}

/** Resolve a device's stored layout into renderable zones for the TV.
 *  With no layout configured, falls back to a single full-screen menu zone
 *  using the categories assigned to the device's screen. */
export async function buildDeviceContent(
  shopId: string,
  screenId: string | null,
  layout: DeviceLayout | null,
  version: number,
  orientation: "landscape" | "portrait" = "landscape",
): Promise<DeviceContent> {
  if (!layout || layout.zones.length === 0) {
    const assigned = screenId
      ? await db
          .select({ categoryId: screenCategories.categoryId })
          .from(screenCategories)
          .where(eq(screenCategories.screenId, screenId))
          .orderBy(asc(screenCategories.sortOrder))
      : [];
    const ids = assigned.map((a) => a.categoryId);
    const map = await loadCategories(shopId, ids);
    const cats = ids
      .map((id) => map.get(id))
      .filter((c): c is MenuCategoryView => !!c);
    return {
      zones: [
        { id: "default", x: 0, y: 0, w: 100, h: 100, type: "menu", categories: cats },
      ],
      orientation,
      fontSize: "medium",
      sliding: true,
      theme: DEFAULT_THEME,
      version,
    };
  }

  // Collect all category ids referenced by menu/featured zones.
  const allCatIds = Array.from(
    new Set(
      layout.zones
        .filter((z) => z.type === "menu" || z.type === "featured")
        .flatMap((z) => z.categoryIds),
    ),
  );
  const catMap = await loadCategories(shopId, allCatIds);

  const zones: ResolvedZone[] = layout.zones.map((z) => {
    const base = { id: z.id, x: z.x, y: z.y, w: z.w, h: z.h, type: z.type };
    if (z.type === "menu" || z.type === "featured") {
      // Drop any items the block hides within its categories (empty = show all).
      const hidden = new Set(z.hiddenItemIds ?? []);
      const cats = z.categoryIds
        .map((id) => catMap.get(id))
        .filter((c): c is MenuCategoryView => !!c)
        .map((c) =>
          hidden.size
            ? { ...c, items: c.items.filter((it) => !hidden.has(it.id)) }
            : c,
        );
      return { ...base, categories: cats };
    }
    return { ...base, mediaUrl: z.mediaUrl ?? null };
  });

  return {
    zones,
    orientation,
    fontSize: layout.fontSize ?? "medium",
    sliding: layout.sliding ?? true,
    theme: { ...DEFAULT_THEME, ...layout.theme },
    version,
  };
}
