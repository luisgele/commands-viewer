import { useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDomainsStore } from "../store/useDomainsStore";
import { EmailRow } from "./EmailRow";

interface EmailTableProps {
  domainId: string;
}

export function EmailTable({ domainId }: EmailTableProps) {
  const allEmails = useDomainsStore((s) => s.emails);
  const reorderEmails = useDomainsStore((s) => s.reorderEmails);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const emails = useMemo(
    () =>
      allEmails
        .filter((email) => email.domainId === domainId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [allEmails, domainId],
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = emails.findIndex((email) => email.id === active.id);
    const newIdx = emails.findIndex((email) => email.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(emails, oldIdx, newIdx);
    await reorderEmails(domainId, reordered.map((email) => email.id));
  };

  if (emails.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[color:var(--color-border-glow)] py-6 text-center font-mono text-xs text-[color:var(--color-text-muted)]">
        No hay emails registrados para este dominio.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[color:var(--color-border)]">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={emails.map((email) => email.id)}
          strategy={verticalListSortingStrategy}
        >
      <table className="w-full min-w-[760px] text-left">
        <thead>
          <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
            <th className="w-8 px-2 py-2" />
            <th className="px-3 py-2 font-mono text-[0.65rem] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">
              Email
            </th>
            <th className="px-3 py-2 font-mono text-[0.65rem] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">
              Tipo
            </th>
            <th className="px-3 py-2 font-mono text-[0.65rem] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">
              Proveedor
            </th>
            <th className="px-3 py-2 font-mono text-[0.65rem] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">
              Notas
            </th>
            <th className="px-3 py-2 font-mono text-[0.65rem] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">
              Estado
            </th>
            <th className="px-3 py-2 text-right font-mono text-[0.65rem] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {emails.map((email) => (
            <EmailRow key={email.id} email={email} sortable />
          ))}
        </tbody>
      </table>
        </SortableContext>
      </DndContext>
    </div>
  );
}
