import { mkdirSync } from "node:fs";
import IRC from "irc-framework";
import { RingBuffer } from "../ring-buffer";
import type { IRCMessage } from "../types";
import { IRCChannel } from "./channel";
import { parseMessage } from "./message";
import type {
  ConnectionEvent,
  ConnectionHandler,
  MessageHandler,
} from "./types";

const DEFAULT_BUFFER_SIZE = 500;
const LOG_DIR = "logs";

export class IRCClient {
  readonly irc: IRC.Client;
  readonly network: string;
  readonly autoJoin: string[];
  readonly buffers = new Map<string, RingBuffer<IRCMessage>>();
  readonly channels = new Map<string, IRCChannel>();

  private readonly onMessage: MessageHandler;
  private readonly onConnection?: ConnectionHandler;
  private readonly quitMessage?: string;
  private logWriter: ReturnType<ReturnType<typeof Bun.file>["writer"]> | null =
    null;

  constructor(args: {
    network: string;
    options: IRC.ClientOptions;
    autoJoin?: string[];
    quitMessage?: string;
    onMessage: MessageHandler;
    onConnection?: ConnectionHandler;
  }) {
    this.network = args.network;
    this.autoJoin = args.autoJoin ?? [];
    this.quitMessage = args.quitMessage;
    this.onMessage = args.onMessage;
    this.onConnection = args.onConnection;

    this.irc = new IRC.Client({
      ...args.options,
      version: "zirc3",
    });

    this.initLogFile();
    this.setupEventHandlers();
  }

  private initLogFile() {
    mkdirSync(LOG_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${LOG_DIR}/${this.network}_${timestamp}.log`;
    this.logWriter = Bun.file(filename).writer();
  }

  private setupEventHandlers() {
    // * registered event - auto-join channels and send user info
    this.irc.on("registered", () => {
      for (const channel of this.autoJoin) {
        this.irc.join(channel);
      }
      this.emitConnection({ type: "registered", user: this.getUserInfo() });
    });

    // * user update events
    this.irc.on("nick", (event) => {
      // update nick in all channels
      for (const [key, channel] of this.channels) {
        if (channel.handleNick(event.nick, event.new_nick)) {
          this.emitChannelUpdate(key);
        }
      }
      this.emitConnection({ type: "user_updated", user: this.getUserInfo() });
    });

    this.irc.on("mode", (event) => {
      // channel mode change
      if (event.target.startsWith("#")) {
        const channel = this.channels.get(event.target.toLowerCase());
        if (channel) {
          channel.handleMode(event.modes, this.getPrefixModes());
          this.emitChannelUpdate(event.target);
        }
        return;
      }
      // user mode change
      if (event.target === this.irc.user.nick) {
        this.emitConnection({ type: "user_updated", user: this.getUserInfo() });
      }
    });

    this.irc.on("wholist", () => {
      this.emitConnection({ type: "user_updated", user: this.getUserInfo() });
    });

    this.irc.on("away", () => {
      this.emitConnection({ type: "user_updated", user: this.getUserInfo() });
    });

    this.irc.on("back", () => {
      this.emitConnection({ type: "user_updated", user: this.getUserInfo() });
    });

    // * channel state events
    this.irc.on("join", (event) => {
      const isSelf = event.nick === this.irc.user.nick;
      const channel = this.getOrCreateChannel(event.channel);
      channel.handleJoin(event, isSelf);
      this.emitChannelUpdate(event.channel);
    });

    this.irc.on("part", (event) => {
      const isSelf = event.nick === this.irc.user.nick;
      const channel = this.channels.get(event.channel.toLowerCase());
      if (channel) {
        channel.handlePart(event.nick, isSelf);
        this.emitChannelUpdate(event.channel);
      }
    });

    this.irc.on("kick", (event) => {
      const { channel: channelName, kicked } = event;
      if (!channelName) {
        return;
      }
      if (!kicked) {
        return;
      }
      const isSelf = kicked === this.irc.user.nick;
      const channel = this.channels.get(channelName.toLowerCase());
      if (channel) {
        channel.handleKick(kicked, isSelf);
        this.emitChannelUpdate(channelName);
      }
    });

    this.irc.on("quit", (event) => {
      for (const [key, channel] of this.channels) {
        if (channel.handleQuit(event.nick)) {
          this.emitChannelUpdate(key);
        }
      }
    });

    this.irc.on("userlist", (event) => {
      const channel = this.channels.get(event.channel.toLowerCase());
      if (channel) {
        channel.handleUserlist(event.users);
        this.emitChannelUpdate(event.channel);
      }
    });

    this.irc.on("topic", (event) => {
      const channel = this.channels.get(event.channel.toLowerCase());
      if (channel) {
        channel.handleTopic(event.topic, event.nick, event.time);
        this.emitChannelUpdate(event.channel);
      }
    });

    this.irc.on("topicsetby", (event) => {
      const channel = this.channels.get(event.channel.toLowerCase());
      if (channel) {
        channel.handleTopicSetBy(event.nick, event.when);
        this.emitChannelUpdate(event.channel);
      }
    });

    this.irc.on("channel info", (event) => {
      const channel = this.channels.get(event.channel.toLowerCase());
      if (channel) {
        channel.handleChannelInfo(event.modes);
        this.emitChannelUpdate(event.channel);
      }
    });

    // * message handler - parse and notify
    this.irc.connection.on("message", (rawMessage) => {
      if (["PING", "PONG"].includes(rawMessage.command)) {
        return;
      }

      const rawLine = rawMessage.to1459();
      this.logWriter?.write(`${rawLine}\n`);

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

  private getUserInfo() {
    const user = this.irc.user;
    return {
      nick: user.nick,
      username: user.username,
      host: user.host,
      away: user.away,
      modes: [...user.modes],
    };
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

  private getOrCreateChannel(name: string) {
    const key = name.toLowerCase();
    let channel = this.channels.get(key);
    if (!channel) {
      channel = new IRCChannel(name, this.irc.caseCompare.bind(this.irc));
      this.channels.set(key, channel);
    }
    return channel;
  }

  private emitChannelUpdate(name: string) {
    const channel = this.channels.get(name.toLowerCase());
    if (channel) {
      this.emitConnection({
        type: "channel_updated",
        channel: channel.getState(),
      });
    }
  }

  private getPrefixModes(): string[] {
    return this.irc.network.options.PREFIX?.map((p) => p.mode) ?? [];
  }

  connect() {
    this.irc.connect();
  }

  quit(message?: string) {
    this.irc.quit(message ?? this.quitMessage);
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
