import { Search, X } from "lucide-react";
import clsx from "clsx";
import { useDomainsStore } from "../store/useDomainsStore";
import type { DomainStatus } from "../../../types";

const STATUS_OPTIONS: { value: DomainStatus; label: string }[] = [
  { value: "active", label: "Activo" },
  { value: "expired", label: "Caducado" },
  { value: "pending", label: "Pendiente" },
  { value: "transferred", label: "Transferido" },
  { value: "cancelled", label: "Cancelado" },
];

const EXPIRY_OPTIONS = [
  { value: 30, label: "30 días" },
  { value: 60, label: "60 días" },
  { value: 90, label: "90 días" },
];

export function DomainFilterBar() {
  const filters = useDomainsStore((s) => s.filters);
  const setFilter = useDomainsStore((s) => s.setFilter);
  const toggleStatusFilter = useDomainsStore((s) => s.toggleStatusFilter);
  const resetFilters = useDomainsStore((s) => s.resetFilters);
  const activeFilterCount = useDomainsStore((s) => s.activeFilterCount);

  const filterCount = activeFilterCount();
  const hasActiveFilters = filterCount > 0;

  return (
    <div
      className={clsx(
        "border-b border-[color:var(--color-border)] transition",
        hasActiveFilters
          ? "bg-[color:var(--color-accent-cyan)]/[0.04]"
          : "bg-[color:var(--color-bg-card)]/30",
      )}
    >
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-6 py-3">
        {/* Search */}
        <div className="relative min-w-[260px] flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)]"
          />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            placeholder="Buscar dominios, registradores, tags..."
            className="h-9 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] pl-9 pr-3 font-mono text-xs text-[color:var(--color-text-bright)] placeholder:text-[color:var(--color-text-muted)] outline-none focus:border-[color:var(--color-accent-cyan)]"
          />
        </div>

        {/* Status toggles */}
        <div className="flex items-center gap-1 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-1">
          {STATUS_OPTIONS.map((opt) => {
            const active = filters.status.has(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleStatusFilter(opt.value)}
                className={clsx(
                  "rounded px-2 py-1 font-mono text-[0.65rem] font-semibold tracking-wide transition",
                  active
                    ? "bg-[color:var(--color-bg-card-alt)] text-[color:var(--color-text-bright)]"
                    : "text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Expiry filter */}
        <div className="flex items-center gap-1 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-1">
          <span className="px-2 py-1 font-mono text-[0.65rem] text-[color:var(--color-text-muted)]">
            Caduca en
          </span>
          {EXPIRY_OPTIONS.map((opt) => {
            const active = filters.expiresInDays === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setFilter("expiresInDays", active ? null : opt.value)
                }
                className={clsx(
                  "rounded px-2 py-1 font-mono text-[0.65rem] font-semibold tracking-wide transition",
                  active
                    ? "bg-[color:var(--color-bg-card-alt)] text-[color:var(--color-accent-orange)]"
                    : "text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-2 py-1.5 font-mono text-[0.65rem] text-[color:var(--color-text-muted)] transition hover:text-[color:var(--color-text-bright)]"
          >
            <X size={12} />
            Limpiar ({filterCount})
          </button>
        )}
      </div>
    </div>
  );
}
