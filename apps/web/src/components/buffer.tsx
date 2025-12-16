import { createEffect, createSignal, For, on, Show } from "solid-js";
import type { ChannelMember } from "@/api";
import type { BufferLine } from "@/store/types";
import { BufferLineComponent } from "./buffer-line";
import { BufferSidebar } from "./buffer-sidebar";

export type BufferProps = {
  lines: BufferLine[];
  sidebar?: { users: ChannelMember[] };
  onInput: (text: string) => void;
};

export function Buffer(props: BufferProps) {
  const [inputValue, setInputValue] = createSignal("");
  let contentRef: HTMLDivElement | undefined;

  // * Auto-scroll to bottom when new lines arrive
  createEffect(
    on(
      () => props.lines.length,
      () => {
        contentRef?.scrollTo(0, contentRef.scrollHeight);
      }
    )
  );

  function handleSubmit(e: Event) {
    e.preventDefault();
    const value = inputValue().trim();
    if (!value) return;
    props.onInput(value);
    setInputValue("");
  }

  return (
    <div class="flex h-full flex-col overflow-hidden">
      {/* Main content area */}
      <div class="flex min-h-0 flex-1">
        {/* Lines */}
        <div
          class="scrollbar-thin flex-1 overflow-y-auto bg-[var(--color-bg-primary)] py-2"
          ref={(el) => (contentRef = el)}
        >
          <Show
            fallback={
              <div class="flex h-full items-center justify-center">
                <span class="text-[var(--color-text-muted)]">No messages</span>
              </div>
            }
            when={props.lines.length > 0}
          >
            <For each={props.lines}>
              {(line) => <BufferLineComponent line={line} />}
            </For>
          </Show>
        </div>

        {/* Sidebar */}
        <Show when={props.sidebar}>
          {(sidebar) => <BufferSidebar users={sidebar().users} />}
        </Show>
      </div>

      {/* Input */}
      <form
        class="flex border-[var(--color-border)] border-t bg-[var(--color-bg-secondary)]"
        onSubmit={handleSubmit}
      >
        <input
          class="flex-1 bg-transparent px-3 py-2 text-[var(--color-text-primary)] text-sm outline-none placeholder:text-[var(--color-text-muted)]"
          onInput={(e) => setInputValue(e.currentTarget.value)}
          placeholder="Type a message or /command..."
          type="text"
          value={inputValue()}
        />
      </form>
    </div>
  );
}
