import { KV } from "@jsr/cross__kv";
import type { z } from "zod";
import type { IRCMessage, NetworkConfig } from "./contract";

type NetworkConfigType = z.infer<typeof NetworkConfig>;
type IRCMessageType = z.infer<typeof IRCMessage>;

const db = new KV();

export async function openDb() {
  console.log("[db] opening database at ./data/zirc.db");
  await db.open("./data/zirc.db");
}

export function closeDb() {
  console.log("[db] closing database");
  db.close();
}

// * KV keys only allow: @, unicode letters, unicode numbers, _, -
// * Strategy: URI-encode all string parts, then swap % for @ (which KV allows)
// * encodeURIComponent leaves some chars unchanged that KV doesn't allow,
// * so we manually encode: ! ' ( ) * ~ .

type KeyPart = string | number;
type QueryPart = KeyPart | { to: number };

function encode(part: string): string {
  let encoded = encodeURIComponent(part);
  encoded = encoded
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A")
    .replace(/~/g, "%7E")
    .replace(/\./g, "%2E");
  return encoded.replace(/%/g, "@");
}

function key(parts: KeyPart[]): KeyPart[] {
  return parts.map((part) => (typeof part === "string" ? encode(part) : part));
}

function query(parts: QueryPart[]): QueryPart[] {
  return parts.map((part) => (typeof part === "string" ? encode(part) : part));
}

export function decode(encoded: string): string {
  return decodeURIComponent(encoded.replace(/@/g, "%"));
}

// * Network config helpers

export async function getAllNetworkConfigs(): Promise<NetworkConfigType[]> {
  const results = await db.listAll<NetworkConfigType>(key(["networks"]));
  return results.map((entry) => entry.data);
}

export async function putNetworkConfig(config: NetworkConfigType) {
  console.log("[db] storing network config:", config.network);
  await db.set(key(["networks", config.network]), config);
}

export async function deleteNetworkConfig(name: string) {
  console.log("[db] deleting network config:", name);
  await db.delete(key(["networks", name]));
}

// * Message helpers

const SERVER_TARGET = "*";

export async function storeMessage(message: IRCMessageType) {
  const target = message.target?.toLowerCase() ?? SERVER_TARGET;
  const timestamp = message.timestamp.getTime();
  await db.set(key(["messages", message.network, target, timestamp]), message);
}

export async function getMessages(args: {
  network: string;
  target: string;
  before?: string;
  limit: number;
}): Promise<{
  messages: IRCMessageType[];
  hasMore: boolean;
  oldestId?: string;
}> {
  const target = args.target.toLowerCase();

  // * Build query - if we have a cursor, extract timestamp from UUIDv7
  // * UUIDv7 encodes timestamp in the first 48 bits
  let q: QueryPart[];

  if (args.before) {
    const cursorTimestamp = extractTimestampFromUUIDv7(args.before);
    if (cursorTimestamp) {
      q = query([
        "messages",
        args.network,
        target,
        { to: cursorTimestamp - 1 },
      ]);
    } else {
      q = query(["messages", args.network, target]);
    }
  } else {
    q = query(["messages", args.network, target]);
  }

  // * Fetch more than limit to determine hasMore
  const results = await db.listAll<IRCMessageType>(q, args.limit + 1, true);

  const hasMore = results.length > args.limit;
  const messages = results.slice(0, args.limit).map((entry) => entry.data);

  // * Results come in reverse order (newest first), reverse to get oldest first
  messages.reverse();

  return {
    messages,
    hasMore,
    oldestId: messages[0]?.id,
  };
}

// * Extract timestamp from UUIDv7
// * UUIDv7 format: tttttttt-tttt-7xxx-xxxx-xxxxxxxxxxxx
// * First 48 bits (12 hex chars) are the timestamp in milliseconds
function extractTimestampFromUUIDv7(uuid: string): number | null {
  const hex = uuid.replace(/-/g, "").slice(0, 12);
  const timestamp = Number.parseInt(hex, 16);
  if (Number.isNaN(timestamp)) return null;
  return timestamp;
}
