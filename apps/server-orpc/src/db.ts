import { createDatabase, type DatabaseConnection } from "@zirc3/db";

let db: DatabaseConnection | null = null;
let close: (() => void) | null = null;

export function initDb() {
  const result = createDatabase("./data/zirc.db");
  db = result.db;
  close = result.close;
  console.log("[db] initialized at ./data/zirc.db");
}

export function closeDb() {
  close?.();
  db = null;
  close = null;
}

export function getDb() {
  return db;
}
