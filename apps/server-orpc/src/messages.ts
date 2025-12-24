import type { z } from "zod";
import { os } from "./base";
import type { IRCMessage } from "./contract";
import { storeMessage as dbStoreMessage, getMessages } from "./db";

type IRCMessageType = z.infer<typeof IRCMessage>;

// * Store a message (delegates to db)

export function storeMessage(message: IRCMessageType) {
  // * Fire and forget - don't block on db write
  dbStoreMessage(message);
}

// * oRPC handler

const list = os.messages.list.handler(async ({ input }) => {
  console.log("[messages.list]", input);
  return await getMessages({
    network: input.network,
    target: input.target,
    before: input.before,
    limit: input.limit,
  });
});

export const messagesRouter = { list };
