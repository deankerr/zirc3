import IRC from "irc-framework";
import { IRCChannel } from "./channel";
import { IRCLogger } from "./logger";
import { numerics } from "./numerics";
import type { IRCClientOptions, IRCMessage } from "./types";

// biome-ignore lint/suspicious/noControlCharactersInRegex: CTCP uses 0x01 markers
const CTCP_ACTION = /^\x01ACTION (.*)\x01$/;

const TARGET_COMMANDS = new Set([
  "PRIVMSG",
  "NOTICE",
  "JOIN",
  "PART",
  "MODE",
  "TOPIC",
  "KICK",
  "ACTION",
]);

type TargetInfo = { target: string; context: "channel" | "dm" | "server" };

function extractTarget(args: {
  rawTarget: string;
  isChannel: boolean;
  isNumeric: boolean;
  isTargetCommand: boolean;
  isTargetSelf: boolean;
  source: string;
}): TargetInfo | null {
  const {
    rawTarget,
    isChannel,
    isNumeric,
    isTargetCommand,
    isTargetSelf,
    source,
  } = args;

  // for numerics, extract channel target if first param is a channel
  if (!isTargetCommand && isChannel && isNumeric) {
    return { target: rawTarget, context: "channel" };
  }

  if (!isTargetCommand) return null;

  if (isChannel) {
    return { target: rawTarget, context: "channel" };
  }

  const isFromUser = source.includes("!");
  if (isTargetSelf && isFromUser) {
    // DM: target becomes the sender's nick for grouping/replies
    return { target: source.slice(0, source.indexOf("!")), context: "dm" };
  }

  return { target: rawTarget, context: "server" };
}

function extractSourceNick(source: string): string | null {
  const bangIndex = source.indexOf("!");
  return bangIndex > 0 ? source.slice(0, bangIndex) : null;
}

export class IRCClient extends IRC.Client {
  autoJoin: string[];
  quitMessage?: string;
  readonly channels = new Map<string, IRCChannel>();
  readonly logger: IRCLogger;

  constructor(args: IRCClientOptions) {
    super({
      ...args,
      version: "zirc3",
    });

    this.autoJoin = args.autoJoin ?? [];
    this.quitMessage = args.quitMessage;
    this.logger = new IRCLogger(this, args.logging);

    // * auto-join channels on registration
    this.on("registered", () => {
      for (const channel of this.autoJoin) {
        this.join(channel);
      }
    });

    // * create channel tracker when we join - it subscribes to events itself
    this.on("join", (event) => {
      if (event.nick !== this.user.nick) return;
      const key = event.channel.toLowerCase();
      if (!this.channels.has(key)) {
        this.channels.set(key, new IRCChannel(event.channel, this));
      }
    });

    // * emit parsed messages for all non-ping/pong traffic
    this.connection.on("message", (rawMessage: IRC.IrcMessage) => {
      if (["PING", "PONG"].includes(rawMessage.command)) return;
      this.emit("parsed_message", this.parseMessage(rawMessage));
    });

    // * connection error logging
    this.on("socket close", (err: unknown) => {
      if (err instanceof Error) {
        console.error(`[irc] socket closed with error: ${err.message}`);
      }
    });

    this.on("reconnecting", (event: unknown) => {
      const e = event as { attempt: number; max_retries: number; wait: number };
      console.log(
        `[irc] reconnecting (attempt ${e.attempt}/${e.max_retries}, wait ${e.wait}ms)`
      );
    });

    this.on("close", (hadError: unknown) => {
      console.log(`[irc] connection closed${hadError ? " (with error)" : ""}`);
    });
  }

  getChannel(name: string): IRCChannel | undefined {
    return this.channels.get(name.toLowerCase());
  }

  parseMessage(input: IRC.IrcMessage): IRCMessage {
    const raw = input.toJson();

    const msg: IRCMessage = {
      id: Bun.randomUUIDv7(),
      timestamp: new Date(),
      self: false,
      ...raw,
    };

    // * detect CTCP ACTION (e.g. /me commands)
    // format: PRIVMSG #channel :\x01ACTION does something\x01
    if (msg.command === "PRIVMSG" && msg.params[1]) {
      const actionMatch = CTCP_ACTION.exec(msg.params[1]);
      if (actionMatch?.[1]) {
        msg.command = "ACTION";
        msg.params[1] = actionMatch[1];
      }
    }

    // * map numeric to human-readable name
    const name = numerics[msg.command];
    if (name) {
      msg.numeric = msg.command;
      msg.command = name;

      // * most numerics have our nick as the first param - strip it
      if (msg.params[0] === this.user.nick) {
        msg.params.shift();
      }
    }

    // * check if message is from ourselves
    const sourceNick = extractSourceNick(msg.source);
    msg.self = !!sourceNick && this.caseCompare(sourceNick, this.user.nick);

    // * extract target and determine message context
    const rawTarget = msg.params[0];
    if (rawTarget) {
      const targetInfo = extractTarget({
        rawTarget,
        isChannel: this.network.isChannelName(rawTarget),
        isNumeric: !!msg.numeric,
        isTargetCommand: TARGET_COMMANDS.has(msg.command),
        isTargetSelf: this.caseCompare(rawTarget, this.user.nick),
        source: msg.source,
      });

      if (targetInfo) {
        msg.params.shift();
        msg.target = targetInfo.target;
        msg.context = targetInfo.context;
      }
    }

    return msg;
  }

  connect(options?: Partial<IRCClientOptions>) {
    this.autoJoin = options?.autoJoin ?? this.autoJoin;
    this.quitMessage = options?.quitMessage ?? this.quitMessage;
    super.connect(options);
  }

  quit(message?: string) {
    super.quit(message ?? this.quitMessage);
  }

  // * Emit synthetic outgoing message (for servers without echo-message)
  private emitOutgoing(command: string, target: string, text: string) {
    const isChannel = this.network.isChannelName(target);
    const msg: IRCMessage = {
      id: Bun.randomUUIDv7(),
      timestamp: new Date(),
      command,
      params: [text],
      source: `${this.user.nick}!${this.user.username}@${this.user.host}`,
      tags: {},
      target,
      context: isChannel ? "channel" : "dm",
      self: true,
    };
    this.emit("parsed_message", msg);
  }

  say(target: string, message: string) {
    const result = super.say(target, message);
    this.emitOutgoing("PRIVMSG", target, message);
    return result;
  }

  notice(target: string, message: string) {
    const result = super.notice(target, message);
    this.emitOutgoing("NOTICE", target, message);
    return result;
  }

  action(target: string, message: string) {
    const result = super.action(target, message);
    this.emitOutgoing("ACTION", target, message);
    return result;
  }
}
