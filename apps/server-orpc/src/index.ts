import { cors } from "@elysiajs/cors";
import { RPCHandler } from "@orpc/server/fetch";
import { Elysia } from "elysia";
import { commandsRouter } from "./commands";
import { eventsRouter } from "./events";
import { messagesRouter } from "./messages";
import { networksRouter, shutdown } from "./networks";

export const router = {
  networks: networksRouter,
  messages: messagesRouter,
  commands: commandsRouter,
  ...eventsRouter,
};

const handler = new RPCHandler(router);

export const app = new Elysia()
  .use(cors())
  .all(
    "/rpc/*",
    async ({ request }) => {
      const { response } = await handler.handle(request, {
        prefix: "/rpc",
      });
      return response ?? new Response("Not Found", { status: 404 });
    },
    { parse: "none" }
  )
  .get("/health", () => ({ status: "ok" }));

if (import.meta.main) {
  app.listen(3001);
  console.log("server-orpc listening on http://localhost:3001");

  const handleSignal = async (signal: string) => {
    console.log(`\n${signal} received, shutting down...`);
    await shutdown();
    console.log("Shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => handleSignal("SIGTERM"));
  process.on("SIGINT", () => handleSignal("SIGINT"));
}
