import { oc } from "@orpc/contract";
import { z } from "zod";

/*
 * Contracts
  - these are not necessarily how they will be stored on the server
 */

// * Networks

export const NetworkConfig = z.object({
  network: z.string(),
  host: z.string(),
  port: z.number().int().min(1).max(65_535).default(6667),
  tls: z.boolean().default(false),
  rejectUnauthorized: z.boolean().default(true),
  password: z.string().optional(),
  nick: z.string(),
  username: z.string().optional(),
  gecos: z.string().optional(),
  autoReconnect: z.boolean().default(true),
  autoReconnectMaxRetries: z.number().int().min(0).default(30),
  autoJoin: z.array(z.string()).default([]),
  quitMessage: z.string().optional(),
  enabled: z.boolean().default(true),
});

const ConnectionStatus = z.enum(["disconnected", "connecting", "connected"]);

const UserState = z.object({
  nick: z.string(),
  username: z.string(),
  host: z.string(),
  away: z.boolean(),
  modes: z.array(z.string()),
});

export const ChannelMember = z.object({
  nick: z.string(),
  ident: z.string().optional(),
  hostname: z.string().optional(),
  modes: z.array(z.string()),
});

export const ChannelState = z.object({
  name: z.string(),
  topic: z.string(),
  topicSetBy: z.string().optional(),
  topicSetAt: z.number().optional(),
  modes: z.array(z.string()),
  users: z.array(ChannelMember),
  joined: z.boolean(),
});

export const NetworkState = z.object({
  network: z.string(),
  status: ConnectionStatus,
  error: z.string().optional(),
  user: UserState.optional(),
  channels: z.record(z.string(), ChannelState),
  config: NetworkConfig,
});

const networks = {
  list: oc.output(z.array(NetworkState)),
  put: oc.input(z.object({ config: NetworkConfig })).output(NetworkState),
  delete: oc
    .input(z.object({ name: z.string() }))
    .output(z.object({ success: z.boolean() })),
};

// * Messages

const MessageContext = z.enum(["channel", "dm", "server"]);

const MessageMeta = z.object({
  ident: z.string().optional(),
  hostname: z.string().optional(),
  context: MessageContext.optional(),
  modes: z.array(z.string()).optional(),
  params: z.array(z.string()).optional(),
  tags: z.record(z.string(), z.string()).optional(),
  numeric: z.string().optional(),
});

export const IRCMessage = z.object({
  id: z.string(),
  timestamp: z.date(),
  network: z.string(),
  command: z.string(),
  target: z.string().optional(),
  source: z.string().optional(),
  content: z.string().optional(),
  self: z.boolean(),
  meta: MessageMeta.optional(),
});

const PaginatedMessages = z.object({
  messages: z.array(IRCMessage),
  hasMore: z.boolean(),
  oldestId: z.string().optional(),
});

const messages = {
  list: oc
    .input(
      z.object({
        network: z.string(),
        target: z.string(),
        before: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .output(PaginatedMessages),
};

// * Commands

export const IRCCommand = z.object({
  network: z.string(),
  command: z.string(),
  args: z.array(z.string()),
});

const commands = {
  send: oc
    .input(IRCCommand)
    .output(z.object({ success: z.boolean(), error: z.string().optional() })),
};

// * Events (subscribe stream)

export const SubscribeEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("irc"), data: IRCMessage }),
  z.object({ type: z.literal("state"), data: NetworkState }),
]);

export const contract = { networks, messages, commands };
