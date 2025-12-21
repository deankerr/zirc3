import { defineCommand, runMain } from "citty";
import { client } from "./orpc-client";

const main = defineCommand({
  meta: {
    name: "list-networks",
    description: "List all configured IRC networks",
  },
  args: {
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
  },
  async run({ args }) {
    const networks = await client.networks.list();

    if (args.json) {
      console.log(JSON.stringify(networks, null, 2));
      return;
    }

    if (networks.length === 0) {
      console.log("No networks configured.");
      return;
    }

    console.log(`${networks.length} network(s):\n`);

    for (const net of networks) {
      console.log(`[${net.network}] ${net.status}`);
      console.log(`  Host: ${net.config.host}:${net.config.port}`);
      if (net.user) {
        console.log(`  Nick: ${net.user.nick}`);
      }
      const channelNames = Object.keys(net.channels);
      if (channelNames.length > 0) {
        console.log(`  Channels: ${channelNames.join(", ")}`);
      }
      console.log();
    }
  },
});

runMain(main);
