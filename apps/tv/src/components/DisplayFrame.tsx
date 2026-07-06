import { View, type ViewStyle } from "react-native";
import { frameSpec, type DisplayFrame as DisplayFrameId } from "@imlipos/contracts";

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

  return (
    <View
      pointerEvents="none"
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
