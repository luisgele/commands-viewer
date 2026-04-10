import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import clsx from "clsx";
import type { Command, Importance, Modifier, Tool } from "../types";
import { IMPORTANCE_LABELS, IMPORTANCE_ORDER } from "../lib/constants";
import { useFocusTrap } from "../lib/useFocusTrap";

interface CommandModalProps {
  tool: Tool;
  command: Command | null;
  existingSections: string[];
  onClose: () => void;
  onSave: (values: CommandFormValues) => Promise<void>;
}

export interface CommandFormValues {
  name: string;
  description: string;
  hint: string;
  section: string;
  importance: Importance;
  frequency: number;
  tags: string[];
  notes: string;
  favorite: boolean;
  modifiers: Modifier[];
  docUrl?: string;
}

const EMPTY: CommandFormValues = {
  name: "",
  description: "",
  hint: "",
  section: "General",
  importance: "medium",
  frequency: 3,
  tags: [],
  notes: "",
  favorite: false,
  modifiers: [],
  docUrl: "",
};

export function CommandModal({
  tool,
  command,
  existingSections,
  onClose,
  onSave,
}: CommandModalProps) {
  const isEdit = command !== null;
  const [values, setValues] = useState<CommandFormValues>(
    command
      ? {
          name: command.name,
          description: command.description,
          hint: command.hint,
          section: command.section,
          importance: command.importance,
          frequency: command.frequency,
          tags: [...command.tags],
          notes: command.notes,
          favorite: command.favorite,
          modifiers: (command.modifiers ?? []).map((m) => ({ ...m })),
          docUrl: command.docUrl ?? "",
        }
      : { ...EMPTY, section: existingSections[0] ?? "General" },
  );
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const patch = <K extends keyof CommandFormValues>(
    key: K,
    value: CommandFormValues[K],
  ) => setValues((v) => ({ ...v, [key]: value }));

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!values.tags.includes(t)) patch("tags", [...values.tags, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) =>
    patch(
      "tags",
      values.tags.filter((t) => t !== tag),
    );

  const sections = useMemo(() => {
    const set = new Set(existingSections);
    if (values.section) set.add(values.section);
    return [...set].sort();
  }, [existingSections, values.section]);

  const handleSave = async () => {
    if (!values.name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      // Drop any modifier rows whose flag is empty — they'd be stripped by the
      // server anyway, but trimming them here keeps the UI in sync.
      const cleaned: CommandFormValues = {
        ...values,
        modifiers: values.modifiers.filter((m) => m.flag.trim().length > 0),
        docUrl: values.docUrl?.trim() || undefined,
      };
      await onSave(cleaned);
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
      aria-label={isEdit ? "Editar comando" : "Nuevo comando"}
    >
      <div
        ref={trapRef}
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-[color:var(--color-border-glow)] bg-[color:var(--color-bg-card)] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <span style={{ color: tool.color }} className="text-lg">
              {tool.icon}
            </span>
            <h2 className="font-mono text-base font-semibold text-[color:var(--color-text-bright)]">
              {isEdit ? "Editar comando" : "Nuevo comando"} · {tool.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg-card-alt)] hover:text-[color:var(--color-text-bright)]"
          >
            <X size={15} />
          </button>
        </header>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <Field label="Nombre del comando" required>
              <input
                value={values.name}
                onChange={(e) => patch("name", e.target.value)}
                autoFocus
                placeholder="p.ej. git rebase -i HEAD~3"
                className="h-9 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 font-mono text-sm text-[color:var(--color-text-bright)] outline-none focus:border-[color:var(--color-accent-cyan)]"
              />
            </Field>

            <Field label="Descripción">
              <input
                value={values.description}
                onChange={(e) => patch("description", e.target.value)}
                placeholder="Qué hace en una línea"
                className="h-9 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 text-sm text-[color:var(--color-text-bright)] outline-none focus:border-[color:var(--color-accent-cyan)]"
              />
            </Field>

            <Field label="Hint / ejemplo">
              <input
                value={values.hint}
                onChange={(e) => patch("hint", e.target.value)}
                placeholder="Ejemplos, flags útiles, aliases..."
                className="h-9 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 font-mono text-xs text-[color:var(--color-text-muted)] outline-none focus:border-[color:var(--color-accent-cyan)]"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Sección">
                <input
                  list="sections"
                  value={values.section}
                  onChange={(e) => patch("section", e.target.value)}
                  placeholder="Básico, Avanzado..."
                  className="h-9 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 text-sm text-[color:var(--color-text-bright)] outline-none focus:border-[color:var(--color-accent-cyan)]"
                />
                <datalist id="sections">
                  {sections.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </Field>

              <Field label="Favorito">
                <button
                  type="button"
                  onClick={() => patch("favorite", !values.favorite)}
                  className={clsx(
                    "h-9 w-full rounded-md border font-mono text-xs transition",
                    values.favorite
                      ? "border-[color:var(--color-accent-yellow)]/40 bg-[color:var(--color-accent-yellow)]/10 text-[color:var(--color-accent-yellow)]"
                      : "border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[color:var(--color-text-muted)]",
                  )}
                >
                  {values.favorite ? "★ Marcado como favorito" : "☆ Sin marcar"}
                </button>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Importancia">
                <div className="flex gap-1 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-1">
                  {IMPORTANCE_ORDER.map((imp) => (
                    <button
                      key={imp}
                      type="button"
                      onClick={() => patch("importance", imp)}
                      className={clsx(
                        "flex-1 rounded px-2 py-1.5 font-mono text-[0.65rem] font-semibold tracking-wide transition",
                        values.importance === imp
                          ? "bg-[color:var(--color-bg-card-alt)]"
                          : "text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]",
                      )}
                      style={
                        values.importance === imp
                          ? {
                              color:
                                imp === "critical"
                                  ? "var(--color-accent-orange)"
                                  : imp === "high"
                                    ? "var(--color-accent-cyan)"
                                    : imp === "medium"
                                      ? "var(--color-accent-purple)"
                                      : "var(--color-accent-pink)",
                            }
                          : undefined
                      }
                    >
                      {IMPORTANCE_LABELS[imp]}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label={`Frecuencia: ${values.frequency}/5`}>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={values.frequency}
                  onChange={(e) => patch("frequency", Number(e.target.value))}
                  className="h-9 w-full accent-[color:var(--color-accent-green)]"
                />
              </Field>
            </div>

            {/* Tags — uses div+span instead of Field's <label> wrapper to avoid
                wrong focus target when clicking the label with remove buttons present */}
            <div>
              <span className="mb-1.5 block font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
                Tags
              </span>
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2">
                {values.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-accent-cyan)]/40 bg-[color:var(--color-accent-cyan)]/10 px-2 py-0.5 font-mono text-[0.65rem] text-[color:var(--color-accent-cyan)]"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      className="ml-0.5 opacity-70 hover:opacity-100"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addTag();
                    } else if (
                      e.key === "Backspace" &&
                      tagInput === "" &&
                      values.tags.length > 0
                    ) {
                      removeTag(values.tags[values.tags.length - 1]);
                    }
                  }}
                  placeholder={values.tags.length ? "" : "añade tags y pulsa Enter"}
                  className="flex-1 bg-transparent font-mono text-xs text-[color:var(--color-text-bright)] outline-none placeholder:text-[color:var(--color-text-muted)]"
                />
              </div>
            </div>

            {/* Modifiers editor */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
                  Modificadores / flags
                </span>
                <button
                  type="button"
                  onClick={() =>
                    patch("modifiers", [
                      ...values.modifiers,
                      { flag: "", description: "" },
                    ])
                  }
                  className="flex items-center gap-1 rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg-card-alt)] px-2 py-1 font-mono text-[0.6rem] text-[color:var(--color-text-muted)] transition hover:border-[color:var(--color-accent-cyan)]/40 hover:text-[color:var(--color-accent-cyan)]"
                >
                  <Plus size={10} />
                  Añadir
                </button>
              </div>
              {values.modifiers.length === 0 ? (
                <div className="rounded-md border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-3 text-center font-mono text-[0.65rem] italic text-[color:var(--color-text-muted)]">
                  Sin modificadores. Añade flags como <code>-s</code>, <code>--graph</code>…
                </div>
              ) : (
                <div className="space-y-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-2">
                  {values.modifiers.map((mod, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <input
                        value={mod.flag}
                        onChange={(e) => {
                          const next = [...values.modifiers];
                          next[i] = { ...next[i], flag: e.target.value };
                          patch("modifiers", next);
                        }}
                        placeholder="-s / --graph"
                        className="h-8 w-28 shrink-0 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)] px-2 font-mono text-xs text-[color:var(--color-accent-cyan)] outline-none focus:border-[color:var(--color-accent-cyan)]"
                      />
                      <div className="flex flex-1 flex-col gap-1.5">
                        <input
                          value={mod.description}
                          onChange={(e) => {
                            const next = [...values.modifiers];
                            next[i] = { ...next[i], description: e.target.value };
                            patch("modifiers", next);
                          }}
                          placeholder="Descripción"
                          className="h-8 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)] px-2 text-xs text-[color:var(--color-text-bright)] outline-none focus:border-[color:var(--color-accent-cyan)]"
                        />
                        <input
                          value={mod.example ?? ""}
                          onChange={(e) => {
                            const next = [...values.modifiers];
                            const val = e.target.value;
                            next[i] = val
                              ? { ...next[i], example: val }
                              : { flag: next[i].flag, description: next[i].description };
                            patch("modifiers", next);
                          }}
                          placeholder="Ejemplo (opcional)"
                          className="h-7 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)] px-2 font-mono text-[0.68rem] text-[color:var(--color-text-muted)] outline-none focus:border-[color:var(--color-accent-cyan)]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = values.modifiers.filter((_, j) => j !== i);
                          patch("modifiers", next);
                        }}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)] text-[color:var(--color-text-muted)] transition hover:border-[color:var(--color-accent-orange)]/40 hover:text-[color:var(--color-accent-orange)]"
                        title="Eliminar modificador"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Field label="Notas personales">
              <textarea
                value={values.notes}
                onChange={(e) => patch("notes", e.target.value)}
                rows={4}
                placeholder="Contexto propio, lecciones aprendidas, cuándo usar..."
                className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm text-[color:var(--color-text)] outline-none focus:border-[color:var(--color-accent-cyan)]"
              />
            </Field>

            <Field label="URL Documentación oficial">
              <input
                type="url"
                value={values.docUrl ?? ""}
                onChange={(e) => patch("docUrl", e.target.value)}
                placeholder="https://docs.ejemplo.com/comando"
                className="h-9 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 font-mono text-sm text-[color:var(--color-text-bright)] outline-none focus:border-[color:var(--color-accent-cyan)]"
              />
            </Field>

            {error && (
              <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            )}
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[color:var(--color-border)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-card-alt)] px-4 py-2 font-mono text-xs text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md border border-[color:var(--color-accent-cyan)]/40 bg-[color:var(--color-accent-cyan)]/20 px-5 py-2 font-mono text-xs text-[color:var(--color-accent-cyan)] hover:bg-[color:var(--color-accent-cyan)]/30 disabled:opacity-50"
          >
            {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear comando"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
        {label}
        {required && <span className="ml-1 text-[color:var(--color-accent-orange)]">*</span>}
      </span>
      {children}
    </label>
  );
}
