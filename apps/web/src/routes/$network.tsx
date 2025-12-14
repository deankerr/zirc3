import { createFileRoute } from "@tanstack/solid-router";
import { createEffect, createMemo, For, on } from "solid-js";
import { CommandInput } from "@/components/command-input";
import { MessageLine } from "@/components/message-line";
import { useApp } from "./__root";

export const Route = createFileRoute("/$network")({
  component: NetworkView,
});

function NetworkView() {
  const params = Route.useParams();
  const { messages, sendCommand } = useApp();

  // biome-ignore lint/suspicious/noUnassignedVariables: solid ref
  let bufferRef!: HTMLDivElement;

  // * Filter messages for this network
  const networkMessages = createMemo(() =>
    messages().filter((m) => m.network === params().network)
  );

  // * Auto-scroll to bottom when new messages arrive
  createEffect(
    on(networkMessages, () => {
      bufferRef.scrollTo(0, bufferRef.scrollHeight);
    })
  );

  return (
    <div class="flex h-full flex-col overflow-hidden">
      <div
        class="scrollbar-thin flex-1 overflow-y-auto bg-neutral-950 py-2"
        ref={bufferRef}
      >
        {networkMessages().length === 0 ? (
          <div class="flex h-full items-center justify-center">
            <div class="text-center text-neutral-600">
              <p>No messages for {params().network}</p>
            </div>
          </div>
        ) : (
          <For each={networkMessages()}>
            {(message) => <MessageLine message={message} />}
          </For>
        )}
      </div>
      <CommandInput network={params().network} onSend={sendCommand} />
    </div>
  );
}
