import * as SQLite from "expo-sqlite";
import type { DeviceContent, ScreenContent } from "@imlipos/contracts";

/**
 * Offline cache: store the last good ScreenContent snapshot so the menu keeps
 * rendering if the network drops. We keep it simple — one JSON blob keyed by
 * screenId plus the version, which is plenty for a display client.
 */
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("imlipos.db").then(async (db) => {
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS snapshot (
           screen_id TEXT PRIMARY KEY,
           version INTEGER NOT NULL,
           json TEXT NOT NULL
         );
         CREATE TABLE IF NOT EXISTS device_snapshot (
           id TEXT PRIMARY KEY,
           json TEXT NOT NULL
         );`,
      );
      return db;
    });
  }
  return dbPromise;
}

export async function saveSnapshot(content: ScreenContent): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO snapshot (screen_id, version, json) VALUES (?, ?, ?)
     ON CONFLICT(screen_id) DO UPDATE SET version=excluded.version, json=excluded.json;`,
    content.screen.id,
    content.version,
    JSON.stringify(content),
  );
}

export async function clearSnapshot(screenId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM snapshot WHERE screen_id = ?;`, screenId);
}

/** ---- Device (zone-layout) content cache — one row per device ('self'). ---- */
export async function saveDeviceContent(content: DeviceContent): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO device_snapshot (id, json) VALUES ('self', ?)
     ON CONFLICT(id) DO UPDATE SET json=excluded.json;`,
    JSON.stringify(content),
  );
}

export async function loadDeviceContent(): Promise<DeviceContent | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ json: string }>(
    `SELECT json FROM device_snapshot WHERE id = 'self';`,
  );
  return row ? (JSON.parse(row.json) as DeviceContent) : null;
}

export async function clearDeviceContent(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM device_snapshot WHERE id = 'self';`);
}

export async function loadSnapshot(
  screenId: string,
): Promise<ScreenContent | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ json: string }>(
    `SELECT json FROM snapshot WHERE screen_id = ?;`,
    screenId,
  );
  return row ? (JSON.parse(row.json) as ScreenContent) : null;
}
