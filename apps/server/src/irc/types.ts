import type { IRCMessage } from "../types";

export type UserInfo = {
  nick: string;
  username: string;
  host: string;
  away: boolean;
  modes: string[];
};

export type ChannelMember = {
  nick: string;
  ident?: string;
  hostname?: string;
  modes: string[];
};

export type ChannelState = {
  name: string;
  topic: string;
  topicSetBy?: string;
  topicSetAt?: number;
  modes: string[];
  users: ChannelMember[];
  joined: boolean;
};

export type ConnectionEvent =
  | { type: "registered"; user: UserInfo }
  | { type: "user_updated"; user: UserInfo }
  | { type: "channel_updated"; channel: ChannelState }
  | { type: "socket_close"; error?: string }
  | { type: "socket_error"; error: Error | string }
  | { type: "reconnecting"; attempt: number; wait: number }
  | { type: "close" };

export type MessageHandler = (args: {
  client: { network: string };
  message: IRCMessage;
}) => void;

export type ConnectionHandler = (args: {
  client: { network: string };
  event: ConnectionEvent;
}) => void;
