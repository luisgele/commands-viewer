import { useEffect } from "react";
import clsx from "clsx";
import { useFocusTrap } from "../lib/useFocusTrap";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = true,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const trapRef = useFocusTrap<HTMLDivElement>();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--color-overlay)] p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={trapRef}
        className="max-w-sm rounded-xl border border-[color:var(--color-border-glow)] bg-[color:var(--color-bg-card)] p-6 shadow-2xl"
      >
        <h3 className="font-mono text-base font-semibold text-[color:var(--color-text-bright)]">
          {title}
        </h3>
        <p className="mt-2 whitespace-pre-line text-sm text-[color:var(--color-text)]">
          {message}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-card-alt)] px-4 py-2 font-mono text-xs text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={clsx(
              "rounded-md border px-4 py-2 font-mono text-xs transition",
              destructive
                ? "border-[color:var(--color-accent-orange)]/40 bg-[color:var(--color-accent-orange)]/20 text-[color:var(--color-accent-orange)] hover:bg-[color:var(--color-accent-orange)]/30"
                : "border-[color:var(--color-accent-cyan)]/40 bg-[color:var(--color-accent-cyan)]/20 text-[color:var(--color-accent-cyan)] hover:bg-[color:var(--color-accent-cyan)]/30",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
