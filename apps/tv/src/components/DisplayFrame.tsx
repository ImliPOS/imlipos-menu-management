import { useState } from "react";
import { View, type ImageStyle, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import {
  frameSpec,
  type DisplayFrame as DisplayFrameId,
  type FrameOrnamentId,
} from "@imlipos/contracts";

// Ornament artwork, rendered from the web's SVG masters by
// scripts/render-frame-ornaments.mjs. White on transparent, tinted at runtime.
const ORNAMENT_IMAGES: Record<FrameOrnamentId, number> = {
  "floral-corner": require("../../assets/frames/floral-corner.png"),
  "crest-corner": require("../../assets/frames/crest-corner.png"),
  "crest-centre": require("../../assets/frames/crest-centre.png"),
  "swirl-corner": require("../../assets/frames/swirl-corner.png"),
};

/**
 * Decorative border drawn over the whole display canvas on the panel. Cosmetic
 * and non-interactive (pointerEvents="none"). Geometry comes from the shared
 * frameSpec() — all distances in dp, anchored to the screen edge — so it matches
 * the web editor preview and hugs the border without crossing menu content.
 * Rendered in the category-heading colour.
 */
export function DisplayFrame({
  frame,
  color,
  background,
}: {
  frame: DisplayFrameId;
  color: string;
  /** Display background — used to erase border corners under diamond accents. */
  background: string;
}) {
  // Canvas width — edge-centre ornaments and centre-broken lines are placed
  // from it. Measured, since the canvas may be rotated for portrait panels.
  const [width, setWidth] = useState(0);
  if (frame === "none") return null;
  const spec = frameSpec(frame);

  const corners: Array<{ v: "top" | "bottom"; h: "left" | "right" }> = [
    { v: "top", h: "left" },
    { v: "top", h: "right" },
    { v: "bottom", h: "left" },
    { v: "bottom", h: "right" },
  ];

  const parts: React.ReactNode[] = [];

  spec.rects.forEach((r, i) => {
    parts.push(
      <View
        key={`rect-${i}`}
        style={{
          position: "absolute",
          top: r.t,
          left: r.l,
          right: r.r,
          bottom: r.b,
          borderWidth: r.weight,
          borderColor: color,
          borderRadius: r.radius,
        }}
      />,
    );
  });

  spec.corners.forEach((c, i) => {
    const s = c.size;
    const paint = c.color === "background" ? background : color;
    corners.forEach((k) => {
      const style: ViewStyle = {
        position: "absolute",
        width: s,
        height: s,
        backgroundColor: c.fill ? paint : "transparent",
        borderWidth: c.fill ? 0 : (c.weight ?? 1),
        borderColor: paint,
      };
      // Only attach `transform` when we actually rotate — passing `undefined`
      // gets normalised to `null`, which crashes RN's transform validation.
      if (c.rotate) style.transform = [{ rotate: "45deg" }];
      if (k.v === "top") {
        style.top = c.inset;
        style.marginTop = -s / 2;
      } else {
        style.bottom = c.inset;
        style.marginBottom = -s / 2;
      }
      if (k.h === "left") {
        style.left = c.inset;
        style.marginLeft = -s / 2;
      } else {
        style.right = c.inset;
        style.marginRight = -s / 2;
      }
      parts.push(<View key={`corner-${i}-${k.v}${k.h}`} style={style} />);
    });
  });

  spec.brackets.forEach((b, i) => {
    corners.forEach((k) => {
      const legBase: ViewStyle = { position: "absolute", backgroundColor: color };
      const hLeg: ViewStyle = { ...legBase, width: b.arm, height: b.weight };
      const vLeg: ViewStyle = { ...legBase, width: b.weight, height: b.arm };
      if (k.v === "top") {
        hLeg.top = b.inset;
        vLeg.top = b.inset;
      } else {
        hLeg.bottom = b.inset;
        vLeg.bottom = b.inset;
      }
      if (k.h === "left") {
        hLeg.left = b.inset;
        vLeg.left = b.inset;
      } else {
        hLeg.right = b.inset;
        vLeg.right = b.inset;
      }
      parts.push(
        <View key={`bracket-${i}-${k.v}${k.h}-h`} style={hLeg} />,
        <View key={`bracket-${i}-${k.v}${k.h}-v`} style={vLeg} />,
      );
    });
  });

  (spec.rules ?? []).forEach((r, i) => {
    const half = r.weight / 2;
    const line = (key: string, style: ViewStyle) =>
      parts.push(
        <View
          key={`rule-${i}-${key}`}
          style={{ position: "absolute", backgroundColor: color, ...style }}
        />,
      );
    // Left and right edges run between the corner gaps.
    line("l", { left: r.inset - half, top: r.gap, bottom: r.gap, width: r.weight });
    line("r", { right: r.inset - half, top: r.gap, bottom: r.gap, width: r.weight });
    for (const v of ["top", "bottom"] as const) {
      const edge = { [v]: r.inset - half, height: r.weight };
      if (!r.centreGap) {
        line(v, { ...edge, left: r.gap, right: r.gap });
      } else if (width > 0) {
        // Broken around the centre for an edge-centre ornament.
        const inner = width / 2 - r.centreGap / 2;
        line(`${v}-a`, { ...edge, left: r.gap, width: Math.max(0, inner - r.gap) });
        line(`${v}-b`, { ...edge, right: r.gap, width: Math.max(0, inner - r.gap) });
      }
    }
  });

  (spec.ornaments ?? []).forEach((o, i) => {
    const img = (key: string, pos: ImageStyle, flipX: boolean, flipY: boolean) => {
      const style: ImageStyle = { position: "absolute", width: o.w, height: o.h, ...pos };
      // Only attach `transform` when flipping (an undefined transform crashes RN).
      const flips = [
        ...(flipX ? [{ scaleX: -1 }] : []),
        ...(flipY ? [{ scaleY: -1 }] : []),
      ];
      if (flips.length) style.transform = flips;
      parts.push(
        <Image
          key={`orn-${i}-${key}`}
          source={ORNAMENT_IMAGES[o.asset]}
          tintColor={color}
          contentFit="fill"
          style={style}
        />,
      );
    };
    if (o.place === "corners") {
      corners.forEach((k) =>
        img(`${k.v}${k.h}`, { [k.v]: 0, [k.h]: 0 }, k.h === "right", k.v === "bottom"),
      );
    } else if (width > 0) {
      const left = width / 2 - o.w / 2;
      img("top", { top: 0, left }, false, false);
      img("bottom", { bottom: 0, left }, false, true);
    }
  });

  return (
    <View
      pointerEvents="none"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
      }}
    >
      {parts}
    </View>
  );
}
