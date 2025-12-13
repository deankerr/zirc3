import type { IRCMessage } from "@/api";

export function parseNick(source?: string) {
  if (!source) {
    return;
  }
  const bangIndex = source.indexOf("!");
  return bangIndex > 0 ? source.slice(0, bangIndex) : source;
}

export function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function parseTarget(command: string, params: string[]) {
  if (params.length === 0) {
    return;
  }
  switch (command) {
    case "PRIVMSG":
    case "NOTICE":
    case "JOIN":
    case "PART":
    case "MODE":
    case "TOPIC":
    case "KICK":
      return params[0];
    default:
      return;
  }
}

function getCommandColor(command: string, numeric?: string) {
  if (numeric) {
    return "text-neutral-500";
  }
  switch (command) {
    case "PRIVMSG":
      return "text-emerald-400";
    case "JOIN":
      return "text-cyan-400";
    case "PART":
    case "QUIT":
      return "text-rose-400";
    case "NICK":
      return "text-amber-400";
    case "MODE":
      return "text-violet-400";
    case "NOTICE":
      return "text-sky-400";
    case "TOPIC":
      return "text-pink-400";
    case "KICK":
      return "text-red-500";
    default:
      return "text-neutral-400";
  }
}

function pad(str: string, len: number) {
  return str.padEnd(len, " ");
}

export function MessageLine(props: { message: IRCMessage }) {
  const msg = props.message;
  const commandColor = getCommandColor(msg.command, msg.numeric);
  const nick = parseNick(msg.source);
  const target = parseTarget(msg.command, msg.params);
  const isNumeric = !!msg.numeric;
  const command = msg.command;
  const params = (target ? msg.params.slice(1) : msg.params).join(" ");

  return (
    <div class="group whitespace-pre-wrap px-3 py-0.5 font-mono text-sm hover:bg-neutral-900/50">
      <span class="text-neutral-600">{pad(formatTime(msg.timestamp), 10)}</span>
      <span class={commandColor}>{pad(command, 14)}</span>
      <span class="text-blue-400">{pad(target ?? "", 16)}</span>
      <span class="text-orange-400">{pad(nick ?? msg.source ?? "", 16)}</span>
      <span class={isNumeric ? "text-neutral-500" : "text-neutral-300"}>
        {params}
      </span>
    </div>
  );
}
