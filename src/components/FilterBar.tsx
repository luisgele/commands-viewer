import { ChevronDown, ChevronRight, Search, Star, X } from "lucide-react";
import clsx from "clsx";
import { useStore } from "../store/useStore";
import { IMPORTANCE_LABELS, IMPORTANCE_ORDER } from "../lib/constants";
import { uniqueTags } from "../lib/selectors";
import { TagChip } from "./Badges";
import { useMemo, useState } from "react";

export function FilterBar() {
  const filters = useStore((s) => s.filters);
  const setFilter = useStore((s) => s.setFilter);
  const toggleImportanceFilter = useStore((s) => s.toggleImportanceFilter);
  const resetFilters = useStore((s) => s.resetFilters);
  const activeFilterCount = useStore((s) => s.activeFilterCount);
  const commands = useStore((s) => s.commands);
  const activeToolId = useStore((s) => s.activeToolId);

  const toolCommands = useMemo(
    () => commands.filter((c) => c.toolId === activeToolId),
    [commands, activeToolId],
  );
  const tags = useMemo(() => uniqueTags(toolCommands), [toolCommands]);

  const filterCount = activeFilterCount();
  const hasActiveFilters = filterCount > 0;
  const [tagsOpen, setTagsOpen] = useState(true);

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
            placeholder="Buscar comandos, descripciones, tags..."
            className="h-9 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] pl-9 pr-3 font-mono text-xs text-[color:var(--color-text-bright)] placeholder:text-[color:var(--color-text-muted)] outline-none focus:border-[color:var(--color-accent-cyan)]"
          />
        </div>

        {/* Importance toggles */}
        <div className="flex items-center gap-1 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-1">
          {IMPORTANCE_ORDER.map((imp) => {
            const active = filters.importance.has(imp);
            return (
              <button
                key={imp}
                type="button"
                onClick={() => toggleImportanceFilter(imp)}
                className={clsx(
                  "rounded px-2 py-1 font-mono text-[0.65rem] font-semibold tracking-wide transition",
                  active
                    ? "bg-[color:var(--color-bg-card-alt)] text-[color:var(--color-text-bright)]"
                    : "text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]",
                )}
                style={
                  active
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
            );
          })}
        </div>

        {/* Frequency threshold */}
        <div className="flex items-center gap-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-1.5">
          <label className="font-mono text-[0.65rem] text-[color:var(--color-text-muted)]">
            FREQ ≥
          </label>
          <select
            value={filters.minFrequency}
            onChange={(e) => setFilter("minFrequency", Number(e.target.value))}
            className="bg-transparent font-mono text-xs text-[color:var(--color-text-bright)] outline-none"
          >
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n} className="bg-[color:var(--color-bg-card)]">
                {n === 0 ? "all" : n}
              </option>
            ))}
          </select>
        </div>

        {/* Favorites only */}
        <button
          type="button"
          onClick={() => setFilter("favoritesOnly", !filters.favoritesOnly)}
          className={clsx(
            "flex h-9 items-center gap-1.5 rounded-md border px-3 font-mono text-xs transition",
            filters.favoritesOnly
              ? "border-[color:var(--color-accent-yellow)]/50 bg-[color:var(--color-accent-yellow)]/10 text-[color:var(--color-accent-yellow)]"
              : "border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]",
          )}
        >
          <Star size={13} fill={filters.favoritesOnly ? "currentColor" : "none"} />
          Favoritos
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex h-9 items-center gap-2 rounded-md border border-[color:var(--color-accent-cyan)]/40 bg-[color:var(--color-accent-cyan)]/10 px-3 font-mono text-xs text-[color:var(--color-accent-cyan)] transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
            title={`${filterCount} filtro${filterCount === 1 ? "" : "s"} activo${filterCount === 1 ? "" : "s"} — click para limpiar`}
          >
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--color-accent-cyan)]/30 px-1.5 font-mono text-[0.65rem] font-bold text-[color:var(--color-accent-cyan)]">
              {filterCount}
            </span>
            <span>{filterCount === 1 ? "filtro activo" : "filtros activos"}</span>
            <X size={13} className="opacity-70" />
          </button>
        )}
      </div>

      {tags.length > 0 && (
        <div className="border-t border-[color:var(--color-border)]/50">
          <div className="mx-auto max-w-[1400px]">
            <button
              type="button"
              onClick={() => setTagsOpen((v) => !v)}
              className="flex w-full items-center gap-1.5 px-6 py-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-[color:var(--color-text-muted)] transition hover:text-[color:var(--color-text)]"
            >
              {tagsOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              tags ({tags.length})
              {filters.tag && (
                <span className="ml-1 rounded-full bg-[color:var(--color-accent-cyan)]/20 px-1.5 py-0.5 text-[0.6rem] text-[color:var(--color-accent-cyan)]">
                  activo
                </span>
              )}
            </button>
            {tagsOpen && (
              <div className="flex flex-wrap items-center gap-1.5 px-6 pb-2">
                {tags.map((tag) => (
                  <TagChip
                    key={tag}
                    tag={tag}
                    active={filters.tag === tag}
                    onClick={() => setFilter("tag", filters.tag === tag ? null : tag)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
