import type { IRCMessage } from "../types";

export type ConnectionEvent =
  | { type: "registered" }
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
