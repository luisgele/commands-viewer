import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { DomainEmail, EmailType } from "../../../types";
import { useFocusTrap } from "../../../lib/useFocusTrap";
import { useDomainsStore } from "../store/useDomainsStore";

interface EmailModalProps {
  email: DomainEmail | null;
  defaultDomainId?: string;
  onClose: () => void;
  onSave: (values: EmailFormValues) => Promise<void>;
}

export interface EmailFormValues {
  domainId: string;
  address: string;
  type: EmailType;
  provider: string;
  createdAt: string;
  forwardingTo: string;
  storageLimit: string;
  passwordHint: string;
  active: boolean;
  notes: string;
}

const EMPTY: EmailFormValues = {
  domainId: "",
  address: "",
  type: "other",
  provider: "",
  createdAt: "",
  forwardingTo: "",
  storageLimit: "",
  passwordHint: "",
  active: true,
  notes: "",
};

const EMAIL_TYPES: EmailType[] = ["personal", "work", "support", "noreply", "billing", "other"];

export function EmailModal({ email, defaultDomainId, onClose, onSave }: EmailModalProps) {
  const isEdit = email !== null;
  const domainId = email?.domainId ?? defaultDomainId ?? "";
  const domainName = useDomainsStore(
    (s) => s.domains.find((domain) => domain.id === domainId)?.name ?? "",
  );
  const suffix = domainName ? `@${domainName}` : "";
  const addressToLocalPart = (address: string) =>
    suffix && address.toLowerCase().endsWith(suffix.toLowerCase())
      ? address.slice(0, -suffix.length)
      : address;
  const [values, setValues] = useState<EmailFormValues>(
    email
      ? {
          domainId: email.domainId,
          address: addressToLocalPart(email.address),
          type: email.type,
          provider: email.provider,
          createdAt: email.createdAt ?? "",
          forwardingTo: email.forwardingTo ?? "",
          storageLimit: email.storageLimit ?? "",
          passwordHint: email.passwordHint ?? "",
          active: email.active,
          notes: email.notes ?? "",
        }
      : { ...EMPTY, domainId },
  );
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

  const patch = <K extends keyof EmailFormValues>(key: K, value: EmailFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!values.address.trim()) {
      setError("La dirección de email es obligatoria");
      return;
    }
    if (!values.domainId.trim()) {
      setError("Debes seleccionar un dominio");
      return;
    }
    const localPart = values.address.trim().replace(/@.*$/, "");
    const fullAddress = suffix ? `${localPart}${suffix}` : values.address.trim();
    setSaving(true);
    try {
      await onSave({ ...values, address: fullAddress });
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
      aria-label={isEdit ? "Editar email" : "Nuevo email"}
    >
      <div
        ref={trapRef}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-[color:var(--color-border-glow)] bg-[color:var(--color-bg-card)] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-6 py-4">
          <h2 className="font-mono text-base font-semibold text-[color:var(--color-text-bright)]">
            {isEdit ? "Editar email" : "Nuevo email"}
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
                Dirección de email <span className="text-red-400">*</span>
              </label>
              <div className="flex overflow-hidden rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] transition focus-within:border-[color:var(--color-accent-cyan)]">
                <input
                  type="text"
                  value={values.address}
                  onChange={(e) => patch("address", e.target.value.replace(/@.*$/, ""))}
                  placeholder="contact"
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-sm text-[color:var(--color-text-bright)] outline-none"
                />
                {suffix && (
                  <span className="flex shrink-0 items-center border-l border-[color:var(--color-border)] bg-[color:var(--color-bg-card-alt)] px-3 font-mono text-sm text-[color:var(--color-text-muted)]">
                    {suffix}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block font-mono text-xs text-[color:var(--color-text-muted)]">
                Tipo
              </label>
              <select
                value={values.type}
                onChange={(e) => patch("type", e.target.value as EmailType)}
                className="w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm text-[color:var(--color-text-bright)] outline-none transition focus:border-[color:var(--color-accent-cyan)]"
              >
                {EMAIL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-mono text-xs text-[color:var(--color-text-muted)]">
                Proveedor de email
              </label>
              <input
                type="text"
                value={values.provider}
                onChange={(e) => patch("provider", e.target.value)}
                placeholder="ej. Google Workspace"
                className="w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm text-[color:var(--color-text-bright)] outline-none transition focus:border-[color:var(--color-accent-cyan)]"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-xs text-[color:var(--color-text-muted)]">
                Fecha de creación
              </label>
              <input
                type="date"
                value={values.createdAt}
                onChange={(e) => patch("createdAt", e.target.value)}
                className="w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm text-[color:var(--color-text-bright)] outline-none transition focus:border-[color:var(--color-accent-cyan)]"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-xs text-[color:var(--color-text-muted)]">
                Reenvío a
              </label>
              <input
                type="email"
                value={values.forwardingTo}
                onChange={(e) => patch("forwardingTo", e.target.value)}
                placeholder="ej. personal@gmail.com"
                className="w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm text-[color:var(--color-text-bright)] outline-none transition focus:border-[color:var(--color-accent-cyan)]"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-xs text-[color:var(--color-text-muted)]">
                Límite de almacenamiento
              </label>
              <input
                type="text"
                value={values.storageLimit}
                onChange={(e) => patch("storageLimit", e.target.value)}
                placeholder="ej. 15GB"
                className="w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm text-[color:var(--color-text-bright)] outline-none transition focus:border-[color:var(--color-accent-cyan)]"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-xs text-[color:var(--color-text-muted)]">
                Pista de contraseña
              </label>
              <input
                type="text"
                value={values.passwordHint}
                onChange={(e) => patch("passwordHint", e.target.value)}
                placeholder="ej. Bitwarden / entrada 'email x'"
                className="w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm text-[color:var(--color-text-bright)] outline-none transition focus:border-[color:var(--color-accent-cyan)]"
              />
            </div>

            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 pb-2 font-mono text-sm text-[color:var(--color-text)]">
                <input
                  type="checkbox"
                  checked={values.active}
                  onChange={(e) => patch("active", e.target.checked)}
                  className="h-4 w-4 rounded border-[color:var(--color-border)] bg-[color:var(--color-bg)] accent-[color:var(--color-accent-cyan)]"
                />
                Activo
              </label>
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
              {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear email"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
