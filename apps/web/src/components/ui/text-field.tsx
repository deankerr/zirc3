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
        class="mb-1 block text-[var(--color-text-secondary)] text-sm"
        for={props.name}
      >
        {props.label}
      </label>
      <input
        class="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        disabled={props.disabled}
        id={props.name}
        name={props.name}
        onBlur={props.onBlur}
        onInput={(e) => props.onChange(e.currentTarget.value)}
        placeholder={props.placeholder}
        type={props.type ?? "text"}
        value={props.value}
      />
      <Show when={props.error}>
        <span class="mt-1 block text-[var(--color-line-error)] text-xs">
          {props.error}
        </span>
      </Show>
    </div>
  );
}
