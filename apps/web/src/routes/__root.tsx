import {
  createRootRouteWithContext,
  Link,
  Outlet,
  useNavigate,
} from "@tanstack/solid-router";
import {
  type Accessor,
  createContext,
  createEffect,
  createSignal,
  For,
  type JSX,
  on,
  onCleanup,
  onMount,
  useContext,
} from "solid-js";
import { api, type IRCMessage, type NetworkInfo } from "@/api";
import Header from "@/components/header";

// * App context for sharing state across routes
type AppContextType = {
  messages: Accessor<IRCMessage[]>;
  networks: Accessor<NetworkInfo[]>;
  connected: Accessor<boolean>;
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
  const [networks, setNetworks] = createSignal<NetworkInfo[]>([]);
  const [connected, setConnected] = createSignal(false);
  const navigate = useNavigate();

  let ws: ReturnType<typeof api.events.subscribe> | undefined;

  onMount(() => {
    console.log("[ws] connecting...");
    ws = api.events.subscribe();

    ws.on("open", () => {
      console.log("[ws] connected");
      setConnected(true);
    });

    ws.on("close", () => {
      console.log("[ws] disconnected");
      setConnected(false);
    });

    ws.on("error", (err) => {
      console.error("[ws] error", err);
      setConnected(false);
    });

    ws.subscribe(({ data: msg }) => {
      if (msg.type === "networks") {
        console.log("[ws] networks", msg.data);
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
      }
    });
  });

  // * Navigate to first network when networks are loaded and we're at root
  createEffect(
    on(networks, (nets) => {
      if (nets.length > 0 && window.location.pathname === "/") {
        navigate({ to: "/$network", params: { network: nets[0].name } });
      }
    })
  );

  onCleanup(() => {
    ws?.close();
  });

  return (
    <AppContext.Provider value={{ messages, networks, connected }}>
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
