import { treaty } from "@elysiajs/eden";
import type {
  ElysiaApp,
  IRCMessage,
  NetworkStateSync,
  SystemEvent,
} from "@zirc3/server/types";

const SERVER_URL = process.env.SERVER_URL ?? "http://localhost:3000";

const api = treaty<ElysiaApp>(SERVER_URL);

type WSMessage =
  | { type: "irc"; data: IRCMessage }
  | { type: "system"; data: SystemEvent }
  | { type: "state"; data: NetworkStateSync }
  | { type: "networks"; data: { name: string }[] };

function formatTimestamp(ts: number) {
  return new Date(ts).toLocaleTimeString();
}

function handleMessage(msg: WSMessage) {
  switch (msg.type) {
    case "networks":
      console.log("[networks]", msg.data.map((n) => n.name).join(", "));
      break;
    case "state":
      console.log(
        `[state:${msg.data.name}]`,
        msg.data.status,
        msg.data.user ? `as ${msg.data.user.nick}` : ""
      );
      break;
    case "system":
      console.log(
        `[system:${msg.data.network}]`,
        formatTimestamp(msg.data.timestamp),
        msg.data.event.type
      );
      break;
    case "irc":
      console.log(
        `[${msg.data.network}:${msg.data.target ?? "server"}]`,
        formatTimestamp(msg.data.timestamp),
        msg.data.command,
        `<${msg.data.source}>`,
        msg.data.params.slice(0, 2).join(" ")
      );
      break;
    default:
      console.log("[unknown]", msg);
  }
}

function connect() {
  console.log(`Connecting to ${SERVER_URL}...`);

  const ws = api.events.subscribe();

  ws.on("open", () => {
    console.log("Connected!");
  });

  ws.on("message", (event: { data: WSMessage }) => {
    handleMessage(event.data);
  });

  ws.on("close", () => {
    console.log("Disconnected. Reconnecting in 3s...");
    setTimeout(connect, 3000);
  });

  ws.on("error", (error: unknown) => {
    console.error("WebSocket error:", error);
  });
}

connect();
