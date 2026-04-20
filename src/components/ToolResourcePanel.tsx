import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Building2,
  ExternalLink,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";
import clsx from "clsx";
import { api } from "../lib/api";
import {
  RESOURCE_SCOPE_LABELS,
  RESOURCE_TYPE_LABELS,
  RESOURCE_TYPE_ORDER,
  SKILL_SOURCE_LABELS,
} from "../lib/constants";
import { useStore } from "../store/useStore";
import type { Tool, ToolResource, ToolResourceType } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  ToolResourceModal,
  type ToolResourceFormValues,
} from "./ToolResourceModal";

type TypeFilter = ToolResourceType | "all";
type SearchScope = "all" | "name";
type ResourceSortKey =
  | "manual"
  | "name-asc"
  | "name-desc"
  | "scope"
  | "installed-desc"
  | "installed-asc"
  | "status";

const SORT_LABELS: Record<ResourceSortKey, string> = {
  manual: "Agrupar por tipo",
  "name-asc": "Nombre A→Z",
  "name-desc": "Nombre Z→A",
  scope: "Scope (global primero)",
  "installed-desc": "Instalación · más reciente",
  "installed-asc": "Instalación · más antigua",
  status: "Estado (activas primero)",
};

const SORT_OPTIONS: ResourceSortKey[] = [
  "manual",
  "name-asc",
  "name-desc",
  "scope",
  "installed-desc",
  "installed-asc",
  "status",
];

interface ToolResourcePanelProps {
  tool: Tool;
}

export function ToolResourcePanel({ tool }: ToolResourcePanelProps) {
  const resources = useStore((s) => s.resources);
  const addResource = useStore((s) => s.addResource);
  const updateResource = useStore((s) => s.updateResource);
  const deleteResource = useStore((s) => s.deleteResource);

  const [query, setQuery] = useState("");
  const [searchScope, setSearchScope] = useState<SearchScope>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [publisherFilter, setPublisherFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<ResourceSortKey>("manual");
  const [editingResource, setEditingResource] = useState<ToolResource | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pathError, setPathError] = useState<string | null>(null);

  const toolResources = useMemo(
    () => resources.filter((resource) => resource.toolId === tool.id),
    [resources, tool.id],
  );

  const typeCounts = useMemo(() => {
    const counts: Record<ToolResourceType, number> = {
      skill: 0,
      agent: 0,
      plugin: 0,
      hook: 0,
    };
    for (const r of toolResources) counts[r.type]++;
    return counts;
  }, [toolResources]);

  const publisherOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of toolResources) {
      const key = r.publisher || "(sin publisher)";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [toolResources]);

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    let list = toolResources;
    if (typeFilter !== "all") list = list.filter((r) => r.type === typeFilter);
    if (publisherFilter !== "all") {
      list = list.filter(
        (r) => (r.publisher || "(sin publisher)") === publisherFilter,
      );
    }
    if (!normalizedQuery) return list;
    return list.filter((resource) => {
      const haystack =
        searchScope === "name"
          ? resource.name
          : [
              resource.name,
              resource.identifier,
              resource.publisher,
              resource.utility,
              resource.path,
              resource.projectName,
            ].join(" ");
      return haystack.toLowerCase().includes(normalizedQuery);
    });
  }, [normalizedQuery, toolResources, typeFilter, publisherFilter, searchScope]);

  const sortedFlat = useMemo(() => {
    if (sortKey === "manual") return null;
    const arr = [...filtered];
    const byName = (a: ToolResource, b: ToolResource) =>
      a.name.localeCompare(b.name);
    const byInstalled = (a: string, b: string) => {
      // Empty dates sink to the bottom regardless of direction.
      if (!a && !b) return 0;
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b);
    };
    switch (sortKey) {
      case "name-asc":
        arr.sort(byName);
        break;
      case "name-desc":
        arr.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "scope":
        arr.sort(
          (a, b) => a.scope.localeCompare(b.scope) || byName(a, b),
        );
        break;
      case "installed-desc":
        arr.sort(
          (a, b) => byInstalled(b.installedAt, a.installedAt) || byName(a, b),
        );
        break;
      case "installed-asc":
        arr.sort(
          (a, b) => byInstalled(a.installedAt, b.installedAt) || byName(a, b),
        );
        break;
      case "status":
        arr.sort(
          (a, b) => Number(b.active) - Number(a.active) || byName(a, b),
        );
        break;
    }
    return arr;
  }, [filtered, sortKey]);

  const grouped = useMemo(() => {
    if (sortKey !== "manual") return null;
    return RESOURCE_TYPE_ORDER.map((type) => ({
      type,
      entries: filtered
        .filter((resource) => resource.type === type)
        .sort((a, b) => a.name.localeCompare(b.name)),
    })).filter((group) => group.entries.length > 0);
  }, [filtered, sortKey]);

  const openPath = async (path: string) => {
    try {
      setPathError(null);
      await api.openLocalPath(path);
    } catch (err) {
      setPathError((err as Error).message);
    }
  };

  const saveNewResource = async (values: ToolResourceFormValues) => {
    await addResource({ ...values, toolId: tool.id });
    setShowCreateModal(false);
  };

  const saveEditedResource = async (values: ToolResourceFormValues) => {
    if (!editingResource) return;
    await updateResource(editingResource.id, { ...values, toolId: tool.id });
    setEditingResource(null);
  };

  const resourceToDelete =
    confirmDeleteId === null
      ? null
      : toolResources.find((resource) => resource.id === confirmDeleteId) ?? null;

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--color-border)]"
              style={{ color: tool.color, borderColor: `${tool.color}40` }}
            >
              <span className="text-lg">{tool.icon}</span>
            </div>
            <div>
              <h2 className="font-mono text-lg font-bold text-[color:var(--color-text-bright)]">
                Skills / Agents / Plugins / Hooks
              </h2>
              <p className="text-xs text-[color:var(--color-text-muted)]">
                {toolResources.length} elemento{toolResources.length === 1 ? "" : "s"} documentado
                {filtered.length !== toolResources.length &&
                  ` · ${filtered.length} visible${filtered.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex h-10 min-w-[340px] items-stretch overflow-hidden rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] focus-within:border-[color:var(--color-accent-cyan)]">
            <div className="flex items-stretch border-r border-[color:var(--color-border)] bg-[color:var(--color-bg-card-alt)] p-0.5">
              {(["all", "name"] as SearchScope[]).map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => setSearchScope(scope)}
                  className={clsx(
                    "rounded px-2.5 font-mono text-[0.65rem] font-semibold uppercase tracking-wider transition",
                    searchScope === scope
                      ? "bg-[color:var(--color-accent-cyan)]/15 text-[color:var(--color-accent-cyan)]"
                      : "text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]",
                  )}
                  title={
                    scope === "all"
                      ? "Buscar en todos los campos"
                      : "Buscar solo en el nombre"
                  }
                >
                  {scope === "all" ? "Todo" : "Nombre"}
                </button>
              ))}
            </div>
            <label className="relative flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)]"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  searchScope === "name"
                    ? "Buscar por nombre del recurso..."
                    : "Buscar por nombre, publisher, utilidad, path..."
                }
                className="h-full w-full bg-transparent pl-9 pr-3 font-mono text-xs text-[color:var(--color-text-bright)] placeholder:text-[color:var(--color-text-muted)] outline-none"
              />
            </label>
          </div>
          <label className="relative flex items-center gap-2">
            <Building2
              size={13}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)]"
            />
            <select
              value={publisherFilter}
              onChange={(e) => setPublisherFilter(e.target.value)}
              className="h-10 appearance-none rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] pl-9 pr-6 font-mono text-xs text-[color:var(--color-text-bright)] outline-none focus:border-[color:var(--color-accent-cyan)]"
              aria-label="Filtrar por publisher"
            >
              <option value="all">Todos los publishers</option>
              {publisherOptions.map((opt) => (
                <option key={opt.name} value={opt.name}>
                  {opt.name} ({opt.count})
                </option>
              ))}
            </select>
          </label>
          <label className="relative flex items-center gap-2">
            <ArrowUpDown
              size={13}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)]"
            />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as ResourceSortKey)}
              className="h-10 appearance-none rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] pl-9 pr-6 font-mono text-xs text-[color:var(--color-text-bright)] outline-none focus:border-[color:var(--color-accent-cyan)]"
              aria-label="Ordenar recursos"
            >
              {SORT_OPTIONS.map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[color:var(--color-accent-cyan)]/40 bg-[color:var(--color-accent-cyan)]/10 px-4 font-mono text-xs text-[color:var(--color-accent-cyan)] transition hover:bg-[color:var(--color-accent-cyan)]/20"
          >
            <Plus size={13} />
            Añadir recurso
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <TypePill
          label="Todos"
          count={toolResources.length}
          active={typeFilter === "all"}
          onClick={() => setTypeFilter("all")}
        />
        {RESOURCE_TYPE_ORDER.map((type) => (
          <TypePill
            key={type}
            label={`${RESOURCE_TYPE_LABELS[type]}s`}
            count={typeCounts[type]}
            active={typeFilter === type}
            onClick={() =>
              setTypeFilter((current) => (current === type ? "all" : type))
            }
          />
        ))}
      </div>

      {pathError && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{pathError}</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          hasResources={toolResources.length > 0}
          onAdd={() => setShowCreateModal(true)}
          onClearQuery={() => {
            setQuery("");
            setTypeFilter("all");
            setPublisherFilter("all");
          }}
        />
      ) : sortedFlat ? (
        <div>
          <div className="mb-3 flex items-center gap-3 border-b border-[color:var(--color-border)] pb-2">
            <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-[color:var(--color-text-bright)]">
              {SORT_LABELS[sortKey]}
            </h3>
            <span className="text-xs italic text-[color:var(--color-text-muted)]">
              {sortedFlat.length} elemento{sortedFlat.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {sortedFlat.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                showTypeBadge
                onOpenPath={openPath}
                onEdit={() => setEditingResource(resource)}
                onDelete={() => setConfirmDeleteId(resource.id)}
                onFilterPublisher={setPublisherFilter}
              />
            ))}
          </div>
        </div>
      ) : grouped && grouped.length > 0 ? (
        <div className="space-y-8">
          {grouped.map((group) => (
            <section key={group.type}>
              <div className="mb-3 flex items-center gap-3 border-b border-[color:var(--color-border)] pb-2">
                <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-[color:var(--color-text-bright)]">
                  {RESOURCE_TYPE_LABELS[group.type]}s
                </h3>
                <span className="text-xs italic text-[color:var(--color-text-muted)]">
                  {group.entries.length} elemento{group.entries.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {group.entries.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    onOpenPath={openPath}
                    onEdit={() => setEditingResource(resource)}
                    onDelete={() => setConfirmDeleteId(resource.id)}
                    onFilterPublisher={setPublisherFilter}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {showCreateModal && (
        <ToolResourceModal
          tool={tool}
          resource={null}
          onClose={() => setShowCreateModal(false)}
          onSave={saveNewResource}
        />
      )}

      {editingResource && (
        <ToolResourceModal
          tool={tool}
          resource={editingResource}
          onClose={() => setEditingResource(null)}
          onSave={saveEditedResource}
        />
      )}

      {resourceToDelete && (
        <ConfirmDialog
          title={`Eliminar "${resourceToDelete.name}"`}
          message="Esta ficha se eliminará de tu inventario local."
          confirmLabel="Eliminar"
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={async () => {
            await deleteResource(resourceToDelete.id);
            setConfirmDeleteId(null);
          }}
        />
      )}
    </div>
  );
}

function TypePill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-xs transition",
        active
          ? "border-[color:var(--color-accent-cyan)]/60 bg-[color:var(--color-accent-cyan)]/15 text-[color:var(--color-accent-cyan)]"
          : "border-[color:var(--color-border)] bg-[color:var(--color-bg-card)] text-[color:var(--color-text-muted)] hover:border-[color:var(--color-border-glow)] hover:text-[color:var(--color-text)]",
      )}
    >
      <span>{label}</span>
      <span
        className={clsx(
          "rounded-full px-1.5 text-[0.62rem] font-semibold",
          active
            ? "bg-[color:var(--color-accent-cyan)]/20 text-[color:var(--color-accent-cyan)]"
            : "bg-[color:var(--color-bg)] text-[color:var(--color-text-muted)]",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function ResourceCard({
  resource,
  showTypeBadge = false,
  onOpenPath,
  onEdit,
  onDelete,
  onFilterPublisher,
}: {
  resource: ToolResource;
  showTypeBadge?: boolean;
  onOpenPath: (path: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onFilterPublisher: (publisher: string) => void;
}) {
  return (
    <article className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)] p-5 transition hover:border-[color:var(--color-border-glow)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="truncate font-mono text-lg font-bold leading-tight tracking-tight text-[color:var(--color-text-bright)]">
            {resource.name}
          </h4>
          <div className="mt-1 mb-1.5 flex items-center gap-1.5 text-xs">
            <span className="text-[color:var(--color-text-muted)]">por</span>
            {resource.publisher ? (
              <button
                type="button"
                onClick={() => onFilterPublisher(resource.publisher)}
                className="font-mono font-semibold text-[color:var(--color-accent-cyan)] hover:underline"
                title={`Filtrar por publisher: ${resource.publisher}`}
              >
                {resource.publisher}
              </button>
            ) : (
              <span className="font-mono italic text-[color:var(--color-text-muted)]">
                Sin publisher
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {showTypeBadge && (
              <MetaPill>{RESOURCE_TYPE_LABELS[resource.type]}</MetaPill>
            )}
            <StatusPill active={resource.active} />
            {resource.type === "skill" && resource.source && (
              <MetaPill>{SKILL_SOURCE_LABELS[resource.source]}</MetaPill>
            )}
            <span className="truncate font-mono text-[0.7rem] text-[color:var(--color-text-muted)]">
              {resource.identifier}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onOpenPath(resource.path)}
            disabled={!resource.path}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-text-muted)] transition hover:bg-[color:var(--color-bg)] hover:text-[color:var(--color-accent-cyan)] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[color:var(--color-text-muted)]"
            title={resource.path ? "Abrir ruta" : "Sin ruta definida"}
            aria-label="Abrir ruta"
          >
            <ExternalLink size={14} />
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-text-muted)] transition hover:bg-[color:var(--color-bg)] hover:text-[color:var(--color-accent-cyan)]"
            title="Editar"
            aria-label="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-text-muted)] transition hover:bg-[color:var(--color-bg)] hover:text-[color:var(--color-accent-orange)]"
            title="Eliminar"
            aria-label="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <p className="mb-4 text-sm text-[color:var(--color-text)]">
        {resource.utility || (
          <span className="italic text-[color:var(--color-text-muted)]">
            Sin utilidad documentada todavía.
          </span>
        )}
      </p>

      <dl className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
        <Field label="Scope">
          {RESOURCE_SCOPE_LABELS[resource.scope]}
          {resource.scope === "project" && resource.projectName
            ? ` · ${resource.projectName}`
            : ""}
        </Field>
        <Field label="Instalación">
          {resource.installedAt || "Sin fecha"}
        </Field>
        <Field label="Seguridad">
          <span className="inline-flex items-center gap-1">
            {resource.securityAudited ? (
              <>
                <ShieldCheck size={13} className="text-[color:var(--color-accent-green)]" />
                Auditada
              </>
            ) : (
              <>
                <ShieldOff size={13} className="text-[color:var(--color-accent-orange)]" />
                Sin auditoría
              </>
            )}
          </span>
        </Field>
        <Field label="Ruta">
          {resource.path ? (
            <button
              type="button"
              onClick={() => onOpenPath(resource.path)}
              className="truncate text-left font-mono text-[color:var(--color-accent-cyan)] hover:text-[color:var(--color-text-bright)]"
              title={resource.path}
            >
              {resource.path}
            </button>
          ) : (
            <span className="italic text-[color:var(--color-text-muted)]">
              Sin instalar
            </span>
          )}
        </Field>
      </dl>
    </article>
  );
}

function EmptyState({
  hasResources,
  onAdd,
  onClearQuery,
}: {
  hasResources: boolean;
  onAdd: () => void;
  onClearQuery: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[color:var(--color-border-glow)] bg-[color:var(--color-bg-card)] p-12 text-center">
      <h3 className="font-mono text-base text-[color:var(--color-text-bright)]">
        {hasResources ? "Sin resultados" : "Sin recursos documentados"}
      </h3>
      <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
        {hasResources
          ? "Ajusta la búsqueda para volver a ver recursos."
          : "Añade tu primer skill, agent, plugin o hook para empezar."}
      </p>
      <button
        type="button"
        onClick={hasResources ? onClearQuery : onAdd}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[color:var(--color-accent-cyan)]/40 bg-[color:var(--color-accent-cyan)]/10 px-4 py-2 font-mono text-xs text-[color:var(--color-accent-cyan)] transition hover:bg-[color:var(--color-accent-cyan)]/20"
      >
        {hasResources ? "Limpiar búsqueda" : "Añadir recurso"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2">
      <dt className="mb-1 font-mono text-[0.62rem] uppercase tracking-wider text-[color:var(--color-text-muted)]">
        {label}
      </dt>
      <dd className="text-[color:var(--color-text)]">{children}</dd>
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[0.62rem]",
        active
          ? "border-[color:var(--color-accent-green)]/30 bg-[color:var(--color-accent-green)]/10 text-[color:var(--color-accent-green)]"
          : "border-[color:var(--color-accent-orange)]/30 bg-[color:var(--color-accent-orange)]/10 text-[color:var(--color-accent-orange)]",
      )}
    >
      {active ? "Activa" : "Deshabilitada"}
    </span>
  );
}

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-2 py-0.5 font-mono text-[0.62rem] text-[color:var(--color-text-muted)]">
      {children}
    </span>
  );
}
