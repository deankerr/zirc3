import type IRC from "irc-framework";
import { numerics } from "@/irc/numerics";
import type { IRCMessage } from "@/types";

const CTCP_MARKER = "\x01";

const TARGET_COMMANDS = new Set([
  "PRIVMSG",
  "NOTICE",
  "JOIN",
  "PART",
  "MODE",
  "TOPIC",
  "KICK",
  "ACTION",
]);

export function parseMessage(
  input: IRC.IrcMessage,
  network: string
): IRCMessage {
  const raw = input.toJson();

  const msg: IRCMessage = {
    id: Bun.randomUUIDv7(),
    timestamp: Date.now(),
    network,
    ...raw,
  };

  // * detect CTCP ACTION (e.g. /me commands)
  // format: PRIVMSG #channel :\x01ACTION does something\x01
  const text = msg.params?.[1];
  if (
    msg.command === "PRIVMSG" &&
    msg.params?.[0] &&
    text?.startsWith(`${CTCP_MARKER}ACTION `)
  ) {
    msg.command = "ACTION";
    msg.params = [msg.params[0], text.slice(8, -1)]; // remove "\x01ACTION " prefix and trailing "\x01"
  }

  // * map numeric to human-readable name
  const name = numerics[msg.command];
  if (name) {
    msg.numeric = msg.command;
    msg.command = name;
  }

  // * extract target from params
  if (msg.params.length > 0 && TARGET_COMMANDS.has(msg.command)) {
    msg.target = msg.params.shift();
  }

  return msg;
}
