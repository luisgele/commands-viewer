import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useDomainsStore } from "../store/useDomainsStore";
import { DomainRow } from "./DomainRow";

type SortField = "name" | "registrar" | "expirationDate" | "renewalPrice" | "status";
type SortDir = "asc" | "desc";
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const TODAY_TIME = Date.now();

export function DomainTable() {
  const domains = useDomainsStore((s) => s.domains);
  const filters = useDomainsStore((s) => s.filters);
  const expandedDomainId = useDomainsStore((s) => s.selectedDomainId);
  const setExpandedDomain = useDomainsStore((s) => s.setSelectedDomain);
  const [sortField, setSortField] = useState<SortField>("expirationDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
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

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <span className="inline-block w-3" />;
    return sortDir === "asc" ? (
      <ArrowUp size={12} className="text-[color:var(--color-accent-cyan)]" />
    ) : (
      <ArrowDown size={12} className="text-[color:var(--color-accent-cyan)]" />
    );
  };

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-4">
      <div className="overflow-hidden rounded-xl border border-[color:var(--color-border)]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-card)]/60">
              <th className="px-4 py-3 font-mono text-xs font-semibold text-[color:var(--color-text-muted)]">
                <button
                  type="button"
                  onClick={() => toggleSort("name")}
                  className="flex items-center gap-1"
                >
                  Dominio {renderSortIcon("name")}
                </button>
              </th>
              <th className="px-4 py-3 font-mono text-xs font-semibold text-[color:var(--color-text-muted)]">
                <button
                  type="button"
                  onClick={() => toggleSort("registrar")}
                  className="flex items-center gap-1"
                >
                  Registrador {renderSortIcon("registrar")}
                </button>
              </th>
              <th className="px-4 py-3 font-mono text-xs font-semibold text-[color:var(--color-text-muted)]">
                <button
                  type="button"
                  onClick={() => toggleSort("expirationDate")}
                  className="flex items-center gap-1"
                >
                  Caducidad {renderSortIcon("expirationDate")}
                </button>
              </th>
              <th className="px-4 py-3 font-mono text-xs font-semibold text-[color:var(--color-text-muted)]">
                <button
                  type="button"
                  onClick={() => toggleSort("renewalPrice")}
                  className="flex items-center gap-1"
                >
                  Precio {renderSortIcon("renewalPrice")}
                </button>
              </th>
              <th className="px-4 py-3 font-mono text-xs font-semibold text-[color:var(--color-text-muted)]">
                <button
                  type="button"
                  onClick={() => toggleSort("status")}
                  className="flex items-center gap-1"
                >
                  Estado {renderSortIcon("status")}
                </button>
              </th>
              <th className="px-4 py-3 text-right font-mono text-xs font-semibold text-[color:var(--color-text-muted)]">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((domain) => (
              <DomainRow
                key={domain.id}
                domain={domain}
                expanded={expandedDomainId === domain.id}
                onToggle={() =>
                  setExpandedDomain(expandedDomainId === domain.id ? null : domain.id)
                }
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center font-mono text-sm text-[color:var(--color-text-muted)]"
                >
                  No se encontraron dominios con los filtros actuales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
