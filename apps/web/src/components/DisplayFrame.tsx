import { Fragment, type CSSProperties } from "react";
import { frameSpec, type DisplayFrame, type FrameOrnamentId } from "@imlipos/contracts";

/** Ornament artwork drawn in the frame colour: the white-on-transparent SVG
 *  (public/frames — the same masters the TV's PNGs are rendered from) is used
 *  as a mask over a solid colour fill. */
function ornamentStyle(asset: FrameOrnamentId, color: string): CSSProperties {
  const url = `url(/frames/${asset}.svg)`;
  return {
    backgroundColor: color,
    maskImage: url,
    WebkitMaskImage: url,
    maskSize: "100% 100%",
    WebkitMaskSize: "100% 100%",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
  };
}

/**
 * Decorative border drawn over the whole preview canvas. Purely cosmetic and
 * click-through (pointer-events: none) so blocks stay selectable underneath.
 * Geometry comes from the shared frameSpec() — all distances in dp, anchored to
 * the screen edge — so it matches the TV render and hugs the border without
 * crossing menu content.
 *
 * `scale` is the preview's px-per-dp (the value MenuBlock uses); dp distances are
 * multiplied by it so the frame is proportioned like it will be on the panel.
 */
export function DisplayFrame({
  frame,
  color,
  background,
  scale,
}: {
  frame: DisplayFrame;
  color: string;
  /** Display background — used to erase border corners under diamond accents. */
  background: string;
  scale: number;
}) {
  if (frame === "none") return null;
  const spec = frameSpec(frame);
  const unit = scale > 0 ? scale : 0.3; // fall back before the canvas is measured
  const u = (dp: number) => Math.max(1, dp * unit);

  // Each corner: which two edges it anchors to.
  const corners: Array<{ v: "top" | "bottom"; h: "left" | "right" }> = [
    { v: "top", h: "left" },
    { v: "top", h: "right" },
    { v: "bottom", h: "left" },
    { v: "bottom", h: "right" },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {spec.rects.map((r, i) => (
        <div
          key={`rect-${i}`}
          className="absolute"
          style={{
            top: u(r.t),
            left: u(r.l),
            right: u(r.r),
            bottom: u(r.b),
            border: `${u(r.weight)}px solid ${color}`,
            borderRadius: r.radius ? u(r.radius) : undefined,
          }}
        />
      ))}

      {spec.corners.map((c, i) => {
        const s = u(c.size);
        const paint = c.color === "background" ? background : color;
        return (
          <Fragment key={`corner-${i}`}>
            {corners.map((k) => (
              <div
                key={`${k.v}${k.h}`}
                className="absolute"
                style={{
                  [k.v]: u(c.inset),
                  [k.h]: u(c.inset),
                  width: s,
                  height: s,
                  [`margin${k.v === "top" ? "Top" : "Bottom"}`]: -s / 2,
                  [`margin${k.h === "left" ? "Left" : "Right"}`]: -s / 2,
                  transform: c.rotate ? "rotate(45deg)" : undefined,
                  backgroundColor: c.fill ? paint : "transparent",
                  border: c.fill
                    ? undefined
                    : `${u(c.weight ?? 1)}px solid ${paint}`,
                }}
              />
            ))}
          </Fragment>
        );
      })}

      {spec.brackets.map((b, i) => {
        const w = u(b.weight);
        const arm = u(b.arm);
        const inset = u(b.inset);
        return (
          <Fragment key={`bracket-${i}`}>
            {corners.map((k) => (
              <Fragment key={`${k.v}${k.h}`}>
                {/* horizontal leg */}
                <div
                  className="absolute"
                  style={{
                    [k.v]: inset,
                    [k.h]: inset,
                    width: arm,
                    height: w,
                    backgroundColor: color,
                  }}
                />
                {/* vertical leg */}
                <div
                  className="absolute"
                  style={{
                    [k.v]: inset,
                    [k.h]: inset,
                    width: w,
                    height: arm,
                    backgroundColor: color,
                  }}
                />
              </Fragment>
            ))}
          </Fragment>
        );
      })}

      {(spec.rules ?? []).map((r, i) => {
        const w = u(r.weight);
        const at = u(r.inset) - w / 2;
        const gap = u(r.gap);
        const line = (key: string, style: CSSProperties) => (
          <div key={key} className="absolute" style={{ backgroundColor: color, ...style }} />
        );
        const half = r.centreGap ? u(r.centreGap) / 2 : 0;
        return (
          <Fragment key={`rule-${i}`}>
            {line("l", { left: at, top: gap, bottom: gap, width: w })}
            {line("r", { right: at, top: gap, bottom: gap, width: w })}
            {(["top", "bottom"] as const).map((v) =>
              r.centreGap ? (
                <Fragment key={v}>
                  {/* Broken around the centre for an edge-centre ornament. */}
                  {line(`${v}-a`, { [v]: at, height: w, left: gap, right: `calc(50% + ${half}px)` })}
                  {line(`${v}-b`, { [v]: at, height: w, right: gap, left: `calc(50% + ${half}px)` })}
                </Fragment>
              ) : (
                line(v, { [v]: at, height: w, left: gap, right: gap })
              ),
            )}
          </Fragment>
        );
      })}

      {(spec.ornaments ?? []).map((o, i) => {
        const w = u(o.w);
        const h = u(o.h);
        const art = ornamentStyle(o.asset, color);
        const flip = (x: boolean, y: boolean) =>
          x || y ? `scale(${x ? -1 : 1}, ${y ? -1 : 1})` : undefined;
        return (
          <Fragment key={`orn-${i}`}>
            {o.place === "corners"
              ? corners.map((k) => (
                  <div
                    key={`${k.v}${k.h}`}
                    className="absolute"
                    style={{
                      ...art,
                      [k.v]: 0,
                      [k.h]: 0,
                      width: w,
                      height: h,
                      transform: flip(k.h === "right", k.v === "bottom"),
                    }}
                  />
                ))
              : (["top", "bottom"] as const).map((v) => (
                  <div
                    key={v}
                    className="absolute"
                    style={{
                      ...art,
                      [v]: 0,
                      left: `calc(50% - ${w / 2}px)`,
                      width: w,
                      height: h,
                      transform: flip(false, v === "bottom"),
                    }}
                  />
                ))}
          </Fragment>
        );
      })}
    </div>
  );
}
