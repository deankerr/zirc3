import {
  deleteNetworkConfig,
  getAllNetworkConfigs,
  putNetworkConfig,
} from "@zirc3/db";
import { IRCClient } from "@zirc3/irc-client";
import type { z } from "zod";
import { os } from "./base";
import type { NetworkConfig, NetworkState } from "./contract";
import { closeDb, getDb } from "./db";
import { publisher } from "./events";
import { storeMessage } from "./messages";

type NetworkConfigType = z.infer<typeof NetworkConfig>;
type NetworkStateType = z.infer<typeof NetworkState>;
type ConnectionStatus = "disconnected" | "connecting" | "connected";

// * In-memory storage

type StoredNetwork = {
  client: IRCClient;
  config: NetworkConfigType;
  status: ConnectionStatus;
};

const networks = new Map<string, StoredNetwork>();

// * Helpers

function publishState(stored: StoredNetwork) {
  publisher.publish("event", { type: "state", data: getNetworkState(stored) });
}

function getNetworkState(stored: StoredNetwork): NetworkStateType {
  const { client, config, status } = stored;

  const channels: Record<
    string,
    z.infer<typeof NetworkState>["channels"][string]
  > = {};
  for (const [key, channel] of client.channels) {
    channels[key] = channel.getState();
  }

  return {
    network: config.network,
    status,
    user:
      status === "connected"
        ? {
            nick: client.user.nick,
            username: client.user.username,
            host: client.user.host,
            away: client.user.away ?? false,
            modes: [...(client.user.modes ?? [])],
          }
        : undefined,
    channels,
    config,
  };
}

function createClient(config: NetworkConfigType): StoredNetwork {
  console.log(`[networks] creating client for "${config.network}":`, config);

  const client = new IRCClient({
    host: config.host,
    port: config.port,
    tls: config.tls,
    rejectUnauthorized: config.rejectUnauthorized,
    password: config.password,
    nick: config.nick,
    username: config.username,
    gecos: config.gecos,
    auto_reconnect: config.autoReconnect,
    auto_reconnect_max_retries: config.autoReconnectMaxRetries,
    autoJoin: config.autoJoin,
    quitMessage: config.quitMessage,
    logging: { console: true, raw: true },
  });

  const stored: StoredNetwork = {
    client,
    config,
    status: "disconnected",
  };

  // * Track connection status and publish state changes
  client.on("connecting", () => {
    console.log(
      `[networks] ${config.network}: connecting to ${config.host}:${config.port}`
    );
    stored.status = "connecting";
    publishState(stored);
  });

  client.on("registered", () => {
    console.log(
      `[networks] ${config.network}: registered as ${client.user.nick}`
    );
    stored.status = "connected";
    publishState(stored);
  });

  client.on("close", () => {
    console.log(`[networks] ${config.network}: connection closed`);
    stored.status = "disconnected";
    publishState(stored);
  });

  client.on("socket close", (error) => {
    console.log(
      `[networks] ${config.network}: socket closed`,
      error ? { error } : ""
    );
  });

  client.on("irc error", (error) => {
    console.log(`[networks] ${config.network}: IRC error:`, error);
  });

  // * Publish state on channel/user changes
  // Note: We defer publishes with queueMicrotask to ensure IRCChannel's
  // handlers have run first (they're registered later, when channels are created)
  const deferPublish = () => queueMicrotask(() => publishState(stored));

  client.on("join", (event) => {
    console.log(
      `[networks] ${config.network}: ${event.nick} joined ${event.channel}`
    );
    deferPublish();
  });
  client.on("part", (event) => {
    console.log(
      `[networks] ${config.network}: ${event.nick} parted ${event.channel}`
    );
    deferPublish();
  });
  client.on("kick", (event) => {
    console.log(
      `[networks] ${config.network}: ${event.kicked} kicked from ${event.channel} by ${event.nick}`
    );
    deferPublish();
  });
  client.on("quit", (event) => {
    console.log(`[networks] ${config.network}: ${event.nick} quit`);
    deferPublish();
  });
  client.on("nick", (event) => {
    console.log(
      `[networks] ${config.network}: ${event.nick} -> ${event.new_nick}`
    );
    deferPublish();
  });
  client.on("topic", (event) => {
    console.log(
      `[networks] ${config.network}: topic for ${event.channel} set to "${event.topic}"`
    );
    deferPublish();
  });
  client.on("userlist", (event) => {
    console.log(
      `[networks] ${config.network}: userlist for ${event.channel} (${event.users.length} users)`
    );
    deferPublish();
  });
  client.on("mode", (event) => {
    console.log(
      `[networks] ${config.network}: mode ${event.target}`,
      event.modes
    );
    deferPublish();
  });

  // * Publish and store parsed messages
  client.on("parsed_message", (message) => {
    const enriched = { ...message, network: config.network };
    publisher.publish("event", { type: "irc", data: enriched });
    storeMessage(enriched);
  });

  return stored;
}

// * Load networks from db on startup

export function loadNetworks() {
  const db = getDb();
  if (!db) {
    console.log("[networks] db not initialized, skipping network load");
    return;
  }

  const configs = getAllNetworkConfigs(db);
  console.log(`[networks] loading ${configs.length} networks from db`);

  for (const config of configs) {
    const stored = createClient(config as NetworkConfigType);
    networks.set(config.network, stored);

    if ((config as NetworkConfigType).enabled) {
      stored.client.connect();
    }
  }
}

// * oRPC handlers

const list = os.networks.list.handler(() =>
  [...networks.values()].map(getNetworkState)
);

const put = os.networks.put.handler(({ input }) => {
  const db = getDb();
  if (!db) {
    throw new Error("Database not initialized");
  }

  const { config } = input;
  const name = config.network;

  // * persist config to db
  putNetworkConfig(db, config);

  // * disconnect and remove existing client if present
  const existing = networks.get(name);
  if (existing) {
    existing.client.quit();
  }

  // * create new client
  const stored = createClient(config);
  networks.set(name, stored);

  // * connect if enabled
  if (config.enabled) {
    stored.client.connect();
  }

  return getNetworkState(stored);
});

const del = os.networks.delete.handler(({ input }) => {
  const db = getDb();
  if (!db) {
    throw new Error("Database not initialized");
  }

  const stored = networks.get(input.name);
  if (!stored) {
    return { success: false };
  }

  // * remove from db
  deleteNetworkConfig(db, input.name);

  stored.client.quit();
  networks.delete(input.name);
  return { success: true };
});

export const networksRouter = {
  list,
  put,
  delete: del,
};

// * Export for command dispatch
export function getClient(network: string) {
  return networks.get(network)?.client;
}

// * Graceful shutdown
export function shutdown() {
  for (const stored of networks.values()) {
    stored.client.quit();
    stored.client.logger.close();
  }
  networks.clear();
  closeDb();
}
