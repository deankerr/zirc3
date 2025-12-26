import { createFileRoute } from "@tanstack/solid-router";
import { createEffect, createMemo, createSignal } from "solid-js";
import { Buffer } from "@/components/buffer";
import { BufferTabs } from "@/components/buffer-tabs";
import { uuid } from "@/lib/uuid";
import { useStore } from "@/store";
import { createActions } from "@/store/actions";

export const Route = createFileRoute("/$network")({
  component: NetworkView,
});

function getBufferSortKey(type: string): number {
  if (type === "server") return 0;
  if (type === "channel") return 1;
  return 2;
}

function NetworkView() {
  const params = Route.useParams();
  const { store, setStore, sendCommand } = useStore();
  const actions = createActions(setStore);
  const [activeBufferId, setActiveBufferId] = createSignal<string | null>(null);

  // * Get buffers for this network, sorted: server first, then channels, then queries
  const networkBuffers = createMemo(() => {
    const network = params().network;
    return Object.values(store.buffers)
      .filter((b) => b.network === network)
      .sort((a, b) => {
        const aKey = getBufferSortKey(a.type);
        const bKey = getBufferSortKey(b.type);
        if (aKey !== bKey) return aKey - bKey;
        return (a.target ?? "").localeCompare(b.target ?? "");
      });
  });

  // * Buffer IDs for tabs (show target for display)
  const bufferIds = createMemo(() =>
    networkBuffers().map((b) => b.target ?? b.id)
  );

  // * Auto-select first buffer when network changes or buffers arrive
  createEffect(() => {
    const buffers = networkBuffers();
    if (buffers.length === 0) {
      setActiveBufferId(null);
      return;
    }
    const current = activeBufferId();
    const hasValid = current && buffers.some((b) => b.id === current);
    if (!hasValid) {
      setActiveBufferId(buffers[0].id);
    }
  });

  // * Active buffer data
  const activeBuffer = createMemo(() => {
    const id = activeBufferId();
    if (!id) return null;
    return store.buffers[id] ?? null;
  });

  // * Sidebar data for channels
  const sidebarData = createMemo(() => {
    const buffer = activeBuffer();
    if (!buffer || buffer.type !== "channel") return;
    const network = store.networks[params().network];
    if (!network) return;
    const key = (buffer.target ?? "").toLowerCase();
    const channel = network.channels[key];
    if (!channel?.users || channel.users.length === 0) return;
    return { users: channel.users };
  });

  // * Handle buffer selection from tabs
  function handleSelectBuffer(target: string) {
    const buffer = networkBuffers().find((b) => (b.target ?? b.id) === target);
    if (buffer) {
      setActiveBufferId(buffer.id);
    }
  }

  // * Handle input from buffer
  async function handleInput(text: string) {
    const buffer = activeBuffer();
    if (!buffer) return;

    // * Helper to show command errors in buffer
    const showError = (error: string) => {
      actions.addLine(buffer.id, {
        id: uuid(),
        timestamp: Date.now(),
        type: "error",
        source: "client",
        content: error,
      });
    };

    // * Parse /commands
    if (text.startsWith("/")) {
      const [command, ...args] = text.slice(1).split(" ");
      const result = await sendCommand({
        network: params().network,
        command: command.toUpperCase(),
        args,
      });
      if (!result.success && result.error) {
        showError(`Command failed: ${result.error}`);
      }
      return;
    }

    // * Send as PRIVMSG if we have a target (channel or query)
    if (buffer.target && buffer.target !== "*") {
      const result = await sendCommand({
        network: params().network,
        command: "PRIVMSG",
        args: [buffer.target, text],
      });
      if (!result.success && result.error) {
        showError(`Send failed: ${result.error}`);
      }
    }
  }

  return (
    <div class="flex h-full flex-col overflow-hidden">
      <BufferTabs
        active={activeBuffer()?.target ?? activeBufferId()}
        buffers={bufferIds()}
        onSelect={handleSelectBuffer}
      />
      <Buffer
        lines={activeBuffer()?.lines ?? []}
        onInput={handleInput}
        sidebar={sidebarData()}
      />
    </div>
  );
}
