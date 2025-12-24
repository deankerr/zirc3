import type { SetStoreFunction } from "solid-js/store";
import type {
  ChannelStateType,
  NetworkConfigType,
  NetworkStateType,
} from "@/api";
import type {
  BufferLine,
  BufferState,
  BufferType,
  ConnectionStatus,
  NetworkState,
  Store,
  UserInfo,
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

    updateChannel(
      network: string,
      channelName: string,
      state: ChannelStateType
    ) {
      const key = channelName.toLowerCase();
      setStore("networks", network, "channels", (channels) => ({
        ...channels,
        [key]: state,
      }));
    },

    // * Sync full network state from server
    syncNetworkState(state: {
      name: string;
      status: "connecting" | "connected" | "disconnected";
      user?: UserInfo;
      channels: Record<string, ChannelStateType>;
      config: NetworkConfigType;
    }) {
      setStore("networks", state.name, {
        name: state.name,
        status: state.status,
        user: state.user,
        channels: state.channels,
        config: state.config,
      });
    },

    // * Sync all networks from API response (replaces store state)
    syncAllNetworks(networks: NetworkStateType[]) {
      const updated: Record<string, NetworkState> = {};
      for (const n of networks) {
        updated[n.network] = {
          name: n.network,
          status: n.status,
          user: n.user,
          channels: n.channels,
          config: n.config,
        };
      }
      setStore("networks", updated);
    },

    // * Remove a network from the store
    removeNetwork(name: string) {
      setStore("networks", name, undefined as unknown as NetworkState);
    },
  };
}

export type Actions = ReturnType<typeof createActions>;
