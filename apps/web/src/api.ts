import { treaty } from "@elysiajs/eden";
import type { ElysiaApp } from "@zirc3/server/types";

export type {
  ChannelMember,
  ChannelState,
  EventMessage,
  IRCMessage,
  NetworkInfo,
  SystemEvent,
  UserInfo,
} from "@zirc3/server/types";

export const api = treaty<ElysiaApp>(import.meta.env.VITE_SERVER_URL as string);
