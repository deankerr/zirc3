import { useStore } from "@/store";
import type { ConnectionStatus } from "@/store/types";

function getStatusColor(status: ConnectionStatus): string {
  switch (status) {
    case "connected":
      return "var(--color-status-connected)";
    case "connecting":
      return "var(--color-status-connecting)";
    default:
      return "var(--color-status-disconnected)";
  }
}

function getStatusText(status: ConnectionStatus): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting...";
    default:
      return "Disconnected";
  }
}

export function Header() {
  const { store } = useStore();

  return (
    <header class="flex items-center justify-between border-[var(--color-border)] border-b bg-[var(--color-bg-secondary)] px-4 py-2">
      <div class="flex items-center gap-3">
        <span class="font-bold text-[var(--color-accent-secondary)]">zirc</span>
      </div>
      <div class="flex items-center gap-2">
        <div
          class="h-2 w-2 rounded-full"
          style={{
            "background-color": getStatusColor(store.connection.status),
          }}
        />
        <span
          class="text-sm"
          style={{ color: getStatusColor(store.connection.status) }}
        >
          {getStatusText(store.connection.status)}
        </span>
      </div>
    </header>
  );
}
