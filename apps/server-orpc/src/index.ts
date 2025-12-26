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

// * CORS configuration
const corsOrigins = process.env.CORS_ORIGINS;
const corsPlugin = corsOrigins
  ? new CORSPlugin({ origin: corsOrigins.split(",").map((o) => o.trim()) })
  : new CORSPlugin(); // defaults to allow all

const handler = new RPCHandler(router, {
  plugins: [corsPlugin],
});

initDb();
loadNetworks();

// * Server configuration
const SERVER_PORT = Number(process.env.SERVER_PORT) || 3001;
const SERVER_HOST = process.env.SERVER_HOST ?? "0.0.0.0";

const server = Bun.serve({
  port: SERVER_PORT,
  hostname: SERVER_HOST,
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

console.log(`[server] listening on http://${server.hostname}:${server.port}`);

const handleSignal = (signal: string) => {
  console.log(`\n${signal} received, shutting down...`);
  shutdown();
  console.log("Shutdown complete");
  process.exit(0);
};

process.on("SIGTERM", () => handleSignal("SIGTERM"));
process.on("SIGINT", () => handleSignal("SIGINT"));
