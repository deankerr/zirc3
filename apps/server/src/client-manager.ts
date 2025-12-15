import type { NetworkConfig } from "./config";
import { IRCClient } from "./irc/client";
import type { ConnectionEvent } from "./irc/types";
import { RingBuffer } from "./ring-buffer";
import type {
  IRCCommand,
  IRCMessage,
  NetworkStateSync,
  SystemEvent,
} from "./types";

const SYSTEM_BUFFER_SIZE = 100;

export class ClientManager {
  readonly clients = new Map<string, IRCClient>();
  readonly systemBuffer = new RingBuffer<SystemEvent>(SYSTEM_BUFFER_SIZE);
  private readonly messageListeners: Array<(message: IRCMessage) => void> = [];
  private readonly systemListeners: Array<(event: SystemEvent) => void> = [];
  private readonly stateListeners: Array<(state: NetworkStateSync) => void> =
    [];

  addNetwork(network: string, config: NetworkConfig): IRCClient {
    if (this.clients.has(network)) {
      throw new Error(`Network "${network}" already exists`);
    }

    const { channels: autoJoin, quitMessage, ...options } = config;

    const client = new IRCClient({
      network,
      options,
      autoJoin,
      quitMessage,
      onMessage: ({ message }) => {
        this.notifyMessage(message);
      },
      onConnection: ({ client, event }) => {
        this.handleConnection(client, event);
      },
    });

    this.clients.set(network, client);
    client.connect();

    return client;
  }

  removeNetwork(network: string) {
    const client = this.clients.get(network);
    if (client) {
      client.quit();
      this.clients.delete(network);
    }
  }

  onMessage(listener: (message: IRCMessage) => void) {
    this.messageListeners.push(listener);
    return () => {
      const idx = this.messageListeners.indexOf(listener);
      if (idx !== -1) {
        this.messageListeners.splice(idx, 1);
      }
    };
  }

  onSystem(listener: (event: SystemEvent) => void) {
    this.systemListeners.push(listener);
    return () => {
      const idx = this.systemListeners.indexOf(listener);
      if (idx !== -1) {
        this.systemListeners.splice(idx, 1);
      }
    };
  }

  onState(listener: (state: NetworkStateSync) => void) {
    this.stateListeners.push(listener);
    return () => {
      const idx = this.stateListeners.indexOf(listener);
      if (idx !== -1) {
        this.stateListeners.splice(idx, 1);
      }
    };
  }

  // * Handle commands from web clients
  handleCommand(cmd: IRCCommand) {
    const client = this.clients.get(cmd.network);
    if (!client) {
      console.warn(`[command] Unknown network: ${cmd.network}`);
      return;
    }

    const [target = "", ...rest] = cmd.args;
    const text = rest.join(" ");

    switch (cmd.command) {
      case "PRIVMSG":
        return client.say(target, text);
      case "NOTICE":
        return client.notice(target, text);
      case "ACTION":
        return client.action(target, text);
      case "JOIN":
        return client.join(target, rest[0]);
      case "PART":
        return client.part(target, text || undefined);
      case "NICK":
        return client.changeNick(target);
      case "TOPIC":
        return client.setTopic(target, text);
      case "QUIT":
        return client.quit(cmd.args.join(" ") || undefined);
      case "CONNECT":
        return client.connect();
      case "RAW":
        return client.irc.raw(...cmd.args);
      default:
        console.warn(`[command] Unknown command: ${cmd.command}`);
    }
  }

  private notifyMessage(message: IRCMessage) {
    for (const listener of this.messageListeners) {
      listener(message);
    }
  }

  private notifySystem(event: SystemEvent) {
    this.systemBuffer.push(event);
    for (const listener of this.systemListeners) {
      listener(event);
    }
  }

  private notifyState(state: NetworkStateSync) {
    for (const listener of this.stateListeners) {
      listener(state);
    }
  }

  private handleConnection(client: IRCClient, event: ConnectionEvent) {
    const network = client.network;

    // * State change events trigger state sync broadcast
    if (event.type === "user_updated" || event.type === "channel_updated") {
      this.notifyState(client.getNetworkState());
      return;
    }

    // * System events get buffered and broadcast
    const systemEvent: SystemEvent = {
      id: Bun.randomUUIDv7(),
      timestamp: Date.now(),
      network,
      event:
        event.type === "socket_error"
          ? { ...event, error: String(event.error) }
          : event,
    };

    this.notifySystem(systemEvent);

    // * Registered and close events also trigger state sync
    if (event.type === "registered" || event.type === "close") {
      this.notifyState(client.getNetworkState());
    }

    // * Log to console
    switch (event.type) {
      case "registered":
        console.log(`[${network}] Connected and registered`);
        break;
      case "socket_close":
        console.log(`[${network}] Socket closed`, event.error);
        break;
      case "socket_error":
        console.error(`[${network}] Socket error`, event.error);
        break;
      case "reconnecting":
        console.log(`[${network}] Reconnecting (attempt ${event.attempt})`);
        break;
      case "close":
        console.log(`[${network}] Disconnected`);
        break;
      default:
        break;
    }
  }
}
