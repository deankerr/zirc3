import IRC from "irc-framework";
import { RingBuffer } from "../ring-buffer";
import type { IRCMessage } from "../types";
import { parseMessage } from "./message";
import type {
  ConnectionEvent,
  ConnectionHandler,
  MessageHandler,
} from "./types";

const DEFAULT_BUFFER_SIZE = 500;

export class IRCClient {
  readonly irc: IRC.Client;
  readonly network: string;
  readonly channels: string[];
  readonly buffers = new Map<string, RingBuffer<IRCMessage>>();

  private readonly onMessage: MessageHandler;
  private readonly onConnection?: ConnectionHandler;

  constructor(args: {
    network: string;
    options: IRC.ClientOptions;
    channels?: string[];
    onMessage: MessageHandler;
    onConnection?: ConnectionHandler;
  }) {
    this.network = args.network;
    this.channels = args.channels ?? [];
    this.onMessage = args.onMessage;
    this.onConnection = args.onConnection;

    this.irc = new IRC.Client({
      ...args.options,
      version: "zirc3",
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // * registered event - auto-join channels
    this.irc.on("registered", () => {
      for (const channel of this.channels) {
        this.irc.join(channel);
      }
      this.emitConnection({ type: "registered" });
    });

    // * message handler - parse and notify
    this.irc.connection.on("message", (rawMessage) => {
      if (["PING", "PONG"].includes(rawMessage.command)) {
        return;
      }

      const message = parseMessage(rawMessage, this.network);

      // * buffer message by target, or network for server messages
      const bufferKey = message.target ?? this.network;
      this.getOrCreateBuffer(bufferKey).push(message);

      this.onMessage({ client: this, message });
    });

    // * connection events
    this.irc.on("socket close", (error) => {
      this.emitConnection({ type: "socket_close", error });
    });

    this.irc.on("socket error", (error) => {
      this.emitConnection({ type: "socket_error", error });
    });

    this.irc.on("reconnecting", (event) => {
      this.emitConnection({
        type: "reconnecting",
        attempt: event.attempt,
        wait: event.wait,
      });
    });

    this.irc.on("close", () => {
      this.emitConnection({ type: "close" });
    });
  }

  private emitConnection(event: ConnectionEvent) {
    this.onConnection?.({ client: this, event });
  }

  private getOrCreateBuffer(target: string) {
    const key = target.toLowerCase();
    let buffer = this.buffers.get(key);
    if (!buffer) {
      buffer = new RingBuffer<IRCMessage>(DEFAULT_BUFFER_SIZE);
      this.buffers.set(key, buffer);
    }
    return buffer;
  }

  connect() {
    this.irc.connect();
  }

  quit(message?: string) {
    this.irc.quit(message);
  }

  // * Convenience methods that delegate to irc client
  say(target: string, message: string) {
    this.irc.say(target, message);
  }

  notice(target: string, message: string) {
    this.irc.notice(target, message);
  }

  action(target: string, message: string) {
    this.irc.action(target, message);
  }

  join(channel: string, key?: string) {
    this.irc.join(channel, key);
  }

  part(channel: string, message?: string) {
    this.irc.part(channel, message);
  }

  changeNick(nick: string) {
    this.irc.changeNick(nick);
  }

  setTopic(channel: string, topic: string) {
    this.irc.setTopic(channel, topic);
  }
}
