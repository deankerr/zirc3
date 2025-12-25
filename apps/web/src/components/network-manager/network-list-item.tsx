import { Pencil, Trash2 } from "lucide-solid";
import type { NetworkState } from "@/store/types";

type NetworkListItemProps = {
  network: NetworkState;
  onEdit: () => void;
  onDelete: () => void;
};

function getStatusColor(status: string): string {
  switch (status) {
    case "connected":
      return "var(--color-status-connected)";
    case "connecting":
      return "var(--color-status-connecting)";
    default:
      return "var(--color-status-disconnected)";
  }
}

export function NetworkListItem(props: NetworkListItemProps) {
  return (
    <div class="flex items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3">
      <div class="flex items-center gap-3">
        <div
          class="h-2 w-2 rounded-full"
          style={{ "background-color": getStatusColor(props.network.status) }}
        />
        <div>
          <div class="font-medium text-[var(--color-text-primary)]">
            {props.network.name}
          </div>
          <div class="text-[var(--color-text-muted)] text-xs">
            {props.network.config.host}:{props.network.config.port}
            {props.network.config.tls && " (TLS)"}
          </div>
        </div>
      </div>
      <div class="flex gap-1">
        <button
          class="rounded p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
          onClick={props.onEdit}
          title="Edit network"
          type="button"
        >
          <Pencil size={16} />
        </button>
        <button
          class="rounded p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-line-error)]"
          onClick={props.onDelete}
          title="Delete network"
          type="button"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
