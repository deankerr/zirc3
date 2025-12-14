import { createFileRoute } from "@tanstack/solid-router";
import { createEffect, createSignal, For, on } from "solid-js";
import type { SystemEvent } from "@/api";
import { formatTime } from "@/components/message-line";
import { useApp } from "./__root";

export const Route = createFileRoute("/")({
  component: SystemView,
});

const LOGO = `
     ███████╗██╗██████╗  ██████╗
     ╚══███╔╝██║██╔══██╗██╔════╝
       ███╔╝ ██║██████╔╝██║
      ███╔╝  ██║██╔══██╗██║
     ███████╗██║██║  ██║╚██████╗
     ╚══════╝╚═╝╚═╝  ╚═╝ ╚═════╝
`;

function getEventColor(type: string) {
  switch (type) {
    case "connecting":
      return "text-sky-400";
    case "registered":
      return "text-emerald-400";
    case "socket_close":
    case "close":
      return "text-rose-400";
    case "socket_error":
      return "text-red-500";
    case "reconnecting":
      return "text-amber-400";
    default:
      return "text-neutral-400";
  }
}

function getEventText(event: SystemEvent["event"]) {
  switch (event.type) {
    case "connecting":
      return event.address ? `Connecting to ${event.address}` : "Connecting...";
    case "registered":
      return "Connected";
    case "socket_close":
      return event.error ? `Socket closed: ${event.error}` : "Socket closed";
    case "socket_error":
      return `Socket error: ${event.error}`;
    case "reconnecting":
      return `Reconnecting (attempt ${event.attempt}, wait ${event.wait}ms)`;
    case "close":
      return "Disconnected";
    default:
      return "Unknown event";
  }
}

function SystemEventLine(props: { event: SystemEvent; isLogo?: boolean }) {
  const evt = props.event;

  if (props.isLogo) {
    return (
      <div class="px-3 py-2 font-mono text-xs">
        <pre class="text-amber-500">{LOGO}</pre>
      </div>
    );
  }

  const color = getEventColor(evt.event.type);
  const text = getEventText(evt.event);

  return (
    <div class="group whitespace-pre-wrap px-3 py-0.5 font-mono text-sm hover:bg-neutral-900/50">
      <span class="text-neutral-600">
        {formatTime(evt.timestamp)}
        {"  "}
      </span>
      <span class={color}>{evt.event.type.padEnd(14)}</span>
      <span class="text-blue-400">{evt.network.padEnd(16)}</span>
      <span class="text-neutral-300">{text}</span>
    </div>
  );
}

function SystemView() {
  const { systemEvents } = useApp();
  const [container, setContainer] = createSignal<HTMLDivElement>();

  // * Auto-scroll to bottom when new events arrive
  createEffect(
    on(systemEvents, () => {
      const el = container();
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    })
  );

  return (
    <div
      class="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-700 h-full overflow-y-auto"
      ref={setContainer}
    >
      <For each={systemEvents()}>
        {(event) => (
          <SystemEventLine event={event} isLogo={event.id === "logo"} />
        )}
      </For>
    </div>
  );
}
