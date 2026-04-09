import { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { useFocusTrap } from "../lib/useFocusTrap";

interface FormatInfoModalProps {
  onClose: () => void;
}

const EXAMPLE_JSON = `{
  "tools": [
    {
      "id": "git",
      "name": "Git",
      "slug": "git",
      "icon": "⑂",
      "color": "#f05033",
      "order": 1
    }
  ],
  "commands": [
    {
      "id": "git-1",
      "toolId": "git",
      "section": "Básico",
      "name": "git status",
      "description": "Estado del working tree",
      "hint": "git status -s para formato corto",
      "importance": "critical",
      "frequency": 5,
      "tags": ["git", "inspection"],
      "notes": "",
      "favorite": false,
      "order": 0,
      "modifiers": [
        {
          "flag": "-s",
          "description": "Formato compacto, una línea por archivo",
          "example": "git status -s"
        },
        {
          "flag": "-b",
          "description": "Incluye info de branch en el output"
        }
      ]
    }
  ]
}`;

export function FormatInfoModal({ onClose }: FormatInfoModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(EXAMPLE_JSON);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may be unavailable — fall back silently
    }
  };

  const trapRef = useFocusTrap<HTMLDivElement>();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Formato de importación JSON"
    >
      <div
        ref={trapRef}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[color:var(--color-border-glow)] bg-[color:var(--color-bg-card)] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-6 py-4">
          <h2 className="font-mono text-base font-semibold text-[color:var(--color-text-bright)]">
            Formato de importación JSON
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg-card-alt)] hover:text-[color:var(--color-text-bright)]"
          >
            <X size={15} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="mb-3 text-sm text-[color:var(--color-text)]">
            El archivo JSON debe contener dos arrays raíz:{" "}
            <code className="rounded bg-[color:var(--color-bg)] px-1.5 py-0.5 font-mono text-xs text-[color:var(--color-accent-cyan)]">
              tools
            </code>{" "}
            y{" "}
            <code className="rounded bg-[color:var(--color-bg)] px-1.5 py-0.5 font-mono text-xs text-[color:var(--color-accent-cyan)]">
              commands
            </code>
            .
          </p>
          <p className="mb-4 text-xs text-[color:var(--color-text-muted)]">
            El import <strong className="text-[color:var(--color-text)]">añade</strong>{" "}
            datos sin sobrescribir: las tools con el mismo{" "}
            <code className="rounded bg-[color:var(--color-bg)] px-1 font-mono text-[color:var(--color-accent-cyan)]">
              slug
            </code>{" "}
            se reutilizan; los comandos reciben nuevos IDs. Usa{" "}
            <em>Export</em> desde el header para generar un archivo de ejemplo
            con la estructura exacta de tu base de datos actual.
          </p>

          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
              Ejemplo mínimo
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex h-7 items-center gap-1.5 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-card-alt)] px-2.5 font-mono text-[0.65rem] text-[color:var(--color-text-muted)] transition hover:border-[color:var(--color-accent-cyan)]/40 hover:text-[color:var(--color-accent-cyan)]"
            >
              {copied ? (
                <>
                  <Check size={12} /> Copiado
                </>
              ) : (
                <>
                  <Copy size={12} /> Copiar
                </>
              )}
            </button>
          </div>

          <pre className="max-h-[40vh] overflow-auto rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4 font-mono text-[0.72rem] leading-relaxed text-[color:var(--color-text)]">
            {EXAMPLE_JSON}
          </pre>

          <div className="mt-5 space-y-3">
            <FieldRow
              name="importance"
              desc='"critical" | "high" | "medium" | "low"'
            />
            <FieldRow name="frequency" desc="1-5 (entero, 5 = uso diario)" />
            <FieldRow
              name="modifiers"
              desc="Array opcional con { flag, description, example? }"
            />
            <FieldRow name="tags" desc="Array de strings para filtrar transversalmente" />
            <FieldRow name="favorite" desc="boolean — marca con estrella" />
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[color:var(--color-border)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-card-alt)] px-4 py-2 font-mono text-xs text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}

function FieldRow({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 text-xs">
      <code className="inline-block w-28 shrink-0 rounded bg-[color:var(--color-bg)] px-2 py-0.5 font-mono text-[0.7rem] text-[color:var(--color-accent-cyan)]">
        {name}
      </code>
      <span className="text-[color:var(--color-text-muted)]">{desc}</span>
    </div>
  );
}
