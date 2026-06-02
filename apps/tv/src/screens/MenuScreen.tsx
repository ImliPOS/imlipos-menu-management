import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  PixelRatio,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Video, ResizeMode } from "expo-av";
import type { DeviceContent, ResolvedZone } from "@imlipos/contracts";
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
    loadDeviceContent().then((snap) => snap && setContent(snap));
    refresh();

    // Report resolution once (pixels).
    const { width, height } = Dimensions.get("screen");
    const scale = PixelRatio.get();
    reportResolution(deviceToken, Math.round(width * scale), Math.round(height * scale));

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

  if (!content)
    return (
      <Pressable onLongPress={confirmReset} delayLongPress={2000} style={styles.root}>
        <Text style={styles.dim}>Loading…</Text>
      </Pressable>
    );

  return (
    <Pressable onLongPress={confirmReset} delayLongPress={2000} style={styles.root}>
      {!online && (
        <View style={styles.offline}>
          <Text style={styles.offlineText}>OFFLINE — showing last menu</Text>
        </View>
      )}
      <View style={styles.canvas}>
        {content.zones.map((z) => (
          <View
            key={z.id}
            style={{
              position: "absolute",
              left: `${z.x}%`,
              top: `${z.y}%`,
              width: `${z.w}%`,
              height: `${z.h}%`,
            }}
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
      <Video
        source={{ uri: zone.mediaUrl }}
        style={styles.fill}
        resizeMode={ResizeMode.COVER}
        isLooping
        shouldPlay
        isMuted
      />
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
  return (
    <View style={styles.zonePad}>
      {cats.map((cat) => (
        <View key={cat.id} style={styles.category}>
          <Text style={styles.catTitle}>{cat.name}</Text>
          {cat.items
            .filter((it) => it.isAvailable)
            .map((it) => (
              <View key={it.id} style={styles.row}>
                <Text style={styles.item}>{it.name}</Text>
                <Text style={styles.price}>₹{it.price}</Text>
              </View>
            ))}
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

  zonePad: { flex: 1, padding: 32 },
  category: { marginBottom: 28 },
  catTitle: { color: "#f5d90a", fontSize: 34, fontWeight: "800", marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  item: { color: "#fff", fontSize: 26 },
  price: { color: "#fff", fontSize: 26, fontWeight: "700" },

  featColumn: { flex: 1, gap: 16 },
  featCard: { flex: 1, minHeight: 0, borderRadius: 16, overflow: "hidden" },

  offline: { backgroundColor: "#7f1d1d", padding: 8 },
  offlineText: { color: "#fff", textAlign: "center", fontSize: 18 },
});
