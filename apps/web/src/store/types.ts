import type { ChannelState, UserInfo } from "@/api";

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

export type NetworkState = {
  name: string;
  status: "connecting" | "connected" | "disconnected";
  user?: UserInfo;
  channels: Record<string, ChannelState>;
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
