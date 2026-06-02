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

/** Device-reported screen resolution. */
export const resolution = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
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
];
