import * as SecureStore from "expo-secure-store";

/** Long-lived secrets the TV holds: device token + identity for pairing. */
const KEYS = {
  deviceToken: "imlipos.deviceToken",
  deviceId: "imlipos.deviceId",
  claimToken: "imlipos.claimToken",
  screenId: "imlipos.screenId",
  hardwareId: "imlipos.hardwareId",
  // Id of the last OTA update we attempted — so a failed update is never
  // re-applied in a loop (see MenuScreen's auto-update effect).
  otaTriedId: "imlipos.otaTriedId",
} as const;

export const store = {
  get: (k: keyof typeof KEYS) => SecureStore.getItemAsync(KEYS[k]),
  set: (k: keyof typeof KEYS, v: string) => SecureStore.setItemAsync(KEYS[k], v),
  del: (k: keyof typeof KEYS) => SecureStore.deleteItemAsync(KEYS[k]),
};

/** Stable per-install hardware id used during registration. */
export async function getHardwareId(): Promise<string> {
  let id = await store.get("hardwareId");
  if (!id) {
    id = `tv_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    await store.set("hardwareId", id);
  }
  return id;
}
