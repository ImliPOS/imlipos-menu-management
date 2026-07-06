import { Fragment } from "react";
import { frameSpec, type DisplayFrame } from "@imlipos/contracts";

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
    </div>
  );
}
