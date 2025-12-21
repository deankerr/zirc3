import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { router } from "@zirc3/server-orpc";

const SERVER_URL = process.env.ORPC_URL ?? "http://localhost:3001/rpc";

const link = new RPCLink({
  url: SERVER_URL,
});

export const client: RouterClient<typeof router> = createORPCClient(link);

export { SERVER_URL };
