import { client } from "./orpc-client";

const [network, target] = process.argv.slice(2);

if (!network || !target) {
  console.log("Usage: bun run list-messages <network> <target>");
  console.log("Example: bun run list-messages local #test");
  process.exit(1);
}

const result = await client.messages.list({
  network,
  target,
  limit: 20,
});

console.log(`Messages for ${target} on ${network}:`);
console.log(`  Has more: ${result.hasMore}`);
console.log(`  Oldest ID: ${result.oldestId ?? "(none)"}`);
console.log("");

for (const msg of result.messages) {
  const time = msg.timestamp.toLocaleTimeString();
  console.log(
    `[${time}] <${msg.source}> ${msg.command}: ${msg.params.join(" ")}`
  );
}

if (result.messages.length === 0) {
  console.log("(no messages)");
}
