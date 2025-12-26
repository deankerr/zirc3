import { createWriteStream, mkdirSync, type WriteStream } from "node:fs";
import type IRC from "irc-framework";
import { formatMessage } from "./format";
import type { IRCMessage, LoggerOptions } from "./types";

type Destination = {
  filePath: string;
  stream?: WriteStream;
};

const DIR_REGEX = /\/[^/]+$/;

function getStream(dest: Destination): WriteStream {
  if (!dest.stream) {
    mkdirSync(dest.filePath.replace(DIR_REGEX, ""), { recursive: true });
    dest.stream = createWriteStream(dest.filePath, { flags: "a" });
  }
  return dest.stream;
}

export class IRCLogger {
  private readonly client: IRC.Client;
  private readonly targets = new Map<string, Destination>();
  private server?: Destination;
  private raw?: Destination;

  readonly dir: string;
  readonly console: boolean;

  constructor(client: IRC.Client, options: LoggerOptions = {}) {
    this.client = client;
    this.dir = options.dir ?? "./logs";
    this.console = options.console ?? false;

    // * subscribe to events
    this.client.on("parsed_message", (msg) => this.handleMessage(msg));

    if (options.raw) {
      this.client.connection.on("message", (msg) => {
        if (msg.command === "PING" || msg.command === "PONG") return;
        this.logRaw(msg.to1459());
      });
    }
  }

  private getHostname(): string {
    return this.client.options.host ?? "server";
  }

  private handleMessage(msg: IRCMessage) {
    const line = formatMessage(msg);
    if (!line) return;

    if (msg.target) {
      this.logTarget(msg.target, line);
    } else {
      this.logServer(line);
    }
  }

  private logTarget(target: string, line: string) {
    const key = target.toLowerCase();
    let dest = this.targets.get(key);

    if (!dest) {
      const hostname = this.getHostname();
      dest = { filePath: `${this.dir}/${hostname}/${target}.log` };
      this.targets.set(key, dest);
    }

    if (this.console) console.log(line);
    getStream(dest).write(`${line}\n`);
  }

  private logServer(line: string) {
    if (!this.server) {
      const hostname = this.getHostname();
      this.server = { filePath: `${this.dir}/${hostname}/server.log` };
    }

    if (this.console) console.log(line);
    getStream(this.server).write(`${line}\n`);
  }

  private logRaw(rawLine: string) {
    if (!this.raw) {
      const hostname = this.getHostname();
      this.raw = { filePath: `${this.dir}/${hostname}/raw.log` };
    }

    getStream(this.raw).write(`${rawLine}\n`);
  }

  close() {
    for (const dest of this.targets.values()) {
      dest.stream?.end();
    }
    this.server?.stream?.end();
    this.raw?.stream?.end();
  }
}
