import { logger } from "@bogeychan/elysia-logger";
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { ClientManager } from "./client-manager";
import { config } from "./config";
import { CommandMessage, EventMessage } from "./model";
import type { IRCMessage, NetworkStateSync, SystemEvent } from "./types";

const PORT = Number(process.env.PORT ?? 3000);

// biome-ignore lint/suspicious/noExplicitAny: Elysia WS type is complex
const wsClients = new Set<any>();

// * Initialize client manager
const clientManager = new ClientManager();

// * Subscribe to all IRC messages
clientManager.onMessage((message) => {
  broadcastIRC(message);
});

// * Subscribe to system events (historical, buffered)
clientManager.onSystem((event) => {
  broadcastSystem(event);
});

// * Subscribe to state sync (live state updates)
clientManager.onState((state) => {
  broadcastState(state);
});

// * Load networks from config
for (const [network, networkConfig] of Object.entries(config.networks)) {
  if (networkConfig?.enabled === false) continue;
  clientManager.addNetwork(network, networkConfig);
}

function broadcastIRC(data: IRCMessage) {
  console.log("[ws:broadcast:irc]", data.command, data.target);
  const message = { type: "irc" as const, data };
  for (const ws of wsClients) {
    ws.send(message);
  }
}

function broadcastSystem(data: SystemEvent) {
  console.log("[ws:broadcast:system]", data.event.type);
  const message = { type: "system" as const, data };
  for (const ws of wsClients) {
    ws.send(message);
  }
}

function broadcastState(data: NetworkStateSync) {
  console.log("[ws:broadcast:state]", data.name, data.status);
  const message = { type: "state" as const, data };
  for (const ws of wsClients) {
    ws.send(message);
  }
}

export const app = new Elysia()
  .use(
    logger({
      level: "info",
    })
  )
  .use(
    cors({
      origin: process.env.CORS_ORIGIN || "",
      methods: ["GET", "POST", "OPTIONS"],
    })
  )
  .get("/", () => "OK")

  .get("/debug", () => {
    const networks: Record<string, unknown> = {};
    for (const [name, client] of clientManager.clients) {
      const channels: Record<string, unknown> = {};
      for (const [channelName, channel] of client.channels) {
        channels[channelName] = channel.getState();
      }
      networks[name] = {
        connected: client.irc.connected,
        user: {
          nick: client.irc.user.nick,
          username: client.irc.user.username,
          host: client.irc.user.host,
          away: client.irc.user.away,
          modes: [...client.irc.user.modes],
        },
        autoJoin: client.autoJoin,
        channels,
        bufferKeys: [...client.buffers.keys()],
      };
    }
    return { networks };
  })

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

      // * Send current state for all networks
      for (const client of clientManager.clients.values()) {
        const data = client.getNetworkState();
        console.log(data);
        ws.send({ type: "state", data });
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
        console.log(`[--> ${_ws.id}]`, msg);
        clientManager.handleCommand(msg.data);
      }
    },
  })

  .listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
