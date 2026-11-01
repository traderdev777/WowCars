/**
 * WowCars — Unified Database Persistence Layer
 * Provides explicit adapter selection between MySqlStore (production) and DatabaseStore (file fallback).
 *
 * Safety Invariant:
 * If DB_ADAPTER === "mysql", the application strictly requires MySQL connectivity.
 * It will NOT silently fall back to JSON storage if MySQL is unconfigured or unreachable.
 */

import { DatabaseAdapter } from "./adapter";
import { DatabaseStore } from "./store";
import { MySqlStore } from "./mysqlStore";

function initializeDatabaseAdapter(): DatabaseAdapter {
  const explicitAdapter = (process.env.DB_ADAPTER || "").toLowerCase().trim();

  // Explicit MySQL Selection
  if (explicitAdapter === "mysql") {
    try {
      return new MySqlStore();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("\n❌ [FATAL DATABASE ERROR] Explicit DB_ADAPTER='mysql' failed to initialize:\n", msg);
      throw err;
    }
  }

  // Automatic Production MySQL Detection
  if (process.env.NODE_ENV === "production" && (process.env.MYSQL_DATABASE || process.env.MYSQL_HOST)) {
    try {
      return new MySqlStore();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("\n❌ [FATAL DATABASE ERROR] Production MySQL environment detected but failed to initialize:\n", msg);
      throw err;
    }
  }

  // Explicit File Adapter or Default Development Mode
  if (explicitAdapter && explicitAdapter !== "file") {
    throw new Error(
      `Unsupported DB_ADAPTER: "${explicitAdapter}". Supported adapters are 'mysql' or 'file'.`
    );
  }

  return new DatabaseStore();
}

export const db: DatabaseAdapter = initializeDatabaseAdapter();
export * from "./types";
export * from "./adapter";
export { DatabaseStore } from "./store";
export { MySqlStore } from "./mysqlStore";
