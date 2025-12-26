import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { messages } from "./schema";

export * from "./messages";
export * from "./schema";

// * Create a database connection with bun:sqlite
export function createDatabase(path: string) {
  const sqlite = new Database(path, { create: true });

  // Enable WAL mode for better concurrency
  sqlite.run("PRAGMA journal_mode = WAL");
  sqlite.run("PRAGMA synchronous = NORMAL");

  return drizzle(sqlite, { schema: { messages } });
}

export type DatabaseConnection = ReturnType<typeof createDatabase>;
