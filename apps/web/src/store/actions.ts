import type { SetStoreFunction } from "solid-js/store";
import type { NetworkStateSync } from "@/api";
import type {
  BufferLine,
  BufferState,
  BufferType,
  ChannelState,
  ConnectionStatus,
  NetworkState,
  Store,
} from "./types";

const MAX_LINES_PER_BUFFER = 500;

export function createActions(setStore: SetStoreFunction<Store>) {
  return {
    setConnectionStatus(status: ConnectionStatus) {
      setStore("connection", "status", status);
    },

    addLine(bufferId: string, line: BufferLine) {
      setStore("buffers", bufferId, "lines", (lines) => {
        const updated = [...lines, line];
        if (updated.length > MAX_LINES_PER_BUFFER) {
          return updated.slice(-MAX_LINES_PER_BUFFER);
        }
        return updated;
      });
    },

    ensureBuffer(args: {
      id: string;
      type: BufferType;
      network?: string;
      target?: string;
    }) {
      setStore("buffers", (buffers) => {
        if (buffers[args.id]) {
          return buffers;
        }
        return {
          ...buffers,
          [args.id]: {
            id: args.id,
            type: args.type,
            network: args.network,
            target: args.target,
            lines: [],
          } satisfies BufferState,
        };
      });
    },

    setActiveBuffer(id: string | null) {
      setStore("ui", "activeBuffer", id);
    },

    updateNetwork(name: string, partial: Partial<NetworkState>) {
      setStore("networks", name, (current) => {
        if (!current) {
          return {
            name,
            status: "disconnected",
            channels: {},
            ...partial,
          } as NetworkState;
        }
        return { ...current, ...partial };
      });
    },

    ensureNetwork(name: string) {
      setStore("networks", (networks) => {
        if (networks[name]) {
          return networks;
        }
        return {
          ...networks,
          [name]: {
            name,
            status: "disconnected",
            channels: {},
          } satisfies NetworkState,
        };
      });
    },

    updateChannel(network: string, channelName: string, state: ChannelState) {
      const key = channelName.toLowerCase();
      setStore("networks", network, "channels", (channels) => ({
        ...channels,
        [key]: state,
      }));
    },

    setNetworks(names: string[]) {
      setStore("networks", (current) => {
        const updated: Record<string, NetworkState> = {};
        for (const name of names) {
          updated[name] = current[name] ?? {
            name,
            status: "disconnected",
            channels: {},
          };
        }
        return updated;
      });
    },

    // * Sync full network state from server
    syncNetworkState(state: NetworkStateSync) {
      setStore("networks", state.name, {
        name: state.name,
        status: state.status,
        user: state.user,
        channels: state.channels,
      });
    },
  };
}

export type Actions = ReturnType<typeof createActions>;
