import { useEffect } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import { useStore, type Density } from "../store/useStore";
import type { Theme } from "../types";
import { useFocusTrap } from "../lib/useFocusTrap";

interface SettingsModalProps {
  onClose: () => void;
}

const DENSITY_OPTIONS: Array<{
  value: Density;
  label: string;
  description: string;
  preview: string[];
}> = [
  {
    value: "ultra",
    label: "Compacto",
    description:
      "Densidad máxima. Oculta etiquetas, notas y pistas; cada fila en una sola línea. Ideal para escanear muchos comandos.",
    preview: ["•", "•", "•", "•", "•", "•", "•"],
  },
  {
    value: "compact",
    label: "Normal",
    description: "Modo normal con etiquetas y notas visibles. Botones pequeños.",
    preview: ["•", "•", "•", "•", "•"],
  },
  {
    value: "comfortable",
    label: "Confortable",
    description: "Más aire entre filas y botones de ~36px. Mejor para touch y accesibilidad.",
    preview: ["•", "•", "•"],
  },
];

const THEME_OPTIONS: Array<{
  value: Theme;
  label: string;
  description: string;
}> = [
  {
    value: "dark",
    label: "Oscuro",
    description: "El tema actual: fondo profundo, contraste alto y look terminal.",
  },
  {
    value: "light",
    label: "Claro",
    description: "Fondo luminoso y tinta suave para trabajar de día sin depender del modo oscuro.",
  },
];

export function SettingsModal({ onClose }: SettingsModalProps) {
  const density = useStore((s) => s.settings.density);
  const theme = useStore((s) => s.settings.theme);
  const setDensity = useStore((s) => s.setDensity);
  const setTheme = useStore((s) => s.setTheme);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const trapRef = useFocusTrap<HTMLDivElement>();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--color-overlay)] p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Configuración"
    >
      <div
        ref={trapRef}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-[color:var(--color-border-glow)] bg-[color:var(--color-bg-card)] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-6 py-4">
          <h2 className="font-mono text-base font-semibold text-[color:var(--color-text-bright)]">
            Configuración
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg-card-alt)] hover:text-[color:var(--color-text-bright)]"
            aria-label="Cerrar"
          >
            <X size={15} />
          </button>
        </header>

        <div className="space-y-6 px-6 py-5">
          <section>
            <h3 className="mb-1 font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
              Apariencia
            </h3>
            <p className="mb-3 text-xs text-[color:var(--color-text-muted)]">
              Cambia el tema visual general de la aplicación.
            </p>
            <div className="space-y-2">
              {THEME_OPTIONS.map((opt) => {
                const active = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTheme(opt.value)}
                    className={clsx(
                      "flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition",
                      active
                        ? "border-[color:var(--color-accent-cyan)]/50 bg-[color:var(--color-accent-cyan)]/10"
                        : "border-[color:var(--color-border)] bg-[color:var(--color-bg)] hover:border-[color:var(--color-border-glow)]",
                    )}
                  >
                    <div
                      className={clsx(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition",
                        active
                          ? "border-[color:var(--color-accent-cyan)]"
                          : "border-[color:var(--color-border-glow)]",
                      )}
                    >
                      {active && (
                        <div className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent-cyan)]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div
                        className={clsx(
                          "font-mono text-sm font-semibold",
                          active
                            ? "text-[color:var(--color-accent-cyan)]"
                            : "text-[color:var(--color-text-bright)]",
                        )}
                      >
                        {opt.label}
                      </div>
                      <div className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                        {opt.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="mb-1 font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
              Densidad de la tabla
            </h3>
            <p className="mb-3 text-xs text-[color:var(--color-text-muted)]">
              Elige cuánto espacio dejar entre filas y el tamaño de los botones de acción.
            </p>
            <div className="space-y-2">
              {DENSITY_OPTIONS.map((opt) => {
                const active = density === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDensity(opt.value)}
                    className={clsx(
                      "flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition",
                      active
                        ? "border-[color:var(--color-accent-cyan)]/50 bg-[color:var(--color-accent-cyan)]/10"
                        : "border-[color:var(--color-border)] bg-[color:var(--color-bg)] hover:border-[color:var(--color-border-glow)]",
                    )}
                  >
                    <div
                      className={clsx(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition",
                        active
                          ? "border-[color:var(--color-accent-cyan)]"
                          : "border-[color:var(--color-border-glow)]",
                      )}
                    >
                      {active && (
                        <div className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent-cyan)]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div
                        className={clsx(
                          "font-mono text-sm font-semibold",
                          active
                            ? "text-[color:var(--color-accent-cyan)]"
                            : "text-[color:var(--color-text-bright)]",
                        )}
                      >
                        {opt.label}
                      </div>
                      <div className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                        {opt.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <footer className="flex items-center justify-between border-t border-[color:var(--color-border)] px-6 py-4">
          <p className="font-mono text-[0.65rem] text-[color:var(--color-text-muted)]">
            Los cambios se aplican al momento y se guardan en el navegador.
          </p>
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
