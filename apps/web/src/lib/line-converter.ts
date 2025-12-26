import type { IRCMessageType } from "@/api";
import type { BufferLine, LineType } from "@/store/types";

// Local type with timestamp as number (for store/lines)
type IRCMessage = Omit<IRCMessageType, "timestamp"> & { timestamp: number };

function commandToLineType(command: string): LineType {
  switch (command) {
    case "PRIVMSG":
      return "message";
    case "ACTION":
      return "action";
    case "NOTICE":
      return "notice";
    case "JOIN":
      return "join";
    case "PART":
      return "part";
    case "QUIT":
      return "quit";
    case "KICK":
      return "kick";
    case "NICK":
      return "nick";
    case "MODE":
      return "mode";
    case "TOPIC":
      return "topic";
    case "ERROR":
      return "error";
    default:
      return "info";
  }
}

function formatMessageContent(msg: IRCMessage): string {
  const type = commandToLineType(msg.command);
  const params = msg.meta?.params ?? [];

  // * Use content directly for message types that have it
  if (msg.content !== undefined) {
    return msg.content;
  }

  switch (type) {
    case "join":
      return `has joined ${msg.target}`;

    case "part": {
      const reason = params.join(" ");
      return reason
        ? `has left ${msg.target} (${reason})`
        : `has left ${msg.target}`;
    }

    case "quit": {
      const reason = params.join(" ");
      return reason ? `has quit (${reason})` : "has quit";
    }

    case "kick": {
      const [kicked, ...reasonParts] = params;
      const reason = reasonParts.join(" ");
      return reason
        ? `has kicked ${kicked} from ${msg.target} (${reason})`
        : `has kicked ${kicked} from ${msg.target}`;
    }

    case "nick": {
      const newNick = params[0];
      return `is now known as ${newNick}`;
    }

    case "mode": {
      const modeString = params.join(" ");
      return `sets mode ${modeString}`;
    }

    case "topic": {
      const topic = params.join(" ");
      return topic
        ? `has changed the topic to: ${topic}`
        : "has cleared the topic";
    }

    default:
      return params.join(" ");
  }
}

export function ircMessageToLine(msg: IRCMessage): BufferLine {
  const type = commandToLineType(msg.command);

  // * For action, show nick in content style
  const sourceStyle: LineType | undefined =
    type === "action" ? "action" : undefined;

  return {
    id: msg.id,
    timestamp: msg.timestamp,
    type,
    source: msg.source,
    sourceStyle,
    content: formatMessageContent(msg),
  };
}

// * Get the buffer ID for an IRC message
export function getMessageBufferId(msg: {
  network: string;
  target?: string;
}): string {
  // * Messages without target go to server buffer
  if (!msg.target) {
    return `${msg.network}:*`;
  }
  return `${msg.network}:${msg.target.toLowerCase()}`;
}

// * Determine buffer type from target
export function getBufferType(target: string): "channel" | "query" | "server" {
  if (target === "*") return "server";
  if (target.startsWith("#") || target.startsWith("&")) return "channel";
  return "query";
}
