import { MemoryPublisher } from "@orpc/experimental-publisher/memory";
import { eventIterator, onError, os } from "@orpc/server";
import type { z } from "zod";
import { SubscribeEvent } from "./contract";

type SubscribeEventType = z.infer<typeof SubscribeEvent>;

// * Publisher instance - exported so network module can publish to it

export const publisher = new MemoryPublisher<{
  event: SubscribeEventType;
}>();

// * Subscribe endpoint - streams IRC messages and state updates to clients

const subscribe = os
  .use(
    onError((error) => {
      console.error("[rpc] subscribe error:", error);
    })
  )
  .output(eventIterator(SubscribeEvent))
  .handler(async function* ({ signal }) {
    const iterator = publisher.subscribe("event", { signal });

    for await (const event of iterator) {
      yield event;
    }
  });

export const eventsRouter = {
  subscribe,
};
