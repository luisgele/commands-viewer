import { Fragment, useEffect, useMemo, useRef, useState } from "react";
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
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, Plus } from "lucide-react";
import clsx from "clsx";
import type { Command, Modifier, SortKey, Tool } from "../types";
import { useStore } from "../store/useStore";
import {
  filterCommands,
  groupBySection,
  searchOnlyMatchesModifiers,
  sortCommands,
} from "../lib/selectors";
import { CommandRow } from "./CommandRow";
import { ConfirmDialog } from "./ConfirmDialog";

const MIN_CMD_COL_W = 120;
const MIN_DESC_COL_W = 240;
const DEFAULT_CMD_COL_W = 224;
const LS_CMD_COL_W = "commandTable.cmdColWidth";
const LS_DESC_COL_W = "commandTable.descColWidth";

function readStoredColW(key: string, min: number): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return null;
  const v = Number(raw);
  if (!Number.isFinite(v) || v < min) return null;
  return v;
}

interface CommandTableProps {
  tool: Tool;
  onEdit: (cmd: Command) => void;
  onAdd: () => void;
  onOpenDocs: (cmd: Command) => void;
}

export function CommandTable({ tool, onEdit, onAdd, onOpenDocs }: CommandTableProps) {
  const allCommands = useStore((s) => s.commands);
  const filters = useStore((s) => s.filters);
  const sortKey = useStore((s) => s.sortKey);
  const sortDir = useStore((s) => s.sortDir);
  const setSort = useStore((s) => s.setSort);
  const resetFilters = useStore((s) => s.resetFilters);
  const deleteCommand = useStore((s) => s.deleteCommand);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const reorderCommands = useStore((s) => s.reorderCommands);
  const density = useStore((s) => s.settings.density);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const descThRef = useRef<HTMLTableCellElement>(null);
  const [cmdColWidth, setCmdColWidth] = useState<number>(
    () => readStoredColW(LS_CMD_COL_W, MIN_CMD_COL_W) ?? DEFAULT_CMD_COL_W,
  );
  const [descColWidth, setDescColWidth] = useState<number | null>(() =>
    readStoredColW(LS_DESC_COL_W, MIN_DESC_COL_W),
  );

  useEffect(() => {
    window.localStorage.setItem(LS_CMD_COL_W, String(cmdColWidth));
  }, [cmdColWidth]);

  useEffect(() => {
    if (descColWidth === null) {
      window.localStorage.removeItem(LS_DESC_COL_W);
    } else {
      window.localStorage.setItem(LS_DESC_COL_W, String(descColWidth));
    }
  }, [descColWidth]);

  const beginColResize = (
    col: "cmd" | "desc",
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;

    // Snapshot the description width before a cmd drag starts so growing
    // the command column triggers horizontal scroll instead of squeezing
    // the auto-sized description column into an invalid state.
    if (col === "cmd" && descColWidth === null) {
      const measured = descThRef.current?.offsetWidth;
      if (measured && measured >= MIN_DESC_COL_W) {
        setDescColWidth(measured);
      }
    }

    const startW =
      col === "cmd"
        ? cmdColWidth
        : descColWidth ?? descThRef.current?.offsetWidth ?? 400;
    const min = col === "cmd" ? MIN_CMD_COL_W : MIN_DESC_COL_W;

    const handleMove = (ev: PointerEvent) => {
      const next = Math.max(min, Math.round(startW + (ev.clientX - startX)));
      if (col === "cmd") setCmdColWidth(next);
      else setDescColWidth(next);
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toolCommands = useMemo(
    () => allCommands.filter((c) => c.toolId === tool.id),
    [allCommands, tool.id],
  );

  const filtered = useMemo(
    () => filterCommands(toolCommands, filters),
    [toolCommands, filters],
  );

  const sorted = useMemo(
    () => sortCommands(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir],
  );

  const grouped = useMemo(() => groupBySection(sorted), [sorted]);

  // Auto-expand rows whose search match came only from a modifier (so the user
  // can actually see why the row is visible). Manual user toggles still win.
  const autoExpandedIds = useMemo(() => {
    if (!filters.search.trim()) {
      return new Set<string>();
    }
    const next = new Set<string>();
    for (const cmd of sorted) {
      if (searchOnlyMatchesModifiers(cmd, filters.search)) next.add(cmd.id);
    }
    return next;
  }, [filters.search, sorted]);

  const isExpanded = (id: string) => expandedIds.has(id) || autoExpandedIds.has(id);

  const sortable =
    sortKey === "manual" &&
    filters.search === "" &&
    filters.tag === null &&
    filters.importance.size === 0 &&
    filters.minFrequency === 0 &&
    !filters.favoritesOnly;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = async (event: DragEndEvent, sectionCommands: Command[]) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = sectionCommands.findIndex((c) => c.id === active.id);
    const newIdx = sectionCommands.findIndex((c) => c.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(sectionCommands, oldIdx, newIdx);

    // We reorder globally within the tool, keeping commands from other sections stable
    const allOrdered = [...toolCommands].sort((a, b) => a.order - b.order);
    const sectionSet = new Set(sectionCommands.map((c) => c.id));
    let rIdx = 0;
    const finalIds: string[] = [];
    for (const cmd of allOrdered) {
      if (sectionSet.has(cmd.id)) {
        finalIds.push(reordered[rIdx].id);
        rIdx++;
      } else {
        finalIds.push(cmd.id);
      }
    }
    await reorderCommands(tool.id, finalIds);
  };

  const ariaSortFor = (keyName: SortKey): "ascending" | "descending" | "none" => {
    if (sortKey !== keyName) return "none";
    return sortDir === "asc" ? "ascending" : "descending";
  };

  const renderSortHeader = (
    label: string,
    keyName: SortKey,
    align: "left" | "center" | "right" = "left",
  ) => {
    const active = sortKey === keyName;
    const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
    // Visual element only — the click handler lives on the parent <th> so
    // the entire cell (and its tooltip wrapper, for the frequency column)
    // is clickable, and so keyboard users can Tab onto the cell itself.
    return (
      <span
        className={clsx(
          "flex w-full select-none items-center gap-1 font-mono text-[0.7rem] font-semibold uppercase tracking-wider transition",
          active
            ? "text-[color:var(--color-text-bright)]"
            : "text-[color:var(--color-text-muted)]",
          align === "center" && "justify-center",
          align === "right" && "justify-end",
        )}
      >
        {label}
        <Icon size={11} className="opacity-70" />
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--color-border)]"
            style={{ color: tool.color, borderColor: `${tool.color}40` }}
          >
            <span className="text-lg">{tool.icon}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-lg font-bold text-[color:var(--color-text-bright)]">
                {tool.name}
              </h2>
              {tool.docUrl && (
                <a
                  href={tool.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Documentación oficial de ${tool.name}`}
                  className="text-[color:var(--color-text-muted)] transition hover:text-[color:var(--color-accent-cyan)]"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
            <p className="text-xs text-[color:var(--color-text-muted)]">
              {toolCommands.length} comando{toolCommands.length === 1 ? "" : "s"}
              {filtered.length !== toolCommands.length && ` · ${filtered.length} visible${filtered.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-2 rounded-lg border border-[color:var(--color-accent-cyan)]/40 bg-[color:var(--color-accent-cyan)]/10 px-4 py-2 font-mono text-xs text-[color:var(--color-accent-cyan)] transition hover:bg-[color:var(--color-accent-cyan)]/20"
        >
          <Plus size={13} />
          Añadir comando
        </button>
      </div>

      {!sortable && toolCommands.length > 0 && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)]/50 px-4 py-2">
          <p className="font-mono text-[0.7rem] text-[color:var(--color-text-muted)]">
            <span className="text-[color:var(--color-accent-yellow)]">⚑</span>{" "}
            Arrastrar y soltar desactivado — hay filtros o un orden personalizado activo.
          </p>
          <button
            type="button"
            onClick={() => {
              setSort("manual", "asc");
              resetFilters();
            }}
            className="shrink-0 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-1 font-mono text-[0.7rem] text-[color:var(--color-text-muted)] transition hover:border-[color:var(--color-accent-cyan)]/40 hover:text-[color:var(--color-accent-cyan)]"
          >
            Activar reorden manual
          </button>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          toolName={tool.name}
          hasCommands={toolCommands.length > 0}
          onAdd={onAdd}
          onClearFilters={resetFilters}
        />
      ) : (
        <div className="space-y-8">
          {grouped.map(({ section, commands }) => (
            <section key={section}>
              <div className="mb-3 flex items-center gap-3 border-b border-[color:var(--color-border)] pb-2">
                <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-[color:var(--color-text-bright)]">
                  {section}
                </h3>
                <span className="text-xs italic text-[color:var(--color-text-muted)]">
                  {commands.length} comando{commands.length === 1 ? "" : "s"}
                </span>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, commands)}
              >
                <SortableContext
                  items={commands.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="overflow-x-auto">
                  <table
                    className={clsx(
                      "table-fixed border-separate border-spacing-y-1",
                      descColWidth === null && "w-full",
                    )}
                    style={
                      descColWidth !== null
                        ? { width: `${380 + cmdColWidth + descColWidth}px` }
                        : undefined
                    }
                  >
                    <colgroup>
                      <col style={{ width: "24px" }} />
                      <col style={{ width: "32px" }} />
                      <col style={{ width: "36px" }} />
                      <col style={{ width: `${cmdColWidth}px` }} />
                      <col
                        style={
                          descColWidth !== null
                            ? { width: `${descColWidth}px` }
                            : undefined
                        }
                      />
                      <col style={{ width: "96px" }} />
                      <col style={{ width: "96px" }} />
                      <col style={{ width: "96px" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="pl-1" />
                        <th />
                        <th />
                        <th
                          scope="col"
                          aria-sort={ariaSortFor("name")}
                          tabIndex={0}
                          role="columnheader"
                          className="relative cursor-pointer px-3 py-1.5 text-left transition hover:text-[color:var(--color-text-bright)]"
                          onClick={() => setSort("name")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSort("name");
                            }
                          }}
                        >
                          {renderSortHeader("Comando", "name")}
                          <div
                            role="separator"
                            aria-orientation="vertical"
                            aria-label="Redimensionar columna Comando"
                            onPointerDown={(e) => beginColResize("cmd", e)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize select-none bg-transparent transition-colors hover:bg-[color:var(--color-accent-cyan)]/40"
                          />
                        </th>
                        <th
                          ref={descThRef}
                          scope="col"
                          className="relative px-3 py-1.5 text-left"
                        >
                          <span className="font-mono text-[0.7rem] font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
                            Descripción
                          </span>
                          <div
                            role="separator"
                            aria-orientation="vertical"
                            aria-label="Redimensionar columna Descripción"
                            onPointerDown={(e) => beginColResize("desc", e)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize select-none bg-transparent transition-colors hover:bg-[color:var(--color-accent-cyan)]/40"
                          />
                        </th>
                        <th
                          scope="col"
                          aria-sort={ariaSortFor("importance")}
                          tabIndex={0}
                          role="columnheader"
                          className="w-24 cursor-pointer px-2 py-1.5 transition hover:text-[color:var(--color-text-bright)]"
                          onClick={() => setSort("importance")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSort("importance");
                            }
                          }}
                        >
                          {renderSortHeader("Valor", "importance", "center")}
                        </th>
                        <th
                          scope="col"
                          aria-sort={ariaSortFor("frequency")}
                          tabIndex={0}
                          role="columnheader"
                          className="w-24 cursor-pointer px-2 py-1.5 transition hover:text-[color:var(--color-text-bright)]"
                          onClick={() => setSort("frequency")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSort("frequency");
                            }
                          }}
                        >
                          <div className="group/freq relative inline-flex w-full justify-center">
                            {renderSortHeader("Frec.", "frequency", "center")}
                            <div
                              role="tooltip"
                              className="pointer-events-none invisible absolute left-1/2 top-full z-20 mt-2 w-56 -translate-x-1/2 rounded-md border border-[color:var(--color-border-glow)] bg-[color:var(--color-bg)] p-3 text-left font-mono text-[0.65rem] text-[color:var(--color-text)] opacity-0 shadow-xl transition-opacity group-hover/freq:visible group-hover/freq:opacity-100"
                            >
                              <div className="mb-1.5 font-semibold text-[color:var(--color-text-bright)]">
                                Frecuencia de uso
                              </div>
                              <ul className="space-y-1 text-[color:var(--color-text-muted)]">
                                <li>
                                  <span className="mr-1 text-[color:var(--color-freq-high)]">●●●●●</span>{" "}
                                  5 — cada día
                                </li>
                                <li>
                                  <span className="mr-1 text-[color:var(--color-freq-high)]">●●●●</span>{" "}
                                  4 — varias veces por semana
                                </li>
                                <li>
                                  <span className="mr-1 text-[color:var(--color-freq-mid)]">●●●</span>{" "}
                                  3 — semanal
                                </li>
                                <li>
                                  <span className="mr-1 text-[color:var(--color-freq-mid)]">●●</span>{" "}
                                  2 — mensual
                                </li>
                                <li>
                                  <span className="mr-1 text-[color:var(--color-freq-low)]">●</span>{" "}
                                  1 — muy rara vez
                                </li>
                              </ul>
                            </div>
                          </div>
                        </th>
                        <th className="w-24" />
                      </tr>
                    </thead>
                    <tbody>
                      {commands.map((cmd) => {
                        const hasModifiers = (cmd.modifiers?.length ?? 0) > 0;
                        const expanded = isExpanded(cmd.id);
                        return (
                          <Fragment key={cmd.id}>
                            <CommandRow
                              command={cmd}
                              sortable={sortable}
                              expanded={expanded}
                              hasModifiers={hasModifiers}
                              onToggleExpand={() => toggleExpand(cmd.id)}
                              onEdit={() => onEdit(cmd)}
                              onDelete={() => setConfirmDelete(cmd.id)}
                              onToggleFavorite={() => toggleFavorite(cmd.id)}
                              onOpenDocs={() => onOpenDocs(cmd)}
                              density={density}
                            />
                            {expanded && hasModifiers &&
                              cmd.modifiers.map((mod, i) => (
                                <ModifierSubRow
                                  key={`${cmd.id}-mod-${i}`}
                                  modifier={mod}
                                  isLast={i === cmd.modifiers.length - 1}
                                />
                              ))}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                </SortableContext>
              </DndContext>
            </section>
          ))}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar comando"
          message={`Seguro que quieres eliminar "${toolCommands.find((c) => c.id === confirmDelete)?.name}"?`}
          confirmLabel="Eliminar"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={async () => {
            await deleteCommand(confirmDelete);
            setConfirmDelete(null);
          }}
        />
      )}
    </div>
  );
}

function EmptyState({
  toolName,
  hasCommands,
  onAdd,
  onClearFilters,
}: {
  toolName: string;
  hasCommands: boolean;
  onAdd: () => void;
  onClearFilters: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[color:var(--color-border-glow)] bg-[color:var(--color-bg-card)] p-12 text-center">
      <h3 className="font-mono text-base text-[color:var(--color-text-bright)]">
        {hasCommands ? "Sin resultados" : `Sin comandos en ${toolName}`}
      </h3>
      <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
        {hasCommands
          ? "Ningún comando coincide con los filtros actuales."
          : "Añade tu primer comando para empezar."}
      </p>
      {hasCommands ? (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[color:var(--color-accent-cyan)]/40 bg-[color:var(--color-accent-cyan)]/10 px-4 py-2 font-mono text-xs text-[color:var(--color-accent-cyan)] transition hover:bg-[color:var(--color-accent-cyan)]/20"
        >
          Limpiar filtros
        </button>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[color:var(--color-accent-cyan)]/40 bg-[color:var(--color-accent-cyan)]/10 px-4 py-2 font-mono text-xs text-[color:var(--color-accent-cyan)] transition hover:bg-[color:var(--color-accent-cyan)]/20"
        >
          <Plus size={13} />
          Añadir comando
        </button>
      )}
    </div>
  );
}

function ModifierSubRow({
  modifier,
  isLast,
}: {
  modifier: Modifier;
  isLast: boolean;
}) {
  return (
    <tr className="bg-[color:var(--color-bg-card-alt)]/60">
      <td colSpan={7} className="px-0 py-0">
        <div
          className={clsx(
            "flex items-start gap-4 border-l-2 border-[color:var(--color-accent-cyan)]/50 py-1.5 pl-16 pr-4",
            isLast && "rounded-b-lg pb-2",
          )}
        >
          <code className="w-32 shrink-0 font-mono text-[0.78rem] font-semibold text-[color:var(--color-accent-cyan)]">
            {modifier.flag}
          </code>
          <div className="flex-1">
            <div className="text-[0.8rem] text-[color:var(--color-text)]">
              {modifier.description}
            </div>
            {modifier.example && (
              <code className="mt-0.5 block font-mono text-[0.68rem] text-[color:var(--color-text-muted)]">
                {modifier.example}
              </code>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

