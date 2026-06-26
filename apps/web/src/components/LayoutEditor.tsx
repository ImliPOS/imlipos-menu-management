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
  continuationHeadingIds,
  flowCategoriesAcrossZones,
  LAYOUT_TEMPLATES,
  MENU_BLOCK_PAD,
  MENU_SCALE_DEFAULT,
  MENU_SCALE_MAX,
  MENU_SCALE_MIN,
  MENU_SCALE_STEP,
  menuStyle,
  paginateMenu,
  resolveFontScale,
  type Category,
  type Device,
  type FlowCatalogCategory,
  type Item,
  type LayoutZone,
  type MenuFont,
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
  // Continuous font scale (1 = original). Legacy preset strings on existing
  // layouts are normalised to a number so the +/- control starts in the right
  // place.
  const [fontScale, setFontScale] = useState<number>(() =>
    resolveFontScale(device.layout?.fontSize ?? MENU_SCALE_DEFAULT),
  );
  const adjustFont = (delta: number) => {
    setFontScale((v) =>
      Math.min(
        MENU_SCALE_MAX,
        Math.max(MENU_SCALE_MIN, Math.round((v + delta) * 100) / 100),
      ),
    );
    setSaved(false);
  };
  // Editable percentage field (kept in sync with fontScale; committed on
  // blur/Enter, clamped to [MIN, MAX]).
  const PCT_MIN = Math.round(MENU_SCALE_MIN * 100);
  const PCT_MAX = Math.round(MENU_SCALE_MAX * 100);
  const [pctText, setPctText] = useState(String(Math.round(fontScale * 100)));
  useEffect(() => {
    setPctText(String(Math.round(fontScale * 100)));
  }, [fontScale]);
  const commitPct = () => {
    const n = parseInt(pctText, 10);
    if (Number.isFinite(n)) {
      const clamped = Math.min(PCT_MAX, Math.max(PCT_MIN, n));
      setFontScale(clamped / 100);
      setSaved(false);
    } else {
      setPctText(String(Math.round(fontScale * 100)));
    }
  };
  const [sliding, setSliding] = useState(device.layout?.sliding ?? true);
  // When on, a category that overflows its block spills into the following
  // empty/continuation blocks automatically (see flowCategoriesAcrossZones).
  const [autoFlow, setAutoFlow] = useState(device.layout?.autoFlow ?? true);
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
  // Canvas height in dp for the intended orientation — feeds the auto-flow
  // distributor's per-block capacity (innerH = h% × this − padding), the same
  // basis the TV paginates against.
  const logicalHeightDp =
    (orientation === "portrait" ? longSide : shortSide) / pixelRatio;

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

  // Available items per category, shaped for the auto-flow distributor.
  const catalog = useMemo(() => {
    const m = new Map<string, FlowCatalogCategory>();
    for (const c of categories) {
      if (!c.isAvailable) continue;
      m.set(c.id, {
        id: c.id,
        name: c.name,
        items: (itemsByCat.get(c.id) ?? []).map((it) => ({
          id: it.id,
          name: it.name,
          price: Number(it.price),
        })),
      });
    }
    return m;
  }, [categories, itemsByCat]);

  // The zones actually previewed and saved. With auto-flow on, each block's
  // overflow spills into the following empty/continuation blocks; off, the
  // operator's manual assignment is used verbatim. Guard on a loaded catalog so
  // we never clobber stored content with an empty split during initial load.
  const flowedZones = useMemo(() => {
    if (!autoFlow || catalog.size === 0) return zones;
    return flowCategoriesAcrossZones(zones, {
      logicalHeightDp,
      fontSize: fontScale,
      catalog,
    });
  }, [autoFlow, zones, catalog, logicalHeightDp, fontScale]);

  // Category ids whose heading is suppressed per block — a category that spills
  // across blocks prints its heading only in the first block it appears in.
  const headingHideByZone = useMemo(
    () =>
      continuationHeadingIds(
        flowedZones.map((z) => {
          const hidden = new Set(z.hiddenItemIds ?? []);
          const shownCategoryIds =
            z.type === "menu"
              ? z.categoryIds.filter((cid) => {
                  const c = catById.get(cid);
                  if (!c || !c.isAvailable) return false;
                  return (itemsByCat.get(cid) ?? []).some(
                    (it) => !hidden.has(it.id),
                  );
                })
              : [];
          return { id: z.id, x: z.x, y: z.y, type: z.type, shownCategoryIds };
        }),
      ),
    [flowedZones, catById, itemsByCat],
  );

  function applyTemplate(id: string) {
    const t = LAYOUT_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    const next: LayoutZone[] = t.zones.map((z, i) => ({
      id: `z${i}`,
      ...z,
      categoryIds: [],
      hiddenItemIds: [],
      mediaUrl: null,
      autoFilled: false,
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
          // Adding a category. If it already shows in other block(s), default
          // THIS block to only the items not shown elsewhere — so splitting a
          // long category across columns doesn't duplicate rows.
          const catItemIds = new Set(
            (itemsByCat.get(catId) ?? []).map((i) => i.id),
          );
          const shownElsewhere = new Set<string>();
          for (const other of prev) {
            if (other.id === zoneId || !other.categoryIds.includes(catId))
              continue;
            const otherHidden = new Set(other.hiddenItemIds ?? []);
            for (const id of catItemIds)
              if (!otherHidden.has(id)) shownElsewhere.add(id);
          }
          const keptHidden = (z.hiddenItemIds ?? []).filter(
            (id) => !catItemIds.has(id),
          );
          return {
            ...z,
            categoryIds: [...z.categoryIds, catId],
            hiddenItemIds: [...keptHidden, ...shownElsewhere],
          };
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

  // Items of a category currently *shown* in blocks other than `zoneId`. These
  // are locked from being added here so the same item isn't displayed twice.
  function shownInOtherBlocks(catId: string, zoneId: string): Set<string> {
    const ids = new Set<string>();
    const catItems = itemsByCat.get(catId) ?? [];
    for (const z of zones) {
      if (z.id === zoneId || !z.categoryIds.includes(catId)) continue;
      const hidden = new Set(z.hiddenItemIds ?? []);
      for (const it of catItems) if (!hidden.has(it.id)) ids.add(it.id);
    }
    return ids;
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
        // Persist the flowed result (with autoFilled markers) so the TV renders
        // the same split the preview shows; it re-derives identically on reload.
        zones: flowedZones,
        fontSize: fontScale,
        sliding,
        autoFlow,
      });
      setSaved(true);
      onSaved?.();
    } finally {
      setBusy(false);
    }
  }

  // Manual edits target the raw zone; the flowed copy tells us whether this
  // block is an auto-filled continuation slot (then its content is read-only).
  const sel = zones.find((z) => z.id === selected) ?? null;
  const selFlowed = flowedZones.find((z) => z.id === selected) ?? null;
  const selAutoFilled = autoFlow && !!selFlowed?.autoFilled;

  // With sliding off, a layout can only be saved when every menu block's items
  // fit statically. A block reports overflow via reportOverflow, keyed by the
  // (flowed) zone id actually rendered in the preview.
  const blocksDontFit =
    !sliding &&
    flowedZones.some(
      (z) => z.type === "menu" && z.categoryIds.length > 0 && overflowByZone[z.id],
    );

  // A category MAY appear in more than one menu/featured block (e.g. to split a
  // long category across columns, each showing a different subset of its items
  // via the block's own hiddenItemIds). We collect the ones already used by
  // *other* blocks only to show an informational hint — not to disable them.
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Decrease menu font size"
              onClick={() => adjustFont(-MENU_SCALE_STEP)}
              disabled={fontScale <= MENU_SCALE_MIN + 1e-9}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-lg leading-none hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-40"
            >
              −
            </button>
            <div className="flex w-16 items-center justify-center gap-0.5">
              <input
                value={pctText}
                onChange={(e) =>
                  setPctText(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))
                }
                onBlur={commitPct}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    commitPct();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                inputMode="numeric"
                aria-label={`Menu font size percent (${PCT_MIN}-${PCT_MAX})`}
                className="w-9 rounded border border-input bg-background py-0.5 text-center text-sm tabular-nums outline-none focus:border-foreground"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <button
              type="button"
              aria-label="Increase menu font size"
              onClick={() => adjustFont(MENU_SCALE_STEP)}
              disabled={fontScale >= MENU_SCALE_MAX - 1e-9}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-lg leading-none hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>
            {Math.abs(fontScale - MENU_SCALE_DEFAULT) > 1e-9 && (
              <button
                type="button"
                onClick={() => adjustFont(MENU_SCALE_DEFAULT - fontScale)}
                className="ml-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary/60"
              >
                Reset
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Applies to every menu block on this display. Increase until your
            items fit; larger sizes fit fewer items per page, so they cycle more.
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

      {zones.some((z) => z.type === "menu") && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <Label htmlFor="autoflow">Auto-fill overflow</Label>
            <Switch
              id="autoflow"
              checked={autoFlow}
              onCheckedChange={(v) => {
                setAutoFlow(v);
                setSaved(false);
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {autoFlow
              ? "On — a category that doesn’t fit its block spills into the following empty blocks automatically (in reading order). Just pick a category for the first block."
              : "Off — each block shows only the items you assign to it."}
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
              {flowedZones.map((z) => (
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
                      fontSize={fontScale}
                      sliding={sliding}
                      catById={catById}
                      itemsByCat={itemsByCat}
                      onOverflow={reportOverflow}
                      hideHeadings={headingHideByZone.get(z.id)}
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

                {selAutoFilled && (
                  <p className="rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
                    Auto-filled — this block shows the overflow from an earlier
                    block. Turn off “Auto-fill overflow”, or change the first
                    block’s category, to edit what appears here.
                  </p>
                )}

                {!selAutoFilled && (sel.type === "menu" || sel.type === "featured") && (
                  <ul className="max-h-64 space-y-1 overflow-y-auto">
                    {categories.length === 0 && (
                      <li className="text-sm text-muted-foreground">No categories yet.</li>
                    )}
                    {categories.map((c) => {
                      const enabled = sel.categoryIds.includes(c.id);
                      // A category can be added to multiple blocks; flag when it
                      // already shows in another so the operator can split items.
                      const alsoElsewhere =
                        usedElsewhere.has(c.id) && !enabled;
                      return (
                        <li key={c.id}>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={() => toggleCat(sel.id, c.id)}
                            />
                            {c.name}
                            {alsoElsewhere && (
                              <span className="text-xs italic text-muted-foreground opacity-70">
                                also in another block
                              </span>
                            )}
                          </label>
                          {/* Once a category is on, pick which of its items show
                              in THIS block (independent of other blocks). With
                              auto-flow on the split is computed, so the per-item
                              picker is replaced by a short hint. */}
                          {sel.type === "menu" && enabled && !autoFlow && (
                            <CategoryItemPicker
                              items={itemsByCat.get(c.id) ?? []}
                              hiddenIds={new Set(sel.hiddenItemIds ?? [])}
                              lockedIds={shownInOtherBlocks(c.id, sel.id)}
                              onToggle={(itemId) => toggleItem(sel.id, itemId)}
                            />
                          )}
                          {sel.type === "menu" && enabled && autoFlow && (
                            <p className="ml-6 mt-1 text-xs italic text-muted-foreground opacity-70">
                              Items auto-distributed across this and the following
                              empty blocks.
                            </p>
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
  lockedIds,
  onToggle,
}: {
  items: Item[];
  hiddenIds: Set<string>;
  /** Items already shown in another block — can't be added here (would dupe).
   *  Still uncheckable if somehow shown in both. */
  lockedIds: Set<string>;
  onToggle: (itemId: string) => void;
}) {
  const shownHere = (it: Item) => !hiddenIds.has(it.id);
  const shown = items.filter(shownHere).length;
  const selectable = items.filter((it) => !(lockedIds.has(it.id) && !shownHere(it))).length;
  return (
    <details className="ml-6 mt-1">
      <summary className="cursor-pointer select-none text-xs text-muted-foreground">
        Items — {shown}/{selectable} shown
        {selectable < items.length && (
          <span className="opacity-70">
            {" "}
            · {items.length - selectable} in another block
          </span>
        )}
      </summary>
      {items.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          No items in this category.
        </p>
      ) : (
        <ul className="mt-1 space-y-1">
          {items.map((it) => {
            // Lock from *adding* when shown elsewhere and not already shown here.
            const locked = lockedIds.has(it.id) && !shownHere(it);
            return (
              <li key={it.id}>
                <label
                  className={`flex items-center gap-2 text-sm ${
                    locked ? "cursor-not-allowed opacity-50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={locked}
                    checked={shownHere(it)}
                    onChange={() => onToggle(it.id)}
                  />
                  <span className="min-w-0 flex-1 truncate">{it.name}</span>
                  {locked && (
                    <span className="shrink-0 text-[10px] italic text-muted-foreground">
                      in another block
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground">
                    ₹{Number(it.price)}
                  </span>
                </label>
              </li>
            );
          })}
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
  hideHeadings,
}: {
  zone: LayoutZone;
  scale: number;
  fontSize: MenuFont;
  sliding: boolean;
  catById: Map<string, Category>;
  itemsByCat: Map<string, Item[]>;
  onOverflow: (zoneId: string, overflows: boolean) => void;
  /** Category ids whose heading is suppressed here (continuation block). */
  hideHeadings?: Set<string>;
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
                hideTitle={hideHeadings?.has(pc.id) ?? false}
              />
            ))}
          </div>
        ) : (
          /* Sliding on: pinned categories + the cycling tail. */
          <>
            {fixed.map((pc) => (
              <PreviewCategory
                key={pc.id}
                pc={pc}
                scale={scale}
                ms={ms}
                hideTitle={hideHeadings?.has(pc.id) ?? false}
              />
            ))}
            {/* Overflowing category — heading static; only the item rows cycle. */}
            {current && (
              <div className="flex min-h-0 flex-1 flex-col">
                {!hideHeadings?.has(current.catId) && (
                  <PreviewCategoryTitle name={current.name} scale={scale} ms={ms} />
                )}
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
  hideTitle = false,
}: {
  pc: MenuPageCategory;
  scale: number;
  ms: MenuStyle;
  /** The last category needs no trailing gap — it would only be dead space
   *  below the final row (and would push a block over the fit check). */
  last?: boolean;
  /** Suppress the heading — this category continues from an earlier block. */
  hideTitle?: boolean;
}) {
  return (
    <div style={{ marginBottom: last ? 0 : ms.catGap * scale }}>
      {!hideTitle && <PreviewCategoryTitle name={pc.name} scale={scale} ms={ms} />}
      {pc.items.map((it) => (
        <PreviewItemRow key={it.id} it={it} scale={scale} ms={ms} />
      ))}
    </div>
  );
}
