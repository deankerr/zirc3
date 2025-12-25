/// <reference path="./irc-framework.d.ts" />
import type IRC from "irc-framework";

export type MessageContext = "channel" | "dm" | "server";

export type IRCMessage = {
  id: string;
  timestamp: Date;
  command: string;
  params: string[];
  source: string;
  tags: Record<string, string>;
  numeric?: string;
  target?: string;
  context?: MessageContext;
  self: boolean;
};

export type LoggerOptions = {
  dir?: string;
  console?: boolean;
  raw?: boolean;
};

export type IRCClientOptions = IRC.ClientOptions & {
  autoJoin?: string[];
  quitMessage?: string;
  logging?: LoggerOptions;
};

// * augment the irc-framework module to add our event
declare module "irc-framework" {
  interface IrcClient {
    on(event: "parsed_message", cb: (message: IRCMessage) => void): this;
    emit(event: "parsed_message", message: IRCMessage): boolean;
  }
}
