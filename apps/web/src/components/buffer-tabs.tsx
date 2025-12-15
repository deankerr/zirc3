import { For, Show } from "solid-js";

export type BufferTabsProps = {
  buffers: string[];
  active: string | null;
  onSelect: (id: string) => void;
};

export function BufferTabs(props: BufferTabsProps) {
  return (
    <div class="scrollbar-thin flex items-center gap-1 overflow-x-auto border-[var(--color-border)] border-b bg-[var(--color-bg-primary)] px-2 py-1">
      <Show
        fallback={
          <span class="px-2 py-1 text-[var(--color-text-muted)] text-xs">
            No buffers
          </span>
        }
        when={props.buffers.length > 0}
      >
        <For each={props.buffers}>
          {(id) => {
            const isActive = () => props.active === id;
            return (
              <button
                class={`rounded px-2 py-1 text-xs transition-colors ${
                  isActive()
                    ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
                }`}
                onClick={() => props.onSelect(id)}
                type="button"
              >
                {id}
              </button>
            );
          }}
        </For>
      </Show>
    </div>
  );
}
