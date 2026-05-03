import clsx from "clsx";
import type { DomainStatus } from "../../../types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const TODAY_TIME = Date.now();

const STATUS_STYLES: Record<DomainStatus, string> = {
  active:
    "bg-[color:var(--color-accent-green)]/10 text-[color:var(--color-accent-green)] border-[color:var(--color-accent-green)]/20",
  expired:
    "bg-red-500/10 text-red-400 border-red-500/20",
  pending:
    "bg-[color:var(--color-accent-yellow)]/10 text-[color:var(--color-accent-yellow)] border-[color:var(--color-accent-yellow)]/20",
  transferred:
    "bg-[color:var(--color-accent-purple)]/10 text-[color:var(--color-accent-purple)] border-[color:var(--color-accent-purple)]/20",
  cancelled:
    "bg-[color:var(--color-border-glow)]/30 text-[color:var(--color-text-muted)] border-[color:var(--color-border)]",
};

const STATUS_LABELS: Record<DomainStatus, string> = {
  active: "Activo",
  expired: "Caducado",
  pending: "Pendiente",
  transferred: "Transferido",
  cancelled: "Cancelado",
};

export function DomainStatusBadge({ status }: { status: DomainStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs font-medium",
        STATUS_STYLES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function ExpiryBadge({ expirationDate }: { expirationDate: string }) {
  const days = Math.ceil(
    (new Date(expirationDate).getTime() - TODAY_TIME) / MS_PER_DAY,
  );
  if (isNaN(days)) return null;

  if (days < 0) {
    return (
      <span className="inline-flex items-center rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 font-mono text-xs text-red-400">
        Caducado hace {Math.abs(days)} días
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="inline-flex items-center rounded-md border border-[color:var(--color-accent-orange)]/20 bg-[color:var(--color-accent-orange)]/10 px-2 py-0.5 font-mono text-xs text-[color:var(--color-accent-orange)]">
        Caduca en {days} días
      </span>
    );
  }
  if (days <= 90) {
    return (
      <span className="inline-flex items-center rounded-md border border-[color:var(--color-accent-yellow)]/20 bg-[color:var(--color-accent-yellow)]/10 px-2 py-0.5 font-mono text-xs text-[color:var(--color-accent-yellow)]">
        Caduca en {days} días
      </span>
    );
  }
  return null;
}
