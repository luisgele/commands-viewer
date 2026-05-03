import { useMemo, useState } from "react";
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
import { ArrowDown, ArrowUp } from "lucide-react";
import { useDomainsStore } from "../store/useDomainsStore";
import { DomainRow } from "./DomainRow";

type SortField = "manual" | "name" | "registrar" | "expirationDate" | "renewalPrice" | "status";
type SortDir = "asc" | "desc";
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const TODAY_TIME = Date.now();

export function DomainTable() {
  const domains = useDomainsStore((s) => s.domains);
  const filters = useDomainsStore((s) => s.filters);
  const expandedDomainId = useDomainsStore((s) => s.selectedDomainId);
  const setExpandedDomain = useDomainsStore((s) => s.setSelectedDomain);
  const updateDomain = useDomainsStore((s) => s.updateDomain);
  const reorderDomains = useDomainsStore((s) => s.reorderDomains);
  const [sortField, setSortField] = useState<SortField>("manual");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let list = [...domains];

    // Search filter
    const q = filters.search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.registrar.toLowerCase().includes(q) ||
          (d.registrarUsername ?? "").toLowerCase().includes(q) ||
          (d.registrarUrl ?? "").toLowerCase().includes(q) ||
          (d.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      );
    }

    // Status filter
    if (filters.status.size > 0) {
      list = list.filter((d) => filters.status.has(d.status));
    }

    // Expiry filter
    if (filters.expiresInDays !== null) {
      list = list.filter((d) => {
        const days = Math.ceil(
          (new Date(d.expirationDate).getTime() - TODAY_TIME) / MS_PER_DAY,
        );
        return !isNaN(days) && days >= 0 && days <= filters.expiresInDays!;
      });
    }

    // Sort. Pinned domains stay visually first so important records remain visible.
    list.sort((a, b) => {
      const pinnedCmp = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      if (pinnedCmp !== 0) return pinnedCmp;
      let cmp = 0;
      switch (sortField) {
        case "manual":
          cmp = (a.order ?? 0) - (b.order ?? 0);
          break;
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "registrar":
          cmp = a.registrar.localeCompare(b.registrar);
          break;
        case "expirationDate":
          cmp = new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
          break;
        case "renewalPrice":
          cmp = a.renewalPrice - b.renewalPrice;
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [domains, filters, sortField, sortDir]);

  const sortable =
    sortField === "manual" &&
    filters.search.trim() === "" &&
    filters.status.size === 0 &&
    filters.expiresInDays === null;

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <span className="inline-block w-3" />;
    return sortDir === "asc" ? (
      <ArrowUp size={12} className="text-[color:var(--color-accent-cyan)]" />
    ) : (
      <ArrowDown size={12} className="text-[color:var(--color-accent-cyan)]" />
    );
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = filtered.findIndex((domain) => domain.id === active.id);
    const newIdx = filtered.findIndex((domain) => domain.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(filtered, oldIdx, newIdx);
    await reorderDomains(reordered.map((domain) => domain.id));
  };

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-4">
      {!sortable && domains.length > 0 && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)]/50 px-4 py-2">
          <p className="font-mono text-[0.7rem] text-[color:var(--color-text-muted)]">
            Reordenación manual desactivada mientras hay filtros o un orden de columna activo.
          </p>
          <button
            type="button"
            onClick={() => setSortField("manual")}
            className="shrink-0 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-1 font-mono text-[0.7rem] text-[color:var(--color-text-muted)] transition hover:border-[color:var(--color-accent-cyan)]/40 hover:text-[color:var(--color-accent-cyan)]"
          >
            Orden manual
          </button>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg)]/50 p-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={filtered.map((domain) => domain.id)}
            strategy={verticalListSortingStrategy}
          >
        <table className="w-full min-w-[940px] border-separate border-spacing-y-2 text-left">
          <thead>
            <tr>
              <th className="w-8 px-2 py-2" />
              <th className="w-20 px-2 py-2 font-mono text-xs font-semibold text-[color:var(--color-text-muted)]">
                Foco
              </th>
              <th className="px-4 py-2 font-mono text-xs font-semibold text-[color:var(--color-text-muted)]">
                <button
                  type="button"
                  onClick={() => toggleSort("name")}
                  className="flex items-center gap-1"
                >
                  Dominio {renderSortIcon("name")}
                </button>
              </th>
              <th className="px-4 py-2 font-mono text-xs font-semibold text-[color:var(--color-text-muted)]">
                <button
                  type="button"
                  onClick={() => toggleSort("registrar")}
                  className="flex items-center gap-1"
                >
                  Registrador {renderSortIcon("registrar")}
                </button>
              </th>
              <th className="px-4 py-2 font-mono text-xs font-semibold text-[color:var(--color-text-muted)]">
                <button
                  type="button"
                  onClick={() => toggleSort("expirationDate")}
                  className="flex items-center gap-1"
                >
                  Caducidad {renderSortIcon("expirationDate")}
                </button>
              </th>
              <th className="px-4 py-2 font-mono text-xs font-semibold text-[color:var(--color-text-muted)]">
                <button
                  type="button"
                  onClick={() => toggleSort("renewalPrice")}
                  className="flex items-center gap-1"
                >
                  Precio {renderSortIcon("renewalPrice")}
                </button>
              </th>
              <th className="px-4 py-2 font-mono text-xs font-semibold text-[color:var(--color-text-muted)]">
                <button
                  type="button"
                  onClick={() => toggleSort("status")}
                  className="flex items-center gap-1"
                >
                  Estado {renderSortIcon("status")}
                </button>
              </th>
              <th className="px-4 py-2 text-right font-mono text-xs font-semibold text-[color:var(--color-text-muted)]">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((domain) => (
              <DomainRow
                key={domain.id}
                domain={domain}
                sortable={sortable}
                expanded={expandedDomainId === domain.id}
                onToggle={() =>
                  setExpandedDomain(expandedDomainId === domain.id ? null : domain.id)
                }
                onToggleFavorite={() =>
                  updateDomain(domain.id, { favorite: !domain.favorite })
                }
                onTogglePinned={() =>
                  updateDomain(domain.id, { pinned: !domain.pinned })
                }
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center font-mono text-sm text-[color:var(--color-text-muted)]"
                >
                  No se encontraron dominios con los filtros actuales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
