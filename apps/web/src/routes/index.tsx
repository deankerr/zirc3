import { createFileRoute } from "@tanstack/solid-router";
import {
  createEffect,
  createSignal,
  For,
  on,
  onCleanup,
  onMount,
} from "solid-js";
import { api, type IRCMessage } from "@/api";
import { MessageLine } from "@/components/message-line";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  const [messages, setMessages] = createSignal<IRCMessage[]>([]);
  const [connected, setConnected] = createSignal(false);
  // biome-ignore lint/suspicious/noUnassignedVariables: solid ref
  let bufferRef!: HTMLDivElement;
  let ws: ReturnType<typeof api.events.subscribe> | undefined;

  const scrollToTop = () => bufferRef.scrollTo({ top: 0, behavior: "smooth" });
  const scrollToBottom = () =>
    bufferRef.scrollTo({ top: bufferRef.scrollHeight, behavior: "smooth" });

  // * Auto-scroll to bottom when new messages arrive
  createEffect(
    on(messages, () => {
      bufferRef.scrollTo(0, bufferRef.scrollHeight);
    })
  );

  onMount(() => {
    console.log("[ws] connecting...");
    ws = api.events.subscribe();

    ws.on("open", () => {
      console.log("[ws] connected");
      setConnected(true);
    });

    ws.on("close", () => {
      console.log("[ws] disconnected");
      setConnected(false);
    });

    ws.on("error", (err) => {
      console.error("[ws] error", err);
      setConnected(false);
    });

    ws.subscribe(({ data: msg }) => {
      console.log("[ws] message", msg);
      if (msg.type !== "irc") {
        console.log("[ws] ignoring non-irc message");
        return;
      }

      setMessages((prev) => {
        const updated = [...prev, msg.data];
        // * Keep last 500 messages to prevent memory issues
        if (updated.length > 500) {
          return updated.slice(-500);
        }
        return updated;
      });
    });
  });

  onCleanup(() => {
    ws?.close();
  });

  return (
    <div class="flex h-full flex-col overflow-hidden">
      {/* * Status bar */}
      <div class="flex items-center justify-between border-neutral-800 border-b bg-neutral-900/50 px-4 py-2">
        <div class="flex items-center gap-3">
          <div
            class={`h-2 w-2 rounded-full ${connected() ? "bg-emerald-500 shadow-emerald-500/50 shadow-sm" : "bg-rose-500"}`}
          />
          <span class="text-neutral-400 text-sm">
            {connected() ? "Connected" : "Disconnected"}
          </span>
        </div>
        <div class="flex items-center gap-2 text-neutral-500 text-xs">
          <span>{messages().length} messages</span>
          <button
            class="rounded px-2 py-1 hover:bg-neutral-800 hover:text-neutral-300"
            onClick={scrollToTop}
            type="button"
          >
            Top
          </button>
          <button
            class="rounded px-2 py-1 hover:bg-neutral-800 hover:text-neutral-300"
            onClick={scrollToBottom}
            type="button"
          >
            Bottom
          </button>
        </div>
      </div>

      {/* * Message buffer */}
      <div
        class="scrollbar-thin flex-1 overflow-y-auto bg-neutral-950 py-2"
        ref={bufferRef}
      >
        {messages().length === 0 ? (
          <div class="flex h-full items-center justify-center">
            <div class="text-center text-neutral-600">
              <pre class="mb-4 font-mono text-neutral-700 text-xs">
                {`
     ███████╗██╗██████╗  ██████╗
     ╚══███╔╝██║██╔══██╗██╔════╝
       ███╔╝ ██║██████╔╝██║
      ███╔╝  ██║██╔══██╗██║
     ███████╗██║██║  ██║╚██████╗
     ╚══════╝╚═╝╚═╝  ╚═╝ ╚═════╝
                `}
              </pre>
              <p>Waiting for IRC events...</p>
            </div>
          </div>
        ) : (
          <For each={messages()}>
            {(message) => <MessageLine message={message} />}
          </For>
        )}
      </div>
    </div>
  );
}
