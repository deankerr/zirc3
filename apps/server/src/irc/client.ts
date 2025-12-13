import IRC from "irc-framework";

const pingPong = /^(PING |PONG )|^:\S+ (PING|PONG) /;
const CRLF = /\r?\n$/;

export function createLogger(filename: string) {
  const file = Bun.file(filename);
  const writer = file.writer({ highWaterMark: 512 });

  return {
    write(line: string) {
      writer.write(`${new Date().toISOString()} ${line.replace(CRLF, "")}\n`);
    },
    flush() {
      return writer.flush();
    },
    end() {
      return writer.end();
    },
  };
}

export function createIRCClient(options: IRC.ClientOptions) {
  const clientOptions = {
    ...options,
    version: "zirc3",
  };

  const client = new IRC.Client(clientOptions);

  client.on("debug", (event) => {
    console.log("[debug]", event);
  });

  const logFilename = [
    "raw",
    options.host ?? "unknown",
    new Date().toISOString(),
    ".log",
  ].join("_");
  const onRawLogger = createLogger(logFilename);

  client.on("raw", ({ line, from_server }) => {
    if (pingPong.test(line)) {
      return;
    }

    if (from_server) {
      onRawLogger.write(line);
    } else {
      onRawLogger.write(`--> ${line}`);
    }
  });

  return client;
}
