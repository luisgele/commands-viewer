import { useMemo } from "react";
import { useDomainsStore } from "../store/useDomainsStore";
import { EmailRow } from "./EmailRow";

interface EmailTableProps {
  domainId: string;
}

export function EmailTable({ domainId }: EmailTableProps) {
  const allEmails = useDomainsStore((s) => s.emails);
  const emails = useMemo(
    () => allEmails.filter((email) => email.domainId === domainId),
    [allEmails, domainId],
  );

  if (emails.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[color:var(--color-border-glow)] py-6 text-center font-mono text-xs text-[color:var(--color-text-muted)]">
        No hay emails registrados para este dominio.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[color:var(--color-border)]">
      <table className="w-full min-w-[760px] text-left">
        <thead>
          <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
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
            <EmailRow key={email.id} email={email} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
