import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type {
  DeviceContent,
  DeviceLayout,
  MenuCategoryView,
  ResolvedZone,
} from "@imlipos/contracts";
import {
  DEFAULT_THEME,
  isUncategorized,
  UNCATEGORIZED_ID,
  WATERMARK_SIZE_DEFAULT,
  watermarkEligible,
} from "@imlipos/contracts";
import { db, schema } from "../db/client.js";

const { categories, items, screenCategories } = schema;

/** Shape a db item row into the view a display renders. */
function toItemView(i: typeof items.$inferSelect) {
  return {
    id: i.id,
    name: i.name,
    description: i.description,
    price: Number(i.price),
    mediaUrl: i.mediaUrl,
    mediaType: i.mediaType,
    isAvailable: i.isAvailable,
    isFeatured: i.isFeatured,
    sortOrder: i.sortOrder,
  };
}

/** Sort order given to the virtual uncategorised group. It has no row of its
 *  own to carry one, and blocks render categories in the order the operator
 *  picked them, so this only matters to consumers that sort by it — where the
 *  loose items belong last. */
const UNCATEGORIZED_SORT = 1_000_000;

/** Load categories (with items) for a shop, keyed by id. `categoryIds` may
 *  contain UNCATEGORIZED_ID, which resolves to a headless group holding every
 *  item of the shop that has no category. */
async function loadCategories(
  shopId: string,
  categoryIds: string[],
): Promise<Map<string, MenuCategoryView>> {
  if (categoryIds.length === 0) return new Map();
  const realIds = categoryIds.filter((id) => !isUncategorized(id));
  const wantsLoose = realIds.length !== categoryIds.length;

  const map = new Map<string, MenuCategoryView>();

  if (realIds.length > 0) {
    const cats = await db
      .select()
      .from(categories)
      .where(and(eq(categories.shopId, shopId), inArray(categories.id, realIds)));
    const its = await db
      .select()
      .from(items)
      .where(inArray(items.categoryId, realIds))
      .orderBy(asc(items.sortOrder));

    for (const c of cats) {
      map.set(c.id, {
        id: c.id,
        name: c.name,
        sortOrder: c.sortOrder,
        isAvailable: c.isAvailable,
        items: its.filter((i) => i.categoryId === c.id).map(toItemView),
      });
    }
  }

  if (wantsLoose) {
    const loose = await db
      .select()
      .from(items)
      .where(and(eq(items.shopId, shopId), isNull(items.categoryId)))
      .orderBy(asc(items.sortOrder));
    // Empty name = no heading on the display; the renderer leaves one blank
    // line in its place so the group reads as a continuation of the list above.
    map.set(UNCATEGORIZED_ID, {
      id: UNCATEGORIZED_ID,
      name: "",
      sortOrder: UNCATEGORIZED_SORT,
      isAvailable: true,
      items: loose.map(toItemView),
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
  rotation: 0 | 90 | 180 | 270 = 0,
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
      rotation,
      fontSize: "medium",
      sliding: true,
      theme: DEFAULT_THEME,
      watermark: null,
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

  // The watermark ships to the TV only when the operator enabled it, uploaded a
  // logo, and the whole display is menu blocks — re-checked here so a stale or
  // hand-crafted layout can never watermark a display with media blocks.
  const wm = layout.watermark;
  const watermark =
    wm?.enabled && wm.url && watermarkEligible(layout.zones)
      ? // Layouts are stored as raw jsonb, so one saved before the size control
        // existed has no `size` — fall back to the original fixed size.
        { url: wm.url, opacity: wm.opacity, size: wm.size ?? WATERMARK_SIZE_DEFAULT }
      : null;

  return {
    zones,
    orientation,
    rotation,
    fontSize: layout.fontSize ?? "medium",
    sliding: layout.sliding ?? true,
    theme: { ...DEFAULT_THEME, ...layout.theme },
    watermark,
    version,
  };
}
