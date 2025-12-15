import { createFileRoute } from "@tanstack/solid-router";
import { Buffer } from "@/components/buffer";
import { SYSTEM_BUFFER_ID, useStore } from "@/store";

export const Route = createFileRoute("/")({
  component: SystemView,
});

function SystemView() {
  const { store } = useStore();

  const buffer = () => store.buffers[SYSTEM_BUFFER_ID];

  function handleInput(text: string) {
    // * Stub: system buffer commands will be implemented later
    console.log("[system] input:", text);
  }

  return <Buffer lines={buffer()?.lines ?? []} onInput={handleInput} />;
}
