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

// * Events that become historical system messages (buffered)
export type SystemConnectionEvent =
  | { type: "connecting"; address?: string }
  | { type: "registered"; nick: string }
  | { type: "socket_close"; error?: string }
  | { type: "socket_error"; error: Error | string }
  | { type: "reconnecting"; attempt: number; wait: number }
  | { type: "close" };

// * Events that trigger state sync (live only, not buffered)
export type StateChangeEvent =
  | { type: "user_updated"; user: UserInfo }
  | { type: "channel_updated"; channel: ChannelState };

export type ConnectionEvent = SystemConnectionEvent | StateChangeEvent;

export type MessageHandler<TClient = { network: string }> = (args: {
  client: TClient;
  message: IRCMessage;
}) => void;

export type ConnectionHandler<TClient = { network: string }> = (args: {
  client: TClient;
  event: ConnectionEvent;
}) => void;
