import { Link } from "@tanstack/solid-router";
import { For } from "solid-js";
import { useStore } from "@/store";

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
      <For each={Object.keys(store.networks)}>
        {(network) => (
          <Link
            activeProps={{
              class:
                "border-[var(--color-accent-primary)] bg-[var(--color-bg-tertiary)] text-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)]",
            }}
            class="border-transparent border-b-2 px-3 py-2 text-[var(--color-text-secondary)] text-sm transition-colors hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
            params={{ network }}
            to="/$network"
          >
            {network}
          </Link>
        )}
      </For>
    </nav>
  );
}
