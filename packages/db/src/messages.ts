import { and, desc, eq, lt, sql } from "drizzle-orm";
import type { DatabaseConnection } from "./index";
import { type MessageInput, messages } from "./schema";

// * Convert input to storage format
function toRow(input: MessageInput) {
  return {
    ...input,
    timestamp: input.timestamp.toISOString(),
  };
}

// * Insert message(s)
export function insertMessages(
  db: DatabaseConnection,
  input: MessageInput | MessageInput[]
) {
  const rows = Array.isArray(input) ? input.map(toRow) : [toRow(input)];
  return db.insert(messages).values(rows).run();
}

// * Get messages with cursor pagination (uses id for ordering)
export function getMessages(
  db: DatabaseConnection,
  args: {
    network: string;
    target: string;
    before?: string; // cursor (message id)
    limit: number;
  }
) {
  const conditions = [
    eq(messages.network, args.network),
    sql`lower(${messages.target}) = ${args.target.toLowerCase()}`,
  ];

  if (args.before) {
    conditions.push(lt(messages.id, args.before));
  }

  return db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(desc(messages.id))
    .limit(args.limit)
    .all();
}

// * Get a single message by ID
export function getMessage(db: DatabaseConnection, id: string) {
  return db.select().from(messages).where(eq(messages.id, id)).get();
}

// * Delete all messages for a network
export function deleteMessages(db: DatabaseConnection, network: string) {
  return db.delete(messages).where(eq(messages.network, network)).run();
}
