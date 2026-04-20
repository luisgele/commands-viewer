import { useEffect, useMemo } from "react";
import { AlertTriangle, Upload, X } from "lucide-react";
import type { Tool } from "../types";
import { useFocusTrap } from "../lib/useFocusTrap";

interface ImportedTool {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
}

interface ImportedCommand {
  id?: string;
  toolId: string;
  name: string;
}

interface ImportedResource {
  id?: string;
  toolId: string;
  name: string;
}

interface ImportedData {
  tools: ImportedTool[];
  commands: ImportedCommand[];
  resources?: ImportedResource[];
}

interface ImportPreviewModalProps {
  data: ImportedData;
  existingTools: Tool[];
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

export function ImportPreviewModal({
  data,
  existingTools,
  onCancel,
  onConfirm,
}: ImportPreviewModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const analysis = useMemo(() => {
    const existingSlugs = new Set(existingTools.map((t) => t.slug));
    const seenSlugs = new Set<string>();
    let newTools = 0;
    let reusedTools = 0;
    let duplicateSlugs = 0;
    const byToolId = new Map<
      string,
      { name: string; commands: number; resources: number; isNew: boolean }
    >();
    for (const tool of data.tools) {
      if (seenSlugs.has(tool.slug)) {
        duplicateSlugs++;
        continue;
      }
      seenSlugs.add(tool.slug);
      const isNew = !existingSlugs.has(tool.slug);
      if (isNew) newTools++;
      else reusedTools++;
      byToolId.set(tool.id, { name: tool.name, commands: 0, resources: 0, isNew });
    }
    let orphanCommands = 0;
    for (const cmd of data.commands) {
      const entry = byToolId.get(cmd.toolId);
      if (entry) entry.commands++;
      else orphanCommands++;
    }
    let orphanResources = 0;
    for (const resource of data.resources ?? []) {
      const entry = byToolId.get(resource.toolId);
      if (entry) entry.resources++;
      else orphanResources++;
    }
    return {
      newTools,
      reusedTools,
      duplicateSlugs,
      orphanCommands,
      orphanResources,
      totalCommands: data.commands.length,
      importedCommands: data.commands.length - orphanCommands,
      totalResources: (data.resources ?? []).length,
      importedResources: (data.resources ?? []).length - orphanResources,
      toolBreakdown: [...byToolId.values()],
    };
  }, [data, existingTools]);

  const hasWarnings =
    analysis.duplicateSlugs > 0 || analysis.orphanCommands > 0 || analysis.orphanResources > 0;

  const trapRef = useFocusTrap<HTMLDivElement>();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--color-overlay)] p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Previsualización de importación"
    >
      <div
        ref={trapRef}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[color:var(--color-border-glow)] bg-[color:var(--color-bg-card)] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-6 py-4">
          <h2 className="font-mono text-base font-semibold text-[color:var(--color-text-bright)]">
            Previsualización de importación
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg-card-alt)] hover:text-[color:var(--color-text-bright)]"
            aria-label="Cerrar"
          >
            <X size={15} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="mb-4 text-xs text-[color:var(--color-text-muted)]">
            Los datos se <strong className="text-[color:var(--color-text)]">añaden</strong> sin
            sobrescribir los existentes. Las herramientas con el mismo{" "}
            <code className="rounded bg-[color:var(--color-bg)] px-1 font-mono text-[color:var(--color-accent-cyan)]">
              slug
            </code>{" "}
            se reutilizan automáticamente.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Herramientas nuevas"
              value={analysis.newTools}
              accent="cyan"
            />
            <StatCard
              label="Herramientas reutilizadas"
              value={analysis.reusedTools}
              accent="muted"
            />
            <StatCard
              label="Comandos a importar"
              value={analysis.importedCommands}
              accent="green"
            />
            <StatCard
              label="Recursos a importar"
              value={analysis.importedResources}
              accent="cyan"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <StatCard
              label="Total comandos"
              value={analysis.totalCommands}
              accent="muted"
            />
            <StatCard
              label="Total recursos"
              value={analysis.totalResources}
              accent="muted"
            />
          </div>

          {hasWarnings && (
            <div className="mt-4 rounded-md border border-[color:var(--color-accent-yellow)]/30 bg-[color:var(--color-accent-yellow)]/[0.06] px-4 py-3">
              <div className="mb-1.5 flex items-center gap-2">
                <AlertTriangle
                  size={13}
                  className="text-[color:var(--color-accent-yellow)]"
                />
                <span className="font-mono text-[0.7rem] font-semibold uppercase tracking-wider text-[color:var(--color-accent-yellow)]">
                  Avisos
                </span>
              </div>
              <ul className="space-y-1 text-xs text-[color:var(--color-text)]">
                {analysis.duplicateSlugs > 0 && (
                  <li>
                    · <strong>{analysis.duplicateSlugs}</strong> herramienta(s) con slug duplicado
                    en el archivo serán ignoradas
                  </li>
                )}
                {analysis.orphanCommands > 0 && (
                  <li>
                    · <strong>{analysis.orphanCommands}</strong> comando(s) apuntan a herramientas
                    inexistentes y serán omitidos
                  </li>
                )}
                {analysis.orphanResources > 0 && (
                  <li>
                    · <strong>{analysis.orphanResources}</strong> recurso(s) apuntan a herramientas
                    inexistentes y serán omitidos
                  </li>
                )}
              </ul>
            </div>
          )}

          {analysis.toolBreakdown.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
                Detalle por herramienta
              </h3>
              <div className="space-y-1 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-2">
                {analysis.toolBreakdown.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-2 py-1 font-mono text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[color:var(--color-text-bright)]">{t.name}</span>
                      <span
                        className={
                          t.isNew
                            ? "rounded bg-[color:var(--color-accent-cyan)]/10 px-1.5 py-0.5 text-[0.6rem] text-[color:var(--color-accent-cyan)]"
                            : "rounded bg-[color:var(--color-bg-card-alt)] px-1.5 py-0.5 text-[0.6rem] text-[color:var(--color-text-muted)]"
                        }
                      >
                        {t.isNew ? "NUEVA" : "EXISTENTE"}
                      </span>
                    </div>
                      <span className="text-[color:var(--color-text-muted)]">
                      {t.commands} cmd · {t.resources} recurso{t.resources === 1 ? "" : "s"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[color:var(--color-border)] px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-card-alt)] px-4 py-2 font-mono text-xs text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-2 rounded-md border border-[color:var(--color-accent-cyan)]/40 bg-[color:var(--color-accent-cyan)]/20 px-5 py-2 font-mono text-xs text-[color:var(--color-accent-cyan)] hover:bg-[color:var(--color-accent-cyan)]/30"
          >
            <Upload size={13} />
            Importar
          </button>
        </footer>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "cyan" | "green" | "muted";
}) {
  const color =
    accent === "cyan"
      ? "text-[color:var(--color-accent-cyan)]"
      : accent === "green"
        ? "text-[color:var(--color-accent-green)]"
        : "text-[color:var(--color-text-bright)]";
  return (
    <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2">
      <div className="font-mono text-[0.6rem] uppercase tracking-wider text-[color:var(--color-text-muted)]">
        {label}
      </div>
      <div className={`mt-0.5 font-mono text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
