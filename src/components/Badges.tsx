import type { Importance } from "../types";
import { IMPORTANCE_LABELS } from "../lib/constants";
import clsx from "clsx";

interface ImportanceBadgeProps {
  importance: Importance;
  className?: string;
}

const STYLES: Record<Importance, string> = {
  critical:
    "bg-[color:var(--color-accent-orange)]/10 text-[color:var(--color-accent-orange)] border-[color:var(--color-accent-orange)]/30",
  high: "bg-[color:var(--color-accent-cyan)]/10 text-[color:var(--color-accent-cyan)] border-[color:var(--color-accent-cyan)]/30",
  medium:
    "bg-[color:var(--color-accent-purple)]/10 text-[color:var(--color-accent-purple)] border-[color:var(--color-accent-purple)]/30",
  low: "bg-[color:var(--color-accent-pink)]/10 text-[color:var(--color-accent-pink)] border-[color:var(--color-accent-pink)]/30",
};

export function ImportanceBadge({ importance, className }: ImportanceBadgeProps) {
  return (
    <span
      role="status"
      aria-label={`Importancia: ${IMPORTANCE_LABELS[importance].toLowerCase()}`}
      className={clsx(
        "inline-flex items-center justify-center rounded-md border px-2.5 py-0.5 font-mono text-[0.68rem] font-semibold tracking-wide",
        STYLES[importance],
        className,
      )}
    >
      {IMPORTANCE_LABELS[importance]}
    </span>
  );
}

interface FrequencyDotsProps {
  frequency: number; // 1-5
  className?: string;
}

export function FrequencyDots({ frequency, className }: FrequencyDotsProps) {
  const level = Math.min(5, Math.max(0, frequency));
  return (
    <div
      role="img"
      aria-label={`Frecuencia ${level} de 5`}
      className={clsx("flex items-center justify-center gap-[3px]", className)}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const active = i < level;
        const color =
          level >= 4
            ? "bg-[color:var(--color-freq-high)] shadow-[0_0_6px_var(--color-freq-high)]"
            : level >= 2
              ? "bg-[color:var(--color-freq-mid)] shadow-[0_0_6px_var(--color-freq-mid)]"
              : "bg-[color:var(--color-freq-low)]";
        return (
          <span
            key={i}
            aria-hidden="true"
            className={clsx(
              "h-2 w-2 rounded-full",
              active ? color : "bg-[color:var(--color-border)]",
            )}
          />
        );
      })}
    </div>
  );
}

interface TagChipProps {
  tag: string;
  onClick?: () => void;
  active?: boolean;
}

export function TagChip({ tag, onClick, active }: TagChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[0.65rem] transition",
        active
          ? "border-[color:var(--color-accent-cyan)]/50 bg-[color:var(--color-accent-cyan)]/10 text-[color:var(--color-accent-cyan)]"
          : "border-[color:var(--color-border)] bg-[color:var(--color-bg-card-alt)] text-[color:var(--color-text-muted)] hover:border-[color:var(--color-border-glow)] hover:text-[color:var(--color-text)]",
      )}
    >
      #{tag}
    </button>
  );
}
