import { createDatabase, type DatabaseConnection } from "@zirc3/db";

let db: DatabaseConnection | null = null;
let close: (() => void) | null = null;

export function initDb() {
  const dbPath = process.env.DB_PATH ?? "./data/zirc.db";
  const result = createDatabase(dbPath);
  db = result.db;
  close = result.close;
  console.log(`[db] initialized at ${dbPath}`);
}

export function closeDb() {
  close?.();
  db = null;
  close = null;
}

export function getDb() {
  return db;
}
