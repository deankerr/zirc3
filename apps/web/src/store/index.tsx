import { createContext, type ParentProps, useContext } from "solid-js";
import { createStore, type SetStoreFunction } from "solid-js/store";
import type { IRCCommandType } from "@/api";
import type { Store } from "./types";

const SYSTEM_BUFFER_ID = "system";

function createInitialStore(): Store {
  return {
    connection: { status: "disconnected" },
    networks: {},
    buffers: {
      [SYSTEM_BUFFER_ID]: {
        id: SYSTEM_BUFFER_ID,
        type: "system",
        lines: [],
      },
    },
    ui: { activeBuffer: SYSTEM_BUFFER_ID },
  };
}

export type CommandResult =
  | { success: true }
  | { success: false; error?: string };
export type SendCommand = (cmd: IRCCommandType) => Promise<CommandResult>;

type StoreContextValue = {
  store: Store;
  setStore: SetStoreFunction<Store>;
  sendCommand: SendCommand;
};

const StoreContext = createContext<StoreContextValue>();

export function StoreProvider(
  props: ParentProps<{ sendCommand: SendCommand }>
) {
  const [store, setStore] = createStore<Store>(createInitialStore());

  return (
    <StoreContext.Provider
      value={{ store, setStore, sendCommand: props.sendCommand }}
    >
      {props.children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStore must be used within StoreProvider");
  }
  return ctx;
}

export { SYSTEM_BUFFER_ID };
