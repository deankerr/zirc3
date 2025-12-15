import { createMemo, For } from "solid-js";
import type { ChannelMember } from "@/store/types";

function getModePrefix(modes: string[]) {
  if (modes.includes("o")) return "@";
  if (modes.includes("v")) return "+";
  return "";
}

function getMemberSortPriority(modes: string[]) {
  if (modes.includes("o")) return 0;
  if (modes.includes("v")) return 1;
  return 2;
}

export function BufferSidebar(props: { users: ChannelMember[] }) {
  const sortedUsers = createMemo(() =>
    [...props.users].sort((a, b) => {
      const aPriority = getMemberSortPriority(a.modes);
      const bPriority = getMemberSortPriority(b.modes);
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.nick.localeCompare(b.nick);
    })
  );

  return (
    <div class="scrollbar-thin w-48 shrink-0 overflow-y-auto border-[var(--color-border)] border-l bg-[var(--color-bg-secondary)]">
      <div class="border-[var(--color-border)] border-b px-3 py-2">
        <span class="font-medium text-[var(--color-text-secondary)] text-xs">
          {props.users.length} users
        </span>
      </div>
      <div class="py-1">
        <For each={sortedUsers()}>
          {(user) => {
            const prefix = getModePrefix(user.modes);
            const prefixColor =
              prefix === "@"
                ? "var(--color-accent-secondary)"
                : "var(--color-accent-primary)";
            return (
              <div class="group flex items-center px-3 py-0.5 text-sm hover:bg-[var(--color-bg-hover)]">
                <span class="w-3" style={{ color: prefixColor }}>
                  {prefix}
                </span>
                <span class="text-[var(--color-text-primary)]">
                  {user.nick}
                </span>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}
