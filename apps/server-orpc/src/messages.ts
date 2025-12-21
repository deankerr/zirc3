import { implement } from "@orpc/server";
import type { z } from "zod";
import { contract, type IRCMessage } from "./contract";
import { RingBuffer } from "./ring-buffer";

type IRCMessageType = z.infer<typeof IRCMessage>;

const DEFAULT_BUFFER_SIZE = 500;

// * Key for messages without a target (server notices, MOTDs, etc)
// * Using "*" as it's not a valid nick character
const SERVER_TARGET = "*";

// * In-memory storage: network -> target -> buffer
const buffers = new Map<string, Map<string, RingBuffer<IRCMessageType>>>();

// * Helpers

function getOrCreateNetworkBuffers(network: string) {
  let networkBuffers = buffers.get(network);
  if (!networkBuffers) {
    networkBuffers = new Map();
    buffers.set(network, networkBuffers);
  }
  return networkBuffers;
}

function getOrCreateBuffer(
  networkBuffers: Map<string, RingBuffer<IRCMessageType>>,
  target: string
) {
  let buffer = networkBuffers.get(target);
  if (!buffer) {
    buffer = new RingBuffer<IRCMessageType>(DEFAULT_BUFFER_SIZE);
    networkBuffers.set(target, buffer);
  }
  return buffer;
}

// * Store a message

export function storeMessage(message: IRCMessageType) {
  const networkBuffers = getOrCreateNetworkBuffers(message.network);
  const target = message.target?.toLowerCase() ?? SERVER_TARGET;
  const buffer = getOrCreateBuffer(networkBuffers, target);
  buffer.push(message);
}

// * Query messages with pagination

function getMessages(args: {
  network: string;
  target: string;
  before?: string;
  limit: number;
}) {
  const networkBuffers = buffers.get(args.network);
  if (!networkBuffers) {
    return { messages: [], hasMore: false };
  }

  const target = args.target.toLowerCase();
  const buffer = networkBuffers.get(target);
  if (!buffer) {
    return { messages: [], hasMore: false };
  }

  const all = buffer.getAll();

  // * Find starting index based on cursor
  let endIndex = all.length;
  if (args.before) {
    const cursorIndex = all.findIndex((m) => m.id === args.before);
    if (cursorIndex !== -1) {
      endIndex = cursorIndex;
    }
  }

  // * Get messages before cursor, limited
  const startIndex = Math.max(0, endIndex - args.limit);
  const messages = all.slice(startIndex, endIndex);

  return {
    messages,
    hasMore: startIndex > 0,
    oldestId: messages[0]?.id,
  };
}

// * oRPC handler

const os = implement(contract);

const list = os.messages.list.handler(({ input }) =>
  getMessages({
    network: input.network,
    target: input.target,
    before: input.before,
    limit: input.limit,
  })
);

export const messagesRouter = { list };
