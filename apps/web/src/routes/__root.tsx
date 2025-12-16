import { createRootRouteWithContext, Outlet } from "@tanstack/solid-router";
import { onCleanup, onMount } from "solid-js";
import {
  api,
  type EventMessage,
  type IRCCommand,
  type NetworkStateSync,
} from "@/api";
import { Header } from "@/components/header";
import { NetworkTabs } from "@/components/network-tabs";
import {
  getBufferType,
  getMessageBufferId,
  ircMessageToLine,
  systemEventToLine,
} from "@/lib/line-converter";
import { StoreProvider, SYSTEM_BUFFER_ID, useStore } from "@/store";
import { type Actions, createActions } from "@/store/actions";

// biome-ignore lint/complexity/noBannedTypes: TanStack Router convention
export type RouterContext = {};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

// * WebSocket instance shared via closure
let ws: ReturnType<typeof api.events.subscribe> | undefined;

function sendCommand(cmd: IRCCommand) {
  if (!ws) {
    console.error("[ws] not connected, cannot send command");
    return;
  }
  ws.send({ type: "irc", data: cmd });
}

function RootComponent() {
  return (
    <StoreProvider sendCommand={sendCommand}>
      <AppShell />
    </StoreProvider>
  );
}

function handleNetworksMessage(actions: Actions, data: { name: string }[]) {
  actions.setNetworks(data.map((n) => n.name));
  for (const network of data) {
    const serverId = `${network.name}:*`;
    actions.ensureBuffer({
      id: serverId,
      type: "server",
      network: network.name,
      target: "*",
    });
  }
}

function handleIrcMessage(
  actions: Actions,
  msg: EventMessage & { type: "irc" }
) {
  const ircMsg = msg.data;
  const bufferId = getMessageBufferId(ircMsg);
  const target = ircMsg.target ?? "*";
  const bufferType = getBufferType(target);

  actions.ensureBuffer({
    id: bufferId,
    type: bufferType,
    network: ircMsg.network,
    target,
  });

  actions.addLine(bufferId, ircMessageToLine(ircMsg));
}

function handleSystemMessage(
  actions: Actions,
  msg: EventMessage & { type: "system" }
) {
  const evt = msg.data;
  actions.addLine(SYSTEM_BUFFER_ID, systemEventToLine(evt));
}

function handleStateMessage(actions: Actions, state: NetworkStateSync) {
  actions.syncNetworkState(state);
}

function AppShell() {
  const { store, setStore } = useStore();
  const actions = createActions(setStore);

  // * Debug: dump store to console
  if (typeof window !== "undefined") {
    (window as unknown as { dumpStore: () => void }).dumpStore = () => {
      console.log("Store:", JSON.parse(JSON.stringify(store)));
    };
  }

  onMount(() => {
    actions.setConnectionStatus("connecting");
    ws = api.events.subscribe();

    ws.on("open", () => {
      actions.setConnectionStatus("connected");
      actions.addLine(SYSTEM_BUFFER_ID, {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: "system",
        source: "client",
        content: "Connected to server",
      });
    });

    ws.on("close", () => {
      actions.setConnectionStatus("disconnected");
      actions.addLine(SYSTEM_BUFFER_ID, {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: "quit",
        source: "client",
        content: "Disconnected from server",
      });
    });

    ws.on("error", (err) => {
      console.error("[ws] error", err);
      actions.setConnectionStatus("disconnected");
      actions.addLine(SYSTEM_BUFFER_ID, {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: "error",
        source: "client",
        content: `Connection error: ${String(err)}`,
      });
    });

    ws.subscribe(({ data: msg }) => {
      console.log("[ws:recv]", msg.type, msg.data);
      if (msg.type === "networks") {
        handleNetworksMessage(actions, msg.data);
      } else if (msg.type === "irc") {
        handleIrcMessage(actions, msg);
      } else if (msg.type === "system") {
        handleSystemMessage(actions, msg);
      } else if (msg.type === "state") {
        handleStateMessage(actions, msg.data);
      }
    });
  });

  onCleanup(() => {
    ws?.close();
    ws = undefined;
  });

  return (
    <div class="grid h-svh grid-rows-[auto_auto_1fr] overflow-hidden">
      <Header />
      <NetworkTabs />
      <Outlet />
    </div>
  );
}
