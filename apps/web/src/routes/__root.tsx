import { createRootRouteWithContext, Outlet } from "@tanstack/solid-router";
import { onCleanup, onMount } from "solid-js";
import {
  client,
  type IRCCommandType,
  type IRCMessageType,
  type NetworkStateType,
} from "@/api";
import { Header } from "@/components/header";
import { NetworkTabs } from "@/components/network-tabs";
import {
  getBufferType,
  getMessageBufferId,
  ircMessageToLine,
} from "@/lib/line-converter";
import { StoreProvider, SYSTEM_BUFFER_ID, useStore } from "@/store";
import { type Actions, createActions } from "@/store/actions";

const INITIAL_MESSAGE_LIMIT = 50;

// biome-ignore lint/complexity/noBannedTypes: TanStack Router convention
export type RouterContext = {};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

// * Command sender using RPC
async function sendCommand(cmd: IRCCommandType) {
  console.log("[commands] sending:", cmd);
  try {
    const result = await client.commands.send(cmd);
    if (!result.success && result.error) {
      console.error("[commands] error:", result.error);
    }
    return result;
  } catch (err) {
    console.error("[commands] request failed:", err);
    return { success: false as const, error: String(err) };
  }
}

function RootComponent() {
  return (
    <StoreProvider sendCommand={sendCommand}>
      <AppShell />
    </StoreProvider>
  );
}

type BufferTarget = { network: string; target: string; bufferId: string };

function addSystemLine(actions: Actions, content: string) {
  actions.addLine(SYSTEM_BUFFER_ID, {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    type: "system",
    source: "client",
    content,
  });
}

async function fetchInitialMessages(actions: Actions, buffers: BufferTarget[]) {
  if (buffers.length === 0) return;

  await Promise.all(
    buffers.map(async ({ network, target, bufferId }) => {
      const label =
        target === "*" ? `${network} (server)` : `${network}/${target}`;
      try {
        const { messages } = await client.messages.list({
          network,
          target,
          limit: INITIAL_MESSAGE_LIMIT,
        });
        for (const msg of messages) {
          const lineMsg = { ...msg, timestamp: msg.timestamp.getTime() };
          actions.addLine(bufferId, ircMessageToLine(lineMsg));
        }
        addSystemLine(actions, `${label}: loaded ${messages.length} messages`);
      } catch (err) {
        console.error("[messages] fetch failed:", { network, target, err });
        addSystemLine(
          actions,
          `${label}: failed to load history - ${String(err)}`
        );
      }
    })
  );
}

function handleIrcMessage(actions: Actions, msg: IRCMessageType) {
  const bufferId = getMessageBufferId(msg);
  const target = msg.target ?? "*";
  const bufferType = getBufferType(target);

  actions.ensureBuffer({
    id: bufferId,
    type: bufferType,
    network: msg.network,
    target,
  });

  // Convert Date to number for line
  const lineMsg = { ...msg, timestamp: msg.timestamp.getTime() };
  actions.addLine(bufferId, ircMessageToLine(lineMsg));
}

function handleStateMessage(actions: Actions, state: NetworkStateType) {
  // Ensure server buffer exists for this network
  const serverId = `${state.network}:*`;
  actions.ensureBuffer({
    id: serverId,
    type: "server",
    network: state.network,
    target: "*",
  });

  // Ensure channel buffers exist for all joined channels
  for (const channelName of Object.keys(state.channels)) {
    const bufferId = `${state.network}:${channelName.toLowerCase()}`;
    actions.ensureBuffer({
      id: bufferId,
      type: "channel",
      network: state.network,
      target: channelName,
    });
  }

  // Sync state (map field name)
  actions.syncNetworkState({
    name: state.network,
    status: state.status,
    user: state.user,
    channels: state.channels,
  });
}

async function connectToServer(actions: Actions, signal: AbortSignal) {
  actions.setConnectionStatus("connecting");

  try {
    // Fetch initial network list
    const networks = await client.networks.list();
    actions.setNetworks(networks.map((n) => n.network));

    // Initialize state for each network
    for (const network of networks) {
      handleStateMessage(actions, network);
    }

    actions.setConnectionStatus("connected");
    actions.addLine(SYSTEM_BUFFER_ID, {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: "system",
      source: "client",
      content: "Connected to server",
    });

    // * Collect all buffers to fetch initial messages for
    const buffersToFetch: BufferTarget[] = [];
    for (const network of networks) {
      // Server buffer
      buffersToFetch.push({
        network: network.network,
        target: "*",
        bufferId: `${network.network}:*`,
      });
      // Channel buffers
      for (const channelName of Object.keys(network.channels)) {
        buffersToFetch.push({
          network: network.network,
          target: channelName,
          bufferId: `${network.network}:${channelName.toLowerCase()}`,
        });
      }
    }

    // * Fetch initial messages in parallel (don't block subscription)
    fetchInitialMessages(actions, buffersToFetch);

    // Subscribe to events
    const iterator = await client.subscribe({ signal });

    for await (const event of iterator) {
      if (event.type === "irc") {
        console.log("[event:irc]", event.data.command, event.data.target);
        handleIrcMessage(actions, event.data);
      } else if (event.type === "state") {
        console.log("[event:state]", event.data.network, event.data.status);
        handleStateMessage(actions, event.data);
      }
    }
  } catch (err) {
    if (signal.aborted) return;
    console.error("[orpc] error", err);
    actions.setConnectionStatus("disconnected");
    actions.addLine(SYSTEM_BUFFER_ID, {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: "error",
      source: "client",
      content: `Connection error: ${String(err)}`,
    });
  }
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
    const controller = new AbortController();
    connectToServer(actions, controller.signal);

    onCleanup(() => {
      controller.abort();
    });
  });

  return (
    <div class="grid h-svh grid-rows-[auto_auto_1fr] overflow-hidden">
      <Header />
      <NetworkTabs />
      <Outlet />
    </div>
  );
}
