import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, X } from "lucide-react";
import type { Domain, DomainStatus } from "../../../types";
import { useFocusTrap } from "../../../lib/useFocusTrap";

interface DomainModalProps {
  domain: Domain | null;
  onClose: () => void;
  onSave: (values: DomainFormValues) => Promise<void>;
}

export interface DomainFormValues {
  name: string;
  registrar: string;
  registrationDate: string;
  expirationDate: string;
  renewalPrice: number;
  autoRenew: boolean;
  hostingProvider: string;
  hostingPlan: string;
  status: DomainStatus;
  notes: string;
  tags: string[];
}

const EMPTY: DomainFormValues = {
  name: "",
  registrar: "",
  registrationDate: "",
  expirationDate: "",
  renewalPrice: 0,
  autoRenew: false,
  hostingProvider: "",
  hostingPlan: "",
  status: "active",
  notes: "",
  tags: [],
};

const STATUSES: DomainStatus[] = ["active", "expired", "pending", "transferred", "cancelled"];

export function DomainModal({ domain, onClose, onSave }: DomainModalProps) {
  const isEdit = domain !== null;
  const [values, setValues] = useState<DomainFormValues>(
    domain
      ? {
          name: domain.name,
          registrar: domain.registrar,
          registrationDate: domain.registrationDate,
          expirationDate: domain.expirationDate,
          renewalPrice: domain.renewalPrice,
          autoRenew: domain.autoRenew,
          hostingProvider: domain.hostingProvider ?? "",
          hostingPlan: domain.hostingPlan ?? "",
          status: domain.status,
          notes: domain.notes ?? "",
          tags: [...(domain.tags ?? [])],
        }
      : { ...EMPTY },
  );
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const patch = <K extends keyof DomainFormValues>(key: K, value: DomainFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!values.tags.includes(t)) patch("tags", [...values.tags, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) => patch("tags", values.tags.filter((t) => t !== tag));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!values.name.trim()) {
      setError("El nombre del dominio es obligatorio");
      return;
    }
    setSaving(true);
    try {
      await onSave(values);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--color-overlay)] p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "Editar dominio" : "Nuevo dominio"}
    >
      <div
        ref={trapRef}
        className="w-full max-w-xl overflow-hidden rounded-xl border border-[color:var(--color-border-glow)] bg-[color:var(--color-bg-card)] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-6 py-4">
          <h2 className="font-mono text-base font-semibold text-[color:var(--color-text-bright)]">
            {isEdit ? "Editar dominio" : "Nuevo dominio"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-text-muted)] transition hover:bg-[color:var(--color-bg)] hover:text-[color:var(--color-text-bright)]"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          {error && (
            <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block font-mono text-xs text-[color:var(--color-text-muted)]">
                Dominio <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={values.name}
                onChange={(e) => patch("name", e.target.value)}
                placeholder="ej. example.com"
                className="w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm text-[color:var(--color-text-bright)] outline-none transition focus:border-[color:var(--color-accent-cyan)]"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-xs text-[color:var(--color-text-muted)]">
                Registrador
              </label>
              <input
                type="text"
                value={values.registrar}
                onChange={(e) => patch("registrar", e.target.value)}
                placeholder="ej. Namecheap"
                className="w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm text-[color:var(--color-text-bright)] outline-none transition focus:border-[color:var(--color-accent-cyan)]"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-xs text-[color:var(--color-text-muted)]">
                Estado
              </label>
              <select
                value={values.status}
                onChange={(e) => patch("status", e.target.value as DomainStatus)}
                className="w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm text-[color:var(--color-text-bright)] outline-none transition focus:border-[color:var(--color-accent-cyan)]"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-mono text-xs text-[color:var(--color-text-muted)]">
                Fecha de contratación
              </label>
              <input
                type="date"
                value={values.registrationDate}
                onChange={(e) => patch("registrationDate", e.target.value)}
                className="w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm text-[color:var(--color-text-bright)] outline-none transition focus:border-[color:var(--color-accent-cyan)]"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-xs text-[color:var(--color-text-muted)]">
                Fecha de caducidad
              </label>
              <input
                type="date"
                value={values.expirationDate}
                onChange={(e) => patch("expirationDate", e.target.value)}
                className="w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm text-[color:var(--color-text-bright)] outline-none transition focus:border-[color:var(--color-accent-cyan)]"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-xs text-[color:var(--color-text-muted)]">
                Precio renovación
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={values.renewalPrice}
                onChange={(e) => patch("renewalPrice", parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm text-[color:var(--color-text-bright)] outline-none transition focus:border-[color:var(--color-accent-cyan)]"
              />
            </div>

            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 pb-2 font-mono text-sm text-[color:var(--color-text)]">
                <input
                  type="checkbox"
                  checked={values.autoRenew}
                  onChange={(e) => patch("autoRenew", e.target.checked)}
                  className="h-4 w-4 rounded border-[color:var(--color-border)] bg-[color:var(--color-bg)] accent-[color:var(--color-accent-cyan)]"
                />
                Auto-renovación
              </label>
            </div>

            <div>
              <label className="mb-1 block font-mono text-xs text-[color:var(--color-text-muted)]">
                Proveedor de hosting
              </label>
              <input
                type="text"
                value={values.hostingProvider}
                onChange={(e) => patch("hostingProvider", e.target.value)}
                placeholder="ej. Vercel"
                className="w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm text-[color:var(--color-text-bright)] outline-none transition focus:border-[color:var(--color-accent-cyan)]"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-xs text-[color:var(--color-text-muted)]">
                Plan de hosting
              </label>
              <input
                type="text"
                value={values.hostingPlan}
                onChange={(e) => patch("hostingPlan", e.target.value)}
                placeholder="ej. Pro"
                className="w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm text-[color:var(--color-text-bright)] outline-none transition focus:border-[color:var(--color-accent-cyan)]"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block font-mono text-xs text-[color:var(--color-text-muted)]">
              Notas
            </label>
            <textarea
              value={values.notes}
              onChange={(e) => patch("notes", e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm text-[color:var(--color-text-bright)] outline-none transition focus:border-[color:var(--color-accent-cyan)]"
            />
          </div>

          <div className="mt-4">
            <label className="mb-1 block font-mono text-xs text-[color:var(--color-text-muted)]">
              Tags
            </label>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2">
              {values.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded bg-[color:var(--color-bg-card-alt)] px-2 py-1 font-mono text-xs text-[color:var(--color-text-muted)]"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-[color:var(--color-text-muted)] hover:text-red-400"
                  >
                    <Trash2 size={10} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Añadir tag..."
                className="min-w-[120px] flex-1 bg-transparent font-mono text-sm text-[color:var(--color-text-bright)] outline-none"
              />
              <button
                type="button"
                onClick={addTag}
                className="flex h-6 w-6 items-center justify-center rounded text-[color:var(--color-text-muted)] hover:text-[color:var(--color-accent-cyan)]"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-4 py-2 font-mono text-xs text-[color:var(--color-text-muted)] transition hover:text-[color:var(--color-text-bright)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg border border-[color:var(--color-accent-cyan)]/40 bg-[color:var(--color-accent-cyan)]/10 px-4 py-2 font-mono text-xs text-[color:var(--color-accent-cyan)] transition hover:bg-[color:var(--color-accent-cyan)]/20 disabled:opacity-50"
            >
              {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear dominio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
