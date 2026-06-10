import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  PixelRatio,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import * as ScreenOrientation from "expo-screen-orientation";
import { MENU_METRICS, paginateMenu } from "@imlipos/contracts";
import type {
  DeviceContent,
  MenuCategoryView,
  MenuPageCategory,
  ResolvedZone,
} from "@imlipos/contracts";
import {
  fetchDeviceContent,
  heartbeat,
  HttpError,
  reportResolution,
} from "../lib/api";
import { connectSocket, type TvSocket } from "../lib/socket";
import { clearDeviceContent, loadDeviceContent, saveDeviceContent } from "../db/cache";
import { store } from "../lib/storage";
import { sizedImage } from "../lib/image";

/**
 * Renders the display's per-device zone layout. Each zone is positioned by
 * percentage (adapts to any resolution) and renders menu / featured / image /
 * video. Falls back to a full-screen menu zone when no layout is configured.
 */
export function MenuScreen({
  deviceToken,
  screenId,
  onUnpaired,
}: {
  deviceToken: string;
  screenId: string;
  onUnpaired: () => void;
}) {
  const [content, setContent] = useState<DeviceContent | null>(null);
  const [online, setOnline] = useState(true);
  const socketRef = useRef<TvSocket | null>(null);
  // Re-render on rotation changes, but size to the *full physical screen*
  // (Dimensions.screen includes the system-bar area; window excludes it, which
  // left an uncovered stripe on the rotated canvas).
  useWindowDimensions();
  const { width: panelW, height: panelH } = Dimensions.get("screen");

  const unpair = useCallback(async () => {
    await Promise.all([
      store.del("deviceToken"),
      store.del("screenId"),
      store.del("claimToken"),
      store.del("deviceId"),
      clearDeviceContent(),
    ]);
    socketRef.current?.disconnect();
    onUnpaired();
  }, [onUnpaired]);

  const refresh = useCallback(async () => {
    try {
      const fresh = await fetchDeviceContent(deviceToken);
      setContent(fresh);
      setOnline(true);
      await saveDeviceContent(fresh);
    } catch (e) {
      if (e instanceof HttpError && [401, 403, 404].includes(e.status)) {
        await unpair();
        return;
      }
      setOnline(false);
    }
  }, [deviceToken, unpair]);

  const confirmReset = useCallback(() => {
    Alert.alert(
      "Reset this display?",
      "This unpairs it and shows a new pairing code. Other displays keep running.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: () => void unpair() },
      ],
    );
  }, [unpair]);

  useEffect(() => {
    // Full-screen kiosk: no status bar.
    StatusBar.setHidden(true);
    loadDeviceContent().then((snap) => snap && setContent(snap));
    refresh();

    // Report resolution once (pixels).
    const { width, height } = Dimensions.get("screen");
    const scale = PixelRatio.get();
    reportResolution(
      deviceToken,
      Math.round(width * scale),
      Math.round(height * scale),
      scale,
    );

    socketRef.current = connectSocket(deviceToken, screenId, {
      onItemUpdated: () => refresh(),
      onCategoryUpdated: () => refresh(),
      onRefresh: () => refresh(),
      onReassigned: () => refresh(),
      onReconnect: () => {
        setOnline(true);
        refresh();
      },
      onUnpair: () => void unpair(),
    });
    socketRef.current.on("disconnect", () => setOnline(false));

    const hb = setInterval(() => heartbeat(deviceToken), 30_000);
    return () => {
      clearInterval(hb);
      socketRef.current?.disconnect();
    };
  }, [deviceToken, screenId, refresh, unpair]);

  // Lock the panel to the display's configured orientation so a tablet's sensor
  // (e.g. lying flat on a table, where the OS reverts to portrait) can't flip
  // it. On fixed panels that can't rotate (a landscape TV mounted in portrait)
  // the lock is a no-op and the canvas-rotation fallback below still applies.
  const configuredOrientation = content?.orientation;
  useEffect(() => {
    if (!configuredOrientation) return;
    const lock =
      configuredOrientation === "portrait"
        ? ScreenOrientation.OrientationLock.PORTRAIT_UP
        : ScreenOrientation.OrientationLock.LANDSCAPE;
    ScreenOrientation.lockAsync(lock).catch(() => {});
  }, [configuredOrientation]);

  if (!content)
    return (
      <Pressable onLongPress={confirmReset} delayLongPress={2000} style={styles.root}>
        <Text style={styles.dim}>Loading…</Text>
      </Pressable>
    );

  // Paired but nothing configured yet (no layout / no available items). Show a
  // friendly "active" state instead of a blank screen, prompting the operator
  // to set up the layout from the admin.
  const hasContent = content.zones.some((z) => {
    if (z.type === "image" || z.type === "video") return !!z.mediaUrl;
    return (z.categories ?? []).some(
      (c) => c.isAvailable && c.items.some((i) => i.isAvailable),
    );
  });
  if (!hasContent)
    return (
      <Pressable onLongPress={confirmReset} delayLongPress={2000} style={styles.root}>
        <View style={styles.activeWrap}>
          <View style={styles.activeDot} />
          <Text style={styles.activeTitle}>Display active</Text>
          <Text style={styles.activeSubtitle}>
            Start customising your layout for the display.
          </Text>
        </View>
      </Pressable>
    );

  // The panel is physically rotated when the intended orientation (from the
  // screen) doesn't match the panel's actual orientation. In that case we lay
  // the zones out on a swapped (portrait) canvas and rotate the whole thing 90°
  // so it renders upright on the turned display — video and all.
  const wantPortrait = content.orientation === "portrait";
  const panelIsPortrait = panelH > panelW;
  const rotate = wantPortrait !== panelIsPortrait;
  const canvasStyle: ViewStyle = rotate
    ? {
        position: "absolute",
        width: panelH, // logical canvas is the panel, swapped
        height: panelW,
        top: (panelH - panelW) / 2,
        left: (panelW - panelH) / 2,
        transform: [{ rotate: "90deg" }],
      }
    : { flex: 1, position: "relative" };

  return (
    <Pressable onLongPress={confirmReset} delayLongPress={2000} style={styles.root}>
      {!online && (
        <View style={styles.offline}>
          <Text style={styles.offlineText}>OFFLINE — showing last menu</Text>
        </View>
      )}
      <View style={canvasStyle}>
        {content.zones.map((z) => (
          <View
            key={z.id}
            style={[
              {
                position: "absolute",
                left: `${z.x}%`,
                top: `${z.y}%`,
                width: `${z.w}%`,
                height: `${z.h}%`,
              },
              menuDivider(z, content.zones),
            ]}
          >
            <Zone zone={z} />
          </View>
        ))}
      </View>
    </Pressable>
  );
}

function Zone({ zone }: { zone: ResolvedZone }) {
  if (zone.type === "image") {
    return zone.mediaUrl ? (
      <Image
        source={{ uri: sizedImage(zone.mediaUrl, 960) }}
        style={styles.fill}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={200}
      />
    ) : (
      <View style={styles.placeholder} />
    );
  }

  if (zone.type === "video") {
    return zone.mediaUrl ? (
      <VideoZone uri={zone.mediaUrl} />
    ) : (
      <View style={styles.placeholder} />
    );
  }

  if (zone.type === "featured") {
    const imgs = (zone.categories ?? [])
      .filter((c) => c.isAvailable)
      .flatMap((c) => c.items.filter((i) => i.isAvailable && i.isFeatured && i.mediaUrl));
    return (
      <View style={styles.zonePad}>
        <View style={styles.featColumn}>
          {imgs.map((it) => (
            <View key={it.id} style={styles.featCard}>
              <Image
                source={{ uri: sizedImage(it.mediaUrl, 480) }}
                style={styles.fill}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
              />
            </View>
          ))}
        </View>
      </View>
    );
  }

  // menu
  const cats = (zone.categories ?? []).filter(
    (c) => c.isAvailable && c.items.some((i) => i.isAvailable),
  );
  return <PagedMenu cats={cats} />;
}

// Two menu blocks sitting edge-to-edge read as one continuous menu. Draw a
// clear divider on a menu zone's right/bottom edge when the block touching it
// there is *also* a menu. Each shared edge is "owned" by the left/top zone, so
// the line is drawn exactly once (never against image/video blocks).
const DIVIDER_W = 2;
const DIVIDER_COLOR = "#52525b";
function menuDivider(zone: ResolvedZone, zones: ResolvedZone[]): ViewStyle | null {
  if (zone.type !== "menu") return null;
  const EPS = 0.5; // percentage tolerance for "touching" edges
  const aRight = zone.x + zone.w;
  const aBottom = zone.y + zone.h;
  let borderRightWidth = 0;
  let borderBottomWidth = 0;
  for (const b of zones) {
    if (b === zone || b.type !== "menu") continue;
    const vOverlap = Math.min(aBottom, b.y + b.h) - Math.max(zone.y, b.y) > EPS;
    const hOverlap = Math.min(aRight, b.x + b.w) - Math.max(zone.x, b.x) > EPS;
    if (vOverlap && Math.abs(aRight - b.x) < EPS) borderRightWidth = DIVIDER_W;
    if (hOverlap && Math.abs(aBottom - b.y) < EPS) borderBottomWidth = DIVIDER_W;
  }
  if (!borderRightWidth && !borderBottomWidth) return null;
  return { borderColor: DIVIDER_COLOR, borderRightWidth, borderBottomWidth };
}

// Looping, muted, auto-playing background video. expo-av's <Video> was removed
// from Expo Go (SDK 54+); expo-video is the supported replacement.
function VideoZone({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <VideoView
      style={styles.fill}
      player={player}
      contentFit="cover"
      nativeControls={false}
      allowsPictureInPicture={false}
    />
  );
}

// Renders a menu block. Categories that fully fit are pinned statically at the
// top; the first one that overflows (and anything after it) auto-pages through
// the leftover space, sliding the next page in from the left every 5s, so every
// item is shown over time while the pinned categories stay put. Layout comes
// from the shared paginateMenu so the editor preview matches exactly.
const PAGE_INTERVAL_MS = 5000;
function PagedMenu({ cats }: { cats: MenuCategoryView[] }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [page, setPage] = useState(0);
  const x = useRef(new Animated.Value(0)).current;

  const { fixed, pages } = useMemo(() => {
    const simple = cats.map((c) => ({
      id: c.id,
      name: c.name,
      items: c.items
        .filter((i) => i.isAvailable)
        .map((i) => ({ id: i.id, name: i.name, price: i.price })),
    }));
    if (size.h <= 0)
      return { fixed: simple.map((c) => ({ ...c, continued: false })), pages: [] };
    return paginateMenu(simple, size.h, MENU_METRICS);
  }, [cats, size.h]);

  const pageCount = pages.length;
  const current = pageCount > 0 ? pages[Math.min(page, pageCount - 1)]! : [];

  useEffect(() => {
    setPage(0);
  }, [pageCount]);

  // Advance every interval — only when there's more than one page.
  useEffect(() => {
    if (pageCount <= 1) return;
    const id = setInterval(() => setPage((p) => (p + 1) % pageCount), PAGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [pageCount]);

  // Slide the new page in from the left edge → content flows left-to-right.
  useEffect(() => {
    if (pageCount <= 1) {
      x.setValue(0);
      return;
    }
    x.setValue(-(size.w || 300));
    Animated.timing(x, { toValue: 0, duration: 600, useNativeDriver: true }).start();
  }, [page, size.w, pageCount, x]);

  return (
    <View
      style={styles.zonePad}
      onLayout={(e) => {
        // Content area = the zone minus its 32dp padding on each side.
        const w = e.nativeEvent.layout.width - 64;
        const h = e.nativeEvent.layout.height - 64;
        setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
      }}
    >
      {/* Pinned categories — static, never animated. */}
      {fixed.map((pc) => (
        <MenuCategoryRows key={pc.id} pc={pc} />
      ))}
      {/* Overflowing tail — slides a new page in from the left each interval. */}
      {pageCount > 0 && (
        <View style={styles.pagedViewport}>
          <Animated.View style={{ transform: [{ translateX: x }] }}>
            {current.map((pc) => (
              <MenuCategoryRows key={`${pc.id}${pc.continued ? "-c" : ""}`} pc={pc} />
            ))}
          </Animated.View>
        </View>
      )}
    </View>
  );
}

function MenuCategoryRows({ pc }: { pc: MenuPageCategory }) {
  return (
    <View style={styles.category}>
      <Text style={styles.catTitle} numberOfLines={1}>
        {pc.name}
      </Text>
      {pc.items.map((it) => (
        <View key={it.id} style={styles.row}>
          {/* Single-line, ellipsised — a wrapped name would make the row taller
              than MENU_METRICS.itemH and the metric-based pagination would then
              overflow the zone, clipping the bottom rows on the real display. */}
          <Text style={styles.item} numberOfLines={1}>
            {it.name}
          </Text>
          <Text style={styles.price} numberOfLines={1}>
            ₹{it.price}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0a" },
  canvas: { flex: 1, position: "relative" },
  fill: { width: "100%", height: "100%", backgroundColor: "#161616" },
  placeholder: { width: "100%", height: "100%", backgroundColor: "#161616" },
  dim: { color: "#888", fontSize: 28, padding: 48 },

  activeWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  activeDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#22c55e", marginBottom: 20 },
  activeTitle: { color: "#fff", fontSize: 48, fontWeight: "800", marginBottom: 12 },
  activeSubtitle: { color: "#9ca3af", fontSize: 24, textAlign: "center" },

  zonePad: { flex: 1, padding: 32 },
  category: { marginBottom: 28 },
  // Clips the sliding page during the paged-menu transition.
  pagedViewport: { flex: 1, overflow: "hidden" },
  catTitle: {
    color: "#f5d90a",
    fontSize: 34,
    lineHeight: 42,
    fontWeight: "800",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  // flexShrink lets a long name ellipsise instead of pushing the price off-row.
  item: { flexShrink: 1, color: "#fff", fontSize: 26, lineHeight: 32 },
  price: { flexShrink: 0, color: "#fff", fontSize: 26, lineHeight: 32, fontWeight: "700" },

  featColumn: { flex: 1, gap: 16 },
  featCard: { flex: 1, minHeight: 0, borderRadius: 16, overflow: "hidden" },

  offline: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#7f1d1d",
    padding: 8,
  },
  offlineText: { color: "#fff", textAlign: "center", fontSize: 18 },
});
