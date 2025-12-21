import type { ChannelStateType } from "@/api";

export type LineType =
  | "message"
  | "action"
  | "notice"
  | "join"
  | "part"
  | "quit"
  | "kick"
  | "nick"
  | "mode"
  | "topic"
  | "info"
  | "error"
  | "system";

export type BufferLine = {
  id: string;
  timestamp: number;
  type: LineType;
  source?: string;
  sourceStyle?: LineType;
  content: string;
};

export type BufferType = "system" | "server" | "channel" | "query";

export type BufferState = {
  id: string;
  type: BufferType;
  network?: string;
  target?: string;
  lines: BufferLine[];
};

export type UserInfo = {
  nick: string;
  username: string;
  host: string;
  away: boolean;
  modes: string[];
};

export type NetworkState = {
  name: string;
  status: "connecting" | "connected" | "disconnected";
  user?: UserInfo;
  channels: Record<string, ChannelStateType>;
};

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

export type Store = {
  connection: {
    status: ConnectionStatus;
  };
  networks: Record<string, NetworkState>;
  buffers: Record<string, BufferState>;
  ui: {
    activeBuffer: string | null;
  };
};
