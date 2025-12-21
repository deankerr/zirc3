import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { router } from "@zirc3/server-orpc";
import type { z } from "zod";
import type {
  ChannelMember,
  ChannelState,
  IRCCommand,
  IRCMessage,
  NetworkState,
  SubscribeEvent,
} from "@zirc3/server-orpc/contract";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";

const link = new RPCLink({
  url: `${SERVER_URL}/rpc`,
});

export const client: RouterClient<typeof router> = createORPCClient(link);

// * Type exports
export type IRCMessageType = z.infer<typeof IRCMessage>;
export type NetworkStateType = z.infer<typeof NetworkState>;
export type SubscribeEventType = z.infer<typeof SubscribeEvent>;
export type ChannelStateType = z.infer<typeof ChannelState>;
export type ChannelMemberType = z.infer<typeof ChannelMember>;
export type IRCCommandType = z.infer<typeof IRCCommand>;
