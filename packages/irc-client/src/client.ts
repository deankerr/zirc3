import IRC from "irc-framework";
import { IRCChannel } from "./channel";
import { IRCLogger } from "./logger";
import { numerics } from "./numerics";
import type {
  IRCClientOptions,
  IRCMessage,
  MessageContext,
  MessageMeta,
} from "./types";

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

const CONTENT_COMMANDS = new Set(["PRIVMSG", "ACTION", "NOTICE"]);

type TargetInfo = { target: string; context: MessageContext };

function extractTarget(args: {
  rawTarget: string;
  isChannel: boolean;
  isNumeric: boolean;
  isTargetCommand: boolean;
  isTargetSelf: boolean;
  sourceNick: string | null;
}): TargetInfo | null {
  const {
    rawTarget,
    isChannel,
    isNumeric,
    isTargetCommand,
    isTargetSelf,
    sourceNick,
  } = args;

  // for numerics, extract channel target if first param is a channel
  if (!isTargetCommand && isChannel && isNumeric) {
    return { target: rawTarget, context: "channel" };
  }

  if (!isTargetCommand) return null;

  if (isChannel) {
    return { target: rawTarget, context: "channel" };
  }

  if (isTargetSelf && sourceNick) {
    // DM: target becomes the sender's nick for grouping/replies
    return { target: sourceNick, context: "dm" };
  }

  return { target: rawTarget, context: "server" };
}

// * Parse source string: "nick!ident@hostname" or just "servername"
function parseSource(source: string): {
  nick: string;
  ident?: string;
  hostname?: string;
} {
  const bangIndex = source.indexOf("!");
  if (bangIndex === -1) {
    return { nick: source };
  }

  const nick = source.slice(0, bangIndex);
  const rest = source.slice(bangIndex + 1);
  const atIndex = rest.indexOf("@");

  if (atIndex === -1) {
    return { nick, ident: rest };
  }

  return {
    nick,
    ident: rest.slice(0, atIndex),
    hostname: rest.slice(atIndex + 1),
  };
}

function lookupSenderModes(
  client: IRCClient,
  context: MessageContext | undefined,
  target: string | undefined,
  nick: string | undefined
): string[] | undefined {
  if (context !== "channel" || !target || !nick) return undefined;
  const channel = client.channels.get(target.toLowerCase());
  const member = channel?.users.find((u) => client.caseCompare(u.nick, nick));
  return member?.modes.length ? member.modes : undefined;
}

// * Detect and transform CTCP ACTION
function detectAction(
  command: string,
  params: string[]
): { command: string; params: string[] } {
  if (command !== "PRIVMSG" || !params[1]) {
    return { command, params };
  }
  const actionMatch = CTCP_ACTION.exec(params[1]);
  if (!actionMatch?.[1]) {
    return { command, params };
  }
  const newParams = [...params];
  newParams[1] = actionMatch[1];
  return { command: "ACTION", params: newParams };
}

// * Resolve numeric command to human-readable name
function resolveNumeric(
  command: string,
  params: string[],
  userNick: string
): { command: string; params: string[]; numeric?: string } {
  const numericName = numerics[command];
  if (!numericName) {
    return { command, params };
  }
  const newParams = params[0] === userNick ? params.slice(1) : params;
  return { command: numericName, params: newParams, numeric: command };
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

    // * connection lifecycle events → synthetic messages
    this.on("connecting", () => {
      const host = this.options.host ?? "unknown";
      const port = this.options.port ?? 6667;
      this.emitSynthetic("NET_CONNECTING", `${host}:${port}`);
    });

    this.on("registered", () => {
      this.emitSynthetic("NET_CONNECTED", this.user.nick);
    });

    this.on("socket close", (err: unknown) => {
      // * err can be: Error object, false, or undefined
      let content: string | undefined;
      if (err instanceof Error) {
        content = err.message;
      } else if (err && err !== false) {
        content = String(err);
      }
      console.log("[irc] socket close:", content ?? "(clean)");
      this.emitSynthetic("NET_CLOSE", content);
    });

    // * Note: irc-framework's transport does NOT emit socket error events
    // * (the emit is commented out in transports/net.js). Errors come through
    // * socket close instead. Keep these handlers in case behavior changes.
    this.on("socket error", (err: unknown) => {
      console.error("[irc] socket error:", err);
      const content = err instanceof Error ? err.message : String(err);
      this.emitSynthetic("NET_ERROR", content);
    });

    this.connection.on("error", (err: unknown) => {
      console.error("[irc] connection error:", err);
      const content = err instanceof Error ? err.message : String(err);
      this.emitSynthetic("NET_ERROR", content);
    });

    // * Note: irc-framework only fires reconnecting AFTER a successful initial
    // * connection that later drops. It won't retry failed initial connections.
    this.on("reconnecting", (event: unknown) => {
      const e = event as { attempt: number; max_retries: number; wait: number };
      console.log(
        `[irc] reconnecting (attempt ${e.attempt}/${e.max_retries}, wait ${e.wait}ms)`
      );
      this.emitSynthetic(
        "NET_RECONNECTING",
        `attempt ${e.attempt}/${e.max_retries}, waiting ${e.wait}ms`
      );
    });

    this.on("close", () => {
      console.log("[irc] connection closed");
      this.emitSynthetic("NET_DISCONNECTED", undefined);
    });
  }

  getChannel(name: string): IRCChannel | undefined {
    return this.channels.get(name.toLowerCase());
  }

  parseMessage(input: IRC.IrcMessage): IRCMessage {
    const raw = input.toJson();

    // * transform command/params through helpers
    const action = detectAction(raw.command, [...raw.params]);
    const resolved = resolveNumeric(
      action.command,
      action.params,
      this.user.nick
    );
    const { command, numeric } = resolved;
    const params = [...resolved.params];

    // * parse source into nick + ident/hostname
    const { nick: sourceNick, ident, hostname } = parseSource(raw.source);

    // * check if message is from ourselves
    const self =
      !raw.source ||
      (!!sourceNick && this.caseCompare(sourceNick, this.user.nick));

    // * extract target and determine message context
    const {
      target,
      context,
      params: remainingParams,
    } = this.extractTargetInfo(command, params, sourceNick, !!numeric);

    // * extract content for message commands
    const content = CONTENT_COMMANDS.has(command)
      ? remainingParams[0]
      : undefined;

    // * capture sender's channel modes at message time
    const modes = lookupSenderModes(this, context, target, sourceNick);

    // * build meta object
    const meta: MessageMeta = { params: remainingParams, tags: raw.tags };
    if (ident) meta.ident = ident;
    if (hostname) meta.hostname = hostname;
    if (context) meta.context = context;
    if (modes) meta.modes = modes;
    if (numeric) meta.numeric = numeric;

    return {
      id: Bun.randomUUIDv7(),
      timestamp: new Date(),
      command,
      target,
      source: sourceNick || undefined,
      content,
      self,
      meta,
    };
  }

  private extractTargetInfo(
    command: string,
    params: string[],
    sourceNick: string | undefined,
    isNumeric: boolean
  ): { target?: string; context?: MessageContext; params: string[] } {
    const rawTarget = params[0];
    if (!rawTarget) {
      return { params };
    }

    const targetInfo = extractTarget({
      rawTarget,
      isChannel: this.network.isChannelName(rawTarget),
      isNumeric,
      isTargetCommand: TARGET_COMMANDS.has(command),
      isTargetSelf: this.caseCompare(rawTarget, this.user.nick),
      sourceNick: sourceNick || null,
    });

    if (!targetInfo) {
      return { params };
    }

    return {
      target: targetInfo.target,
      context: targetInfo.context,
      params: params.slice(1),
    };
  }

  connect(options?: Partial<IRCClientOptions>) {
    this.autoJoin = options?.autoJoin ?? this.autoJoin;
    this.quitMessage = options?.quitMessage ?? this.quitMessage;
    super.connect(options);
  }

  quit(message?: string) {
    super.quit(message ?? this.quitMessage);
  }

  // * Emit synthetic connection status message
  private emitSynthetic(command: string, content?: string) {
    const msg: IRCMessage = {
      id: Bun.randomUUIDv7(),
      timestamp: new Date(),
      command,
      target: undefined,
      source: undefined,
      content,
      self: false,
      meta: { context: "server" },
    };
    this.emit("parsed_message", msg);
  }

  // * Emit synthetic outgoing message (for servers without echo-message)
  private emitOutgoing(command: string, target: string, text: string) {
    const isChannel = this.network.isChannelName(target);
    const context: MessageContext = isChannel ? "channel" : "dm";
    const modes = lookupSenderModes(this, context, target, this.user.nick);

    const meta: MessageMeta = {
      params: [text],
      tags: {},
      context,
      ident: this.user.username,
      hostname: this.user.host,
    };
    if (modes) meta.modes = modes;

    const msg: IRCMessage = {
      id: Bun.randomUUIDv7(),
      timestamp: new Date(),
      command,
      target,
      source: this.user.nick,
      content: text,
      self: true,
      meta,
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
