import { Download, Upload, RotateCcw, Info, Settings } from "lucide-react";
import { useStore } from "../store/useStore";

interface HeaderProps {
  onImport?: () => void;
  onExport?: () => void;
  onShowFormat?: () => void;
  onShowSettings?: () => void;
}

export function Header({
  onImport,
  onExport,
  onShowFormat,
  onShowSettings,
}: HeaderProps) {
  const load = useStore((s) => s.load);
  const loading = useStore((s) => s.loading);
  const error = useStore((s) => s.error);

  return (
    <header className="relative border-b border-[color:var(--color-border)]">
      <div
        className="pointer-events-none absolute inset-x-0 -top-24 h-64"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, rgba(255,107,53,0.12) 0%, transparent 70%)",
        }}
      />
      <div className="relative mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-bg-card)] font-mono text-xl text-[color:var(--color-accent-orange)]">
            ◆
          </div>
          <div>
            <h1 className="font-mono text-xl font-bold leading-none text-[color:var(--color-text-bright)] md:text-2xl">
              <span
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-accent-orange), var(--color-accent-cyan))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                commands
              </span>{" "}
              viewer
            </h1>
            <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
              Gestiona y visualiza cheatsheets de tus herramientas favoritas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {error && (
            <span className="max-w-xs truncate rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-mono text-xs text-red-400">
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={() => load()}
            className="flex h-9 items-center gap-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)] px-3 font-mono text-xs text-[color:var(--color-text-muted)] transition hover:border-[color:var(--color-border-glow)] hover:text-[color:var(--color-text-bright)] disabled:cursor-not-allowed disabled:opacity-50"
            title="Recargar desde disco"
            aria-label="Recargar desde disco"
            disabled={loading}
          >
            <RotateCcw size={13} className={loading ? "animate-spin" : ""} />
            Recargar
          </button>
          {onShowFormat && (
            <button
              type="button"
              onClick={onShowFormat}
              className="flex h-9 items-center gap-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)] px-3 font-mono text-xs text-[color:var(--color-text-muted)] transition hover:border-[color:var(--color-accent-cyan)]/40 hover:text-[color:var(--color-accent-cyan)]"
              title="Ver formato de importación JSON"
              aria-label="Ver formato de importación JSON"
            >
              <Info size={13} />
              Formato
            </button>
          )}
          {onImport && (
            <button
              type="button"
              onClick={onImport}
              className="flex h-9 items-center gap-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)] px-3 font-mono text-xs text-[color:var(--color-text-muted)] transition hover:border-[color:var(--color-border-glow)] hover:text-[color:var(--color-text-bright)]"
              title="Importar JSON"
            >
              <Upload size={13} />
              Importar
            </button>
          )}
          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="flex h-9 items-center gap-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)] px-3 font-mono text-xs text-[color:var(--color-text-muted)] transition hover:border-[color:var(--color-border-glow)] hover:text-[color:var(--color-text-bright)]"
              title="Exportar JSON"
            >
              <Download size={13} />
              Exportar
            </button>
          )}
          {onShowSettings && (
            <button
              type="button"
              onClick={onShowSettings}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)] text-[color:var(--color-text-muted)] transition hover:border-[color:var(--color-border-glow)] hover:text-[color:var(--color-text-bright)]"
              title="Configuración"
              aria-label="Configuración"
            >
              <Settings size={15} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
