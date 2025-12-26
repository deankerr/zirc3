import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { messages, networkConfigs } from "./schema";

export * from "./messages";
export * from "./networks";
export * from "./schema";

// * Create a database connection with bun:sqlite
export function createDatabase(path: string) {
  // Ensure directory exists
  mkdirSync(dirname(path), { recursive: true });

  const sqlite = new Database(path, { create: true });

  // Enable WAL mode for better concurrency
  sqlite.run("PRAGMA journal_mode = WAL");
  sqlite.run("PRAGMA synchronous = NORMAL");

  // * Create tables if they don't exist
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      network TEXT NOT NULL,
      target TEXT,
      source TEXT,
      command TEXT NOT NULL,
      content TEXT,
      self INTEGER NOT NULL DEFAULT 0,
      meta TEXT
    )
  `);
  sqlite.run(
    "CREATE INDEX IF NOT EXISTS idx_messages_network_target ON messages (network, target)"
  );
  sqlite.run(
    "CREATE INDEX IF NOT EXISTS idx_messages_command ON messages (command)"
  );

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS network_configs (
      name TEXT PRIMARY KEY,
      config TEXT NOT NULL
    )
  `);

  const db = drizzle(sqlite, { schema: { messages, networkConfigs } });

  return {
    db,
    close: () => sqlite.close(),
  };
}

export type DatabaseConnection = ReturnType<typeof createDatabase>["db"];
