import { defineCommand, runMain } from "citty";
import { client } from "./orpc-client";

const main = defineCommand({
  meta: {
    name: "delete-network",
    description: "Delete an IRC network connection",
  },
  args: {
    name: {
      type: "positional",
      description: "Network name to delete",
      required: true,
    },
  },
  async run({ args }) {
    console.log(`Deleting network "${args.name}"...`);

    const result = await client.networks.delete({ name: args.name });

    if (result.success) {
      console.log("Network deleted.");
    } else {
      console.log("Network not found.");
      process.exit(1);
    }
  },
});

runMain(main);
