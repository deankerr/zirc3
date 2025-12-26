import { defineCommand, runMain } from "citty";
import { client, SERVER_URL } from "./orpc-client";

function formatTimestamp(ts: Date) {
  return ts.toLocaleTimeString();
}

const main = defineCommand({
  meta: {
    name: "subscribe",
    description: "Subscribe to real-time IRC events from the server",
  },
  args: {
    json: {
      type: "boolean",
      description: "Output events as JSON",
      default: false,
    },
  },
  async run({ args }) {
    console.log(`Connecting to ${SERVER_URL}...`);

    const iterator = await client.subscribe();

    console.log("Subscribed! Waiting for events...\n");

    for await (const event of iterator) {
      if (args.json) {
        console.log(JSON.stringify(event));
        continue;
      }

      if (event.type === "irc") {
        const msg = event.data;
        const target = msg.target ?? "server";
        const prefix = msg.self ? ">" : "<";
        const text = msg.content ?? msg.meta?.params?.join(" ") ?? "";
        console.log(
          `[${msg.network}:${target}]`,
          formatTimestamp(msg.timestamp),
          msg.command,
          `${prefix}${msg.source}>`,
          text
        );
      } else if (event.type === "state") {
        const state = event.data;
        console.log(
          `[${state.network}] state:`,
          state.status,
          `channels: ${Object.keys(state.channels).join(", ") || "(none)"}`
        );
      }
    }
  },
});

runMain(main);
