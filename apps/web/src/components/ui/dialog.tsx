import { Dialog as KobalteDialog } from "@kobalte/core/dialog";
import { X } from "lucide-solid";
import type { JSX, ParentProps } from "solid-js";

type DialogProps = ParentProps<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
}>;

export function Dialog(props: DialogProps) {
  return (
    <KobalteDialog open={props.open} onOpenChange={props.onOpenChange}>
      <KobalteDialog.Portal>
        <KobalteDialog.Overlay class="fixed inset-0 z-40 bg-black/60" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <KobalteDialog.Content class="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 shadow-xl scrollbar-thin">
            <div class="mb-4 flex items-center justify-between">
              <KobalteDialog.Title class="text-lg font-semibold text-[var(--color-text-primary)]">
                {props.title}
              </KobalteDialog.Title>
              <KobalteDialog.CloseButton class="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]">
                <X size={18} />
              </KobalteDialog.CloseButton>
            </div>
            {props.children}
          </KobalteDialog.Content>
        </div>
      </KobalteDialog.Portal>
    </KobalteDialog>
  );
}

type DialogTriggerProps = {
  children: JSX.Element;
};

export function DialogTrigger(props: DialogTriggerProps) {
  return (
    <KobalteDialog.Trigger as="div">{props.children}</KobalteDialog.Trigger>
  );
}
