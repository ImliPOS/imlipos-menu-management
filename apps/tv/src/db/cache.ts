import * as SQLite from "expo-sqlite";
import type { ScreenContent } from "@imlipos/contracts";

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
