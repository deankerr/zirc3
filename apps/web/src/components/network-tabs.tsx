import { Link } from "@tanstack/solid-router";
import { For } from "solid-js";
import { useStore } from "@/store";
import type { NetworkState } from "@/store/types";

function getStatusColor(status: NetworkState["status"]): string {
  switch (status) {
    case "connected":
      return "var(--color-status-connected)";
    case "connecting":
      return "var(--color-status-connecting)";
    default:
      return "var(--color-status-disconnected)";
  }
}

export function NetworkTabs() {
  const { store } = useStore();

  return (
    <nav class="flex items-center border-[var(--color-border)] border-b bg-[var(--color-bg-secondary)] px-2">
      <Link
        activeProps={{
          class:
            "border-[var(--color-accent-secondary)] bg-[var(--color-bg-tertiary)] text-[var(--color-accent-secondary)] hover:text-[var(--color-accent-secondary)]",
        }}
        class="border-transparent border-b-2 px-3 py-2 text-[var(--color-text-secondary)] text-sm transition-colors hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
        to="/"
      >
        system
      </Link>
      <For each={Object.values(store.networks)}>
        {(network) => (
          <Link
            activeProps={{
              class:
                "border-[var(--color-accent-primary)] bg-[var(--color-bg-tertiary)] text-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)]",
            }}
            class="flex items-center gap-1.5 border-transparent border-b-2 px-3 py-2 text-[var(--color-text-secondary)] text-sm transition-colors hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
            params={{ network: network.name }}
            to="/$network"
          >
            <span
              class="h-2 w-2 rounded-full"
              style={{ "background-color": getStatusColor(network.status) }}
            />
            {network.name}
          </Link>
        )}
      </For>
    </nav>
  );
}
