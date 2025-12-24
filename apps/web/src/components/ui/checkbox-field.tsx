import { Checkbox } from "@kobalte/core/checkbox";
import { Check } from "lucide-solid";

type CheckboxFieldProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
};

export function CheckboxField(props: CheckboxFieldProps) {
  return (
    <Checkbox
      checked={props.checked}
      onChange={props.onChange}
      class="mb-3 flex items-start gap-2"
    >
      <Checkbox.Input class="peer" />
      <Checkbox.Control class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] data-[checked]:border-[var(--color-accent-primary)] data-[checked]:bg-[var(--color-accent-primary)]">
        <Checkbox.Indicator>
          <Check size={12} class="text-[var(--color-bg-primary)]" />
        </Checkbox.Indicator>
      </Checkbox.Control>
      <div class="flex flex-col">
        <Checkbox.Label class="text-sm text-[var(--color-text-secondary)] peer-focus-visible:text-[var(--color-text-primary)]">
          {props.label}
        </Checkbox.Label>
        {props.description && (
          <span class="text-xs text-[var(--color-text-muted)]">
            {props.description}
          </span>
        )}
      </div>
    </Checkbox>
  );
}
