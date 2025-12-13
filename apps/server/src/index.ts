import { cors } from "@elysiajs/cors";
import "dotenv/config";
import { Elysia } from "elysia";
import { config } from "./config";
import { createIRCClient } from "./irc/client";
import { parseMessage } from "./irc/message";
import { EventMessage } from "./model";
import { RingBuffer } from "./ring-buffer";
import type { IRCMessage } from "./types";

const PORT = Number(process.env.PORT ?? 3000);
const BUFFER_SIZE = 500;

type Event = (typeof EventMessage)["static"];

const eventBuffer = new RingBuffer<Event>(BUFFER_SIZE);

// * Track connected WebSocket clients
// biome-ignore lint/suspicious/noExplicitAny: Elysia WS type is complex
const clients = new Set<any>();

const app = new Elysia()
  .use(
    cors({
      origin: process.env.CORS_ORIGIN || "",
      methods: ["GET", "POST", "OPTIONS"],
    })
  )
  .get("/", () => "OK")

  .ws("/events", {
    response: EventMessage,
    open(ws) {
      clients.add(ws);
      console.log(`[ws] client connected (${clients.size} total)`);

      // * Send network list first
      const networks = Object.keys(config.networks).map((name) => ({ name }));
      ws.send({ type: "networks", data: networks });

      // * Replay buffered messages to new client
      for (const message of eventBuffer.getAll()) {
        ws.send(message);
      }
    },
    close(ws) {
      clients.delete(ws);
      console.log(`[ws] client disconnected (${clients.size} total)`);
    },
  })

  .listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

function broadcast(data: IRCMessage) {
  const message = { type: "irc" as const, data };
  eventBuffer.push(message);
  for (const ws of clients) {
    ws.send(message);
  }
}

// * Create IRC clients for each network
for (const [network, networkConfig] of Object.entries(config.networks)) {
  const { channels, ...options } = networkConfig;
  const client = createIRCClient(options);

  client.on("registered", () => {
    if (channels) {
      for (const channel of channels) {
        client.join(channel);
      }
    }
  });

  client.connection.on("message", (message) => {
    if (["PING", "PONG"].includes(message.command)) {
      return;
    }

    const msg = parseMessage(message, network);
    console.log(`[${network}]`, msg);
    broadcast(msg);
  });

  client.connect();
}

export type ElysiaApp = typeof app;
