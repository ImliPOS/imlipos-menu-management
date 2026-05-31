import Constants from "expo-constants";

/**
 * Resolve the API base URL.
 *
 * On a physical device, `localhost` / `10.0.2.2` don't point at your dev
 * machine — but Expo already loaded the JS bundle from your machine's LAN IP,
 * so we reuse that host and just swap the port to the API's (4000).
 *
 * Priority:
 *   1. EXPO_PUBLIC_API_URL (explicit override, e.g. a deployed API)
 *   2. The Expo dev server host (LAN IP) + API port
 *   3. 10.0.2.2 fallback (Android emulator → host)
 */
const API_PORT = 4000;

function devServerHost(): string | null {
  // e.g. "192.168.1.5:8081"
  const hostUri =
    Constants.expoConfig?.hostUri ??
    // older field, still present in some runtimes
    (Constants as any).expoGoConfig?.debuggerHost ??
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;
  if (!hostUri) return null;
  return hostUri.split(":")[0] || null;
}

function resolveApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host = devServerHost();
  if (host) return `http://${host}:${API_PORT}`;
  return `http://10.0.2.2:${API_PORT}`;
}

export const API_URL = resolveApiUrl();
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? API_URL;
