import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getHardwareId, store } from "../lib/storage";
import { pollStatus, registerDevice } from "../lib/api";

/**
 * Shown when the TV has no device token. Displays a 6-digit code and polls
 * until the owner claims it in the web admin, then hands back the device token.
 */
export function PairingScreen({
  onPaired,
}: {
  onPaired: (deviceToken: string, screenId: string) => void;
}) {
  const [code, setCode] = useState<string>("------");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hardwareId = await getHardwareId();
        const reg = await registerDevice(hardwareId);
        if (cancelled) return;
        setCode(reg.pairingCode);
        await store.set("deviceId", reg.deviceId);
        await store.set("claimToken", reg.claimToken);

        timer.current = setInterval(async () => {
          try {
            const status = await pollStatus(reg.deviceId, reg.claimToken);
            if (status.status === "active" && status.deviceToken && status.screenId) {
              if (timer.current) clearInterval(timer.current);
              await store.set("deviceToken", status.deviceToken);
              await store.set("screenId", status.screenId);
              onPaired(status.deviceToken, status.screenId);
            }
          } catch {
            /* keep polling */
          }
        }, 3000);
      } catch {
        setError("Could not reach the server. Retrying…");
        setTimeout(() => setError(null), 4000);
      }
    })();
    return () => {
      cancelled = true;
      if (timer.current) clearInterval(timer.current);
    };
  }, [onPaired]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Pair this screen</Text>
      <Text style={styles.subtitle}>
        In the ImliPos admin, open Screens → Pair a TV and enter:
      </Text>
      <Text style={styles.code}>{code}</Text>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0a0a0a" },
  title: { color: "#fff", fontSize: 40, fontWeight: "700", marginBottom: 16 },
  subtitle: { color: "#bbb", fontSize: 22, marginBottom: 32 },
  code: { color: "#fff", fontSize: 96, fontWeight: "800", letterSpacing: 16 },
  error: { color: "#f87171", fontSize: 20, marginTop: 24 },
});
