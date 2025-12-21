import { defineCommand, runMain } from "citty";
import { client } from "./orpc-client";

const main = defineCommand({
  meta: {
    name: "send-command",
    description: "Send an IRC command to a network",
  },
  args: {
    network: {
      type: "positional",
      description: "Network name",
      required: true,
    },
    command: {
      type: "positional",
      description: "IRC command (PRIVMSG, JOIN, PART, NICK, etc.)",
      required: true,
    },
    args: {
      type: "positional",
      description: "Command arguments",
      required: false,
    },
  },
  async run({ args, rawArgs }) {
    // rawArgs contains everything after the command
    const cmdArgs = rawArgs.slice(2);

    console.log(`Sending: ${args.command.toUpperCase()}`, cmdArgs);

    const result = await client.commands.send({
      network: args.network,
      command: args.command.toUpperCase(),
      args: cmdArgs,
    });

    if (result.success) {
      console.log("Command sent successfully");
    } else {
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }
  },
});

runMain(main);
