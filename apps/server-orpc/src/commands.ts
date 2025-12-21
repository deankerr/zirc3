import { implement } from "@orpc/server";
import type { IRCClient } from "@zirc3/irc-client";
import { contract } from "./contract";
import { getClient } from "./networks";

type CommandError = { success: false; error: string };

type CommandHandler = (
  client: IRCClient,
  args: string[]
) => CommandError | null;

function requireTarget(
  args: string[],
  label: string
): { target: string; rest: string[] } | { error: string } {
  const target = args[0];
  if (!target) return { error: `${label} requires a target` };
  return { target, rest: args.slice(1) };
}

const handlers: Record<string, CommandHandler> = {
  PRIVMSG: (client, args) => {
    const r = requireTarget(args, "PRIVMSG");
    if ("error" in r) return { success: false, error: r.error };
    client.say(r.target, r.rest.join(" "));
    return null;
  },
  NOTICE: (client, args) => {
    const r = requireTarget(args, "NOTICE");
    if ("error" in r) return { success: false, error: r.error };
    client.notice(r.target, r.rest.join(" "));
    return null;
  },
  ACTION: (client, args) => {
    const r = requireTarget(args, "ACTION");
    if ("error" in r) return { success: false, error: r.error };
    client.action(r.target, r.rest.join(" "));
    return null;
  },
  JOIN: (client, args) => {
    const r = requireTarget(args, "JOIN");
    if ("error" in r) return { success: false, error: r.error };
    client.join(r.target, r.rest[0]);
    return null;
  },
  PART: (client, args) => {
    const r = requireTarget(args, "PART");
    if ("error" in r) return { success: false, error: r.error };
    client.part(r.target, r.rest.join(" ") || undefined);
    return null;
  },
  NICK: (client, args) => {
    const r = requireTarget(args, "NICK");
    if ("error" in r) return { success: false, error: r.error };
    client.changeNick(r.target);
    return null;
  },
  TOPIC: (client, args) => {
    const r = requireTarget(args, "TOPIC");
    if ("error" in r) return { success: false, error: r.error };
    client.setTopic(r.target, r.rest.join(" "));
    return null;
  },
  QUIT: (client, args) => {
    client.quit(args.join(" ") || undefined);
    return null;
  },
  CONNECT: (client) => {
    client.connect();
    return null;
  },
  RAW: (client, args) => {
    client.raw(...args);
    return null;
  },
};

const os = implement(contract);

const send = os.commands.send.handler(({ input }) => {
  const { network, command, args } = input;
  console.log(`[commands] ${network}: ${command}`, args);

  const client = getClient(network);
  if (!client) {
    const error = `Network "${network}" not found`;
    console.log(`[commands] error: ${error}`);
    return { success: false, error };
  }

  const handler = handlers[command];
  if (!handler) {
    const error = `Unknown command: ${command}`;
    console.log(`[commands] error: ${error}`);
    return { success: false, error };
  }

  const result = handler(client, args);
  if (result) {
    console.log(`[commands] error: ${result.error}`);
    return result;
  }

  return { success: true };
});

export const commandsRouter = { send };
