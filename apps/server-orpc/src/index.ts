import { RPCHandler } from "@orpc/server/fetch";
import { CORSPlugin } from "@orpc/server/plugins";
import { commandsRouter } from "./commands";
import { initDb } from "./db";
import { eventsRouter } from "./events";
import { messagesRouter } from "./messages";
import { loadNetworks, networksRouter, shutdown } from "./networks";

export const router = {
  networks: networksRouter,
  messages: messagesRouter,
  commands: commandsRouter,
  ...eventsRouter,
};

const handler = new RPCHandler(router, {
  plugins: [new CORSPlugin()],
});

initDb();
loadNetworks();

const server = Bun.serve({
  port: 3001,
  async fetch(request: Request) {
    // Health check
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ status: "ok" });
    }

    const { matched, response } = await handler.handle(request, {
      prefix: "/rpc",
    });

    if (matched) {
      return response;
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`server-orpc listening on http://localhost:${server.port}`);

const handleSignal = (signal: string) => {
  console.log(`\n${signal} received, shutting down...`);
  shutdown();
  console.log("Shutdown complete");
  process.exit(0);
};

process.on("SIGTERM", () => handleSignal("SIGTERM"));
process.on("SIGINT", () => handleSignal("SIGINT"));
