import { implement } from "@orpc/server";
import { IRCClient } from "@zirc3/irc-client";
import type { z } from "zod";
import { contract, type NetworkConfig, type NetworkState } from "./contract";
import {
  deleteNetworkConfig,
  getAllNetworkConfigs,
  putNetworkConfig,
} from "./db";
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
  client.on("join", (event) => {
    console.log(
      `[networks] ${config.network}: ${event.nick} joined ${event.channel}`
    );
    publishState(stored);
  });
  client.on("part", (event) => {
    console.log(
      `[networks] ${config.network}: ${event.nick} parted ${event.channel}`
    );
    publishState(stored);
  });
  client.on("kick", (event) => {
    console.log(
      `[networks] ${config.network}: ${event.kicked} kicked from ${event.channel} by ${event.nick}`
    );
    publishState(stored);
  });
  client.on("quit", (event) => {
    console.log(`[networks] ${config.network}: ${event.nick} quit`);
    publishState(stored);
  });
  client.on("nick", (event) => {
    console.log(
      `[networks] ${config.network}: ${event.nick} -> ${event.new_nick}`
    );
    publishState(stored);
  });
  client.on("topic", (event) => {
    console.log(
      `[networks] ${config.network}: topic for ${event.channel} set to "${event.topic}"`
    );
    publishState(stored);
  });
  client.on("userlist", (event) => {
    console.log(
      `[networks] ${config.network}: userlist for ${event.channel} (${event.users.length} users)`
    );
    publishState(stored);
  });
  client.on("mode", (event) => {
    console.log(
      `[networks] ${config.network}: mode ${event.target}`,
      event.modes
    );
    publishState(stored);
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

export async function loadNetworks() {
  const configs = await getAllNetworkConfigs();
  console.log(`[networks] loading ${configs.length} networks from db`);

  for (const config of configs) {
    const stored = createClient(config);
    networks.set(config.network, stored);

    if (config.enabled) {
      stored.client.connect();
    }
  }
}

// * oRPC handlers

const os = implement(contract);

const list = os.networks.list.handler(() =>
  [...networks.values()].map(getNetworkState)
);

const put = os.networks.put.handler(async ({ input }) => {
  const { config } = input;
  const name = config.network;

  // * persist config to db
  await putNetworkConfig(config);

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

const del = os.networks.delete.handler(async ({ input }) => {
  const stored = networks.get(input.name);
  if (!stored) {
    return { success: false };
  }

  // * remove from db
  await deleteNetworkConfig(input.name);

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
export async function shutdown() {
  const promises: Promise<void>[] = [];

  for (const stored of networks.values()) {
    stored.client.quit();
    promises.push(stored.client.logger.close());
  }

  await Promise.all(promises);
  networks.clear();
}
