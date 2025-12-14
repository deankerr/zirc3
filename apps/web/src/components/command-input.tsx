import { createSignal } from "solid-js";

// * Parse "/command args" into { command, args }
function parseInput(input: string): { command: string; args: string[] } | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) {
    return null;
  }

  const withoutSlash = trimmed.slice(1);
  const [command, ...args] = withoutSlash.split(" ");
  return { command: command.toUpperCase(), args };
}

export function CommandInput(props: {
  network: string;
  onSend: (network: string, command: string, args: string[]) => void;
}) {
  const [value, setValue] = createSignal("");

  function handleSubmit(e: Event) {
    e.preventDefault();
    const parsed = parseInput(value());
    if (!parsed) {
      return;
    }
    props.onSend(props.network, parsed.command, parsed.args);
    setValue("");
  }

  return (
    <form
      class="flex border-neutral-800 border-t bg-neutral-900/50"
      onSubmit={handleSubmit}
    >
      <input
        class="flex-1 bg-transparent px-3 py-2 font-mono text-neutral-200 text-sm outline-none placeholder:text-neutral-600"
        onInput={(e) => setValue(e.currentTarget.value)}
        placeholder={`/${props.network} /command args...`}
        type="text"
        value={value()}
      />
    </form>
  );
}
