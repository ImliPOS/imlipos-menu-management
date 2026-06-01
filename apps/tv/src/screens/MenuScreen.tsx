import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { ScreenContent } from "@imlipos/contracts";
import { fetchScreenContent, heartbeat } from "../lib/api";
import { connectSocket, type TvSocket } from "../lib/socket";
import { loadSnapshot, saveSnapshot } from "../db/cache";

/**
 * The live menu board. Renders from cache instantly, fetches authoritative
 * content, subscribes to its screen room, and applies sold-out toggles in
 * real time. On reconnect it re-fetches (fetch-then-subscribe).
 */
export function MenuScreen({
  deviceToken,
  screenId,
}: {
  deviceToken: string;
  screenId: string;
}) {
  const [content, setContent] = useState<ScreenContent | null>(null);
  const [online, setOnline] = useState(true);
  const socketRef = useRef<TvSocket | null>(null);

  const refresh = useCallback(async () => {
    try {
      const fresh = await fetchScreenContent(screenId, deviceToken);
      setContent(fresh);
      setOnline(true);
      await saveSnapshot(fresh);
    } catch {
      setOnline(false);
    }
  }, [screenId, deviceToken]);

  useEffect(() => {
    // 1. Instant render from cache.
    loadSnapshot(screenId).then((snap) => snap && setContent(snap));
    // 2. Fetch authoritative, then subscribe.
    refresh();

    socketRef.current = connectSocket(deviceToken, screenId, {
      onItemUpdated: (itemId, isAvailable) =>
        setContent((c) => applyItem(c, itemId, isAvailable)),
      onCategoryUpdated: (categoryId, isAvailable) =>
        setContent((c) => applyCategory(c, categoryId, isAvailable)),
      onRefresh: refresh,
      onReassigned: () => refresh(),
      onReconnect: () => {
        setOnline(true);
        refresh();
      },
    });
    socketRef.current.on("disconnect", () => setOnline(false));

    const hb = setInterval(() => heartbeat(deviceToken), 30_000);
    return () => {
      clearInterval(hb);
      socketRef.current?.disconnect();
    };
  }, [deviceToken, screenId, refresh]);

  // Persist whenever content changes from a live event.
  useEffect(() => {
    if (content) saveSnapshot(content).catch(() => {});
  }, [content]);

  if (!content) return <View style={styles.root}><Text style={styles.dim}>Loading…</Text></View>;

  return (
    <View style={styles.root}>
      {!online && <View style={styles.offline}><Text style={styles.offlineText}>OFFLINE — showing last menu</Text></View>}
      <FlatList
        data={content.categories.filter(
          (c) => c.isAvailable && c.items.some((i) => i.isAvailable),
        )}
        keyExtractor={(c) => c.id}
        renderItem={({ item: cat }) => (
          <View style={styles.category}>
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
        )}
      />
    </View>
  );
}

function applyItem(c: ScreenContent | null, itemId: string, isAvailable: boolean) {
  if (!c) return c;
  return {
    ...c,
    categories: c.categories.map((cat) => ({
      ...cat,
      items: cat.items.map((i) => (i.id === itemId ? { ...i, isAvailable } : i)),
    })),
  };
}
function applyCategory(c: ScreenContent | null, categoryId: string, isAvailable: boolean) {
  if (!c) return c;
  return {
    ...c,
    categories: c.categories.map((cat) =>
      cat.id === categoryId ? { ...cat, isAvailable } : cat,
    ),
  };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0a", padding: 48 },
  dim: { color: "#888", fontSize: 28 },
  category: { marginBottom: 40 },
  catTitle: { color: "#f5d90a", fontSize: 40, fontWeight: "800", marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  item: { color: "#fff", fontSize: 30 },
  price: { color: "#fff", fontSize: 30, fontWeight: "700" },
  soldOut: { color: "#666", textDecorationLine: "line-through" },
  offline: { backgroundColor: "#7f1d1d", padding: 8, marginBottom: 16, borderRadius: 8 },
  offlineText: { color: "#fff", textAlign: "center", fontSize: 18 },
});
