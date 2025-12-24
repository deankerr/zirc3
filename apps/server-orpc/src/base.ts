import { implement, onError } from "@orpc/server";
import { contract } from "./contract";

// * Base implementer with error logging middleware
// * All routers should use this instead of calling implement(contract) directly

export const os = implement(contract).use(
  onError((error) => {
    console.error("[rpc] procedure error:", error);
  })
);
