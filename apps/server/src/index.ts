import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { ClientManager } from "./client-manager";
import { config } from "./config";
import { CommandMessage, EventMessage } from "./model";
import type { IRCMessage, SystemEvent } from "./types";

const PORT = Number(process.env.PORT ?? 3000);

// biome-ignore lint/suspicious/noExplicitAny: Elysia WS type is complex
const wsClients = new Set<any>();

// * Initialize client manager
const clientManager = new ClientManager();

// * Subscribe to all IRC messages
clientManager.onMessage((message) => {
  console.log(`[${message.network}]`, message);
  broadcastIRC(message);
});

// * Subscribe to system events
clientManager.onSystem((event) => {
  broadcastSystem(event);
});

// * Load networks from config
for (const [network, networkConfig] of Object.entries(config.networks)) {
  clientManager.addNetwork(network, networkConfig);
}

function broadcastIRC(data: IRCMessage) {
  const message = { type: "irc" as const, data };
  for (const ws of wsClients) {
    ws.send(message);
  }
}

function broadcastSystem(data: SystemEvent) {
  const message = { type: "system" as const, data };
  for (const ws of wsClients) {
    ws.send(message);
  }
}

const app = new Elysia()
  .use(
    cors({
      origin: process.env.CORS_ORIGIN || "",
      methods: ["GET", "POST", "OPTIONS"],
    })
  )
  .get("/", () => "OK")

  .ws("/events", {
    body: CommandMessage,
    response: EventMessage,
    open(ws) {
      wsClients.add(ws);
      console.log(`[ws] client connected (${wsClients.size} total)`);

      // * Send network list first
      const networks = [...clientManager.clients.keys()].map((name) => ({
        name,
      }));
      ws.send({ type: "networks", data: networks });

      // * Replay buffered system events
      for (const event of clientManager.systemBuffer.getAll()) {
        ws.send({ type: "system", data: event });
      }

      // * Replay buffered messages (sorted by timestamp across all buffers)
      const messages: IRCMessage[] = [];
      for (const client of clientManager.clients.values()) {
        for (const buffer of client.buffers.values()) {
          messages.push(...buffer.getAll());
        }
      }
      messages.sort((a, b) => a.timestamp - b.timestamp);
      for (const message of messages) {
        ws.send({ type: "irc", data: message });
      }
    },
    close(ws) {
      wsClients.delete(ws);
      console.log(`[ws] client disconnected (${wsClients.size} total)`);
    },
    message(_ws, msg) {
      if (msg.type === "irc") {
        clientManager.handleCommand(msg.data);
      }
    },
  })

  .listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

export type ElysiaApp = typeof app;
