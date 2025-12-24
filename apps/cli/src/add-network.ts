import { defineCommand, runMain } from "citty";
import { client } from "./orpc-client";

const main = defineCommand({
  meta: {
    name: "add-network",
    description: "Add or update an IRC network connection",
  },
  args: {
    config: {
      type: "positional",
      description: "JSON config file path, or network name for quick setup",
      required: true,
    },
    host: {
      type: "string",
      description: "IRC server hostname",
      default: "localhost",
    },
    port: {
      type: "string",
      description: "IRC server port",
      default: "6667",
    },
    nick: {
      type: "string",
      description: "Nickname to use",
      default: "zircbot",
    },
    tls: {
      type: "boolean",
      description: "Use TLS/SSL",
      default: false,
    },
    channels: {
      type: "string",
      description: "Channels to auto-join (comma-separated)",
      default: "#test",
    },
  },
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: args
  async run({ args }) {
    // biome-ignore lint/suspicious/noExplicitAny: server validates
    let config: any;

    if (args.config.endsWith(".json")) {
      // * Load config from JSON file
      const file = Bun.file(args.config);
      if (!(await file.exists())) {
        console.error(`File not found: ${args.config}`);
        process.exit(1);
      }
      config = await file.json();
      console.log(`Loading config from ${args.config}...`);
    } else {
      // * Build config from args
      const port = Number.parseInt(args.port, 10);
      if (Number.isNaN(port)) {
        console.error(`Invalid port: ${args.port}`);
        process.exit(1);
      }

      config = {
        network: args.config,
        host: args.host,
        port,
        tls: args.tls,
        nick: args.nick,
        autoJoin: args.channels.split(",").map((c) => c.trim()),
        enabled: true,
      };
    }

    console.log("Config:", config);

    try {
      const result = await client.networks.put({ config });
      console.log(`\nNetwork "${result.network}" added:`);
      console.log(`  Status: ${result.status}`);
      console.log(`  Nick: ${result.user?.nick ?? "(not connected)"}`);
      console.log(
        `  Channels: ${Object.keys(result.channels).join(", ") || "(none)"}`
      );
    } catch (err: unknown) {
      const e = err as {
        data?: { issues?: { path?: string[]; message: string }[] };
        message?: string;
      };
      if (e?.data?.issues) {
        console.error("Validation errors:");
        for (const issue of e.data.issues) {
          const path = issue.path?.join(".") || "(root)";
          console.error(`  ${path}: ${issue.message}`);
        }
      } else {
        console.error(e?.message ?? err);
      }
      process.exit(1);
    }
  },
});

runMain(main);
