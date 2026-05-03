import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useDomainsStore } from "../store/useDomainsStore";
import { EmailModal, type EmailFormValues } from "./EmailModal";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import type { DomainEmail } from "../../../types";

interface EmailRowProps {
  email: DomainEmail;
  sortable?: boolean;
}

export function EmailRow({ email, sortable = false }: EmailRowProps) {
  const updateEmail = useDomainsStore((s) => s.updateEmail);
  const deleteEmail = useDomainsStore((s) => s.deleteEmail);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: email.id, disabled: !sortable });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async (values: EmailFormValues) => {
    await updateEmail(email.id, values);
    setEditing(false);
  };

  return (
    <>
      <tr
        ref={setNodeRef}
        style={style}
        className={
          isDragging
            ? "border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-card-alt)] opacity-70 shadow-lg"
            : "border-b border-[color:var(--color-border)] transition hover:bg-[color:var(--color-bg-card)]/30"
        }
      >
        <td className="px-2 py-2">
          {sortable && (
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="flex h-6 w-6 cursor-grab items-center justify-center rounded text-[color:var(--color-text-muted)]/45 transition hover:text-[color:var(--color-text-bright)] active:cursor-grabbing"
              aria-label="Arrastrar email para reordenar"
            >
              <GripVertical size={13} />
            </button>
          )}
        </td>
        <td className="px-3 py-2 font-mono text-xs text-[color:var(--color-text-bright)]">
          {email.address}
          {email.forwardingTo && (
            <span className="ml-2 font-mono text-[0.65rem] text-[color:var(--color-text-muted)]">
              → {email.forwardingTo}
            </span>
          )}
        </td>
        <td className="px-3 py-2 font-mono text-[0.65rem] text-[color:var(--color-text)]">
          {email.type}
        </td>
        <td className="px-3 py-2 font-mono text-[0.65rem] text-[color:var(--color-text)]">
          {email.provider}
        </td>
        <td className="max-w-[220px] px-3 py-2 text-xs text-[color:var(--color-text)]">
          {email.notes ? (
            <span className="line-clamp-2 whitespace-pre-wrap" title={email.notes}>
              {email.notes}
            </span>
          ) : (
            <span className="font-mono text-[0.65rem] text-[color:var(--color-text-muted)]">
              —
            </span>
          )}
        </td>
        <td className="px-3 py-2">
          {email.active ? (
            <span className="inline-flex items-center rounded bg-[color:var(--color-accent-green)]/10 px-1.5 py-0.5 font-mono text-[0.6rem] text-[color:var(--color-accent-green)]">
              Activo
            </span>
          ) : (
            <span className="inline-flex items-center rounded bg-[color:var(--color-border-glow)]/30 px-1.5 py-0.5 font-mono text-[0.6rem] text-[color:var(--color-text-muted)]">
              Inactivo
            </span>
          )}
        </td>
        <td className="px-3 py-2 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex h-6 w-6 items-center justify-center rounded text-[color:var(--color-text-muted)] transition hover:bg-[color:var(--color-bg)] hover:text-[color:var(--color-accent-cyan)]"
              title="Editar email"
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex h-6 w-6 items-center justify-center rounded text-[color:var(--color-text-muted)] transition hover:bg-red-500/10 hover:text-red-400"
              title="Eliminar email"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </td>
      </tr>

      {editing && (
        <EmailModal
          email={email}
          onClose={() => setEditing(false)}
          onSave={handleSave}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`Eliminar email`}
          message={`¿Eliminar "${email.address}"?\n\nEsta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await deleteEmail(email.id);
            setConfirmDelete(false);
          }}
        />
      )}
    </>
  );
}
