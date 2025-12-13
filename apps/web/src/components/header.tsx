export default function Header() {
  return (
    <div class="border-neutral-800 border-b bg-neutral-900/80">
      <div class="flex flex-row items-center justify-between px-4 py-2">
        <div class="flex items-center gap-3">
          <span class="font-bold text-emerald-500">zirc</span>
          <span class="text-neutral-600 text-xs">IRC bouncer</span>
        </div>
        <div class="flex items-center gap-4 text-neutral-500 text-xs">
          <span>v0.1.0</span>
        </div>
      </div>
    </div>
  );
}
