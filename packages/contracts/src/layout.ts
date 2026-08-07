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
  /** For menu / featured zones: items to hide within the selected categories.
   *  Empty (the default) shows every available item — so unticking items is
   *  opt-out, and categories with no explicit choice keep showing everything. */
  hiddenItemIds: z.array(z.string()).default([]),
  /** For image / video zones: the media URL. */
  mediaUrl: z.string().url().nullable().default(null),
  /** True when this block's content was produced by the auto-flow distributor
   *  (a "continuation" slot receiving an earlier block's overflow). Operators
   *  don't edit these directly; flowCategoriesAcrossZones() owns them. The TV
   *  and deviceContent ignore this flag — they only read categoryIds/hidden. */
  autoFilled: z.boolean().default(false),
});
export type LayoutZone = z.infer<typeof layoutZone>;

/** Menu typography preset, chosen per display. "medium" is the original size;
 *  the others scale every menu font/row up or down (see MENU_FONT_SCALE). */
export const MENU_FONT_SIZES = ["xsmall", "small", "medium", "large", "xlarge"] as const;
export const menuFontSize = z.enum(MENU_FONT_SIZES);
export type MenuFontSize = (typeof MENU_FONT_SIZES)[number];

/** Human labels for the legacy presets (kept for back-compat display). */
export const MENU_FONT_LABELS: Record<MenuFontSize, string> = {
  xsmall: "Very small",
  small: "Small",
  medium: "Medium",
  large: "Large",
  xlarge: "Very large",
};

/** Menu font is now a continuous scale multiplier (1 = the original "medium"
 *  size). The editor exposes +/- stepping between these bounds; older layouts
 *  may still hold a preset string, which resolveFontScale() maps to a number. */
export const MENU_SCALE_MIN = 0.2;
export const MENU_SCALE_MAX = 1.0;
export const MENU_SCALE_STEP = 0.05;
export const MENU_SCALE_DEFAULT = 1;

/** A menu font value: the new numeric scale, or a legacy preset string. */
export const menuFont = z.union([z.enum(MENU_FONT_SIZES), z.number().positive()]);
export type MenuFont = MenuFontSize | number;

/** Resolve any stored font value to a clamped numeric scale multiplier. */
export function resolveFontScale(f: MenuFont = MENU_SCALE_DEFAULT): number {
  const n = typeof f === "number" ? f : (MENU_FONT_SCALE[f] ?? MENU_SCALE_DEFAULT);
  return Math.min(MENU_SCALE_MAX, Math.max(MENU_SCALE_MIN, n));
}

/** Decorative border drawn around the whole display (over every zone). Purely
 *  cosmetic — it's rendered in the category-heading colour and never affects
 *  layout/pagination. `none` (the default) draws nothing. See frameSpec() for
 *  each style's geometry; both the web preview and the TV render from it so they
 *  stay identical. */
export const DISPLAY_FRAMES = [
  "none",
  "doubleLine",
  "bracketed",
  "vintage",
  "artDeco",
  "decoCorners",
] as const;
export const displayFrame = z.enum(DISPLAY_FRAMES);
export type DisplayFrame = (typeof DISPLAY_FRAMES)[number];

/** Human labels for the frame picker. */
export const DISPLAY_FRAME_LABELS: Record<DisplayFrame, string> = {
  none: "None",
  doubleLine: "Double line",
  bracketed: "Bracketed border",
  vintage: "Vintage border",
  artDeco: "Art deco",
  decoCorners: "Deco corners",
};

/** ---- Logo watermark ----
 *  The shop's logo drawn once, centred behind the menu text, at an
 *  operator-chosen opacity. Only available when EVERY block on the display is a
 *  menu block (see watermarkEligible) — media blocks paint over the canvas, so a
 *  watermark behind them would show through partially and look broken. */
export const WATERMARK_OPACITY_MIN = 5;
export const WATERMARK_OPACITY_MAX = 100;
export const WATERMARK_OPACITY_DEFAULT = 15;
/** The watermark's bounding box, as a % of each canvas axis; the logo is
 *  contain-fitted inside it, centred. Operator-adjustable in STEP increments;
 *  shared by the web preview and the TV so both draw the logo the same size. */
export const WATERMARK_SIZE_MIN = 10;
export const WATERMARK_SIZE_MAX = 100;
export const WATERMARK_SIZE_STEP = 5;
export const WATERMARK_SIZE_DEFAULT = 60;

export const layoutWatermark = z.object({
  enabled: z.boolean().default(false),
  /** Uploaded logo image (Supabase Storage public URL). */
  url: z.string().url().nullable().default(null),
  /** Logo opacity in percent (100 = solid, lower = more transparent). */
  opacity: z
    .number()
    .min(WATERMARK_OPACITY_MIN)
    .max(WATERMARK_OPACITY_MAX)
    .default(WATERMARK_OPACITY_DEFAULT),
  /** Bounding-box size in percent of each canvas axis (contain-fitted). */
  size: z
    .number()
    .min(WATERMARK_SIZE_MIN)
    .max(WATERMARK_SIZE_MAX)
    .default(WATERMARK_SIZE_DEFAULT),
});
export type LayoutWatermark = z.infer<typeof layoutWatermark>;

export const DEFAULT_WATERMARK: LayoutWatermark = {
  enabled: false,
  url: null,
  opacity: WATERMARK_OPACITY_DEFAULT,
  size: WATERMARK_SIZE_DEFAULT,
};

/** A watermark may only show when the whole display is menu blocks. */
export function watermarkEligible(zones: Array<{ type: ZoneType }>): boolean {
  return zones.length > 0 && zones.every((z) => z.type === "menu");
}

/** Per-display colour theme. `text` drives item names/prices; `heading` keeps
 *  the category-title accent separate so a light background can't hide it.
 *  Values are CSS colour strings (hex from the editor's colour pickers). */
export const layoutTheme = z.object({
  background: z.string().default("#000000"),
  text: z.string().default("#ffffff"),
  heading: z.string().default("#ffd700"),
  /** The line drawn between adjacent menu blocks. */
  divider: z.string().default("#52525b"),
  /** Draw the separator lines at all (colour is kept while off). */
  dividerEnabled: z.boolean().default(true),
  /** Decorative border around the whole display (drawn in `heading`). */
  frame: displayFrame.default("none"),
});
export type LayoutTheme = z.infer<typeof layoutTheme>;

/** The default menu palette: black background, white item text, gold headings,
 *  grey separator lines, no frame. Used as the schema default and the editor's
 *  "Reset colors" target. */
export const DEFAULT_THEME: LayoutTheme = {
  background: "#000000",
  text: "#ffffff",
  heading: "#ffd700",
  divider: "#52525b",
  dividerEnabled: true,
  frame: "none",
};

/** ---- Frame geometry (platform-neutral) ----
 *  Every distance is in dp and anchored to the SCREEN EDGE, so a frame hugs the
 *  display border and stays inside each menu block's MENU_BLOCK_PAD safety band
 *  — it can never cross menu content. (Percent insets were the earlier bug: a
 *  few percent of a 2000px panel is 50–150dp, deep inside the text.) The web
 *  preview multiplies these dp by its px-per-dp scale; the TV uses them as-is.
 *  Rendered identically by both overlays so the preview matches the panel. */

/** A bordered rectangle, inset from each edge in dp. */
export interface FrameRect {
  t: number;
  r: number;
  b: number;
  l: number;
  /** Border weight in dp. */
  weight: number;
  /** Optional corner radius in dp. */
  radius?: number;
}
/** A small square/diamond drawn at all four corners, centred `inset` dp in from
 *  each corner. Used for the vintage/art-deco corner accents. */
export interface FrameCorner {
  /** Distance in dp from the corner to the accent's centre. */
  inset: number;
  /** Side length in dp. */
  size: number;
  /** Filled when true; otherwise an outline of `weight` dp. */
  fill?: boolean;
  weight?: number;
  /** Rotate 45° into a diamond (default false → an upright square). */
  rotate?: boolean;
  /** Which colour to paint. "frame" (default) uses the heading colour; a
   *  "background" corner is drawn in the display background — used to erase the
   *  border's right-angle corner so an outline diamond can sit cleanly on it. */
  color?: "frame" | "background";
}
/** An L-shaped mark drawn at all four corners: two legs meeting at a vertex that
 *  sits `inset` dp in from the corner, each leg `arm` dp long. Multiple brackets
 *  at different insets make concentric (stepped) corners. */
export interface FrameBracket {
  /** dp from each edge to the L's vertex. */
  inset: number;
  /** dp length of each leg (runs along the edge, inside the frame band). */
  arm: number;
  /** Line weight in dp. */
  weight: number;
}
export interface FrameSpec {
  rects: FrameRect[];
  corners: FrameCorner[];
  brackets: FrameBracket[];
}

/** When a frame is active the menu content is pulled in by this many dp on every
 *  side, so the decorative border sits in a clear band and the menu never touches
 *  it. `none` uses the full screen (no inset). The frame's own lines/ornaments
 *  all sit inside this band (see frameSpec). */
export const FRAME_CONTENT_INSET = 44;

/** dp the menu content is inset for a given frame (0 when none). */
export function frameContentInset(frame: DisplayFrame): number {
  return frame === "none" ? 0 : FRAME_CONTENT_INSET;
}

/** A rectangle inset equally on every side (dp). */
function sq(inset: number, weight: number, radius?: number): FrameRect {
  return { t: inset, r: inset, b: inset, l: inset, weight, radius };
}

const EMPTY_FRAME: FrameSpec = { rects: [], corners: [], brackets: [] };

/** Resolve a frame style to its drawable primitives. `none` draws nothing. All
 *  perpendicular insets sit inside FRAME_CONTENT_INSET so the frame is clearly
 *  visible in its band and never overlaps the (inset) menu content. */
export function frameSpec(frame: DisplayFrame): FrameSpec {
  switch (frame) {
    case "doubleLine":
      // Two clean concentric rules with an even gap — restrained and modern.
      return { rects: [sq(15, 2), sq(23, 1)], corners: [], brackets: [] };
    case "bracketed":
      // Fine full border with a small square notch on each corner and an inner
      // L-bracket running parallel to it — a layered, classic corner treatment.
      return {
        rects: [sq(14, 1.5)],
        corners: [{ inset: 14, size: 9, fill: false, weight: 1.5 }],
        brackets: [{ inset: 22, arm: 54, weight: 1.5 }],
      };
    case "vintage":
      // Heavy outer rule, fine inner rule, and a solid diamond seated on each
      // outer corner — a classic ornamented menu-board border.
      return {
        rects: [sq(13, 3), sq(22, 1)],
        corners: [{ inset: 13, size: 15, fill: true, rotate: true }],
        brackets: [],
      };
    case "artDeco":
      // Thin full border, a solid diamond node at each corner, and a stepped
      // inner corner bracket — the geometric art-deco signature.
      return {
        rects: [sq(14, 2)],
        corners: [{ inset: 14, size: 13, fill: true, rotate: true }],
        brackets: [{ inset: 24, arm: 66, weight: 2 }],
      };
    case "decoCorners":
      // No continuous border: double concentric L-brackets at each corner with a
      // hollow diamond on the vertex. Elegant and airy.
      return {
        rects: [],
        corners: [{ inset: 18, size: 12, fill: false, rotate: true, weight: 2 }],
        brackets: [
          { inset: 18, arm: 96, weight: 2 },
          { inset: 25, arm: 70, weight: 1 },
        ],
      };
    case "none":
    default:
      return EMPTY_FRAME;
  }
}

export const deviceLayout = z.object({
  template: z.string(),
  zones: z.array(layoutZone),
  /** Per-display colour theme (background / item text / category heading).
   *  Older layouts without a theme fall back to DEFAULT_THEME. */
  theme: layoutTheme.default(DEFAULT_THEME),
  /** Per-display menu font scale (1 = original). Accepts a legacy preset string
   *  too; resolveFontScale() normalises either to a number. */
  fontSize: menuFont.default(MENU_SCALE_DEFAULT),
  /** When true (default), an overflowing menu block cycles its items in a
   *  sliding transition. When false, every item must fit statically — the editor
   *  blocks saving a layout whose blocks overflow with sliding off. */
  sliding: z.boolean().default(true),
  /** When true (default), a category whose items overflow its block spills into
   *  the following empty/continuation menu blocks (in reading order) — see
   *  flowCategoriesAcrossZones(). When false, every block keeps exactly its own
   *  assigned items (the original manual model). */
  autoFlow: z.boolean().default(true),
  /** Shop-logo watermark behind the menu. Stored even when the layout later
   *  stops being all-menu (so the choice survives template switches), but only
   *  RENDERED when watermarkEligible(zones) — enforced by deviceContent. */
  watermark: layoutWatermark.default(DEFAULT_WATERMARK),
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
  /** Per-display menu font scale (from the layout). Drives both the rendered
   *  text and the pagination metrics via menuStyle(). */
  fontSize: menuFont.default(MENU_SCALE_DEFAULT),
  /** When true, overflowing menu blocks cycle their items; when false they are
   *  rendered statically (the editor guarantees they fit before saving). */
  sliding: z.boolean().default(true),
  /** Per-display colour theme (background / item text / category heading). */
  theme: layoutTheme.default(DEFAULT_THEME),
  /** Resolved logo watermark — present only when the operator enabled it, a
   *  logo is uploaded AND every zone is a menu block; null otherwise. `size`
   *  defaults so content cached before the size control existed still parses. */
  watermark: z
    .object({
      url: z.string().url(),
      opacity: z.number(),
      size: z.number().default(WATERMARK_SIZE_DEFAULT),
    })
    .nullable()
    .default(null),
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
    id: "penta-columns",
    label: "5 columns",
    orientation: "landscape",
    zones: Array.from({ length: 5 }, (_, i) => ({
      x: i * 20,
      y: 0,
      w: 20,
      h: 100,
      type: "menu" as ZoneType,
    })),
  },
  {
    id: "hexa-columns",
    label: "6 columns",
    orientation: "landscape",
    zones: Array.from({ length: 6 }, (_, i) => ({
      x: (i * 100) / 6,
      y: 0,
      w: 100 / 6,
      h: 100,
      type: "menu" as ZoneType,
    })),
  },
  {
    id: "octa-columns",
    label: "8 columns",
    orientation: "landscape",
    zones: Array.from({ length: 8 }, (_, i) => ({
      x: i * 12.5,
      y: 0,
      w: 12.5,
      h: 100,
      type: "menu" as ZoneType,
    })),
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
  {
    // 2 stacked images on the left; the right half's two menu sectors are each
    // split into side-by-side columns -> 4 narrow menu columns.
    id: "img2-menu4-cols",
    label: "2 images + 4 menu columns",
    orientation: "landscape",
    zones: [
      { x: 0, y: 0, w: 50, h: 50, type: "image" },
      { x: 0, y: 50, w: 50, h: 50, type: "image" },
      { x: 50, y: 0, w: 25, h: 50, type: "menu" },
      { x: 75, y: 0, w: 25, h: 50, type: "menu" },
      { x: 50, y: 50, w: 25, h: 50, type: "menu" },
      { x: 75, y: 50, w: 25, h: 50, type: "menu" },
    ],
  },
  {
    // 2 stacked images on the left; the right half's two menu sectors are each
    // split into stacked halves -> 4 short, wide menu rows.
    id: "img2-menu4-rows",
    label: "2 images + 4 menu rows",
    orientation: "landscape",
    zones: [
      { x: 0, y: 0, w: 50, h: 50, type: "image" },
      { x: 0, y: 50, w: 50, h: 50, type: "image" },
      { x: 50, y: 0, w: 50, h: 25, type: "menu" },
      { x: 50, y: 25, w: 50, h: 25, type: "menu" },
      { x: 50, y: 50, w: 50, h: 25, type: "menu" },
      { x: 50, y: 75, w: 50, h: 25, type: "menu" },
    ],
  },
  {
    // One image in the top-left quadrant; every other cell of the 4×2 grid is a
    // narrow menu column. The half below the image is split into 2 menu blocks,
    // and the right half holds the other 4 -> 6 uniform menu columns in all.
    id: "img1-menu6",
    label: "1 image + 6 menu columns",
    orientation: "landscape",
    zones: [
      { x: 0, y: 0, w: 50, h: 50, type: "image" },
      // Below the image: 2 menu blocks.
      { x: 0, y: 50, w: 25, h: 50, type: "menu" },
      { x: 25, y: 50, w: 25, h: 50, type: "menu" },
      // Right half: 4 menu blocks (2 columns × 2 rows).
      { x: 50, y: 0, w: 25, h: 50, type: "menu" },
      { x: 75, y: 0, w: 25, h: 50, type: "menu" },
      { x: 50, y: 50, w: 25, h: 50, type: "menu" },
      { x: 75, y: 50, w: 25, h: 50, type: "menu" },
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
  /** Rendered width (dp) of the name and the price text, measured in the editor
   *  (Roboto, at the item font size). When present, the fit math can tell whether
   *  a name wraps to a 2nd line in a given block width; when absent it assumes a
   *  single line (the original behaviour). */
  nameWidth?: number;
  priceWidth?: number;
}
export interface MenuPageCategory {
  id: string;
  name: string;
  items: MenuPageItem[];
}
export type MenuPage = MenuPageCategory[];

/** An overflowing category in the cycling region. Its `name` is rendered once
 *  and stays put; only its `itemPages` cycle, so the heading is stable while the
 *  items animate in and out. */
export interface CyclingCategory {
  id: string;
  name: string;
  /** The category's items split into pages that each fit under the (static)
   *  heading. ≥1 page; a single page means that category doesn't cycle. */
  itemPages: MenuPageItem[][];
}

/** Result of laying out a menu block. Leading categories that fully fit are
 *  "pinned" — shown statically — while the first overflowing category and
 *  everything after it become `cycle` entries whose headings stay fixed and
 *  whose items page through the leftover height. */
export interface MenuLayout {
  /** Categories pinned to the top, rendered statically (no animation). */
  fixed: MenuPage;
  /** Overflowing categories shown one at a time: heading static, items cycle.
   *  Empty when everything fit in `fixed`. */
  cycle: CyclingCategory[];
}

export interface PaginateCategory {
  id: string;
  name: string;
  items: MenuPageItem[];
}

/** Multiplier applied to the base (medium) menu typography per preset. */
export const MENU_FONT_SCALE: Record<MenuFontSize, number> = {
  xsmall: 0.65,
  small: 0.8,
  medium: 1,
  large: 1.25,
  xlarge: 1.5,
};

/** Padding (dp) inside every menu block, on each side. Doubles as the bezel /
 *  panel-edge safety margin. Shared by the TV (zonePad), the editor preview and
 *  the fit check so all three agree on the usable content area. */
export const MENU_BLOCK_PAD = 16;

/** Base (medium) menu typography in dp — the original look. Every preset scales
 *  these by MENU_FONT_SCALE, and the pagination metrics are derived from them so
 *  the rendered rows and the page heights can never disagree. */
const BASE_MENU_STYLE = {
  titleFont: 34,
  titleLine: 42,
  titleGap: 12, // marginBottom under a category title
  itemFont: 26,
  itemLine: 32,
  itemPadV: 8, // vertical padding on each item row
  catGap: 28, // gap below each category block
};

/** Resolved menu typography + pagination metrics for one font preset, in dp.
 *  `titleH` / `itemH` / `safeBottom` feed paginateMenu; the font/line/padding
 *  fields drive the actual TV and editor-preview text styles. */
export interface MenuStyle {
  titleFont: number;
  titleLine: number;
  titleGap: number;
  itemFont: number;
  itemLine: number;
  itemPadV: number;
  catGap: number;
  /** Total height of a category title block (line + gap below). */
  titleH: number;
  /** Total height of an item row (line + padding top & bottom). */
  itemH: number;
  /** Dead space reserved at the bottom of every block before paginating, so a
   *  panel's nav/gesture bar, rounded bezel, or border can't clip the last row.
   *  One item-row's worth keeps the layout clean across every template. */
  safeBottom: number;
}

/** Build the typography + metrics for a font value (scale number or legacy
 *  preset string; defaults to the original "medium" sizing). */
export function menuStyle(size: MenuFont = MENU_SCALE_DEFAULT): MenuStyle {
  const s = resolveFontScale(size);
  const r = (n: number) => Math.round(n * s);
  const b = BASE_MENU_STYLE;
  const titleLine = r(b.titleLine);
  const titleGap = r(b.titleGap);
  const itemLine = r(b.itemLine);
  const itemPadV = r(b.itemPadV);
  const itemH = itemLine + itemPadV * 2;
  return {
    titleFont: r(b.titleFont),
    titleLine,
    titleGap,
    itemFont: r(b.itemFont),
    itemLine,
    itemPadV,
    catGap: r(b.catGap),
    titleH: titleLine + titleGap,
    itemH,
    // No extra bottom reserve: every menu block already renders with 32dp of
    // padding on each side (zonePad on the TV, the padded preview canvas), which
    // is the bezel/nav-bar safety margin. Reserving an additional full item-row
    // here double-counted that space and made content that visibly fits within
    // the padded block wrongly fail the "does not fit" check.
    safeBottom: 0,
  };
}

/** Default (medium) metrics — kept for paginateMenu's default argument. */
export const MENU_METRICS = menuStyle("medium");

/** Horizontal gap (dp) between an item's name and its price (styles.row gap). */
export const MENU_ITEM_GAP = 8;

/** Advance-width ratios (glyph width ÷ font size) for Roboto Regular, so text
 *  width can be estimated without a canvas — the TV has no way to measure text
 *  before laying it out, yet its pagination must know how many lines a name
 *  wraps to. Regenerate in a browser console with Roboto loaded:
 *  c.font = "400 1000px Roboto"; c.measureText(ch).width / 1000. */
const ROBOTO_RATIO: Record<string, number> = {
  " ": 0.248, "!": 0.258, '"': 0.32, "#": 0.616, "$": 0.562, "%": 0.733,
  "&": 0.622, "'": 0.174, "(": 0.342, ")": 0.348, "*": 0.431, "+": 0.567,
  ",": 0.196, "-": 0.276, ".": 0.263, "/": 0.412, ":": 0.242, ";": 0.211,
  "<": 0.508, "=": 0.549, ">": 0.522, "?": 0.472, "@": 0.898, "[": 0.265,
  "\\": 0.41, "]": 0.265, "^": 0.418, "_": 0.451, "`": 0.309, "{": 0.339,
  "|": 0.244, "}": 0.339, "~": 0.68, "₹": 0.569,
  "0": 0.562, "1": 0.562, "2": 0.562, "3": 0.562, "4": 0.562,
  "5": 0.562, "6": 0.562, "7": 0.562, "8": 0.562, "9": 0.562,
  A: 0.652, B: 0.622, C: 0.651, D: 0.656, E: 0.568, F: 0.553, G: 0.68,
  H: 0.712, I: 0.272, J: 0.551, K: 0.626, L: 0.538, M: 0.876, N: 0.712,
  O: 0.686, P: 0.631, Q: 0.686, R: 0.615, S: 0.593, T: 0.596, U: 0.648,
  V: 0.636, W: 0.887, X: 0.626, Y: 0.6, Z: 0.598,
  a: 0.544, b: 0.561, c: 0.523, d: 0.564, e: 0.53, f: 0.347, g: 0.561,
  h: 0.551, i: 0.243, j: 0.239, k: 0.507, l: 0.243, m: 0.874, n: 0.552,
  o: 0.57, p: 0.561, q: 0.567, r: 0.339, s: 0.516, t: 0.327, u: 0.551,
  v: 0.485, w: 0.752, x: 0.496, y: 0.485, z: 0.496,
};
const ROBOTO_DEFAULT_RATIO = 0.6;
const ROBOTO_BOLD_FACTOR = 1.03;
/** Bias line-count estimates high: over-reserving leaves a small gap at a
 *  block's bottom (benign), under-reserving clips the last row of a page. */
const ESTIMATE_SAFETY = 1.05;

/** Estimate the rendered width (dp) of `text` at `fontPx` in Roboto. Used when
 *  a real measurement isn't available (on the TV, or in the editor before
 *  fonts load). */
export function estimateTextWidth(text: string, fontPx: number, weight: 400 | 700 = 400): number {
  let units = 0;
  for (const ch of text) units += ROBOTO_RATIO[ch] ?? ROBOTO_DEFAULT_RATIO;
  return units * fontPx * (weight >= 700 ? ROBOTO_BOLD_FACTOR : 1);
}

/** How many lines an item row takes in a block whose inner width is `innerW` dp.
 *  The name wraps within the column left beside the price (both sit in one flex
 *  row: name shrinks, price doesn't), taking as many lines as it needs — names
 *  are never truncated. Prefers the editor's measured widths; falls back to
 *  estimateTextWidth() when `m` supplies the item font size, else assumes a
 *  single line (the original metric-only behaviour). */
export function itemLines(
  item: { name?: string; price?: number; nameWidth?: number; priceWidth?: number },
  innerW: number,
  m?: { itemFont: number },
): number {
  if (innerW <= 0) return 1;
  const nameW =
    item.nameWidth ??
    (item.name && m ? estimateTextWidth(item.name, m.itemFont, 400) * ESTIMATE_SAFETY : 0);
  if (!nameW) return 1;
  const priceW =
    item.priceWidth ??
    (item.price != null && m ? estimateTextWidth(`₹${item.price}`, m.itemFont, 700) : 0);
  const nameCol = innerW - priceW - MENU_ITEM_GAP;
  if (nameCol <= 0) return 1; // degenerate: block narrower than the price
  return Math.max(1, Math.ceil(nameW / nameCol));
}

/** Total height (dp) of an item row spanning `lines` lines. */
export function itemHeight(lines: number, m: { itemLine: number; itemPadV: number }): number {
  return lines * m.itemLine + m.itemPadV * 2;
}

/** Lay out a menu block into a static prefix + a cycling tail.
 *
 *  Leading categories that fully fit (stacked together) are *pinned*: they stay
 *  on top so they read as static. The first category that doesn't fully fit —
 *  and everything after it — becomes a `cycle` entry: its heading is shown once
 *  and stays put while only its items page through the leftover height. This way,
 *  in a block holding a category that fits (e.g. "Main Course") next to one that
 *  overflows (e.g. "North Indian"), the headings never move — only the items of
 *  the overflowing category animate in and out.
 */
export function paginateMenu(
  cats: PaginateCategory[],
  innerHeight: number,
  m: {
    titleH: number;
    itemH: number;
    itemLine: number;
    itemPadV: number;
    itemFont: number;
    catGap: number;
    safeBottom?: number;
  } = MENU_METRICS,
  /** Inner width (dp) of the block. When given, rows are sized by how many
   *  lines each name wraps to (see itemLines); when 0/absent every row is
   *  assumed single-line — the original metric-only behaviour. */
  innerWidth = 0,
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
    // catGap separates a category from the one above it, so a run of N pinned
    // categories needs only N-1 gaps — the last one has no category below it.
    // Counting a trailing gap reserved ~one catGap of height that nothing
    // renders into, which falsely flagged a block as overflowing ("doesn't
    // fit") while visible space remained below the last row.
    const sep = fixed.length > 0 ? m.catGap : 0;
    const itemsH = cat.items.reduce(
      (sum, it) => sum + itemHeight(itemLines(it, innerWidth, m), m),
      0,
    );
    const need = sep + m.titleH + itemsH;
    if (fixedUsed + need > usable) break;
    fixed.push({ id: cat.id, name: cat.name, items: cat.items });
    fixedUsed += need;
  }

  const rest = nonEmpty.slice(i);
  if (rest.length === 0) return { fixed, cycle: [] };

  // Page each overflowing category's items under its own static heading, using
  // the height left below the pinned region (fall back to the full usable height
  // when the pinned region leaves too little — keeps the items legible).
  const leftover = usable - fixedUsed;
  const tailHeight = leftover >= m.titleH + m.itemH + m.catGap ? leftover : usable;
  const cycle: CyclingCategory[] = rest.map((cat) => ({
    id: cat.id,
    name: cat.name,
    itemPages: pageItems(cat.items, tailHeight, m, innerWidth),
  }));
  return { fixed, cycle };
}

/** Split one category's items into pages that each fit `tailHeight` dp beneath a
 *  single static heading. The heading + trailing gap are reserved once (not per
 *  page), since the heading never moves. Rows are packed by their wrapped height
 *  (a page always takes ≥1 item, even one taller than the room). Always returns
 *  ≥1 page. */
function pageItems(
  items: MenuPageItem[],
  tailHeight: number,
  m: { titleH: number; itemH: number; itemLine: number; itemPadV: number; itemFont: number; catGap: number },
  innerWidth = 0,
): MenuPageItem[][] {
  const room = tailHeight - m.titleH - m.catGap;
  const pages: MenuPageItem[][] = [];
  let page: MenuPageItem[] = [];
  let used = 0;
  for (const it of items) {
    const h = itemHeight(itemLines(it, innerWidth, m), m);
    if (page.length > 0 && used + h > room) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(it);
    used += h;
  }
  if (page.length > 0) pages.push(page);
  return pages.length ? pages : [[]];
}

/** ---- Auto-flow: spill a category's overflow into following empty blocks ----
 *
 *  Each menu block stores its own categoryIds + hiddenItemIds; the TV renders
 *  blocks independently. flowCategoriesAcrossZones() automates the manual
 *  "split a long category across columns" workflow: it computes, per block, how
 *  many items fit (reusing paginateMenu — the exact metrics the TV uses) and
 *  pushes the remainder into the following empty / continuation blocks, in
 *  reading order. The result is plain categoryIds/hiddenItemIds, so the API and
 *  TV need no changes.
 */

/** A category as the distributor needs it: its available items (in display
 *  order) with the fields the fit metrics care about. */
export interface FlowCatalogCategory {
  id: string;
  name: string;
  items: MenuPageItem[];
}

export interface FlowOptions {
  /** The display's logical canvas height in dp (px / pixelRatio) for the
   *  intended orientation. Each zone's content height is (h% × this) − padding. */
  logicalHeightDp: number;
  /** The display's logical canvas width in dp. Each zone's content width is
   *  (w% × this) − padding; with measured item widths it decides name wrapping. */
  logicalWidthDp: number;
  /** Per-display menu font scale (drives the same metrics as the TV). */
  fontSize?: MenuFont;
  /** Available items per category id, in display order. */
  catalog: Map<string, FlowCatalogCategory>;
  /** Item ids excluded from THIS display (the operator unticked them so they can
   *  show on another display). Skipped entirely when building the stream. */
  hiddenItemIds?: ReadonlySet<string>;
}

/** Menu zones sorted in reading order: top-to-bottom, then left-to-right.
 *  Non-menu zones are excluded (they don't take part in the flow). */
export function zonesInReadingOrder<
  T extends { x: number; y: number; type: ZoneType },
>(zones: T[]): T[] {
  const EPS = 0.5; // percentage tolerance for "same row"
  return zones
    .filter((z) => z.type === "menu")
    .slice()
    .sort((a, b) => (Math.abs(a.y - b.y) <= EPS ? a.x - b.x : a.y - b.y));
}

/** ---- Continuation headings ----
 *  When a category spills across blocks (auto-flow, or a manual split), only the
 *  FIRST block it appears in should print its heading; the later blocks are an
 *  obvious continuation, so their repeated heading is just noise.
 *
 *  Given the menu zones and the category ids that actually render in each (in
 *  display order), returns — per zone — the category ids whose heading should be
 *  suppressed because the category already appeared, with shown items, in an
 *  earlier zone (reading order). Shared by the TV and the editor preview so both
 *  hide exactly the same headings. */
export interface HeadingZone {
  id: string;
  x: number;
  y: number;
  type: ZoneType;
  /** Category ids that render ≥1 item in this zone, in display order. */
  shownCategoryIds: string[];
}
export function continuationHeadingIds(
  zones: HeadingZone[],
): Map<string, Set<string>> {
  const seen = new Set<string>();
  const out = new Map<string, Set<string>>();
  for (const z of zonesInReadingOrder(zones)) {
    const hide = new Set<string>();
    for (const cid of z.shownCategoryIds) {
      if (seen.has(cid)) hide.add(cid);
      else seen.add(cid);
    }
    out.set(z.id, hide);
  }
  return out;
}

/** Build paginate-ready categories from a run of pending items, grouping
 *  consecutive items that share a category under one heading. */
function groupToCats(
  run: Array<{ catId: string; name: string; item: MenuPageItem }>,
): PaginateCategory[] {
  const cats: PaginateCategory[] = [];
  for (const p of run) {
    let last = cats[cats.length - 1];
    if (!last || last.id !== p.catId) {
      last = { id: p.catId, name: p.name, items: [] };
      cats.push(last);
    }
    last.items.push(p.item);
  }
  return cats;
}

/** The item ids that fit when `cats` are stacked statically in an `innerW`×`innerH`
 *  dp block — each category is a heading (titleH) + its rows, with a catGap between
 *  categories — exactly how a block renders. A row is as many lines tall as its
 *  (measured or estimated) name wraps to in `innerW` (see itemLines).
 *  Returns the contiguous prefix that fits (stops at the first row that would
 *  overflow), so callers can split the stream on it. (paginateMenu can't be reused
 *  here: its cycling tail re-measures the overflowing category against the *full*
 *  block height, over-counting capacity when a block also holds a category above.) */
function fittingIds(
  cats: PaginateCategory[],
  innerW: number,
  innerH: number,
  m: MenuStyle,
  /** When true, the FIRST category's heading is suppressed here (it's a
   *  continuation from an earlier block), so reserve no titleH for it — matching
   *  what actually renders. Otherwise the block under-fills by a phantom heading. */
  firstHeadingHidden = false,
): Set<string> {
  const kept = new Set<string>();
  let used = 0;
  let first = true;
  for (const c of cats) {
    if (c.items.length === 0) continue;
    const headingH = first && firstHeadingHidden ? 0 : m.titleH;
    const need = (first ? 0 : m.catGap) + headingH;
    if (used + need > innerH) break; // no room even for the heading
    used += need;
    first = false;
    for (const it of c.items) {
      const h = itemHeight(itemLines(it, innerW, m), m);
      if (used + h > innerH) return kept; // next row would overflow
      used += h;
      kept.add(it.id);
    }
  }
  return kept;
}

/**
 * Recompute every menu zone's categoryIds/hiddenItemIds so a block's overflow
 * spills into the following empty / continuation blocks (reading order). Pure
 * and idempotent: re-running on its own output yields the same zones.
 *
 *  The menu blocks form ONE continuous stream in reading order. Each block adds
 *  its own newly-introduced categories to the stream at its position, then is
 *  filled from the front of the stream up to its capacity; whatever doesn't fit
 *  flows on to the next block. So a block can both *receive* an earlier block's
 *  overflow AND *start* its own category, whose leftover flows onward in turn.
 *
 *  - A category is injected once (the first block, reading order, that lists it);
 *    a later block repeating it just keeps draining the stream (no duplicates).
 *  - Items that fit a block stay; the rest are carried forward.
 *  - Overflow left after the final block stays in it (cycles / "doesn't fit");
 *    nothing is ever dropped.
 *  - `autoFilled` marks a block that shows only received overflow (it introduced
 *    no category of its own) — used by the editor for an informational note.
 */
export function flowCategoriesAcrossZones(
  zones: LayoutZone[],
  { logicalHeightDp, logicalWidthDp, fontSize, catalog, hiddenItemIds }: FlowOptions,
): LayoutZone[] {
  const m = menuStyle(fontSize);
  const excluded = hiddenItemIds ?? new Set<string>();
  const out = zones.map((z) => ({ ...z }));
  const byId = new Map(out.map((z) => [z.id, z]));

  // Per-zone working state; categoryIds/hiddenItemIds are derived from it last.
  type Work = { catIds: string[]; shown: Set<string> };
  const work = new Map<string, Work>();

  const innerHeight = (z: LayoutZone) =>
    (z.h / 100) * logicalHeightDp - MENU_BLOCK_PAD * 2;
  const innerWidth = (z: LayoutZone) =>
    (z.w / 100) * logicalWidthDp - MENU_BLOCK_PAD * 2;

  type Pending = { catId: string; name: string; item: MenuPageItem };
  const pending: Pending[] = [];
  const seenCats = new Set<string>(); // categories already injected into the stream
  const shownCats = new Set<string>(); // categories with ≥1 item placed in an earlier block
  let lastFilledId: string | null = null;

  for (const z0 of zonesInReadingOrder(zones)) {
    const z = byId.get(z0.id)!;
    const innerH = innerHeight(z);
    const innerW = innerWidth(z);

    // Inject this block's own NEW categories at the current stream position.
    // Repeats of an already-flowing category are ignored — they're just this
    // block continuing to drain the stream.
    for (const cid of z0.categoryIds) {
      if (seenCats.has(cid)) continue;
      seenCats.add(cid);
      const cat = catalog.get(cid);
      if (!cat) continue;
      for (const it of cat.items)
        if (!excluded.has(it.id))
          pending.push({ catId: cat.id, name: cat.name, item: it });
    }

    if (pending.length === 0) {
      work.set(z0.id, { catIds: [], shown: new Set() });
      continue;
    }

    // Fill this block from the front of the stream up to its capacity. If the
    // leading category already showed items in an earlier block, its heading is
    // hidden here (continuation), so don't reserve a heading for it.
    const firstHeadingHidden = shownCats.has(pending[0]!.catId);
    const kept = fittingIds(groupToCats(pending), innerW, innerH, m, firstHeadingHidden);
    const taken: Pending[] = [];
    while (pending.length && kept.has(pending[0]!.item.id))
      taken.push(pending.shift()!);
    const catIds: string[] = [];
    const shown = new Set<string>();
    for (const t of taken) {
      if (!catIds.includes(t.catId)) catIds.push(t.catId);
      shown.add(t.item.id);
      shownCats.add(t.catId);
    }
    work.set(z0.id, { catIds, shown });
    if (taken.length) lastFilledId = z0.id;
  }

  // Anything still pending didn't fit anywhere — keep it in the last block that
  // received items (it overflows there) so nothing is dropped.
  if (pending.length && lastFilledId) {
    const w = work.get(lastFilledId)!;
    for (const p of pending) {
      if (!w.catIds.includes(p.catId)) w.catIds.push(p.catId);
      w.shown.add(p.item.id);
    }
  }

  // Derive categoryIds + hiddenItemIds (opt-out within shown categories) from
  // the working state. Non-menu zones are returned untouched.
  for (const z of out) {
    if (z.type !== "menu") continue;
    const w = work.get(z.id) ?? { catIds: [], shown: new Set() };
    const hidden: string[] = [];
    for (const catId of w.catIds) {
      const cat = catalog.get(catId);
      if (!cat) continue;
      for (const it of cat.items) if (!w.shown.has(it.id)) hidden.push(it.id);
    }
    z.categoryIds = w.catIds;
    z.hiddenItemIds = hidden;
  }

  // A block is "auto-filled" when it shows content but every category it shows
  // first appeared in an earlier block — i.e. it's purely receiving overflow.
  // Derived from the final output (reading order) so it's stable & idempotent.
  const seenOut = new Set<string>();
  for (const z of zonesInReadingOrder(out)) {
    z.autoFilled =
      z.categoryIds.length > 0 && z.categoryIds.every((c) => seenOut.has(c));
    for (const c of z.categoryIds) seenOut.add(c);
  }
  return out;
}

/** Reduce flowed zones back to operator intent: each block keeps only the
 *  categories it *introduced* (first appearance, reading order), dropping the
 *  ones it merely received as overflow. Lets the editor restore the sparse
 *  "what I put where" view from a saved (fully-distributed) layout, so the
 *  category checkboxes show a block's own picks — not the spill from earlier
 *  blocks. Item-level hides are cleared (auto-flow recomputes them). */
export function ownCategoriesPerZone(zones: LayoutZone[]): LayoutZone[] {
  const seen = new Set<string>();
  const ownByZone = new Map<string, string[]>();
  for (const z of zonesInReadingOrder(zones)) {
    const own: string[] = [];
    for (const cid of z.categoryIds) {
      if (seen.has(cid)) continue;
      seen.add(cid);
      own.push(cid);
    }
    ownByZone.set(z.id, own);
  }
  return zones.map((z) =>
    z.type === "menu"
      ? {
          ...z,
          categoryIds: ownByZone.get(z.id) ?? [],
          hiddenItemIds: [],
          autoFilled: false,
        }
      : z,
  );
}

/** Item ids actually shown by a saved layout: for each menu/featured zone, its
 *  categories' items minus that zone's hiddenItemIds, unioned across zones.
 *  Used to reconstruct a display's per-item selection on load and to compute
 *  which items already appear on other displays. */
export function shownItemIdsForLayout(
  zones: LayoutZone[],
  catalog: Map<string, { items: { id: string }[] }>,
): Set<string> {
  const shown = new Set<string>();
  for (const z of zones) {
    if (z.type !== "menu" && z.type !== "featured") continue;
    const hidden = new Set(z.hiddenItemIds ?? []);
    for (const cid of z.categoryIds) {
      const cat = catalog.get(cid);
      if (!cat) continue;
      for (const it of cat.items) if (!hidden.has(it.id)) shown.add(it.id);
    }
  }
  return shown;
}
