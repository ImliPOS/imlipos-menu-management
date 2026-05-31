import type {
  DeviceStatusResponse,
  RegisterDeviceResponse,
  ScreenContent,
} from "@imlipos/contracts";
import { API_URL } from "./config";

/** Step 1 — self-register, get a pairing code + claim token. */
export async function registerDevice(
  hardwareId: string,
): Promise<RegisterDeviceResponse> {
  const res = await fetch(`${API_URL}/devices/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hardwareId }),
  });
  if (!res.ok) throw new Error("register failed");
  return res.json();
}

/** Step 3 — poll status with the claim token until active, then get the token. */
export async function pollStatus(
  deviceId: string,
  claimToken: string,
): Promise<DeviceStatusResponse> {
  const res = await fetch(`${API_URL}/devices/${deviceId}/status`, {
    headers: { "x-claim-token": claimToken },
  });
  if (!res.ok) throw new Error("status failed");
  return res.json();
}

/** Fetch authoritative content for the bound screen (boot + on reconnect). */
export async function fetchScreenContent(
  screenId: string,
  deviceToken: string,
): Promise<ScreenContent> {
  const res = await fetch(`${API_URL}/screens/${screenId}/content`, {
    headers: { Authorization: `Bearer ${deviceToken}` },
  });
  if (!res.ok) throw new Error("content failed");
  return res.json();
}

export async function heartbeat(deviceToken: string): Promise<void> {
  await fetch(`${API_URL}/devices/heartbeat`, {
    method: "POST",
    headers: { Authorization: `Bearer ${deviceToken}` },
  }).catch(() => {});
}
