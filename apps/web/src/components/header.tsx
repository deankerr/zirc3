import { useApp } from "@/routes/__root";

export default function Header() {
  const { connected } = useApp();

  return (
    <div class="border-neutral-800 border-b bg-neutral-900/80">
      <div class="flex flex-row items-center justify-between px-4 py-2">
        <div class="flex items-center gap-3">
          <span class="font-bold text-emerald-500">zirc</span>
          <span class="text-neutral-600 text-xs">IRC bouncer</span>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <div
            class={`h-2 w-2 rounded-full ${connected() ? "bg-emerald-500 shadow-emerald-500/50 shadow-sm" : "bg-rose-500"}`}
          />
          <span class={connected() ? "text-emerald-500" : "text-rose-500"}>
            {connected() ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>
    </div>
  );
}
