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

function parseTarget(command: string, params: string[]) {
  if (params.length === 0) {
    return;
  }
  if (TARGET_COMMANDS.has(command)) {
    return params[0];
  }
}

export function parseMessage(
  input: IRC.IrcMessage,
  network: string
): IRCMessage {
  const raw = input.toJson();

  const id = Bun.randomUUIDv7();
  const timestamp = Date.now();

  // * detect CTCP ACTION (e.g. /me commands)
  // format: PRIVMSG #channel :\x01ACTION does something\x01
  const text = raw.params?.[1];
  if (
    raw.command === "PRIVMSG" &&
    raw.params?.[0] &&
    text?.startsWith(`${CTCP_MARKER}ACTION `)
  ) {
    const actionText = text.slice(8, -1); // remove "\x01ACTION " prefix and trailing "\x01"
    const command = "ACTION";
    return {
      id,
      timestamp,
      network,
      ...raw,
      command,
      params: [raw.params[0], actionText],
      target: parseTarget(command, raw.params),
    };
  }

  const name = numerics[raw.command];
  const command = name ?? raw.command;

  return {
    id,
    timestamp,
    network,
    ...raw,
    command,
    numeric: name ? raw.command : undefined,
    target: parseTarget(command, raw.params),
  };
}
