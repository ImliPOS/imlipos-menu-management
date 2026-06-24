"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Roboto } from "next/font/google";
import { UploadCloud, X } from "lucide-react";

// The TV renders the menu in the Android system font (Roboto). Render the
// preview in the same typeface so glyph widths, truncation points and the
// price-column positions match the real panel exactly.
const previewFont = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});
import {
  LAYOUT_TEMPLATES,
  MENU_BLOCK_PAD,
  MENU_FONT_LABELS,
  MENU_FONT_SIZES,
  menuStyle,
  paginateMenu,
  type Category,
  type Device,
  type Item,
  type LayoutZone,
  type MenuFontSize,
  type MenuPageCategory,
  type MenuPageItem,
  type MenuStyle,
  type ZoneType,
} from "@imlipos/contracts";
import { api, uploadMedia } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const field =
  "h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

const ZONE_COLORS: Record<string, string> = {
  menu: "border-sky-500/60 bg-sky-500/10 text-sky-200",
  featured: "border-amber-500/60 bg-amber-500/10 text-amber-200",
  image: "border-emerald-500/60 bg-emerald-500/10 text-emerald-200",
  video: "border-fuchsia-500/60 bg-fuchsia-500/10 text-fuchsia-200",
};

/** Inline layout editor (used on the device detail page). */
export function LayoutEditorPanel({
  device,
  orientation: orientationProp,
  onSaved,
}: {
  device: Device;
  /** Intended orientation from the assigned screen (overrides the panel's
   *  reported resolution — e.g. a landscape panel mounted in portrait). */
  orientation?: "landscape" | "portrait";
  onSaved?: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [templateId, setTemplateId] = useState(device.layout?.template ?? "");
  const [zones, setZones] = useState<LayoutZone[]>(device.layout?.zones ?? []);
  const [fontSize, setFontSize] = useState<MenuFontSize>(
    device.layout?.fontSize ?? "medium",
  );
  const [sliding, setSliding] = useState(device.layout?.sliding ?? true);
  // Which menu blocks overflow at the current size — only meaningful with
  // sliding off, where every item must fit. Keyed by zone id.
  const [overflowByZone, setOverflowByZone] = useState<Record<string, boolean>>({});
  const reportOverflow = useCallback((zoneId: string, overflows: boolean) => {
    setOverflowByZone((prev) =>
      prev[zoneId] === overflows ? prev : { ...prev, [zoneId]: overflows },
    );
  }, []);
  const [selected, setSelected] = useState<string | null>(
    device.layout?.zones?.[0]?.id ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  // The screen's intended orientation wins; fall back to the panel's reported
  // resolution when no screen orientation is provided.
  const orientation =
    orientationProp ??
    (device.resolution && device.resolution.height > device.resolution.width
      ? "portrait"
      : "landscape");
  // Preview aspect matches the *intended* orientation (so a landscape panel
  // mounted in portrait previews tall), using the panel's pixel ratio.
  const ratio =
    device.resolution
      ? Math.max(device.resolution.width, device.resolution.height) /
        Math.min(device.resolution.width, device.resolution.height)
      : 16 / 9;
  const aspect = orientation === "portrait" ? 1 / ratio : ratio;
  const templates = useMemo(
    () => LAYOUT_TEMPLATES.filter((t) => t.orientation === orientation),
    [orientation],
  );

  // The display's logical canvas width in the intended orientation, in *dp*
  // (the TV lays out fonts/padding in dp = px / pixelRatio). The preview shares
  // this aspect ratio, so the scale mapping dp → preview px is simply
  // (measured preview width) / (logical dp width).
  const pixelRatio = device.resolution?.scale ?? 1;
  const longSide = device.resolution
    ? Math.max(device.resolution.width, device.resolution.height)
    : 1920;
  const shortSide = device.resolution
    ? Math.min(device.resolution.width, device.resolution.height)
    : 1080;
  const logicalW = (orientation === "portrait" ? shortSide : longSide) / pixelRatio;

  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasPx, setCanvasPx] = useState(0);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCanvasPx(el.clientWidth));
    ro.observe(el);
    setCanvasPx(el.clientWidth);
    return () => ro.disconnect();
  }, [zones.length, aspect]);
  const scale = canvasPx > 0 ? canvasPx / logicalW : 0;

  useEffect(() => {
    api.listCategories().then(setCategories).catch(console.error);
    api.listItems().then(setItems).catch(console.error);
  }, []);

  // Available categories / items keyed for the scaled menu preview (matches how
  // the TV resolves a menu zone: categoryIds order, items by sortOrder).
  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const itemsByCat = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const it of items) {
      if (!it.isAvailable) continue;
      const arr = m.get(it.categoryId) ?? [];
      arr.push(it);
      m.set(it.categoryId, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.sortOrder - b.sortOrder);
    return m;
  }, [items]);

  function applyTemplate(id: string) {
    const t = LAYOUT_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    const next: LayoutZone[] = t.zones.map((z, i) => ({
      id: `z${i}`,
      ...z,
      categoryIds: [],
      hiddenItemIds: [],
      mediaUrl: null,
    }));
    setTemplateId(id);
    setZones(next);
    setSelected(next[0]?.id ?? null);
    setSaved(false);
  }

  function patchZone(id: string, patch: Partial<LayoutZone>) {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...patch } : z)));
    setSaved(false);
  }

  // Changing a block's type clears its previous content.
  function changeType(id: string, type: ZoneType) {
    patchZone(id, { type, categoryIds: [], hiddenItemIds: [], mediaUrl: null });
  }

  function toggleCat(zoneId: string, catId: string) {
    setZones((prev) =>
      prev.map((z) => {
        if (z.id !== zoneId) return z;
        const has = z.categoryIds.includes(catId);
        if (!has) {
          return { ...z, categoryIds: [...z.categoryIds, catId] };
        }
        // Removing a category: drop it and forget its per-item choices so a
        // later re-add starts from "show all" again.
        const catItemIds = new Set((itemsByCat.get(catId) ?? []).map((i) => i.id));
        return {
          ...z,
          categoryIds: z.categoryIds.filter((c) => c !== catId),
          hiddenItemIds: (z.hiddenItemIds ?? []).filter((id) => !catItemIds.has(id)),
        };
      }),
    );
    setSaved(false);
  }

  // Toggle a single item's visibility within its block (checked = shown).
  function toggleItem(zoneId: string, itemId: string) {
    setZones((prev) =>
      prev.map((z) => {
        if (z.id !== zoneId) return z;
        const hidden = z.hiddenItemIds ?? [];
        return {
          ...z,
          hiddenItemIds: hidden.includes(itemId)
            ? hidden.filter((id) => id !== itemId)
            : [...hidden, itemId],
        };
      }),
    );
    setSaved(false);
  }

  async function uploadFor(zoneId: string, file: File) {
    const url = await uploadMedia(file);
    patchZone(zoneId, { mediaUrl: url });
  }

  async function save() {
    setBusy(true);
    setSaved(false);
    try {
      await api.updateDeviceLayout(device.id, {
        template: templateId,
        zones,
        fontSize,
        sliding,
      });
      setSaved(true);
      onSaved?.();
    } finally {
      setBusy(false);
    }
  }

  const sel = zones.find((z) => z.id === selected) ?? null;

  // With sliding off, a layout can only be saved when every menu block's items
  // fit statically. A block reports overflow via reportOverflow.
  const blocksDontFit =
    !sliding &&
    zones.some(
      (z) => z.type === "menu" && z.categoryIds.length > 0 && overflowByZone[z.id],
    );

  // A category may only live in one menu/featured block. Collect the ones
  // already claimed by *other* blocks so we can disable them here.
  const usedElsewhere = useMemo(() => {
    const m = new Map<string, string>(); // categoryId -> owning zone id
    for (const z of zones) {
      if (z.id === selected) continue;
      if (z.type === "menu" || z.type === "featured") {
        for (const c of z.categoryIds) m.set(c, z.id);
      }
    }
    return m;
  }, [zones, selected]);

  return (
    <div className="space-y-4">
      {/* Slide-in keyframes for the cycling menu preview (left → right). */}
      <style>{`@keyframes imli-slidein{from{transform:translateX(-100%);opacity:.4}to{transform:translateX(0);opacity:1}}`}</style>
      <div className="space-y-2">
        <Label htmlFor="template">Template</Label>
        <select
          id="template"
          className={field}
          value={templateId}
          onChange={(e) => applyTemplate(e.target.value)}
        >
          <option value="">Choose a template…</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {zones.some((z) => z.type === "menu") && (
        <div className="space-y-2">
          <Label>Menu font size</Label>
          <div className="flex flex-wrap gap-2">
            {MENU_FONT_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setFontSize(size);
                  setSaved(false);
                }}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  fontSize === size
                    ? "border-foreground bg-foreground text-background"
                    : "border-input bg-background hover:bg-secondary/60"
                }`}
              >
                {MENU_FONT_LABELS[size]}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Applies to every menu block on this display. Larger sizes fit fewer
            items per page, so they cycle more.
          </p>
        </div>
      )}

      {zones.some((z) => z.type === "menu") && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <Label htmlFor="sliding">Sliding menu</Label>
            <Switch
              id="sliding"
              checked={sliding}
              onCheckedChange={(v) => {
                setSliding(v);
                setSaved(false);
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {sliding
              ? "On — overflowing blocks cycle their items in a sliding transition."
              : "Off — every item must fit on screen. Blocks that overflow are marked “Does not fit” and the layout can’t be saved."}
          </p>
        </div>
      )}

      {zones.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Preview */}
          <div>
            <Label>Preview (click a block)</Label>
            <div
              ref={canvasRef}
              className={`relative mt-2 w-full max-w-xl overflow-hidden rounded-lg border border-border bg-background ${previewFont.className}`}
              style={{ aspectRatio: String(aspect) }}
            >
              {zones.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setSelected(z.id)}
                  className={`absolute overflow-hidden border ${
                    ZONE_COLORS[z.type]
                  } ${selected === z.id ? "z-10 ring-2 ring-foreground" : ""}`}
                  style={{
                    left: `${z.x}%`,
                    top: `${z.y}%`,
                    width: `${z.w}%`,
                    height: `${z.h}%`,
                  }}
                >
                  {z.type === "menu" && z.categoryIds.length > 0 && scale > 0 ? (
                    <MenuBlock
                      zone={z}
                      scale={scale}
                      fontSize={fontSize}
                      sliding={sliding}
                      catById={catById}
                      itemsByCat={itemsByCat}
                      onOverflow={reportOverflow}
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs font-medium">
                      {z.type}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {scale > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Preview scaled to{" "}
                {orientation === "landscape" ? `${longSide}×${shortSide}` : `${shortSide}×${longSide}`}{" "}
                · {orientation}.{" "}
                {sliding
                  ? "When content doesn’t fit, the block cycles through pages every 5s — just like the display."
                  : "Sliding is off, so every item must fit on screen."}
              </p>
            )}
            {blocksDontFit && (
              <p className="mt-1 text-sm font-medium text-red-400">
                Does not fit — turn on Sliding menu, pick a smaller font, or move
                some categories to another block before saving.
              </p>
            )}
          </div>

          {/* Selected zone content */}
          <div>
            <Label>Block content</Label>
            {!sel ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Select a block in the preview.
              </p>
            ) : (
              <div className="mt-2 space-y-3 rounded-lg border border-border p-3">
                <div className="space-y-1">
                  <Label htmlFor="zone-type">Show in this block</Label>
                  <select
                    id="zone-type"
                    className={field}
                    value={sel.type}
                    onChange={(e) => changeType(sel.id, e.target.value as ZoneType)}
                  >
                    <option value="menu">Menu (categories)</option>
                    <option value="featured">Featured images</option>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </div>

                {(sel.type === "menu" || sel.type === "featured") && (
                  <ul className="max-h-64 space-y-1 overflow-y-auto">
                    {categories.length === 0 && (
                      <li className="text-sm text-muted-foreground">No categories yet.</li>
                    )}
                    {categories.map((c) => {
                      const takenBy = usedElsewhere.get(c.id);
                      const disabled =
                        !!takenBy && !sel.categoryIds.includes(c.id);
                      const enabled = sel.categoryIds.includes(c.id);
                      return (
                        <li key={c.id}>
                          <label
                            className={`flex items-center gap-2 text-sm ${
                              disabled
                                ? "cursor-not-allowed text-muted-foreground"
                                : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={disabled}
                              checked={enabled}
                              onChange={() => toggleCat(sel.id, c.id)}
                            />
                            {c.name}
                            {disabled && (
                              <span className="text-xs italic opacity-70">
                                in another block
                              </span>
                            )}
                          </label>
                          {/* Once a category is on, pick which of its items show. */}
                          {sel.type === "menu" && enabled && (
                            <CategoryItemPicker
                              items={itemsByCat.get(c.id) ?? []}
                              hiddenIds={new Set(sel.hiddenItemIds ?? [])}
                              onToggle={(itemId) => toggleItem(sel.id, itemId)}
                            />
                          )}
                        </li>
                      );
                    })}
                    {sel.type === "featured" && (
                      <li className="pt-1 text-xs text-muted-foreground">
                        Shows the “featured” items (with photos) from the picked categories.
                      </li>
                    )}
                  </ul>
                )}

                {(sel.type === "image" || sel.type === "video") && (
                  <div className="space-y-2">
                    {sel.mediaUrl ? (
                      sel.type === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sel.mediaUrl}
                          alt=""
                          className="h-28 w-full rounded-md object-cover"
                        />
                      ) : (
                        <video
                          src={sel.mediaUrl}
                          className="h-28 w-full rounded-md object-cover"
                          muted
                          loop
                          autoPlay
                        />
                      )
                    ) : (
                      <div className="flex h-28 w-full items-center justify-center rounded-md border border-border bg-background text-sm text-muted-foreground">
                        No {sel.type} yet
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-secondary/60">
                        <UploadCloud className="size-4" />
                        Upload {sel.type}
                        <input
                          type="file"
                          accept={sel.type === "image" ? "image/*" : "video/mp4"}
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.currentTarget.value = "";
                            if (f) uploadFor(sel.id, f).catch((err) => alert(err.message));
                          }}
                        />
                      </label>
                      {sel.mediaUrl && (
                        <button
                          type="button"
                          onClick={() => patchZone(sel.id, { mediaUrl: null })}
                          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-red-400"
                        >
                          <X className="size-4" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={busy || zones.length === 0 || blocksDontFit}>
          {busy ? "Saving…" : "Save layout"}
        </Button>
        {blocksDontFit && (
          <span className="text-sm text-red-400">
            Can’t save — a menu block doesn’t fit.
          </span>
        )}
        {saved && <span className="text-sm text-green-400">Saved ✓</span>}
      </div>
    </div>
  );
}

/**
 * Collapsible list of a category's items with checkboxes — checked items show in
 * the block, unchecked ones are hidden (stored as the zone's hiddenItemIds).
 */
function CategoryItemPicker({
  items,
  hiddenIds,
  onToggle,
}: {
  items: Item[];
  hiddenIds: Set<string>;
  onToggle: (itemId: string) => void;
}) {
  const shown = items.reduce((n, it) => n + (hiddenIds.has(it.id) ? 0 : 1), 0);
  return (
    <details className="ml-6 mt-1">
      <summary className="cursor-pointer select-none text-xs text-muted-foreground">
        Items — {shown}/{items.length} shown
      </summary>
      {items.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          No items in this category.
        </p>
      ) : (
        <ul className="mt-1 space-y-1">
          {items.map((it) => (
            <li key={it.id}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!hiddenIds.has(it.id)}
                  onChange={() => onToggle(it.id)}
                />
                <span className="min-w-0 flex-1 truncate">{it.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  ₹{Number(it.price)}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

/**
 * Scaled, faithful preview of a menu block — mirrors the TV's typography for the
 * chosen font preset (via menuStyle) multiplied by `scale`, paginated with the
 * shared `paginateMenu`. When content doesn't fit, it cycles through pages every
 * 5s with a left-to-right slide, exactly like the display.
 */
function MenuBlock({
  zone,
  scale,
  fontSize,
  sliding,
  catById,
  itemsByCat,
  onOverflow,
}: {
  zone: LayoutZone;
  scale: number;
  fontSize: MenuFontSize;
  sliding: boolean;
  catById: Map<string, Category>;
  itemsByCat: Map<string, Item[]>;
  onOverflow: (zoneId: string, overflows: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [blockPx, setBlockPx] = useState(0);
  const [frame, setFrame] = useState(0);
  const ms = useMemo(() => menuStyle(fontSize), [fontSize]);

  // Measure the block's pixel height → dp height (÷ scale), minus 32dp padding
  // each side, is the content area the TV paginates against.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBlockPx(el.clientHeight));
    ro.observe(el);
    setBlockPx(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const simple = useMemo(() => {
    const hidden = new Set(zone.hiddenItemIds ?? []);
    return zone.categoryIds
      .map((id) => catById.get(id))
      .filter((c): c is Category => !!c && c.isAvailable)
      .map((c) => ({
        id: c.id,
        name: c.name,
        items: (itemsByCat.get(c.id) ?? [])
          .filter((it) => !hidden.has(it.id))
          .map((it) => ({ id: it.id, name: it.name, price: Number(it.price) })),
      }))
      .filter((c) => c.items.length > 0);
  }, [zone.categoryIds, zone.hiddenItemIds, catById, itemsByCat]);

  const innerDp =
    blockPx > 0 && scale > 0 ? blockPx / scale - MENU_BLOCK_PAD * 2 : 0;
  const { fixed, cycle } = useMemo(() => {
    if (innerDp <= 0) return { fixed: simple, cycle: [] };
    return paginateMenu(simple, innerDp, ms);
  }, [simple, innerDp, ms]);

  // With sliding OFF, decide "fits" by *measuring* the actually-rendered content
  // against the block's padded content area — not by estimating from metrics.
  // This makes the warning match exactly what's drawn (real font glyphs, line
  // heights, and no phantom trailing-category gap). Sliding ON still uses the
  // metric pagination, which drives the pin/cycle split.
  const staticRef = useRef<HTMLDivElement>(null);
  const [staticOverflow, setStaticOverflow] = useState(false);
  useEffect(() => {
    if (sliding) {
      setStaticOverflow(false);
      return;
    }
    const el = staticRef.current;
    if (!el || blockPx <= 0 || scale <= 0) return;
    const available = blockPx - MENU_BLOCK_PAD * 2 * scale; // minus padding each side
    setStaticOverflow(el.scrollHeight > available + 1); // +1px sub-pixel slack
  }, [simple, fontSize, scale, blockPx, sliding]);

  // Sliding on → metric pagination leaves a cycling tail; off → measured fit.
  const overflows = sliding
    ? innerDp > 0 && cycle.length > 0
    : blockPx > 0 && staticOverflow;
  useEffect(() => {
    if (blockPx > 0) onOverflow(zone.id, overflows);
  }, [zone.id, overflows, blockPx, onOverflow]);

  // Flatten cycling categories into item-page frames, each shown under its
  // category's static heading (mirrors the TV exactly). Empty with sliding off.
  const frames = useMemo(
    () =>
      sliding
        ? cycle.flatMap((c) =>
            c.itemPages.map((items) => ({ catId: c.id, name: c.name, items })),
          )
        : [],
    [cycle, sliding],
  );
  const frameCount = frames.length;
  const current = frameCount > 0 ? frames[Math.min(frame, frameCount - 1)]! : null;

  useEffect(() => {
    setFrame(0);
  }, [frameCount]);
  useEffect(() => {
    if (frameCount <= 1) return;
    const id = window.setInterval(() => setFrame((f) => (f + 1) % frameCount), 5000);
    return () => window.clearInterval(id);
  }, [frameCount]);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden bg-[#0a0a0a] text-left">
      <div
        className="flex h-full w-full flex-col"
        style={{ padding: MENU_BLOCK_PAD * scale }}
      >
        {!sliding ? (
          /* Sliding off: render every category statically in a wrapper we
             measure for real overflow (clipped by the block's overflow-hidden). */
          <div ref={staticRef}>
            {simple.map((pc, i) => (
              <PreviewCategory
                key={pc.id}
                pc={pc}
                scale={scale}
                ms={ms}
                last={i === simple.length - 1}
              />
            ))}
          </div>
        ) : (
          /* Sliding on: pinned categories + the cycling tail. */
          <>
            {fixed.map((pc) => (
              <PreviewCategory key={pc.id} pc={pc} scale={scale} ms={ms} />
            ))}
            {/* Overflowing category — heading static; only the item rows cycle. */}
            {current && (
              <div className="flex min-h-0 flex-1 flex-col">
                <PreviewCategoryTitle name={current.name} scale={scale} ms={ms} />
                <div className="min-h-0 flex-1 overflow-hidden">
                  <div
                    key={frame}
                    style={{
                      animation:
                        frameCount > 1 ? "imli-slidein 600ms ease-out" : undefined,
                    }}
                  >
                    {current.items.map((it) => (
                      <PreviewItemRow key={it.id} it={it} scale={scale} ms={ms} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {sliding && frameCount > 1 && (
        <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-sky-600/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
          ↻ {frame + 1}/{frameCount}
        </span>
      )}
      {!sliding && overflows && (
        <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-red-600/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
          Does not fit
        </span>
      )}
    </div>
  );
}

function PreviewCategoryTitle({
  name,
  scale,
  ms,
}: {
  name: string;
  scale: number;
  ms: MenuStyle;
}) {
  return (
    <div
      className="overflow-hidden text-ellipsis whitespace-nowrap"
      style={{
        color: "#f5d90a",
        fontWeight: 800,
        fontSize: ms.titleFont * scale,
        lineHeight: `${ms.titleLine * scale}px`,
        marginBottom: ms.titleGap * scale,
      }}
    >
      {name}
    </div>
  );
}

function PreviewItemRow({
  it,
  scale,
  ms,
}: {
  it: MenuPageItem;
  scale: number;
  ms: MenuStyle;
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: `${ms.itemPadV * scale}px 0`, gap: 8 * scale }}
    >
      {/* Single-line + ellipsis so a long name doesn't wrap — keeping each
          row at the font preset's itemH, exactly like the TV. */}
      <span
        className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
        style={{
          color: "#fff",
          fontSize: ms.itemFont * scale,
          lineHeight: `${ms.itemLine * scale}px`,
        }}
      >
        {it.name}
      </span>
      <span
        className="shrink-0 whitespace-nowrap"
        style={{
          color: "#fff",
          fontWeight: 700,
          fontSize: ms.itemFont * scale,
          lineHeight: `${ms.itemLine * scale}px`,
        }}
      >
        ₹{it.price}
      </span>
    </div>
  );
}

function PreviewCategory({
  pc,
  scale,
  ms,
  last = false,
}: {
  pc: MenuPageCategory;
  scale: number;
  ms: MenuStyle;
  /** The last category needs no trailing gap — it would only be dead space
   *  below the final row (and would push a block over the fit check). */
  last?: boolean;
}) {
  return (
    <div style={{ marginBottom: last ? 0 : ms.catGap * scale }}>
      <PreviewCategoryTitle name={pc.name} scale={scale} ms={ms} />
      {pc.items.map((it) => (
        <PreviewItemRow key={it.id} it={it} scale={scale} ms={ms} />
      ))}
    </div>
  );
}
