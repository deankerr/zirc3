import type IRC from "irc-framework";
import { numerics } from "@/irc/numerics";
import type { IRCMessage } from "@/model";

const CTCP_MARKER = "\x01";

export function parseMessage(
  input: IRC.IrcMessage,
  network: string
): (typeof IRCMessage)["static"] {
  const raw = input.toJson();

  const id = Bun.randomUUIDv7();
  const timestamp = Date.now();

  // * detect CTCP ACTION (e.g. /me commands)
  // format: PRIVMSG #channel :\x01ACTION does something\x01
  const target = raw.params?.[0];
  const text = raw.params?.[1];
  if (
    raw.command === "PRIVMSG" &&
    target &&
    text?.startsWith(`${CTCP_MARKER}ACTION `)
  ) {
    const actionText = text.slice(8, -1); // remove "\x01ACTION " prefix and trailing "\x01"
    return {
      id,
      timestamp,
      network,
      ...raw,
      command: "ACTION",
      params: [target, actionText],
    };
  }

  const name = numerics[raw.command];

  const msg = name
    ? { id, timestamp, network, ...raw, command: name, numeric: raw.command }
    : { id, timestamp, network, ...raw };

  return msg;
}
