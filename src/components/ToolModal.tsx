import { useState, useEffect } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import { TOOL_COLOR_PALETTE } from "../lib/constants";
import { useFocusTrap } from "../lib/useFocusTrap";
import type { Tool } from "../types";

interface ToolModalProps {
  tool?: Tool;
  onClose: () => void;
  onSave: (values: { name: string; icon: string; color: string; docUrl?: string }) => Promise<void>;
}

export function ToolModal({ tool, onClose, onSave }: ToolModalProps) {
  const isEdit = tool !== undefined;
  const [name, setName] = useState(tool?.name ?? "");
  const [icon, setIcon] = useState(tool?.icon ?? "◆");
  const [color, setColor] = useState(tool?.color ?? TOOL_COLOR_PALETTE[0]);
  const [docUrl, setDocUrl] = useState(tool?.docUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onSave({ name: name.trim(), icon: icon.trim() || "◆", color, docUrl: docUrl.trim() || undefined });
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  const trapRef = useFocusTrap<HTMLDivElement>();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "Editar herramienta" : "Nueva herramienta"}
    >
      <div
        ref={trapRef}
        className="w-full max-w-md overflow-hidden rounded-xl border border-[color:var(--color-border-glow)] bg-[color:var(--color-bg-card)] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-6 py-4">
          <h2 className="font-mono text-base font-semibold text-[color:var(--color-text-bright)]">
            {isEdit ? "Editar herramienta" : "Nueva herramienta"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg-card-alt)] hover:text-[color:var(--color-text-bright)]"
          >
            <X size={15} />
          </button>
        </header>
        <div className="space-y-5 px-6 py-5">
          <label className="block">
            <span className="mb-1.5 block font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
              Nombre <span className="text-[color:var(--color-accent-orange)]">*</span>
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="p.ej. Kubernetes"
              className="h-9 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 font-mono text-sm text-[color:var(--color-text-bright)] outline-none focus:border-[color:var(--color-accent-cyan)]"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
              Icono (1-2 caracteres)
            </span>
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={2}
              className="h-9 w-20 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 text-center font-mono text-base text-[color:var(--color-text-bright)] outline-none focus:border-[color:var(--color-accent-cyan)]"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
              Color
            </span>
            <div className="flex gap-2">
              {TOOL_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={clsx(
                    "h-10 w-10 rounded-lg border-2 transition",
                    color === c
                      ? "border-white scale-110"
                      : "border-transparent hover:scale-105",
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
              Documentación oficial (URL)
            </span>
            <input
              type="url"
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
              placeholder="https://docs.ejemplo.com/comandos"
              className="h-9 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 font-mono text-sm text-[color:var(--color-text-bright)] outline-none focus:border-[color:var(--color-accent-cyan)]"
            />
          </label>
          {error && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-[color:var(--color-border)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-card-alt)] px-4 py-2 font-mono text-xs text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md border border-[color:var(--color-accent-cyan)]/40 bg-[color:var(--color-accent-cyan)]/20 px-5 py-2 font-mono text-xs text-[color:var(--color-accent-cyan)] hover:bg-[color:var(--color-accent-cyan)]/30 disabled:opacity-50"
          >
            {saving ? (isEdit ? "Guardando..." : "Creando...") : (isEdit ? "Guardar" : "Crear")}
          </button>
        </footer>
      </div>
    </div>
  );
}
