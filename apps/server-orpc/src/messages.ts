import { implement } from "@orpc/server";
import type { z } from "zod";
import { contract, type IRCMessage } from "./contract";
import { getMessages, storeMessage as dbStoreMessage } from "./db";

type IRCMessageType = z.infer<typeof IRCMessage>;

// * Store a message (delegates to db)

export function storeMessage(message: IRCMessageType) {
  // * Fire and forget - don't block on db write
  dbStoreMessage(message);
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
