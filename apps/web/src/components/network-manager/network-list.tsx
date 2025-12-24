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
        when={props.networks.length > 0}
        fallback={
          <div class="py-4 text-center text-[var(--color-text-muted)]">
            No networks configured
          </div>
        }
      >
        <For each={props.networks}>
          {(network) => (
            <NetworkListItem
              network={network}
              onEdit={() => props.onEdit(network)}
              onDelete={() => props.onDelete(network.name)}
            />
          )}
        </For>
      </Show>
    </div>
  );
}
