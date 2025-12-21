import { mkdirSync } from "node:fs";
import { formatMessage } from "./format";
import type { IRCClientLike, IRCMessage, LoggerOptions } from "./types";

type Writer = ReturnType<typeof Bun.file.prototype.writer>;

type Destination = {
  filePath: string;
  writer?: Writer;
};

const DIR_REGEX = /\/[^/]+$/;

function getWriter(dest: Destination): Writer {
  if (!dest.writer) {
    mkdirSync(dest.filePath.replace(DIR_REGEX, ""), { recursive: true });
    dest.writer = Bun.file(dest.filePath).writer();
  }
  return dest.writer;
}

export class IRCLogger {
  private readonly client: IRCClientLike;
  private readonly targets = new Map<string, Destination>();
  private server?: Destination;
  private raw?: Destination;

  readonly dir: string;
  readonly console: boolean;

  constructor(client: IRCClientLike, options: LoggerOptions = {}) {
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
    return (
      (this.client as { options?: { host?: string } }).options?.host ?? "server"
    );
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
    getWriter(dest).write(`${line}\n`);
  }

  private logServer(line: string) {
    if (!this.server) {
      const hostname = this.getHostname();
      this.server = { filePath: `${this.dir}/${hostname}/server.log` };
    }

    if (this.console) console.log(line);
    getWriter(this.server).write(`${line}\n`);
  }

  private logRaw(rawLine: string) {
    if (!this.raw) {
      const hostname = this.getHostname();
      this.raw = { filePath: `${this.dir}/${hostname}/raw.log` };
    }

    getWriter(this.raw).write(`${rawLine}\n`);
  }

  async close() {
    const promises: Promise<unknown>[] = [];
    for (const dest of this.targets.values()) {
      if (dest.writer) promises.push(dest.writer.end());
    }
    if (this.server?.writer) promises.push(this.server.writer.end());
    if (this.raw?.writer) promises.push(this.raw.writer.end());
    await Promise.all(promises);
  }
}
