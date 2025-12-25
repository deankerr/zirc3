import { For, Show } from "solid-js";
import type { NetworkState } from "@/store/types";
import { NetworkListItem } from "./network-list-item";

type NetworkListProps = {
  networks: NetworkState[];
  onEdit: (network: NetworkState) => void;
  onDelete: (networkName: string) => void;
};

export function NetworkList(props: NetworkListProps) {
  return (
    <div class="space-y-2">
      <Show
        fallback={
          <div class="py-4 text-center text-[var(--color-text-muted)]">
            No networks configured
          </div>
        }
        when={props.networks.length > 0}
      >
        <For each={props.networks}>
          {(network) => (
            <NetworkListItem
              network={network}
              onDelete={() => props.onDelete(network.name)}
              onEdit={() => props.onEdit(network)}
            />
          )}
        </For>
      </Show>
    </div>
  );
}
