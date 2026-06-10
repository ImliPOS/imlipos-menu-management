"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";
import {
  LAYOUT_TEMPLATES,
  MENU_METRICS,
  paginateMenu,
  type Category,
  type Device,
  type Item,
  type LayoutZone,
  type MenuPageCategory,
  type ZoneType,
} from "@imlipos/contracts";
import { api, uploadMedia } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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
    patchZone(id, { type, categoryIds: [], mediaUrl: null });
  }

  function toggleCat(zoneId: string, catId: string) {
    setZones((prev) =>
      prev.map((z) => {
        if (z.id !== zoneId) return z;
        const has = z.categoryIds.includes(catId);
        return {
          ...z,
          categoryIds: has
            ? z.categoryIds.filter((c) => c !== catId)
            : [...z.categoryIds, catId],
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
      await api.updateDeviceLayout(device.id, { template: templateId, zones });
      setSaved(true);
      onSaved?.();
    } finally {
      setBusy(false);
    }
  }

  const sel = zones.find((z) => z.id === selected) ?? null;

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

      {zones.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Preview */}
          <div>
            <Label>Preview (click a block)</Label>
            <div
              ref={canvasRef}
              className="relative mt-2 w-full max-w-xl overflow-hidden rounded-lg border border-border bg-background"
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
                      catById={catById}
                      itemsByCat={itemsByCat}
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
                · {orientation}. When content doesn’t fit, the block cycles through
                pages every 5s — just like the display.
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
                              checked={sel.categoryIds.includes(c.id)}
                              onChange={() => toggleCat(sel.id, c.id)}
                            />
                            {c.name}
                            {disabled && (
                              <span className="text-xs italic opacity-70">
                                in another block
                              </span>
                            )}
                          </label>
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
        <Button onClick={save} disabled={busy || zones.length === 0}>
          {busy ? "Saving…" : "Save layout"}
        </Button>
        {saved && <span className="text-sm text-green-400">Saved ✓</span>}
      </div>
    </div>
  );
}

/**
 * Scaled, faithful preview of a menu block — mirrors the TV's metrics (padding
 * 32, title 34/42, item rows 26/32) multiplied by `scale`, paginated with the
 * shared `paginateMenu`. When content doesn't fit, it cycles through pages every
 * 5s with a left-to-right slide, exactly like the display.
 */
function MenuBlock({
  zone,
  scale,
  catById,
  itemsByCat,
}: {
  zone: LayoutZone;
  scale: number;
  catById: Map<string, Category>;
  itemsByCat: Map<string, Item[]>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [blockPx, setBlockPx] = useState(0);
  const [page, setPage] = useState(0);

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

  const { fixed, pages } = useMemo(() => {
    const simple = zone.categoryIds
      .map((id) => catById.get(id))
      .filter((c): c is Category => !!c && c.isAvailable)
      .map((c) => ({
        id: c.id,
        name: c.name,
        items: (itemsByCat.get(c.id) ?? []).map((it) => ({
          id: it.id,
          name: it.name,
          price: Number(it.price),
        })),
      }))
      .filter((c) => c.items.length > 0);
    const innerDp = blockPx > 0 && scale > 0 ? blockPx / scale - 64 : 0;
    if (innerDp <= 0)
      return { fixed: simple.map((c) => ({ ...c, continued: false })), pages: [] };
    return paginateMenu(simple, innerDp, MENU_METRICS);
  }, [zone.categoryIds, catById, itemsByCat, blockPx, scale]);

  const pageCount = pages.length;
  const current = pageCount > 0 ? pages[Math.min(page, pageCount - 1)]! : [];

  useEffect(() => {
    setPage(0);
  }, [pageCount]);
  useEffect(() => {
    if (pageCount <= 1) return;
    const id = window.setInterval(() => setPage((p) => (p + 1) % pageCount), 5000);
    return () => window.clearInterval(id);
  }, [pageCount]);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden bg-[#0a0a0a] text-left">
      <div className="h-full w-full" style={{ padding: 32 * scale }}>
        {/* Pinned categories — static, never animated. */}
        {fixed.map((pc) => (
          <PreviewCategory key={pc.id} pc={pc} scale={scale} />
        ))}
        {/* Overflowing tail — slides a new page in from the left each interval. */}
        {pageCount > 0 && (
          <div
            key={page}
            style={{ animation: pageCount > 1 ? "imli-slidein 600ms ease-out" : undefined }}
          >
            {current.map((pc) => (
              <PreviewCategory key={`${pc.id}${pc.continued ? "-c" : ""}`} pc={pc} scale={scale} />
            ))}
          </div>
        )}
      </div>
      {pageCount > 1 && (
        <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-sky-600/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
          ↻ {page + 1}/{pageCount}
        </span>
      )}
    </div>
  );
}

function PreviewCategory({ pc, scale }: { pc: MenuPageCategory; scale: number }) {
  return (
    <div style={{ marginBottom: 28 * scale }}>
      <div
        className="overflow-hidden text-ellipsis whitespace-nowrap"
        style={{
          color: "#f5d90a",
          fontWeight: 800,
          fontSize: 34 * scale,
          lineHeight: `${42 * scale}px`,
          marginBottom: 12 * scale,
        }}
      >
        {pc.name}
      </div>
      {pc.items.map((it) => (
        <div
          key={it.id}
          className="flex items-center justify-between"
          style={{ padding: `${8 * scale}px 0`, gap: 8 * scale }}
        >
          {/* Single-line + ellipsis so a long name doesn't wrap — keeping each
              row at MENU_METRICS.itemH, exactly like the TV. */}
          <span
            className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
            style={{ color: "#fff", fontSize: 26 * scale, lineHeight: `${32 * scale}px` }}
          >
            {it.name}
          </span>
          <span
            className="shrink-0 whitespace-nowrap"
            style={{
              color: "#fff",
              fontWeight: 700,
              fontSize: 26 * scale,
              lineHeight: `${32 * scale}px`,
            }}
          >
            ₹{it.price}
          </span>
        </div>
      ))}
    </div>
  );
}
