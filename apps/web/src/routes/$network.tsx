import { createFileRoute } from "@tanstack/solid-router";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  on,
  Show,
} from "solid-js";
import type { ChannelMember, IRCMessage } from "@/api";
import { CommandInput } from "@/components/command-input";
import { MessageLine } from "@/components/message-line";
import { useApp } from "./__root";

export const Route = createFileRoute("/$network")({
  component: NetworkView,
});

const SERVER_BUFFER = "*server";

// * Get unique buffer targets from messages
function getBufferTargets(messages: IRCMessage[]) {
  const targets = new Set<string>();
  let hasServerMessages = false;
  for (const msg of messages) {
    if (msg.target) {
      targets.add(msg.target);
    } else {
      hasServerMessages = true;
    }
  }
  const sorted = [...targets].sort((a, b) => {
    // * Channels first (start with # or &), then nicks
    const aIsChannel = a.startsWith("#") || a.startsWith("&");
    const bIsChannel = b.startsWith("#") || b.startsWith("&");
    if (aIsChannel && !bIsChannel) return -1;
    if (!aIsChannel && bIsChannel) return 1;
    return a.localeCompare(b);
  });
  // * Server buffer always first if there are server messages
  if (hasServerMessages) {
    return [SERVER_BUFFER, ...sorted];
  }
  return sorted;
}

// * Check if a target is a channel
function isChannel(target: string) {
  return target.startsWith("#") || target.startsWith("&");
}

// * Get mode prefix for display (@ for op, + for voice, etc.)
function getModePrefix(modes: string[]) {
  if (modes.includes("o")) return "@";
  if (modes.includes("v")) return "+";
  return "";
}

// * Get sort priority for channel member (lower = higher priority)
function getMemberSortPriority(modes: string[]) {
  if (modes.includes("o")) return 0;
  if (modes.includes("v")) return 1;
  return 2;
}

function NetworkView() {
  const params = Route.useParams();
  const { messages, channels, sendCommand } = useApp();
  const [activeBuffer, setActiveBuffer] = createSignal<string | null>(null);

  // biome-ignore lint/suspicious/noUnassignedVariables: solid ref
  let bufferRef: HTMLDivElement | undefined;

  // * Filter messages for this network
  const networkMessages = createMemo(() =>
    messages().filter((m) => m.network === params().network)
  );

  // * Get buffer targets from messages
  const bufferTargets = createMemo(() => getBufferTargets(networkMessages()));

  // * Auto-select first buffer when targets change
  createEffect(() => {
    const targets = bufferTargets();
    if (targets.length === 0) return;
    const current = activeBuffer();
    const hasValidBuffer = current !== null && targets.includes(current);
    if (!hasValidBuffer) {
      setActiveBuffer(targets[0]);
    }
  });

  // * Filter messages for active buffer
  const bufferMessages = createMemo(() => {
    const buffer = activeBuffer();
    if (!buffer) return networkMessages();
    if (buffer === SERVER_BUFFER) {
      return networkMessages().filter((m) => !m.target);
    }
    return networkMessages().filter((m) => m.target === buffer);
  });

  // * Get channel state for active buffer (if it's a channel)
  const activeChannel = createMemo(() => {
    const buffer = activeBuffer();
    if (!buffer) return null;
    if (!isChannel(buffer)) return null;
    const key = `${params().network}:${buffer}`;
    return channels()[key] ?? null;
  });

  // * Auto-scroll to bottom when new messages arrive
  createEffect(
    on(bufferMessages, () => {
      bufferRef?.scrollTo(0, bufferRef.scrollHeight);
    })
  );

  return (
    <div class="flex h-full flex-col overflow-hidden">
      {/* Buffer tabs */}
      <div class="scrollbar-thin flex items-center gap-1 overflow-x-auto border-neutral-800 border-b bg-neutral-900/30 px-2 py-1">
        <Show
          fallback={
            <span class="px-2 py-1 text-neutral-600 text-xs">No buffers</span>
          }
          when={bufferTargets().length > 0}
        >
          <For each={bufferTargets()}>
            {(target) => (
              <button
                class={`rounded px-2 py-1 text-xs transition-colors ${
                  activeBuffer() === target
                    ? "bg-neutral-700 text-neutral-100"
                    : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                }`}
                onClick={() => setActiveBuffer(target)}
                type="button"
              >
                {target}
              </button>
            )}
          </For>
        </Show>
      </div>

      {/* Main content area with messages and optional nick list */}
      <div class="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div
          class="scrollbar-thin flex-1 overflow-y-auto bg-neutral-950 py-2"
          ref={bufferRef}
        >
          <Show
            fallback={
              <div class="flex h-full items-center justify-center">
                <div class="text-center text-neutral-600">
                  <p>No messages</p>
                </div>
              </div>
            }
            when={bufferMessages().length > 0}
          >
            <For each={bufferMessages()}>
              {(message) => <MessageLine message={message} />}
            </For>
          </Show>
        </div>

        {/* Nick list sidebar for channels */}
        <Show when={activeChannel()}>
          {(channel) => <NickList users={channel().users} />}
        </Show>
      </div>

      <CommandInput network={params().network} onSend={sendCommand} />
    </div>
  );
}

function NickList(props: { users: ChannelMember[] }) {
  // * Sort users: ops first, then voiced, then regular, alphabetically within each group
  const sortedUsers = createMemo(() =>
    [...props.users].sort((a, b) => {
      const aPriority = getMemberSortPriority(a.modes);
      const bPriority = getMemberSortPriority(b.modes);
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.nick.localeCompare(b.nick);
    })
  );

  return (
    <div class="scrollbar-thin w-48 overflow-y-auto border-neutral-800 border-l bg-neutral-900/30">
      <div class="border-neutral-800 border-b px-3 py-2">
        <span class="font-medium text-neutral-400 text-xs">
          {props.users.length} users
        </span>
      </div>
      <div class="py-1">
        <For each={sortedUsers()}>
          {(user) => {
            const prefix = getModePrefix(user.modes);
            const prefixColor =
              prefix === "@" ? "text-amber-400" : "text-emerald-400";
            return (
              <div class="group flex items-center px-3 py-0.5 text-sm hover:bg-neutral-800/50">
                <span class={`w-3 ${prefixColor}`}>{prefix}</span>
                <span class="text-neutral-300">{user.nick}</span>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}
