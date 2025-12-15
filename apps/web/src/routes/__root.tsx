import {
  createRootRouteWithContext,
  Link,
  Outlet,
} from "@tanstack/solid-router";
import {
  type Accessor,
  createContext,
  createSignal,
  For,
  type JSX,
  onCleanup,
  onMount,
  useContext,
} from "solid-js";
import {
  api,
  type ChannelState,
  type IRCMessage,
  type NetworkInfo,
  type SystemEvent,
} from "@/api";

// * Channels indexed by "network:channel"
type ChannelsMap = Record<string, ChannelState>;

import Header from "@/components/header";

const HTTP_REGEX = /^http/;

// * Initial system message with logo
const LOGO_MESSAGE: SystemEvent = {
  id: "logo",
  timestamp: Date.now(),
  network: "zirc",
  event: { type: "registered" },
};

function createLocalEvent(
  event: SystemEvent["event"],
  network = "client"
): SystemEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    network,
    event,
  };
}

// * App context for sharing state across routes
type AppContextType = {
  messages: Accessor<IRCMessage[]>;
  systemEvents: Accessor<SystemEvent[]>;
  networks: Accessor<NetworkInfo[]>;
  channels: Accessor<ChannelsMap>;
  connected: Accessor<boolean>;
  sendCommand: (network: string, command: string, args: string[]) => void;
};

const AppContext = createContext<AppContextType>();

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within AppProvider");
  }
  return ctx;
}

function AppProvider(props: { children: JSX.Element }) {
  const [messages, setMessages] = createSignal<IRCMessage[]>([]);
  const [systemEvents, setSystemEvents] = createSignal<SystemEvent[]>([
    LOGO_MESSAGE,
  ]);
  const [networks, setNetworks] = createSignal<NetworkInfo[]>([]);
  const [channels, setChannels] = createSignal<ChannelsMap>({});
  const [connected, setConnected] = createSignal(false);

  let ws: ReturnType<typeof api.events.subscribe> | undefined;

  function addSystemEvent(event: SystemEvent["event"], network = "client") {
    setSystemEvents((prev) => {
      const updated = [...prev, createLocalEvent(event, network)];
      if (updated.length > 100) {
        return updated.slice(-100);
      }
      return updated;
    });
  }

  onMount(() => {
    const serverUrl = import.meta.env.VITE_SERVER_URL as string;
    const wsUrl = `${serverUrl.replace(HTTP_REGEX, "ws")}/events`;
    addSystemEvent({ type: "connecting", address: wsUrl });
    ws = api.events.subscribe();

    ws.on("open", () => {
      setConnected(true);
      addSystemEvent({ type: "registered" });
    });

    ws.on("close", () => {
      setConnected(false);
      addSystemEvent({ type: "close" });
    });

    ws.on("error", (err) => {
      console.error("[ws] error", err);
      setConnected(false);
      addSystemEvent({ type: "socket_error", error: String(err) });
    });

    ws.subscribe(({ data: msg }) => {
      console.log("[ws:recv]", msg.type, msg.data);

      if (msg.type === "networks") {
        setNetworks(msg.data);
        return;
      }

      if (msg.type === "irc") {
        setMessages((prev) => {
          const updated = [...prev, msg.data];
          if (updated.length > 500) {
            return updated.slice(-500);
          }
          return updated;
        });
        return;
      }

      if (msg.type === "system") {
        const event = msg.data;
        setSystemEvents((prev) => {
          const updated = [...prev, event];
          if (updated.length > 100) {
            return updated.slice(-100);
          }
          return updated;
        });

        // * Track channel state updates
        if (event.event.type === "channel_updated") {
          const key = `${event.network}:${event.event.channel.name}`;
          setChannels((prev) => ({ ...prev, [key]: event.event.channel }));
        }
      }
    });
  });

  onCleanup(() => {
    ws?.close();
  });

  function sendCommand(network: string, command: string, args: string[]) {
    ws?.send({ type: "irc", data: { network, command, args } });
  }

  return (
    <AppContext.Provider
      value={{
        messages,
        systemEvents,
        networks,
        channels,
        connected,
        sendCommand,
      }}
    >
      {props.children}
    </AppContext.Provider>
  );
}

// biome-ignore lint/complexity/noBannedTypes: TanStack Router convention
export type RouterContext = {};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <AppProvider>
      <div class="grid h-svh grid-rows-[auto_auto_1fr] overflow-hidden">
        <Header />
        <NetworkTabs />
        <Outlet />
      </div>
    </AppProvider>
  );
}

function NetworkTabs() {
  const { networks } = useApp();

  return (
    <div class="flex items-center border-neutral-800 border-b bg-neutral-900/50 px-2">
      <Link
        activeProps={{
          class:
            "border-amber-500 bg-neutral-800/50 text-amber-400 hover:text-amber-300",
        }}
        class="border-transparent border-b-2 px-3 py-2 text-neutral-400 text-sm transition-colors hover:bg-neutral-800/30 hover:text-neutral-200"
        to="/"
      >
        system
      </Link>
      <For each={networks()}>
        {(network) => (
          <Link
            activeProps={{
              class:
                "border-emerald-500 bg-neutral-800/50 text-emerald-400 hover:text-emerald-300",
            }}
            class="border-transparent border-b-2 px-3 py-2 text-neutral-400 text-sm transition-colors hover:bg-neutral-800/30 hover:text-neutral-200"
            params={{ network: network.name }}
            to="/$network"
          >
            {network.name}
          </Link>
        )}
      </For>
    </div>
  );
}
