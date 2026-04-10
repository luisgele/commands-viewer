import { useEffect } from "react";
import { BookOpen, ExternalLink, StickyNote, X } from "lucide-react";
import type { Command } from "../types";
import { useFocusTrap } from "../lib/useFocusTrap";
import { ImportanceBadge, FrequencyDots } from "./Badges";

interface DocModalProps {
  command: Command;
  onClose: () => void;
}

export function DocModal({ command, onClose }: DocModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const trapRef = useFocusTrap<HTMLDivElement>();

  const openInBrowser = () => {
    if (command.docUrl) {
      window.open(command.docUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Documentación: ${command.name}`}
    >
      <div
        ref={trapRef}
        className="w-full max-w-4xl overflow-hidden rounded-xl border border-[color:var(--color-border-glow)] bg-[color:var(--color-bg-card)] shadow-2xl"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <BookOpen
              size={18}
              className="shrink-0 text-[color:var(--color-accent-cyan)]"
            />
            <h2 className="truncate font-mono text-base font-semibold text-[color:var(--color-text-bright)]">
              {command.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg-card-alt)] hover:text-[color:var(--color-text-bright)]"
            aria-label="Cerrar"
          >
            <X size={15} />
          </button>
        </header>

        {/* Sub-header: section · importance · frequency */}
        <div className="flex items-center gap-3 border-b border-[color:var(--color-border)] px-6 py-2.5">
          <span className="font-mono text-[0.7rem] text-[color:var(--color-text-muted)]">
            {command.section}
          </span>
          <span className="text-[color:var(--color-border)]">·</span>
          <ImportanceBadge importance={command.importance} />
          <span className="text-[color:var(--color-border)]">·</span>
          <FrequencyDots frequency={command.frequency} />
        </div>

        {/* Scrollable body */}
        <div className="max-h-[80vh] overflow-y-auto">
          {/* Description section */}
          <section className="border-b border-[color:var(--color-border)] px-6 py-5">
            <p className="mb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
              Descripción
            </p>
            <p className="text-sm text-[color:var(--color-text)]">
              {command.description || (
                <span className="italic text-[color:var(--color-text-muted)]">
                  Sin descripción
                </span>
              )}
            </p>
            {command.hint && (
              <p className="mt-2 font-mono text-xs italic text-[color:var(--color-text-muted)]">
                {command.hint}
              </p>
            )}
          </section>

          {/* Notes section — only if notes exists */}
          {command.notes && (
            <section className="border-b border-[color:var(--color-border)] px-6 py-5">
              <p className="mb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
                Notas
              </p>
              <div className="flex items-start gap-2">
                <StickyNote
                  size={14}
                  className="mt-0.5 shrink-0 text-[color:var(--color-accent-orange)]"
                />
                <p className="whitespace-pre-wrap text-sm text-[color:var(--color-text)]">
                  {command.notes}
                </p>
              </div>
            </section>
          )}

          {/* Modifiers section — only if modifiers exist */}
          {command.modifiers && command.modifiers.length > 0 && (
            <section className="border-b border-[color:var(--color-border)] px-6 py-5">
              <p className="mb-3 font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
                Modificadores
              </p>
              <div className="overflow-hidden rounded-md border border-[color:var(--color-border)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-card-alt)]">
                      <th className="px-3 py-2 text-left font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
                        Flag
                      </th>
                      <th className="px-3 py-2 text-left font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
                        Descripción
                      </th>
                      <th className="px-3 py-2 text-left font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
                        Ejemplo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {command.modifiers.map((mod, i) => (
                      <tr
                        key={i}
                        className={
                          i % 2 === 0
                            ? "bg-[color:var(--color-bg-card)]"
                            : "bg-[color:var(--color-bg-card-alt)]"
                        }
                      >
                        <td className="px-3 py-2 font-mono text-xs text-[color:var(--color-accent-cyan)]">
                          {mod.flag}
                        </td>
                        <td className="px-3 py-2 text-xs text-[color:var(--color-text)]">
                          {mod.description}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs italic text-[color:var(--color-text-muted)]">
                          {mod.example ?? ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Official docs section */}
          <section className="px-6 py-5">
            <p className="mb-3 font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
              Documentación oficial
            </p>
            {command.docUrl ? (
              <div className="space-y-3">
                {/* URL display */}
                <div className="flex items-center gap-2">
                  <ExternalLink
                    size={13}
                    className="shrink-0 text-[color:var(--color-text-muted)]"
                  />
                  <span className="truncate font-mono text-xs text-[color:var(--color-text-muted)]">
                    {command.docUrl}
                  </span>
                </div>

                {/* Open in browser — primary action */}
                <button
                  type="button"
                  onClick={openInBrowser}
                  className="flex items-center gap-1.5 rounded-md border border-[color:var(--color-accent-cyan)]/40 bg-[color:var(--color-accent-cyan)]/20 px-4 py-2 font-mono text-xs text-[color:var(--color-accent-cyan)] hover:bg-[color:var(--color-accent-cyan)]/30"
                >
                  <ExternalLink size={13} />
                  Abrir en navegador ↗
                </button>

                {/* iframe — secondary */}
                <div className="overflow-hidden rounded-md border border-[color:var(--color-border)]">
                  <iframe
                    src={command.docUrl}
                    title="Documentación oficial"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    className="h-[350px] w-full bg-white"
                  />
                </div>

                <p className="text-[0.65rem] text-[color:var(--color-text-muted)]">
                  Si el iframe no carga, usa el botón de arriba para abrir la
                  documentación en el navegador.
                </p>
              </div>
            ) : (
              <p className="text-sm italic text-[color:var(--color-text-muted)]">
                Sin URL de documentación configurada
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
