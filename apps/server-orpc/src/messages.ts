import {
  getMessages as dbGetMessages,
  insertMessages,
  type MessageInput,
} from "@zirc3/db";
import { os } from "./base";
import { getDb } from "./db";

// * Store a message
export function storeMessage(message: MessageInput) {
  const db = getDb();
  if (!db) return;
  insertMessages(db, message);
}

// * oRPC handler
const list = os.messages.list.handler(({ input }) => {
  const db = getDb();
  if (!db) {
    return { messages: [], hasMore: false };
  }

  const rows = dbGetMessages(db, {
    network: input.network,
    target: input.target,
    before: input.before,
    limit: input.limit + 1,
  });

  const hasMore = rows.length > input.limit;
  const messages = rows.slice(0, input.limit).reverse();

  return {
    messages: messages.map((row) => ({
      id: row.id,
      timestamp: new Date(row.timestamp),
      network: row.network,
      command: row.command,
      self: row.self,
      target: row.target ?? undefined,
      source: row.source ?? undefined,
      content: row.content ?? undefined,
      meta: row.meta ?? undefined,
    })),
    hasMore,
    oldestId: messages[0]?.id,
  };
});

export const messagesRouter = { list };
