import type { IRCMessage } from "./types";

export function formatMessage(msg: IRCMessage): string | null {
  const time = formatTime(msg.timestamp);
  const params = msg.meta?.params ?? [];

  switch (msg.command) {
    case "PRIVMSG":
      return `[${time}] <${msg.source}> ${msg.content ?? ""}`;

    case "ACTION":
      return `[${time}] * ${msg.source} ${msg.content ?? ""}`;

    case "JOIN":
      return `[${time}] --> ${msg.source} has joined ${msg.target}`;

    case "PART": {
      const reason = params[0] ? ` (${params[0]})` : "";
      return `[${time}] <-- ${msg.source} has left ${msg.target}${reason}`;
    }

    case "QUIT": {
      const reason = params[0] ? ` (${params[0]})` : "";
      return `[${time}] <-- ${msg.source} has quit${reason}`;
    }

    case "KICK": {
      const kicked = params[0];
      const reason = params[1] ? ` (${params[1]})` : "";
      return `[${time}] <-- ${kicked} was kicked from ${msg.target} by ${msg.source}${reason}`;
    }

    case "NICK": {
      const newNick = params[0];
      return `[${time}] --- ${msg.source} is now known as ${newNick}`;
    }

    case "RPL_TOPIC":
    case "TOPIC": {
      const topic = params[0] ?? "";
      return `[${time}] --- Topic for ${msg.target}: ${topic}`;
    }

    case "MODE": {
      const modes = params.join(" ");
      return `[${time}] --- Mode ${msg.target} [${modes}] by ${msg.source}`;
    }

    case "NOTICE":
      return `[${time}] -${msg.source}- ${msg.content ?? ""}`;

    default:
      return null;
  }
}

function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}
