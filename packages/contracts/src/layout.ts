import { z } from "zod";
import { menuCategoryView } from "./menu";

/**
 * Per-device layout: the display is sliced into rectangular zones (in % of the
 * screen so they adapt to any resolution). Each zone renders one content type.
 */
export const zoneType = z.enum(["menu", "featured", "image", "video"]);
export type ZoneType = z.infer<typeof zoneType>;

export const layoutZone = z.object({
  id: z.string(),
  /** Position + size as percentages (0–100) of the screen. */
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  w: z.number().min(0).max(100),
  h: z.number().min(0).max(100),
  type: zoneType,
  /** For menu / featured zones: which categories feed this block. */
  categoryIds: z.array(z.string().uuid()).default([]),
  /** For image / video zones: the media URL. */
  mediaUrl: z.string().url().nullable().default(null),
});
export type LayoutZone = z.infer<typeof layoutZone>;

export const deviceLayout = z.object({
  template: z.string(),
  zones: z.array(layoutZone),
});
export type DeviceLayout = z.infer<typeof deviceLayout>;

/** Device-reported screen resolution (width/height in physical pixels) plus the
 *  device pixel ratio, so layout-space (dp) can be derived: dp = px / scale.
 *  The TV lays out fonts/padding in dp, so the editor preview must scale to dp. */
export const resolution = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  scale: z.number().positive().optional(),
});
export type Resolution = z.infer<typeof resolution>;
export const reportResolutionSchema = resolution;

/** ---- What the TV fetches: zones with their content resolved ---- */
export const resolvedZone = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  type: zoneType,
  categories: z.array(menuCategoryView).optional(), // menu / featured
  mediaUrl: z.string().url().nullable().optional(), // image / video
});
export type ResolvedZone = z.infer<typeof resolvedZone>;

export const deviceContent = z.object({
  zones: z.array(resolvedZone),
  /** Intended display orientation (from the assigned screen). The TV rotates
   *  its whole canvas 90° when this doesn't match the physical panel. */
  orientation: z.enum(["landscape", "portrait"]).default("landscape"),
  version: z.number().int(),
});
export type DeviceContent = z.infer<typeof deviceContent>;

/** ---- Preset templates (admin convenience; produce a zones array) ---- */
export interface LayoutTemplate {
  id: string;
  label: string;
  orientation: "landscape" | "portrait";
  zones: Array<{ x: number; y: number; w: number; h: number; type: ZoneType }>;
}

export const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  // Landscape
  {
    id: "full-menu",
    label: "Full menu",
    orientation: "landscape",
    zones: [{ x: 0, y: 0, w: 100, h: 100, type: "menu" }],
  },
  {
    id: "media-left",
    label: "Featured left + menu",
    orientation: "landscape",
    zones: [
      { x: 0, y: 0, w: 35, h: 100, type: "featured" },
      { x: 35, y: 0, w: 65, h: 100, type: "menu" },
    ],
  },
  {
    id: "top-banner",
    label: "Image banner + menu",
    orientation: "landscape",
    zones: [
      { x: 0, y: 0, w: 100, h: 28, type: "image" },
      { x: 0, y: 28, w: 100, h: 72, type: "menu" },
    ],
  },
  {
    id: "video-left",
    label: "Video left + menu",
    orientation: "landscape",
    zones: [
      { x: 0, y: 0, w: 42, h: 100, type: "video" },
      { x: 42, y: 0, w: 58, h: 100, type: "menu" },
    ],
  },
  {
    id: "split-lr",
    label: "Split (left / right)",
    orientation: "landscape",
    zones: [
      { x: 0, y: 0, w: 50, h: 100, type: "menu" },
      { x: 50, y: 0, w: 50, h: 100, type: "menu" },
    ],
  },
  {
    id: "thirds-lr",
    label: "3 columns",
    orientation: "landscape",
    zones: [
      { x: 0, y: 0, w: 100 / 3, h: 100, type: "menu" },
      { x: 100 / 3, y: 0, w: 100 / 3, h: 100, type: "menu" },
      { x: 200 / 3, y: 0, w: 100 / 3, h: 100, type: "menu" },
    ],
  },
  {
    id: "media-left-2menu",
    label: "Featured left + 2 menus",
    orientation: "landscape",
    zones: [
      { x: 0, y: 0, w: 34, h: 100, type: "featured" },
      { x: 34, y: 0, w: 33, h: 100, type: "menu" },
      { x: 67, y: 0, w: 33, h: 100, type: "menu" },
    ],
  },
  {
    id: "banner-3menu",
    label: "Banner + 3 menus",
    orientation: "landscape",
    zones: [
      { x: 0, y: 0, w: 100, h: 24, type: "image" },
      { x: 0, y: 24, w: 100 / 3, h: 76, type: "menu" },
      { x: 100 / 3, y: 24, w: 100 / 3, h: 76, type: "menu" },
      { x: 200 / 3, y: 24, w: 100 / 3, h: 76, type: "menu" },
    ],
  },
  {
    id: "quad-columns",
    label: "4 columns",
    orientation: "landscape",
    zones: [
      { x: 0, y: 0, w: 25, h: 100, type: "menu" },
      { x: 25, y: 0, w: 25, h: 100, type: "menu" },
      { x: 50, y: 0, w: 25, h: 100, type: "menu" },
      { x: 75, y: 0, w: 25, h: 100, type: "menu" },
    ],
  },
  {
    id: "grid-2x2",
    label: "2×2 grid",
    orientation: "landscape",
    zones: [
      { x: 0, y: 0, w: 50, h: 50, type: "image" },
      { x: 50, y: 0, w: 50, h: 50, type: "menu" },
      { x: 0, y: 50, w: 50, h: 50, type: "featured" },
      { x: 50, y: 50, w: 50, h: 50, type: "video" },
    ],
  },
  // Portrait
  {
    id: "full-menu-p",
    label: "Full menu",
    orientation: "portrait",
    zones: [{ x: 0, y: 0, w: 100, h: 100, type: "menu" }],
  },
  {
    id: "top-media-p",
    label: "Image top + menu",
    orientation: "portrait",
    zones: [
      { x: 0, y: 0, w: 100, h: 30, type: "image" },
      { x: 0, y: 30, w: 100, h: 70, type: "menu" },
    ],
  },
  {
    id: "video-top-p",
    label: "Video top + menu",
    orientation: "portrait",
    zones: [
      { x: 0, y: 0, w: 100, h: 35, type: "video" },
      { x: 0, y: 35, w: 100, h: 65, type: "menu" },
    ],
  },
  {
    id: "split-tb-p",
    label: "Split (top / bottom)",
    orientation: "portrait",
    zones: [
      { x: 0, y: 0, w: 100, h: 50, type: "menu" },
      { x: 0, y: 50, w: 100, h: 50, type: "menu" },
    ],
  },
  {
    id: "thirds-tb-p",
    label: "3 rows",
    orientation: "portrait",
    zones: [
      { x: 0, y: 0, w: 100, h: 100 / 3, type: "menu" },
      { x: 0, y: 100 / 3, w: 100, h: 100 / 3, type: "menu" },
      { x: 0, y: 200 / 3, w: 100, h: 100 / 3, type: "menu" },
    ],
  },
  {
    id: "media-top-2menu-p",
    label: "Image top + 2 menus",
    orientation: "portrait",
    zones: [
      { x: 0, y: 0, w: 100, h: 30, type: "image" },
      { x: 0, y: 30, w: 100, h: 35, type: "menu" },
      { x: 0, y: 65, w: 100, h: 35, type: "menu" },
    ],
  },
  {
    id: "quad-rows-p",
    label: "4 rows",
    orientation: "portrait",
    zones: [
      { x: 0, y: 0, w: 100, h: 25, type: "menu" },
      { x: 0, y: 25, w: 100, h: 25, type: "menu" },
      { x: 0, y: 50, w: 100, h: 25, type: "menu" },
      { x: 0, y: 75, w: 100, h: 25, type: "menu" },
    ],
  },
  {
    id: "video-top-grid-p",
    label: "Video top + 2×1 menus",
    orientation: "portrait",
    zones: [
      { x: 0, y: 0, w: 100, h: 34, type: "video" },
      { x: 0, y: 34, w: 50, h: 66, type: "menu" },
      { x: 50, y: 34, w: 50, h: 66, type: "menu" },
    ],
  },
];

/** ---- Auto-pagination: flow categories + items into screen-sized pages ----
 *  When a menu block's content doesn't all fit, the TV (and the editor preview)
 *  page through it, cycling every few seconds. Both use this same pure function
 *  so the preview matches the display exactly. */
export interface MenuPageItem {
  id: string;
  name: string;
  price: number;
}
export interface MenuPageCategory {
  id: string;
  name: string;
  items: MenuPageItem[];
  /** True when this is a continuation of a category split across pages. */
  continued: boolean;
}
export type MenuPage = MenuPageCategory[];

/** Result of laying out a menu block. Leading categories that fully fit are
 *  "pinned" — shown statically on every page — while the first overflowing
 *  category and everything after it cycle through `pages`. */
export interface MenuLayout {
  /** Categories pinned to the top of every page (rendered without animation). */
  fixed: MenuPage;
  /** Pages of the overflowing tail that cycle. Empty when everything fit in
   *  `fixed`; a single page means no cycling. */
  pages: MenuPage[];
}

export interface PaginateCategory {
  id: string;
  name: string;
  items: MenuPageItem[];
}

/** dp heights matching the TV menu styles: a category title block (fontSize 34,
 *  lineHeight 42, marginBottom 12 = 54), an item row (paddingVertical 8×2 +
 *  lineHeight 32 = 48), and the gap below each category (28).
 *
 *  `safeBottom` is dead space reserved at the bottom of every block before
 *  paginating, so a panel's navigation/gesture bar, rounded bezel, or border
 *  can't clip the last row. One item-row's worth keeps the layout clean across
 *  every template. */
export const MENU_METRICS = { titleH: 54, itemH: 48, catGap: 28, safeBottom: 48 };

/** Lay out a menu block into a static prefix + a cycling tail.
 *
 *  Leading categories that fully fit (stacked together) are *pinned*: they stay
 *  on top of every page so they read as static. The first category that doesn't
 *  fully fit — and everything after it — flows into `pages`, which cycle through
 *  the height left below the pinned region. This way, in a block holding a
 *  category that fits (e.g. "Main Course") next to one that overflows (e.g.
 *  "North Indian"), only the overflowing one animates while the rest stays put.
 */
export function paginateMenu(
  cats: PaginateCategory[],
  innerHeight: number,
  m: { titleH: number; itemH: number; catGap: number; safeBottom?: number } = MENU_METRICS,
): MenuLayout {
  const nonEmpty = cats.filter((c) => c.items.length > 0);

  // Reserve dead space at the bottom so a panel's nav bar / bezel can't clip the
  // last row. Everything below paginates against this reduced usable height.
  const usable = Math.max(innerHeight - (m.safeBottom ?? 0), m.itemH);

  // Greedily pin leading categories whose whole height fits below the ones
  // already pinned. Stop at the first that doesn't — it begins the cycling tail.
  const fixed: MenuPage = [];
  let fixedUsed = 0;
  let i = 0;
  for (; i < nonEmpty.length; i++) {
    const cat = nonEmpty[i]!;
    const need = m.titleH + cat.items.length * m.itemH + m.catGap;
    if (fixedUsed + need > usable) break;
    fixed.push({ id: cat.id, name: cat.name, items: cat.items, continued: false });
    fixedUsed += need;
  }

  const rest = nonEmpty.slice(i);
  if (rest.length === 0) return { fixed, pages: [] };

  // Flow the overflowing tail into the leftover height (fall back to the full
  // usable height when the pinned region somehow leaves nothing — keeps progress).
  const tailHeight = usable - fixedUsed;
  return { fixed, pages: flowPages(rest, tailHeight > m.itemH ? tailHeight : usable, m) };
}

/** Split categories+items into pages each fitting `innerHeight` dp (the zone's
 *  content area, inside its padding). A category that overflows continues on the
 *  next page with its header repeated. Always returns ≥1 page. */
function flowPages(
  cats: PaginateCategory[],
  innerHeight: number,
  m: { titleH: number; itemH: number; catGap: number },
): MenuPage[] {
  const pages: MenuPage[] = [];
  let page: MenuPage = [];
  let used = 0;
  const flush = () => {
    pages.push(page);
    page = [];
    used = 0;
  };

  for (const cat of cats) {
    if (cat.items.length === 0) continue;
    let idx = 0;
    let continued = false;
    do {
      // Wrap before a header that can't fit with at least one item.
      if (used > 0 && used + m.titleH + m.itemH > innerHeight) flush();
      const pc: MenuPageCategory = { id: cat.id, name: cat.name, items: [], continued };
      used += m.titleH;
      // Always place ≥1 item (guarantees progress), then as many as fit.
      while (
        idx < cat.items.length &&
        (pc.items.length === 0 || used + m.itemH <= innerHeight)
      ) {
        pc.items.push(cat.items[idx]!);
        idx += 1;
        used += m.itemH;
      }
      page.push(pc);
      used += m.catGap;
      continued = true;
      if (idx < cat.items.length) flush();
    } while (idx < cat.items.length);
  }
  if (page.length) pages.push(page);
  return pages.length ? pages : [[]];
}
