import type { BufferLine, LineType } from "@/store/types";

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getLineColor(type: LineType): string {
  const colors: Record<LineType, string> = {
    message: "var(--color-line-message)",
    action: "var(--color-line-action)",
    notice: "var(--color-line-notice)",
    join: "var(--color-line-join)",
    part: "var(--color-line-part)",
    quit: "var(--color-line-quit)",
    kick: "var(--color-line-kick)",
    nick: "var(--color-line-nick)",
    mode: "var(--color-line-mode)",
    topic: "var(--color-line-topic)",
    info: "var(--color-line-info)",
    error: "var(--color-line-error)",
    system: "var(--color-line-system)",
  };
  return colors[type];
}

// * Stub: just render raw content for now, IRC formatting parsing comes later
function renderContent(content: string) {
  return content;
}

export function BufferLineComponent(props: { line: BufferLine }) {
  const line = props.line;
  const contentColor = getLineColor(line.type);
  const sourceColor = line.sourceStyle
    ? getLineColor(line.sourceStyle)
    : "var(--color-text-secondary)";

  return (
    <div class="group flex gap-2 whitespace-pre-wrap px-3 py-0.5 text-sm hover:bg-[var(--color-bg-hover)]">
      <span class="shrink-0 text-[var(--color-text-muted)]">
        {formatTime(line.timestamp)}
      </span>
      {line.source && (
        <span
          class="w-20 shrink-0 truncate text-right"
          style={{ color: sourceColor }}
        >
          {line.source}
        </span>
      )}
      <span class="min-w-0 break-words" style={{ color: contentColor }}>
        {renderContent(line.content)}
      </span>
    </div>
  );
}
