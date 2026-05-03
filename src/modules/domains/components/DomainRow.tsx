import { ChevronDown, ChevronRight, Pencil, Trash2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useDomainsStore } from "../store/useDomainsStore";
import { DomainStatusBadge, ExpiryBadge } from "./DomainBadges";
import { EmailTable } from "./EmailTable";
import { DomainModal, type DomainFormValues } from "./DomainModal";
import { EmailModal, type EmailFormValues } from "./EmailModal";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import type { Domain } from "../../../types";

interface DomainRowProps {
  domain: Domain;
  expanded: boolean;
  onToggle: () => void;
}

export function DomainRow({ domain, expanded, onToggle }: DomainRowProps) {
  const updateDomain = useDomainsStore((s) => s.updateDomain);
  const deleteDomain = useDomainsStore((s) => s.deleteDomain);
  const setSelectedDomain = useDomainsStore((s) => s.setSelectedDomain);
  const allEmails = useDomainsStore((s) => s.emails);
  const emails = useMemo(
    () => allEmails.filter((email) => email.domainId === domain.id),
    [allEmails, domain.id],
  );

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const handleSave = async (values: DomainFormValues) => {
    await updateDomain(domain.id, values);
    setEditing(false);
  };

  const addEmail = useDomainsStore((s) => s.addEmail);

  const handleSaveEmail = async (values: EmailFormValues) => {
    await addEmail(values);
    setSelectedDomain(domain.id);
    setShowEmailModal(false);
  };

  return (
    <>
      <tr
        className="cursor-pointer border-b border-[color:var(--color-border)] transition hover:bg-[color:var(--color-bg-card)]/40"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronDown size={14} className="text-[color:var(--color-text-muted)]" />
            ) : (
              <ChevronRight size={14} className="text-[color:var(--color-text-muted)]" />
            )}
            <span className="font-mono text-sm font-semibold text-[color:var(--color-text-bright)]">
              {domain.name}
            </span>
            <ExpiryBadge expirationDate={domain.expirationDate} />
          </div>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-[color:var(--color-text)]">
          {domain.registrar}
        </td>
        <td className="px-4 py-3 font-mono text-xs text-[color:var(--color-text)]">
          {domain.expirationDate || "—"}
        </td>
        <td className="px-4 py-3 font-mono text-xs text-[color:var(--color-text)]">
          {domain.renewalPrice > 0 ? `€${domain.renewalPrice.toFixed(2)}` : "—"}
        </td>
        <td className="px-4 py-3">
          <DomainStatusBadge status={domain.status} />
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              className="flex h-7 w-7 items-center justify-center rounded text-[color:var(--color-text-muted)] transition hover:bg-[color:var(--color-bg)] hover:text-[color:var(--color-accent-cyan)]"
              title="Editar dominio"
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(true);
              }}
              className="flex h-7 w-7 items-center justify-center rounded text-[color:var(--color-text-muted)] transition hover:bg-red-500/10 hover:text-red-400"
              title="Eliminar dominio"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={6} className="border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-card)]/20 px-4 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <span className="block font-mono text-[0.65rem] uppercase tracking-wide text-[color:var(--color-text-muted)]">
                  Contratación
                </span>
                <span className="font-mono text-sm text-[color:var(--color-text)]">
                  {domain.registrationDate || "—"}
                </span>
              </div>
              <div>
                <span className="block font-mono text-[0.65rem] uppercase tracking-wide text-[color:var(--color-text-muted)]">
                  Auto-renovación
                </span>
                <span className="font-mono text-sm text-[color:var(--color-text)]">
                  {domain.autoRenew ? "Sí" : "No"}
                </span>
              </div>
              <div>
                <span className="block font-mono text-[0.65rem] uppercase tracking-wide text-[color:var(--color-text-muted)]">
                  Hosting
                </span>
                <span className="font-mono text-sm text-[color:var(--color-text)]">
                  {domain.hostingProvider || "—"}
                  {domain.hostingPlan ? ` · ${domain.hostingPlan}` : ""}
                </span>
              </div>
              <div>
                <span className="block font-mono text-[0.65rem] uppercase tracking-wide text-[color:var(--color-text-muted)]">
                  Tags
                </span>
                <span className="font-mono text-sm text-[color:var(--color-text)]">
                  {(domain.tags ?? []).join(", ") || "—"}
                </span>
              </div>
              {domain.notes && (
                <div className="sm:col-span-2 lg:col-span-4">
                  <span className="block font-mono text-[0.65rem] uppercase tracking-wide text-[color:var(--color-text-muted)]">
                    Notas
                  </span>
                  <span className="whitespace-pre-wrap font-mono text-sm text-[color:var(--color-text)]">
                    {domain.notes}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-mono text-xs font-semibold text-[color:var(--color-text-bright)]">
                  Emails asociados ({emails.length})
                </h4>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEmailModal(true);
                  }}
                  className="flex items-center gap-1.5 rounded-md border border-[color:var(--color-accent-cyan)]/30 bg-[color:var(--color-accent-cyan)]/10 px-2.5 py-1.5 font-mono text-[0.65rem] text-[color:var(--color-accent-cyan)] transition hover:bg-[color:var(--color-accent-cyan)]/20"
                >
                  <Plus size={12} />
                  Añadir email
                </button>
              </div>
              <EmailTable domainId={domain.id} />
            </div>
          </td>
        </tr>
      )}

      {editing && (
        <DomainModal
          domain={domain}
          onClose={() => setEditing(false)}
          onSave={handleSave}
        />
      )}

      {showEmailModal && (
        <EmailModal
          email={null}
          defaultDomainId={domain.id}
          onClose={() => setShowEmailModal(false)}
          onSave={handleSaveEmail}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`Eliminar "${domain.name}"`}
          message={
            emails.length > 0
              ? `Se borrarán también ${emails.length} email(s) asociados.\n\nEsta acción no se puede deshacer.`
              : "Esta acción no se puede deshacer."
          }
          confirmLabel="Eliminar"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await deleteDomain(domain.id);
            setConfirmDelete(false);
          }}
        />
      )}
    </>
  );
}
