import { Show } from "solid-js";

type TextFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  type?: "text" | "password" | "number";
  placeholder?: string;
  error?: string;
  disabled?: boolean;
};

export function TextField(props: TextFieldProps) {
  return (
    <div class="mb-3">
      <label
        for={props.name}
        class="mb-1 block text-sm text-[var(--color-text-secondary)]"
      >
        {props.label}
      </label>
      <input
        id={props.name}
        name={props.name}
        type={props.type ?? "text"}
        value={props.value}
        onInput={(e) => props.onChange(e.currentTarget.value)}
        onBlur={props.onBlur}
        placeholder={props.placeholder}
        disabled={props.disabled}
        class="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Show when={props.error}>
        <span class="mt-1 block text-xs text-[var(--color-line-error)]">
          {props.error}
        </span>
      </Show>
    </div>
  );
}
