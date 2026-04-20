import { useEffect, useState } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import type {
  SkillSource,
  Tool,
  ToolResource,
  ToolResourceScope,
  ToolResourceType,
} from "../types";
import {
  RESOURCE_SCOPE_LABELS,
  RESOURCE_TYPE_LABELS,
  RESOURCE_TYPE_ORDER,
  SKILL_SOURCE_LABELS,
} from "../lib/constants";
import { useFocusTrap } from "../lib/useFocusTrap";

interface ToolResourceModalProps {
  tool: Tool;
  resource: ToolResource | null;
  onClose: () => void;
  onSave: (values: ToolResourceFormValues) => Promise<void>;
}

export interface ToolResourceFormValues {
  type: ToolResourceType;
  name: string;
  identifier: string;
  publisher: string;
  active: boolean;
  utility: string;
  scope: ToolResourceScope;
  projectName: string;
  installedAt: string;
  securityAudited: boolean;
  path: string;
  source?: SkillSource;
}

const EMPTY: ToolResourceFormValues = {
  type: "skill",
  name: "",
  identifier: "",
  publisher: "",
  active: true,
  utility: "",
  scope: "global",
  projectName: "",
  installedAt: "",
  securityAudited: false,
  path: "",
  source: "markdown-file",
};

export function ToolResourceModal({
  tool,
  resource,
  onClose,
  onSave,
}: ToolResourceModalProps) {
  const isEdit = resource !== null;
  const [values, setValues] = useState<ToolResourceFormValues>(
    resource
      ? {
          type: resource.type,
          name: resource.name,
          identifier: resource.identifier,
          publisher: resource.publisher ?? "",
          active: resource.active,
          utility: resource.utility,
          scope: resource.scope,
          projectName: resource.projectName,
          installedAt: resource.installedAt,
          securityAudited: resource.securityAudited,
          path: resource.path,
          source: resource.source,
        }
      : EMPTY,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const patch = <K extends keyof ToolResourceFormValues>(
    key: K,
    value: ToolResourceFormValues[K],
  ) => {
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (key === "type" && value !== "skill") {
        next.source = undefined;
      }
      if (key === "type" && value === "skill" && !next.source) {
        next.source = "markdown-file";
      }
      if (key === "scope" && value !== "project") {
        next.projectName = "";
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!values.name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    if (!values.identifier.trim()) {
      setError("El identificador es obligatorio");
      return;
    }
    if (!values.path.trim()) {
      setError("La ruta es obligatoria");
      return;
    }
    if (values.scope === "project" && !values.projectName.trim()) {
      setError("Indica el proyecto cuando el scope es de proyecto");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave({
        ...values,
        name: values.name.trim(),
        identifier: values.identifier.trim(),
        publisher: values.publisher.trim(),
        utility: values.utility.trim(),
        projectName: values.scope === "project" ? values.projectName.trim() : "",
        path: values.path.trim(),
        source: values.type === "skill" ? values.source ?? "markdown-file" : undefined,
      });
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  const trapRef = useFocusTrap<HTMLDivElement>();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--color-overlay)] p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "Editar recurso" : "Nuevo recurso"}
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
              {isEdit ? "Editar" : "Nuevo"} recurso · {tool.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg-card-alt)] hover:text-[color:var(--color-text-bright)]"
            aria-label="Cerrar"
          >
            <X size={15} />
          </button>
        </header>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <Field label="Tipo">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {RESOURCE_TYPE_ORDER.map((type) => {
                  const active = values.type === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => patch("type", type)}
                      className={clsx(
                        "rounded-lg border px-3 py-2 font-mono text-xs transition",
                        active
                          ? "border-[color:var(--color-accent-cyan)]/50 bg-[color:var(--color-accent-cyan)]/10 text-[color:var(--color-accent-cyan)]"
                          : "border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[color:var(--color-text-muted)] hover:border-[color:var(--color-border-glow)] hover:text-[color:var(--color-text)]",
                      )}
                    >
                      {RESOURCE_TYPE_LABELS[type]}
                    </button>
                  );
                })}
              </div>
            </Field>

            {values.type === "skill" && (
              <Field label="Origen del skill">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {(["bundled-slash-skill", "markdown-file"] as SkillSource[]).map((source) => {
                    const active = values.source === source;
                    return (
                      <button
                        key={source}
                        type="button"
                        onClick={() => patch("source", source)}
                        className={clsx(
                          "rounded-lg border px-3 py-2 text-left font-mono text-xs transition",
                          active
                            ? "border-[color:var(--color-accent-cyan)]/50 bg-[color:var(--color-accent-cyan)]/10 text-[color:var(--color-accent-cyan)]"
                            : "border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[color:var(--color-text-muted)] hover:border-[color:var(--color-border-glow)] hover:text-[color:var(--color-text)]",
                        )}
                      >
                        {SKILL_SOURCE_LABELS[source]}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Nombre" required>
                <input
                  value={values.name}
                  onChange={(e) => patch("name", e.target.value)}
                  autoFocus
                  placeholder="p.ej. openai-docs"
                  className="h-9 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 font-mono text-sm text-[color:var(--color-text-bright)] outline-none focus:border-[color:var(--color-accent-cyan)]"
                />
              </Field>

              <Field label="Identificador" required>
                <input
                  value={values.identifier}
                  onChange={(e) => patch("identifier", e.target.value)}
                  placeholder="plugin://..., agent-id, skill slug..."
                  className="h-9 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 font-mono text-sm text-[color:var(--color-text-bright)] outline-none focus:border-[color:var(--color-accent-cyan)]"
                />
              </Field>
            </div>

            <Field label="Publisher">
              <input
                value={values.publisher}
                onChange={(e) => patch("publisher", e.target.value)}
                placeholder="Anthropic, usuario/org de GitHub, autor..."
                className="h-9 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 font-mono text-sm text-[color:var(--color-text-bright)] outline-none focus:border-[color:var(--color-accent-cyan)]"
              />
            </Field>

            <Field label="Valor / utilidad">
              <textarea
                value={values.utility}
                onChange={(e) => patch("utility", e.target.value)}
                rows={3}
                placeholder="Qué aporta, cuándo merece la pena y por qué existe"
                className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm text-[color:var(--color-text)] outline-none focus:border-[color:var(--color-accent-cyan)]"
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Estado">
                <button
                  type="button"
                  onClick={() => patch("active", !values.active)}
                  className={clsx(
                    "h-9 w-full rounded-md border font-mono text-xs transition",
                    values.active
                      ? "border-[color:var(--color-accent-green)]/40 bg-[color:var(--color-accent-green)]/10 text-[color:var(--color-accent-green)]"
                      : "border-[color:var(--color-accent-orange)]/40 bg-[color:var(--color-accent-orange)]/10 text-[color:var(--color-accent-orange)]",
                  )}
                >
                  {values.active ? "Activa" : "Deshabilitada"}
                </button>
              </Field>

              <Field label="Auditoría de seguridad">
                <button
                  type="button"
                  onClick={() => patch("securityAudited", !values.securityAudited)}
                  className={clsx(
                    "h-9 w-full rounded-md border font-mono text-xs transition",
                    values.securityAudited
                      ? "border-[color:var(--color-accent-green)]/40 bg-[color:var(--color-accent-green)]/10 text-[color:var(--color-accent-green)]"
                      : "border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[color:var(--color-text-muted)]",
                  )}
                >
                  {values.securityAudited ? "Auditada" : "Pendiente"}
                </button>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Scope">
                <div className="grid grid-cols-2 gap-2">
                  {(["global", "project"] as ToolResourceScope[]).map((scope) => {
                    const active = values.scope === scope;
                    return (
                      <button
                        key={scope}
                        type="button"
                        onClick={() => patch("scope", scope)}
                        className={clsx(
                          "rounded-md border px-3 py-2 font-mono text-xs transition",
                          active
                            ? "border-[color:var(--color-accent-cyan)]/50 bg-[color:var(--color-accent-cyan)]/10 text-[color:var(--color-accent-cyan)]"
                            : "border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[color:var(--color-text-muted)]",
                        )}
                      >
                        {RESOURCE_SCOPE_LABELS[scope]}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="Fecha de instalación">
                <input
                  type="date"
                  value={values.installedAt}
                  onChange={(e) => patch("installedAt", e.target.value)}
                  className="h-9 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 font-mono text-sm text-[color:var(--color-text-bright)] outline-none focus:border-[color:var(--color-accent-cyan)]"
                />
              </Field>
            </div>

            {values.scope === "project" && (
              <Field label="Proyecto" required>
                <input
                  value={values.projectName}
                  onChange={(e) => patch("projectName", e.target.value)}
                  placeholder="p.ej. Commands-Viewer"
                  className="h-9 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 font-mono text-sm text-[color:var(--color-text-bright)] outline-none focus:border-[color:var(--color-accent-cyan)]"
                />
              </Field>
            )}

            <Field label="Ruta local" required>
              <input
                value={values.path}
                onChange={(e) => patch("path", e.target.value)}
                placeholder="C:\\ruta\\al\\fichero\\o\\directorio"
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
            {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear recurso"}
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
