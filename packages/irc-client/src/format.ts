import type { IRCMessage } from "./types";

export function formatMessage(msg: IRCMessage): string | null {
  const time = formatTime(msg.timestamp);

  switch (msg.command) {
    case "PRIVMSG":
      return `[${time}] <${msg.source}> ${msg.params[0] ?? ""}`;

    case "ACTION":
      return `[${time}] * ${msg.source} ${msg.params[0] ?? ""}`;

    case "JOIN":
      return `[${time}] --> ${msg.source} has joined ${msg.target}`;

    case "PART": {
      const reason = msg.params[0] ? ` (${msg.params[0]})` : "";
      return `[${time}] <-- ${msg.source} has left ${msg.target}${reason}`;
    }

    case "QUIT": {
      const reason = msg.params[0] ? ` (${msg.params[0]})` : "";
      return `[${time}] <-- ${msg.source} has quit${reason}`;
    }

    case "KICK": {
      const kicked = msg.params[0];
      const reason = msg.params[1] ? ` (${msg.params[1]})` : "";
      return `[${time}] <-- ${kicked} was kicked from ${msg.target} by ${msg.source}${reason}`;
    }

    case "NICK": {
      const newNick = msg.params[0];
      return `[${time}] --- ${msg.source} is now known as ${newNick}`;
    }

    case "RPL_TOPIC":
    case "TOPIC": {
      const topic = msg.params[0] ?? "";
      return `[${time}] --- Topic for ${msg.target}: ${topic}`;
    }

    case "MODE": {
      const modes = msg.params.join(" ");
      return `[${time}] --- Mode ${msg.target} [${modes}] by ${msg.source}`;
    }

    case "NOTICE":
      return `[${time}] -${msg.source}- ${msg.params[0] ?? ""}`;

    default:
      return null;
  }
}

function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}
