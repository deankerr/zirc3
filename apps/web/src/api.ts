import { treaty } from "@elysiajs/eden";
import type { ElysiaApp } from "../../server/src/index";

export type {
  EventMessage,
  IRCMessage,
  NetworkInfo,
  SystemEvent,
} from "../../server/src/types";

export const api = treaty<ElysiaApp>(import.meta.env.VITE_SERVER_URL as string);
