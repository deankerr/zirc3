import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// * Messages table - stores IRC messages and synthetic messages
export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    timestamp: text("timestamp").notNull(), // ISO8601
    network: text("network").notNull(),
    target: text("target"),
    source: text("source"),
    command: text("command").notNull(),
    content: text("content"),
    self: integer("self", { mode: "boolean" }).notNull().default(false),
    meta: text("meta", { mode: "json" }).$type<MessageMeta>(),
  },
  (table) => [
    index("idx_messages_network_target").on(table.network, table.target),
    index("idx_messages_command").on(table.command),
  ]
);

// * Meta blob type for IRC-specific and extended data
export type MessageMeta = {
  ident?: string;
  hostname?: string;
  context?: "channel" | "dm" | "server";
  modes?: string[];
  params?: string[];
  tags?: Record<string, string>;
  numeric?: string;
  [key: string]: unknown;
};

// * Input type - accepts Date, converts to ISO8601 for storage
export type MessageInput = Omit<typeof messages.$inferInsert, "timestamp"> & {
  timestamp: Date;
};

// * Stored type
export type Message = typeof messages.$inferSelect;
